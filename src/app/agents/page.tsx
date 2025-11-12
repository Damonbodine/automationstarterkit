import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import AgentsClient from '@/components/agents/AgentsClient';

export default async function AgentsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect('/login');

  return (
    <div className="min-h-screen bg-gray-50 py-8 dark:bg-gray-900">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Agents</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">Enable or disable agents for your account. UI-first; preferences are saved locally for now.</p>
        </div>
        <Card className="dark:border-gray-800 dark:bg-gray-950">
          <CardHeader>
            <CardTitle>Agent Registry</CardTitle>
            <CardDescription>Manage which agents are available for manual runs</CardDescription>
          </CardHeader>
          <CardContent>
            <AgentsClient />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

