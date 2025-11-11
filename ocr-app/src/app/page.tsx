import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { redirect } from 'next/navigation';

export default async function Home() {
  const session = await getServerSession(authOptions);

  if (session?.user?.id) {
    redirect('/dashboard');
  } else {
    redirect('/login');
  }
}
