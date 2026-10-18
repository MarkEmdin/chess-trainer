import ResetPasswordForm from '@/app/components/ResetPasswordForm';

// No getAuthedUser()-redirect-if-authed check here (unlike login/register/
// forgot-password): landing here means /auth/confirm just exchanged a
// recovery code into a real session, so the user IS authed at this point —
// redirecting away would make the reset link a dead end.
export default function ResetPasswordPage() {
  return <ResetPasswordForm />;
}
