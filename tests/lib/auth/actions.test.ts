import {
  requestPasswordReset,
  resendConfirmation,
  signIn,
  signUp,
  updatePassword,
} from '@/lib/auth/actions';
import { redirect } from '@/i18n/navigation';

const resetPasswordForEmail = jest.fn();
const updateUser = jest.fn();
const signOut = jest.fn();
const resend = jest.fn();
const authSignUp = jest.fn();
const signInWithPassword = jest.fn();
const rpc = jest.fn();
const cookieGet = jest.fn();
const cookieSet = jest.fn();

jest.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: {
      resetPasswordForEmail,
      updateUser,
      signOut,
      resend,
      signUp: authSignUp,
      signInWithPassword,
    },
  }),
}));

jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({ rpc }),
}));

jest.mock('@/i18n/navigation', () => ({ redirect: jest.fn() }));

jest.mock('next/headers', () => ({
  headers: async () => new Map([['origin', 'https://example.com']]),
  cookies: async () => ({ get: cookieGet, set: cookieSet }),
}));

jest.mock('next-intl/server', () => ({
  getLocale: async () => 'en',
  getTranslations: async (namespace: string) => (key: string) =>
    `${namespace}.${key}`,
}));

function formData(entries: Record<string, string>) {
  const fd = new FormData();
  Object.entries(entries).forEach(([key, value]) => fd.append(key, value));
  return fd;
}

describe('requestPasswordReset', () => {
  beforeEach(() => {
    resetPasswordForEmail.mockClear();
    resetPasswordForEmail.mockResolvedValue({ error: null });
    rpc.mockClear();
  });

  it('returns an error when nickname is missing', async () => {
    const result = await requestPasswordReset(undefined, formData({}));
    expect(result).toEqual({ error: 'auth.errors.fieldsRequired' });
    expect(rpc).not.toHaveBeenCalled();
  });

  it('sends a reset email and returns a neutral success message when the nickname exists', async () => {
    rpc.mockResolvedValue({ data: 'user@example.com' });
    const result = await requestPasswordReset(
      undefined,
      formData({ nickname: 'alice' }),
    );
    expect(resetPasswordForEmail).toHaveBeenCalledWith(
      'user@example.com',
      expect.objectContaining({
        redirectTo: expect.stringContaining('/en/auth/confirm?next='),
      }),
    );
    expect(result).toEqual({ success: 'auth.forgotPassword.success' });
  });

  it('returns the same neutral success message when the nickname does not exist', async () => {
    rpc.mockResolvedValue({ data: null });
    const result = await requestPasswordReset(
      undefined,
      formData({ nickname: 'ghost' }),
    );
    expect(resetPasswordForEmail).not.toHaveBeenCalled();
    expect(result).toEqual({ success: 'auth.forgotPassword.success' });
  });
});

describe('updatePassword', () => {
  beforeEach(() => {
    updateUser.mockClear();
    signOut.mockClear();
    signOut.mockResolvedValue({ error: null });
  });

  it('rejects mismatched passwords', async () => {
    const result = await updatePassword(
      undefined,
      formData({ password: 'abcdef', confirmPassword: 'xyzxyz' }),
    );
    expect(result).toEqual({ error: 'auth.errors.passwordMismatch' });
    expect(updateUser).not.toHaveBeenCalled();
  });

  it('rejects passwords shorter than 6 characters', async () => {
    const result = await updatePassword(
      undefined,
      formData({ password: 'abc', confirmPassword: 'abc' }),
    );
    expect(result).toEqual({ error: 'auth.errors.passwordTooShort' });
    expect(updateUser).not.toHaveBeenCalled();
  });

  it('updates the password, signs out other sessions, and returns a success message', async () => {
    updateUser.mockResolvedValue({ error: null });
    const result = await updatePassword(
      undefined,
      formData({ password: 'abcdef', confirmPassword: 'abcdef' }),
    );
    expect(updateUser).toHaveBeenCalledWith({ password: 'abcdef' });
    expect(signOut).toHaveBeenCalledWith({ scope: 'others' });
    expect(result).toEqual({ success: 'auth.resetPassword.success' });
  });

  it('maps AuthSessionMissingError to the sessionExpired translation', async () => {
    updateUser.mockResolvedValue({
      error: { name: 'AuthSessionMissingError', message: 'Auth session missing!' },
    });
    const result = await updatePassword(
      undefined,
      formData({ password: 'abcdef', confirmPassword: 'abcdef' }),
    );
    expect(result).toEqual({ error: 'auth.errors.sessionExpired' });
    expect(signOut).not.toHaveBeenCalled();
  });

  it('surfaces the Supabase error message on failure', async () => {
    updateUser.mockResolvedValue({ error: { message: 'Session expired' } });
    const result = await updatePassword(
      undefined,
      formData({ password: 'abcdef', confirmPassword: 'abcdef' }),
    );
    expect(result).toEqual({ error: 'Session expired' });
  });
});

