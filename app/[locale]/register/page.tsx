import { redirect } from 'next/navigation';
import AuthForm from '@/app/components/AuthForm';
import { getAuthedUser } from '@/lib/auth/getUser';

export default async function RegisterPage() {
  const user = await getAuthedUser();
  if (user) redirect('/');
  return <AuthForm mode="register" />;
}
