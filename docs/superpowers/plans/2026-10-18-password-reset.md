# Password Reset Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a user who forgot their password request a reset email (by nickname), click the link, and set a new password — without any paid email infrastructure.

**Architecture:** Two new Server Actions in the existing `lib/auth/actions.ts` (`requestPasswordReset`, `updatePassword`) reuse the existing `lookup_email_by_nickname` RPC and `AuthFormState` type. A new route handler at `app/[locale]/auth/confirm/route.ts` exchanges Supabase's PKCE recovery code for a session (the standard `@supabase/ssr` pattern) before landing on a new `/reset-password` page. Two new pages/forms (`ForgotPasswordForm`, `ResetPasswordForm`) follow the existing `AuthForm`/`FormField` pattern exactly.

**Tech Stack:** Next.js 16 App Router, `@supabase/ssr`, `next-intl`, React 19 `useActionState`, Jest + RTL.

**Spec:** `specs/001-password-reset.md`

## Global Constraints

- No SMTP / email-template changes — rely on Supabase's default hosted email + default `{{ .ConfirmationURL }}` template, which already appends `?code=...` to our `redirectTo` on a PKCE flow.
- Never reveal whether a nickname exists — `requestPasswordReset` always returns the same neutral `{ success }` message.
- Reuse `lookup_email_by_nickname` via `createAdminClient()` — the same RLS-bypass reasoning already documented in `signIn`/`signUp`.
- Follow `conventions.md`: Server Components by default, `'use client'` only where hooks are used; `@/` alias for cross-folder imports; Tailwind semantic tokens only; strings through next-intl, both `messages/en.json` and `messages/ru.json` kept structurally identical; tests under `tests/<mirrored path>`.
- `npm run lint` must stay at zero warnings; `npm run build` must pass (this touches routing — required by `commands.md`).

---

### Task 1: Server actions — `requestPasswordReset` and `updatePassword`

**Files:**
- Modify: `lib/auth/actions.ts`
- Test: `tests/lib/auth/actions.test.ts` (new)

**Interfaces:**
- Produces: `AuthFormState` extended to `{ error: string; suggest?: 'register' | 'login' } | { success: string } | undefined`
- Produces: `requestPasswordReset(_prev: AuthFormState, formData: FormData): Promise<AuthFormState>`
- Produces: `updatePassword(_prev: AuthFormState, formData: FormData): Promise<AuthFormState>`
- Consumes: `createAdminClient` from `@/lib/supabase/admin`, `createClient` from `@/lib/supabase/server` (both already imported in this file), new import `headers` from `next/headers`

- [ ] **Step 1: Write the failing tests**

Create `tests/lib/auth/actions.test.ts`:

```ts
import { requestPasswordReset, updatePassword } from '@/lib/auth/actions';

const resetPasswordForEmail = jest.fn();
const updateUser = jest.fn();
const rpc = jest.fn();

jest.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { resetPasswordForEmail, updateUser },
  }),
}));

jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({ rpc }),
}));

jest.mock('next/headers', () => ({
  headers: async () => new Map([['origin', 'https://example.com']]),
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

  it('updates the password and returns a success message', async () => {
    updateUser.mockResolvedValue({ error: null });
    const result = await updatePassword(
      undefined,
      formData({ password: 'abcdef', confirmPassword: 'abcdef' }),
    );
    expect(updateUser).toHaveBeenCalledWith({ password: 'abcdef' });
    expect(result).toEqual({ success: 'auth.resetPassword.success' });
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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- tests/lib/auth/actions.test.ts`
Expected: FAIL — `requestPasswordReset` and `updatePassword` are not exported from `lib/auth/actions.ts`.

- [ ] **Step 3: Implement the actions**

In `lib/auth/actions.ts`, change the `AuthFormState` type and add the import, then append the two functions after `signUp` (before `signOut`):

```ts
import { headers } from 'next/headers';
```

```ts
export type AuthFormState =
  | { error: string; suggest?: 'register' | 'login' }
  | { success: string }
  | undefined;
```

