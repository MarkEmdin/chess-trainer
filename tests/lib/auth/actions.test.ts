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
const signInWithOAuth = jest.fn();
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
      signInWithOAuth,
    },
    from: () => ({
      select: () => ({
        eq: () => ({ single: async () => ({ data: null }) }),
      }),
    }),
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

  it('sends the reset straight to a typed email, normalised', async () => {
    const result = await requestPasswordReset(
      undefined,
      formData({ email: ' User@Example.com ' }),
    );
    expect(rpc).not.toHaveBeenCalled();
    expect(resetPasswordForEmail).toHaveBeenCalledWith(
      'user@example.com',
      expect.anything(),
    );
    expect(result).toEqual({ success: 'auth.forgotPassword.success' });
  });

  it('returns an error when the email is missing', async () => {
    const result = await requestPasswordReset(undefined, formData({}));
    expect(result).toEqual({ error: 'auth.errors.fieldsRequired' });
    expect(rpc).not.toHaveBeenCalled();
  });

  it('sends the reset through the confirm route of the current locale', async () => {
    await requestPasswordReset(
      undefined,
      formData({ email: 'user@example.com' }),
    );
    expect(resetPasswordForEmail).toHaveBeenCalledWith(
      'user@example.com',
      expect.objectContaining({
        redirectTo: expect.stringContaining('/en/auth/confirm?next='),
      }),
    );
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

  it('shows a translated error on failure', async () => {
    updateUser.mockResolvedValue({ error: { message: 'Session expired' } });
    const result = await updatePassword(
      undefined,
      formData({ password: 'abcdef', confirmPassword: 'abcdef' }),
    );
    expect(result).toEqual({ error: 'common.serverError' });
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

describe('signUp with an email that already has an account', () => {
  beforeEach(() => {
    rpc.mockReset();
    rpc.mockResolvedValue({ data: null });
    cookieSet.mockReset();
    jest.mocked(redirect).mockClear();
  });

  it.each([
    ['over_email_send_rate_limit', 'auth.errors.tooManyAttempts'],
    ['over_request_rate_limit', 'auth.errors.tooManyAttempts'],
    ['email_address_invalid', 'auth.errors.invalidEmail'],
    ['weak_password', 'auth.errors.passwordTooShort'],
    ['unexpected_failure', 'common.serverError'],
  ])('translates %s', async (code, expected) => {
    authSignUp.mockResolvedValue({ error: { code, message: 'raw English' } });
    const result = await signUp(
      undefined,
      formData({ email: 'a@example.com', nickname: 'newbie', password: 'abcdef' }),
    );
    expect(result).toEqual({ error: expected });
  });

  it('shows the same check-email screen instead of revealing the account', async () => {
    authSignUp.mockResolvedValue({
      error: { code: 'user_already_exists', message: 'User already registered' },
    });
    const result = await signUp(
      undefined,
      formData({ email: 'taken@example.com', nickname: 'newbie', password: 'abcdef' }),
    );
    expect(result).toBeUndefined();
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

  it('signs in with the typed email, normalised, and no lookup', async () => {
    signInWithPassword.mockResolvedValue({
      error: null,
      data: { user: { id: 'u1' } },
    });
    await signIn(
      undefined,
      formData({ email: ' User@Example.com ', password: 'abcdef' }),
    );
    expect(rpc).not.toHaveBeenCalled();
    expect(signInWithPassword).toHaveBeenCalledWith({
      email: 'user@example.com',
      password: 'abcdef',
    });
  });

  it('asks an unconfirmed user to confirm and remembers their address', async () => {
    signInWithPassword.mockResolvedValue({
      error: { code: 'email_not_confirmed', message: 'Email not confirmed' },
      data: { user: null },
    });
    const result = await signIn(
      undefined,
      formData({ email: 'user@example.com', password: 'abcdef' }),
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

  it('says so when sign-ins are rate limited', async () => {
    signInWithPassword.mockResolvedValue({
      error: { code: 'over_request_rate_limit', message: 'slow down' },
      data: { user: null },
    });
    const result = await signIn(
      undefined,
      formData({ email: 'user@example.com', password: 'right1' }),
    );
    expect(result).toEqual({ error: 'auth.errors.tooManyAttempts' });
  });

  it('gives one error for a wrong email or password, without touching confirmation state', async () => {
    signInWithPassword.mockResolvedValue({
      error: { code: 'invalid_credentials', message: 'Invalid login' },
      data: { user: null },
    });
    const result = await signIn(
      undefined,
      formData({ email: 'user@example.com', password: 'wrong1' }),
    );
    expect(result).toEqual({ error: 'auth.errors.invalidCredentials' });
    expect(cookieSet).not.toHaveBeenCalled();
  });
});
