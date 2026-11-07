/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import { GET } from '@/app/[locale]/auth/confirm/route';

const exchangeCodeForSession = jest.fn();
const verifyOtp = jest.fn();
const profileSingle = jest.fn();
const profileUpdate = jest.fn();
const profileUpdateEq = jest.fn();

jest.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { exchangeCodeForSession, verifyOtp },
    from: () => ({
      select: () => ({ eq: () => ({ single: profileSingle }) }),
      update: (values: unknown) => {
        profileUpdate(values);
        return { eq: profileUpdateEq };
      },
    }),
  }),
}));

describe('GET /auth/confirm', () => {
  beforeEach(() => {
    exchangeCodeForSession.mockClear();
    verifyOtp.mockReset();
    profileSingle.mockReset();
    profileUpdate.mockClear();
    profileUpdateEq.mockReset();
    profileUpdateEq.mockResolvedValue({ error: null });
  });

  const get = (query: string) =>
    GET(new NextRequest(`https://example.com/en/auth/confirm?${query}`), {
      params: Promise.resolve({ locale: 'en' }),
    });
  const EXPIRED = 'https://example.com/en/login?error=link_expired';

  it('verifies a signup token hash and redirects to next', async () => {
    verifyOtp.mockResolvedValue({ error: null });
    const response = await get(
      'token_hash=h1&type=email&next=%2Fen%2Femail-confirmed',
    );
    expect(verifyOtp).toHaveBeenCalledWith({ token_hash: 'h1', type: 'email' });
    expect(response.headers.get('location')).toBe(
      'https://example.com/en/email-confirmed',
    );
  });

  it('verifies a recovery token hash', async () => {
    verifyOtp.mockResolvedValue({ error: null });
    const response = await get(
      'token_hash=h2&type=recovery&next=%2Fen%2Freset-password',
    );
    expect(verifyOtp).toHaveBeenCalledWith({
      token_hash: 'h2',
      type: 'recovery',
    });
    expect(response.headers.get('location')).toBe(
      'https://example.com/en/reset-password',
    );
  });

  it.each(['type=invite', 'type=', ''])(
    'rejects a token hash with an unsupported type (%s)',
    async (typeParam) => {
      const response = await get(`token_hash=h3&${typeParam}`);
      expect(verifyOtp).not.toHaveBeenCalled();
      expect(response.headers.get('location')).toBe(EXPIRED);
    },
  );

  it('sends a dead token hash to login with the expired notice', async () => {
    verifyOtp.mockResolvedValue({ error: { message: 'expired' } });
    const response = await get('token_hash=old&type=email');
    expect(response.headers.get('location')).toBe(EXPIRED);
  });

  it('guards next on the token hash branch too', async () => {
    verifyOtp.mockResolvedValue({ error: null });
    const response = await get(
      'token_hash=h4&type=email&next=https://evil.com',
    );
    expect(response.headers.get('location')).toBe('https://example.com/en');
  });

  it('exchanges a valid code and redirects to the next path', async () => {
    exchangeCodeForSession.mockResolvedValue({ error: null });
    const request = new NextRequest(
      'https://example.com/en/auth/confirm?code=abc123&next=%2Fen%2Freset-password',
    );
    const response = await GET(request, { params: Promise.resolve({ locale: 'en' }) });
    expect(exchangeCodeForSession).toHaveBeenCalledWith('abc123');
    expect(response.headers.get('location')).toBe(
      'https://example.com/en/reset-password',
    );
  });

  it('redirects to /login with the expired notice when the code exchange fails', async () => {
    exchangeCodeForSession.mockResolvedValue({
      error: { message: 'invalid' },
    });
    const request = new NextRequest(
      'https://example.com/en/auth/confirm?code=bad&next=%2Fen%2Freset-password',
    );
    const response = await GET(request, { params: Promise.resolve({ locale: 'en' }) });
    expect(response.headers.get('location')).toBe(EXPIRED);
  });

  it('redirects to /login when there is no code', async () => {
    const request = new NextRequest('https://example.com/en/auth/confirm');
    const response = await GET(request, { params: Promise.resolve({ locale: 'en' }) });
    expect(exchangeCodeForSession).not.toHaveBeenCalled();
    expect(response.headers.get('location')).toBe(EXPIRED);
  });

  it('falls back to locale-prefixed home when next is not an absolute path', async () => {
    exchangeCodeForSession.mockResolvedValue({
      data: { user: { id: 'u1' } },
      error: null,
    });
    profileSingle.mockResolvedValue({ data: null });
    const request = new NextRequest(
      'https://example.com/en/auth/confirm?code=abc123&next=https://evil.com',
    );
    const response = await GET(request, { params: Promise.resolve({ locale: 'en' }) });
    expect(exchangeCodeForSession).toHaveBeenCalledWith('abc123');
    expect(response.headers.get('location')).toBe('https://example.com/en');
  });

  describe('returning from Google', () => {
    const signedIn = (profile: object) => {
      exchangeCodeForSession.mockResolvedValue({
        data: { user: { id: 'u1' } },
        error: null,
      });
      profileSingle.mockResolvedValue({ data: profile });
    };

    it('sends a cancelled sign-in to login with the Google notice', async () => {
      const response = await get('error=access_denied');
      expect(exchangeCodeForSession).not.toHaveBeenCalled();
      expect(response.headers.get('location')).toBe(
        'https://example.com/en/login?error=google_failed',
      );
    });

    it('asks a new user for a nickname', async () => {
      signedIn({ nickname_set: false, preferred_locale: null });
      const response = await get('code=c1');
      expect(response.headers.get('location')).toBe(
        'https://example.com/en/choose-nickname',
      );
    });

    it('stores the page language for a new user', async () => {
      signedIn({ nickname_set: false, preferred_locale: null });
      await get('code=c1');
      expect(profileUpdate).toHaveBeenCalledWith({ preferred_locale: 'en' });
      expect(profileUpdateEq).toHaveBeenCalledWith('id', 'u1');
    });

    it('sends a returning user home in their language', async () => {
      signedIn({ nickname_set: true, preferred_locale: 'ru' });
      const response = await get('code=c1');
      expect(profileUpdate).not.toHaveBeenCalled();
      expect(response.headers.get('location')).toBe('https://example.com/ru');
    });

    it('never reads the profile when a next path was passed', async () => {
      signedIn({ nickname_set: false, preferred_locale: null });
      await get('code=c1&next=%2Fen%2Freset-password');
      expect(profileSingle).not.toHaveBeenCalled();
    });
  });
});