```ts
export async function requestPasswordReset(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const t = await getTranslations('auth');
  const locale = await getLocale();
  const nickname = String(formData.get('nickname') ?? '').trim();

  if (!nickname) {
    return { error: t('errors.fieldsRequired') };
  }

  const admin = createAdminClient();
  const { data: email } = await admin.rpc('lookup_email_by_nickname', {
    p_nickname: nickname,
  });

  if (email) {
    const origin = (await headers()).get('origin');
    const next = encodeURIComponent(`/${locale}/reset-password`);
    const supabase = await createClient();
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/${locale}/auth/confirm?next=${next}`,
    });
  }

  // Same message whether or not the nickname matched — avoids account
  // enumeration via response timing/content.
  return { success: t('forgotPassword.success') };
}

export async function updatePassword(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const t = await getTranslations('auth');
  const password = String(formData.get('password') ?? '');
  const confirmPassword = String(formData.get('confirmPassword') ?? '');

  if (!password || !confirmPassword) {
    return { error: t('errors.fieldsRequired') };
  }

  if (password.length < 6) {
    return { error: t('errors.passwordTooShort') };
  }

  if (password !== confirmPassword) {
    return { error: t('errors.passwordMismatch') };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return { error: error.message };
  }

  return { success: t('resetPassword.success') };
}
```

Note: this relies on translation keys (`forgotPassword.success`, `resetPassword.success`,
`errors.passwordTooShort`, `errors.passwordMismatch`) added in Task 3. The test file mocks
`getTranslations` so it doesn't need the real keys to pass — but `npm run build` will only succeed
once Task 3 lands, since `next-intl` validates message usage isn't required at build time (no action
needed here beyond knowing the order).

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- tests/lib/auth/actions.test.ts`
Expected: PASS, 8 tests.

- [ ] **Step 5: Commit**

```bash
git add lib/auth/actions.ts tests/lib/auth/actions.test.ts
git commit -m "feat: add password reset server actions"
```

---

### Task 2: PKCE confirm route handler

**Files:**
- Create: `app/[locale]/auth/confirm/route.ts`
- Test: `tests/app/auth/confirm/route.test.ts` (new)

**Interfaces:**
- Consumes: `createClient` from `@/lib/supabase/server`
- Produces: `GET(request: NextRequest): Promise<NextResponse>` — redirects to the `next` query param on
  a successful code exchange, or to `/login` otherwise. Task 1's `requestPasswordReset` builds the URL
  this route receives (`/<locale>/auth/confirm?next=<encoded path>`).

- [ ] **Step 1: Write the failing test**

Create `tests/app/auth/confirm/route.test.ts`:

```ts
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
    const response = await GET(request);
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
    const response = await GET(request);
    expect(response.headers.get('location')).toBe('https://example.com/login');
  });

  it('redirects to /login when there is no code', async () => {
    const request = new NextRequest('https://example.com/en/auth/confirm');
    const response = await GET(request);
    expect(exchangeCodeForSession).not.toHaveBeenCalled();
    expect(response.headers.get('location')).toBe('https://example.com/login');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- tests/app/auth/confirm/route.test.ts`
Expected: FAIL — cannot find module `@/app/[locale]/auth/confirm/route`.

- [ ] **Step 3: Implement the route handler**

Create `app/[locale]/auth/confirm/route.ts`:

```ts
import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Supabase's hosted verify endpoint redirects here with ?code=... after the
// user clicks the emailed reset link. Exchanging the code is what actually
// establishes the recovery session — the PKCE code_verifier cookie was set
// when `resetPasswordForEmail` ran, inside the `requestPasswordReset` action.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login`);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- tests/app/auth/confirm/route.test.ts`
Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
git add "app/[locale]/auth/confirm/route.ts" tests/app/auth/confirm/route.test.ts
git commit -m "feat: add PKCE confirm route for password reset"
```

---

### Task 3: Translation keys

**Files:**
- Modify: `messages/en.json`
- Modify: `messages/ru.json`

**Interfaces:**
- Produces: all `auth.forgotPassword.*`, `auth.resetPassword.*`, `auth.login.forgotPasswordLink`,
  `auth.errors.passwordMismatch`, `auth.errors.passwordTooShort` keys consumed by Tasks 1, 4, 5, 6.

No test file — this task has no logic, only data; it's verified by the component tests in Tasks 4-6
(which render through `renderWithIntl` using the real `en.json`) and by `npm run build`.

- [ ] **Step 1: Edit `messages/en.json`**

Replace the `login` block (lines 19-26) with:

```json
    "login": {
      "title": "Welcome back",
      "subtitle": "Login to your account.",
      "submit": "Login",
      "pending": "Logging in…",
      "switchPrompt": "Don't have an account?",
      "switchLink": "Register",
      "forgotPasswordLink": "Forgot password?"
    },
```

