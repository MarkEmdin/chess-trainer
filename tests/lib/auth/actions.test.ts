import {
  requestPasswordReset,
  resendConfirmation,
  updatePassword,
} from '@/lib/auth/actions';

const resetPasswordForEmail = jest.fn();
const updateUser = jest.fn();
const signOut = jest.fn();
const resend = jest.fn();
const rpc = jest.fn();
const cookieGet = jest.fn();
const cookieSet = jest.fn();

jest.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { resetPasswordForEmail, updateUser, signOut, resend },
  }),
}));

jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({ rpc }),
}));

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
    const result = await resendConfirmation(undefined, formData({}));
    expect(resend).toHaveBeenCalledWith({
      type: 'signup',
      email: 'user@example.com',
    });
    expect(result).toEqual({ success: 'auth.checkEmail.resent' });
  });

  it('returns the neutral message without sending when no address is pending', async () => {
    cookieGet.mockReturnValue(undefined);
    const result = await resendConfirmation(undefined, formData({}));
    expect(resend).not.toHaveBeenCalled();
    expect(result).toEqual({ success: 'auth.checkEmail.resent' });
  });

  it('asks the user to wait when Supabase rate-limits the resend', async () => {
    cookieGet.mockReturnValue({ value: 'user@example.com' });
    resend.mockResolvedValue({
      error: { code: 'over_email_send_rate_limit', message: 'slow down' },
    });
    const result = await resendConfirmation(undefined, formData({}));
    expect(result).toEqual({ error: 'auth.errors.resendTooSoon' });
  });
});