describe('resendConfirmation', () => {
  beforeEach(() => {
    resend.mockReset();
    resend.mockResolvedValue({ error: null });
    cookieGet.mockReset();
  });

  it('resends the signup email to the pending address', async () => {
    cookieGet.mockReturnValue({ value: 'user@example.com' });
    const result = await resendConfirmation();
    expect(resend).toHaveBeenCalledWith({
      type: 'signup',
      email: 'user@example.com',
    });
    expect(result).toEqual({ success: 'auth.checkEmail.resent' });
  });

  it('returns the neutral message without sending when no address is pending', async () => {
    cookieGet.mockReturnValue(undefined);
    const result = await resendConfirmation();
    expect(resend).not.toHaveBeenCalled();
    expect(result).toEqual({ success: 'auth.checkEmail.resent' });
  });

  it('asks the user to wait when Supabase rate-limits the resend', async () => {
    cookieGet.mockReturnValue({ value: 'user@example.com' });
    resend.mockResolvedValue({
      error: { code: 'over_email_send_rate_limit', message: 'slow down' },
    });
    const result = await resendConfirmation();
    expect(result).toEqual({ error: 'auth.errors.resendTooSoon' });
  });
});

describe('signUp', () => {
  beforeEach(() => {
    authSignUp.mockReset();
    authSignUp.mockResolvedValue({ error: null });
    rpc.mockReset();
    rpc.mockResolvedValue({ data: null });
    cookieSet.mockReset();
    jest.mocked(redirect).mockClear();
  });

  it('remembers the address and sends the user to check their email', async () => {
    await signUp(
      undefined,
      formData({ email: 'new@example.com', nickname: 'newbie', password: 'abcdef' }),
    );
    expect(cookieSet).toHaveBeenCalledWith(
      'pending_email',
      'new@example.com',
      expect.objectContaining({ httpOnly: true }),
    );
    expect(redirect).toHaveBeenCalledWith({ href: '/check-email', locale: 'en' });
  });
});

describe('signIn', () => {
  beforeEach(() => {
    signInWithPassword.mockReset();
    rpc.mockReset();
    rpc.mockResolvedValue({ data: 'user@example.com' });
    cookieSet.mockReset();
  });

  it('asks an unconfirmed user to confirm and remembers their address', async () => {
    signInWithPassword.mockResolvedValue({
      error: { code: 'email_not_confirmed', message: 'Email not confirmed' },
      data: { user: null },
    });
    const result = await signIn(
      undefined,
      formData({ nickname: 'alice', password: 'abcdef' }),
    );
    expect(result).toEqual({
      error: 'auth.errors.emailNotConfirmed',
      suggest: 'resend',
    });
    expect(cookieSet).toHaveBeenCalledWith(
      'pending_email',
      'user@example.com',
      expect.anything(),
    );
  });

  it('keeps reporting a wrong password without touching confirmation state', async () => {
    signInWithPassword.mockResolvedValue({
      error: { code: 'invalid_credentials', message: 'Invalid login' },
      data: { user: null },
    });
    const result = await signIn(
      undefined,
      formData({ nickname: 'alice', password: 'wrong1' }),
    );
    expect(result).toEqual({ error: 'auth.errors.wrongPassword' });
    expect(cookieSet).not.toHaveBeenCalled();
  });
});