Replace the `errors` block (lines 35-43) with:

```json
    "errors": {
      "fieldsRequired": "All fields are required",
      "noAccount": "No account with this nickname.",
      "wrongPassword": "Wrong password.",
      "nicknameTaken": "This nickname is already taken.",
      "nicknameFormat": "Nickname must be 3-30 letters, digits, \"-\" or \"_\"",
      "registerSuggest": "Register?",
      "loginSuggest": "Login?",
      "passwordMismatch": "Passwords don't match.",
      "passwordTooShort": "Password must be at least 6 characters."
    },
    "forgotPassword": {
      "title": "Reset your password",
      "subtitle": "Enter your nickname and we'll email you a reset link.",
      "submit": "Send reset link",
      "pending": "Sending…",
      "success": "If that account exists, a reset email was sent.",
      "backToLogin": "Back to login"
    },
    "resetPassword": {
      "title": "Set a new password",
      "subtitle": "Choose a new password for your account.",
      "newPassword": "New password",
      "confirmPassword": "Confirm password",
      "submit": "Update password",
      "pending": "Updating…",
      "success": "Password updated. You can now log in."
    }
```

(Note the `errors` object now ends with `},` instead of `}` since `forgotPassword`/`resetPassword`
follow it inside the same `auth` object — check the closing braces line up with the existing `auth: {`
block before saving.)

- [ ] **Step 2: Edit `messages/ru.json`** with the same key structure

Replace the `login` block (lines 19-26) with:

```json
    "login": {
      "title": "С возвращением",
      "subtitle": "Войдите в свой аккаунт.",
      "submit": "Login",
      "pending": "Вход…",
      "switchPrompt": "Нет аккаунта?",
      "switchLink": "Register",
      "forgotPasswordLink": "Забыли пароль?"
    },
```

Replace the `errors` block (lines 35-43) with:

```json
    "errors": {
      "fieldsRequired": "Все поля обязательны",
      "noAccount": "Аккаунта с таким никнеймом нет.",
      "wrongPassword": "Неверный пароль.",
      "nicknameTaken": "Этот никнейм уже занят.",
      "nicknameFormat": "Никнейм: 3-30 символов — латиница, цифры, «-» или «_»",
      "registerSuggest": "Зарегистрироваться?",
      "loginSuggest": "Войти?",
      "passwordMismatch": "Пароли не совпадают.",
      "passwordTooShort": "Пароль должен быть не короче 6 символов."
    },
    "forgotPassword": {
      "title": "Восстановление пароля",
      "subtitle": "Введите никнейм — мы отправим ссылку для сброса пароля на email.",
      "submit": "Отправить ссылку",
      "pending": "Отправка…",
      "success": "Если такой аккаунт существует, письмо отправлено.",
      "backToLogin": "Назад ко входу"
    },
    "resetPassword": {
      "title": "Новый пароль",
      "subtitle": "Выберите новый пароль для аккаунта.",
      "newPassword": "Новый пароль",
      "confirmPassword": "Подтвердите пароль",
      "submit": "Обновить пароль",
      "pending": "Обновление…",
      "success": "Пароль обновлён. Теперь можно войти."
    }
```

- [ ] **Step 3: Verify both files are still valid JSON and structurally identical**

Run: `node -e "const en=require('./messages/en.json'); const ru=require('./messages/ru.json'); const keys=o=>JSON.stringify(Object.keys(o).sort()); const walk=(a,b,path)=>{ if(keys(a)!==keys(b)) throw new Error('key mismatch at '+path); Object.keys(a).forEach(k=>{ if(typeof a[k]==='object') walk(a[k],b[k],path+'.'+k); }); }; walk(en,ru,'root'); console.log('OK');"`
Expected: `OK`

- [ ] **Step 4: Commit**

```bash
git add messages/en.json messages/ru.json
git commit -m "feat: add password reset translation keys"
```

---

### Task 4: `ForgotPasswordForm` + `/forgot-password` page

**Files:**
- Create: `app/components/ForgotPasswordForm/index.tsx`
- Create: `app/[locale]/forgot-password/page.tsx`
- Test: `tests/app/components/ForgotPasswordForm/index.test.tsx` (new)

**Interfaces:**
- Consumes: `requestPasswordReset`, `type AuthFormState` from `@/lib/auth/actions` (Task 1); `FormField`
  from `@/app/components/FormField`; `Button` from `@/app/components/ui/button`; `Link` from
  `@/i18n/navigation`; `getAuthedUser` from `@/lib/auth/getUser`
