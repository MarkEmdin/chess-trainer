/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import { GET } from '@/app/[locale]/auth/confirm/route';

const exchangeCodeForSession = jest.fn();

jest.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { exchangeCodeForSession },
  }),
}));

describe('GET /auth/confirm', () => {
  beforeEach(() => {
    exchangeCodeForSession.mockClear();
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

  it('redirects to /login when the code exchange fails', async () => {
    exchangeCodeForSession.mockResolvedValue({
      error: { message: 'invalid' },
    });
    const request = new NextRequest(
      'https://example.com/en/auth/confirm?code=bad&next=%2Fen%2Freset-password',
    );
    const response = await GET(request, { params: Promise.resolve({ locale: 'en' }) });
    expect(response.headers.get('location')).toBe('https://example.com/en/login');
  });

  it('redirects to /login when there is no code', async () => {
    const request = new NextRequest('https://example.com/en/auth/confirm');
    const response = await GET(request, { params: Promise.resolve({ locale: 'en' }) });
    expect(exchangeCodeForSession).not.toHaveBeenCalled();
    expect(response.headers.get('location')).toBe('https://example.com/en/login');
  });

  it('falls back to locale-prefixed home when next is not an absolute path', async () => {
    exchangeCodeForSession.mockResolvedValue({ error: null });
    const request = new NextRequest(
      'https://example.com/en/auth/confirm?code=abc123&next=https://evil.com',
    );
    const response = await GET(request, { params: Promise.resolve({ locale: 'en' }) });
    expect(exchangeCodeForSession).toHaveBeenCalledWith('abc123');
    expect(response.headers.get('location')).toBe('https://example.com/en');
  });
});
