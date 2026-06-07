import { redirect } from '@/i18n/navigation';
import AuthForm from '@/app/components/AuthForm';
import { getAuthedUser } from '@/lib/auth/getUser';

export default async function LoginPage() {
  const user = await getAuthedUser();
  if (user) redirect('/');
  return <AuthForm mode="login" />;
}