- Produces: default export `ForgotPasswordForm` (no props)

- [ ] **Step 1: Write the failing test**

Create `tests/app/components/ForgotPasswordForm/index.test.tsx`:

```tsx
import userEvent from '@testing-library/user-event';
import { renderWithIntl, screen } from '@/tests/test-utils';
import ForgotPasswordForm from '@/app/components/ForgotPasswordForm';
import { requestPasswordReset } from '@/lib/auth/actions';

jest.mock('@/i18n/navigation', () => ({
  Link: ({
    href,
    children,
    ...rest
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & {
    href: string;
    children: React.ReactNode;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

jest.mock('@/lib/auth/actions', () => ({
  requestPasswordReset: jest.fn(),
}));

const mockedRequestPasswordReset = requestPasswordReset as jest.Mock;

describe('<ForgotPasswordForm />', () => {
  beforeEach(() => {
    mockedRequestPasswordReset.mockReset();
  });

  it('renders a labelled nickname field and submit button', () => {
    renderWithIntl(<ForgotPasswordForm />);
    expect(screen.getByLabelText(/nickname/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /send reset link/i }),
    ).toBeInTheDocument();
  });

  it('submits the nickname and shows the neutral success message', async () => {
    mockedRequestPasswordReset.mockResolvedValue({
      success: 'If that account exists, a reset email was sent.',
    });
    const user = userEvent.setup();
    renderWithIntl(<ForgotPasswordForm />);
    await user.type(screen.getByLabelText(/nickname/i), 'alice');
    await user.click(screen.getByRole('button', { name: /send reset link/i }));

    expect(await screen.findByText(/reset email was sent/i)).toBeInTheDocument();
    const formData = mockedRequestPasswordReset.mock.calls[0][1] as FormData;
    expect(formData.get('nickname')).toBe('alice');
  });

  it('shows the error message when the action returns one', async () => {
    mockedRequestPasswordReset.mockResolvedValue({
      error: 'All fields are required',
    });
    const user = userEvent.setup();
    renderWithIntl(<ForgotPasswordForm />);
    await user.click(screen.getByRole('button', { name: /send reset link/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'All fields are required',
    );
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- tests/app/components/ForgotPasswordForm`
Expected: FAIL — cannot find module `@/app/components/ForgotPasswordForm`.

- [ ] **Step 3: Implement the component**

Create `app/components/ForgotPasswordForm/index.tsx`:

```tsx
'use client';

import { useActionState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Button } from '@/app/components/ui/button';
import FormField from '@/app/components/FormField';
import { requestPasswordReset, type AuthFormState } from '@/lib/auth/actions';

export default function ForgotPasswordForm() {
  const t = useTranslations('auth');
  const [state, formAction, pending] = useActionState<AuthFormState, FormData>(
    requestPasswordReset,
    undefined,
  );

  return (
    <div className="mx-auto w-full max-w-sm flex flex-col gap-6 px-4 py-12">
      <header className="flex flex-col gap-1 text-center">
        <h1 className="text-2xl font-semibold text-foreground">
          {t('forgotPassword.title')}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t('forgotPassword.subtitle')}
        </p>
      </header>

      {state && 'success' in state ? (
        <p className="text-sm text-foreground text-center" role="status">
          {state.success}
        </p>
      ) : (
        <form action={formAction} className="flex flex-col gap-4">
          <FormField
            label={t('nickname')}
            id="nickname"
            name="nickname"
            type="text"
            autoComplete="username"
            required
          />

          {state && 'error' in state && (
            <p className="text-sm text-destructive" role="alert">
              {state.error}
            </p>
          )}

          <Button type="submit" disabled={pending}>
            {pending ? t('forgotPassword.pending') : t('forgotPassword.submit')}
          </Button>
        </form>
      )}

      <p className="text-sm text-muted-foreground text-center">
        <Link
          href="/login"
          className="text-foreground underline hover:no-underline"
        >
          {t('forgotPassword.backToLogin')}
        </Link>
      </p>
    </div>
  );
}
```

Create `app/[locale]/forgot-password/page.tsx`:

```tsx
import { redirect } from '@/i18n/navigation';
import { getLocale } from 'next-intl/server';
import ForgotPasswordForm from '@/app/components/ForgotPasswordForm';
import { getAuthedUser } from '@/lib/auth/getUser';

export default async function ForgotPasswordPage() {
  const user = await getAuthedUser();
  if (user) {
    const locale = await getLocale();
    redirect({ href: '/', locale });
  }
  return <ForgotPasswordForm />;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- tests/app/components/ForgotPasswordForm`
Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
git add app/components/ForgotPasswordForm app/\[locale\]/forgot-password tests/app/components/ForgotPasswordForm
git commit -m "feat: add forgot-password form and page"
```

---

### Task 5: `ResetPasswordForm` + `/reset-password` page

**Files:**
- Create: `app/components/ResetPasswordForm/index.tsx`
- Create: `app/[locale]/reset-password/page.tsx`
- Test: `tests/app/components/ResetPasswordForm/index.test.tsx` (new)

**Interfaces:**
- Consumes: `updatePassword`, `type AuthFormState` from `@/lib/auth/actions` (Task 1)
- Produces: default export `ResetPasswordForm` (no props)

- [ ] **Step 1: Write the failing test**

Create `tests/app/components/ResetPasswordForm/index.test.tsx`:

```tsx
import userEvent from '@testing-library/user-event';
import { renderWithIntl, screen } from '@/tests/test-utils';
import ResetPasswordForm from '@/app/components/ResetPasswordForm';
import { updatePassword } from '@/lib/auth/actions';

jest.mock('@/i18n/navigation', () => ({
  Link: ({
    href,
    children,
    ...rest
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & {
    href: string;
    children: React.ReactNode;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

jest.mock('@/lib/auth/actions', () => ({
  updatePassword: jest.fn(),
}));

const mockedUpdatePassword = updatePassword as jest.Mock;

describe('<ResetPasswordForm />', () => {
  beforeEach(() => {
    mockedUpdatePassword.mockReset();
  });

  it('renders new password and confirm password fields', () => {
    renderWithIntl(<ResetPasswordForm />);
    expect(screen.getByLabelText(/new password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
  });

  it('submits both fields and shows the success message with a login link', async () => {
    mockedUpdatePassword.mockResolvedValue({
      success: 'Password updated. You can now log in.',
    });
    const user = userEvent.setup();
    renderWithIntl(<ResetPasswordForm />);
    await user.type(screen.getByLabelText(/new password/i), 'abcdef');
    await user.type(screen.getByLabelText(/confirm password/i), 'abcdef');
    await user.click(screen.getByRole('button', { name: /update password/i }));

    expect(await screen.findByText(/password updated/i)).toBeInTheDocument();
    expect(screen.getByRole('link')).toHaveAttribute('href', '/login');
    const formData = mockedUpdatePassword.mock.calls[0][1] as FormData;
    expect(formData.get('password')).toBe('abcdef');
    expect(formData.get('confirmPassword')).toBe('abcdef');
  });

  it('shows the error message when the action returns one', async () => {
    mockedUpdatePassword.mockResolvedValue({
      error: "Passwords don't match.",
    });
    const user = userEvent.setup();
    renderWithIntl(<ResetPasswordForm />);
    await user.type(screen.getByLabelText(/new password/i), 'abcdef');
    await user.type(screen.getByLabelText(/confirm password/i), 'xyzxyz');
    await user.click(screen.getByRole('button', { name: /update password/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      "Passwords don't match.",
    );
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- tests/app/components/ResetPasswordForm`
Expected: FAIL — cannot find module `@/app/components/ResetPasswordForm`.

- [ ] **Step 3: Implement the component**

Create `app/components/ResetPasswordForm/index.tsx`:

```tsx
'use client';

import { useActionState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Button } from '@/app/components/ui/button';
import FormField from '@/app/components/FormField';
import { updatePassword, type AuthFormState } from '@/lib/auth/actions';

export default function ResetPasswordForm() {
  const t = useTranslations('auth');
  const [state, formAction, pending] = useActionState<AuthFormState, FormData>(
    updatePassword,
    undefined,
  );

  return (
    <div className="mx-auto w-full max-w-sm flex flex-col gap-6 px-4 py-12">
      <header className="flex flex-col gap-1 text-center">
        <h1 className="text-2xl font-semibold text-foreground">
          {t('resetPassword.title')}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t('resetPassword.subtitle')}
        </p>
      </header>

      {state && 'success' in state ? (
        <div className="flex flex-col gap-4 text-center">
          <p className="text-sm text-foreground" role="status">
            {state.success}
          </p>
          <Link
            href="/login"
            className="text-foreground underline hover:no-underline"
          >
            {t('forgotPassword.backToLogin')}
          </Link>
        </div>
      ) : (
        <form action={formAction} className="flex flex-col gap-4">
          <FormField
            label={t('resetPassword.newPassword')}
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={6}
            required
          />

          <FormField
            label={t('resetPassword.confirmPassword')}
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            minLength={6}
            required
          />

          {state && 'error' in state && (
            <p className="text-sm text-destructive" role="alert">
              {state.error}
            </p>
          )}

          <Button type="submit" disabled={pending}>
            {pending ? t('resetPassword.pending') : t('resetPassword.submit')}
          </Button>
        </form>
      )}
    </div>
  );
}
```

Create `app/[locale]/reset-password/page.tsx`:

```tsx
import ResetPasswordForm from '@/app/components/ResetPasswordForm';

// No getAuthedUser()-redirect-if-authed check here (unlike login/register/
// forgot-password): landing here means /auth/confirm just exchanged a
// recovery code into a real session, so the user IS authed at this point —
// redirecting away would make the reset link a dead end.
export default function ResetPasswordPage() {
  return <ResetPasswordForm />;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- tests/app/components/ResetPasswordForm`
Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
git add app/components/ResetPasswordForm app/\[locale\]/reset-password tests/app/components/ResetPasswordForm
git commit -m "feat: add reset-password form and page"
```

---

### Task 6: "Forgot password?" link on the login form

**Files:**
- Modify: `app/components/AuthForm/index.tsx`
- Test: `tests/app/components/AuthForm/index.test.tsx` (new — AuthForm currently has no test file)

**Interfaces:**
- Consumes: `auth.login.forgotPasswordLink` (Task 3), existing `Link` import already in this file

- [ ] **Step 1: Write the failing test**

Create `tests/app/components/AuthForm/index.test.tsx`:

```tsx
import { renderWithIntl, screen } from '@/tests/test-utils';
import AuthForm from '@/app/components/AuthForm';

jest.mock('@/i18n/navigation', () => ({
  Link: ({
    href,
    children,
    ...rest
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & {
    href: string;
    children: React.ReactNode;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

jest.mock('@/lib/auth/actions', () => ({
  signIn: jest.fn(),
  signUp: jest.fn(),
}));

describe('<AuthForm />', () => {
  it('shows a "Forgot password?" link in login mode', () => {
    renderWithIntl(<AuthForm mode="login" />);
    expect(
      screen.getByRole('link', { name: /forgot password/i }),
    ).toHaveAttribute('href', '/forgot-password');
  });

  it('does not show a "Forgot password?" link in register mode', () => {
    renderWithIntl(<AuthForm mode="register" />);
    expect(
      screen.queryByRole('link', { name: /forgot password/i }),
    ).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- tests/app/components/AuthForm`
Expected: FAIL — no element with role `link` named `/forgot password/i`.

- [ ] **Step 3: Add the link**

In `app/components/AuthForm/index.tsx`, insert this block right after the password `FormField` (after
the closing `/>` at what is currently line 62) and before the `{state?.error && (` block:

```tsx
        {mode === 'login' && (
          <Link
            href="/forgot-password"
            className="self-end text-sm text-muted-foreground hover:text-foreground"
          >
            {t('login.forgotPasswordLink')}
          </Link>
        )}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- tests/app/components/AuthForm`
Expected: PASS, 2 tests.

- [ ] **Step 5: Commit**

```bash
git add app/components/AuthForm/index.tsx tests/app/components/AuthForm
git commit -m "feat: add forgot-password link to login form"
```

---

## Final Verification

- [ ] Run the full suite: `npm test` — all tests pass, including the pre-existing ones
- [ ] Run `npm run lint` — zero warnings
- [ ] Run `npm run build` — succeeds, and the route tree includes `/[locale]/forgot-password`,
      `/[locale]/reset-password`, and `/[locale]/auth/confirm`
- [ ] Manually smoke-test against the real Supabase project: request a reset for a real nickname, confirm
      the email arrives (default Supabase sender), click through, set a new password, log in with it
- [ ] Add `http://localhost:3000/en/auth/confirm` and the deployed origin's equivalent to Supabase
      Dashboard → Auth → URL Configuration → Redirect URLs (manual step, not code)
