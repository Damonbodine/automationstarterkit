import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { redirect } from 'next/navigation';
import { getSupabaseServerClient } from '@/lib/db/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge, CategoryBadge, PriorityBadge, SentimentBadge } from '@/components/ui/Badge';
import { formatDate } from '@/lib/utils';
import Link from 'next/link';
import { Mail, RefreshCw } from 'lucide-react';
import type { EmailWithClassification, DashboardStats } from '@/types/ui';
import QuickStats from '@/components/dashboard/QuickStats';
import PriorityQueueCard from '@/components/dashboard/PriorityQueueCard';
import QueueStatusWidget from '@/components/dashboard/QueueStatusWidget';
import QuickActionsRow from '@/components/dashboard/QuickActionsRow';
import DashboardSyncToast from '@/components/dashboard/DashboardSyncToast';

async function getDashboardData(userId: string) {
  const supabase = getSupabaseServerClient();

  // Get stats
  const [
    { count: unreadCount },
    { count: urgentCount },
    { count: tasksCount },
    { count: documentsCount },
  ] = await Promise.all([
    supabase
      .from('email_messages')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false),
    supabase
      .from('email_classifications')
      .select('email_messages!inner(*)', { count: 'exact', head: true })
      .eq('email_messages.user_id', userId)
      .in('priority', ['urgent', 'high']),
    supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'pending'),
    supabase
      .from('documents')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId),
  ]);

  // Get recent emails
  const { data: emails } = await supabase
    .from('email_messages')
    .select(
      `
      *,
      email_classifications (
        category,
        priority,
        sentiment,
        tags,
        confidence_score
      )
    `
    )
    .eq('user_id', userId)
    .order('received_at', { ascending: false })
    .limit(10);

  // Get top urgent/high priority emails (priority queue)
  const { data: priorityEmails } = await supabase
    .from('email_messages')
    .select(
      `
      *,
      email_classifications (
        category,
        priority,
        sentiment,
        tags,
        confidence_score
      )
    `
    )
    .eq('user_id', userId)
    .order('received_at', { ascending: false })
    .limit(50);

  const urgentHigh = (priorityEmails || []).filter((e: any) => {
    const c = Array.isArray(e.email_classifications)
      ? e.email_classifications[0]
      : e.email_classifications;
    return c && (c.priority === 'urgent' || c.priority === 'high');
  }).slice(0, 10);

  // Get recent agent logs
  const { data: agentLogs } = await supabase
    .from('agent_logs')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(5);

  // Get sync state
  const { data: syncState } = await supabase
    .from('email_sync_state')
    .select('*')
    .eq('user_id', userId)
    .single();

  return {
    stats: {
      unreadCount: unreadCount || 0,
      urgentCount: urgentCount || 0,
      tasksCount: tasksCount || 0,
      documentsCount: documentsCount || 0,
    },
    // Relax type to tolerate slight shape differences from Supabase joins
    emails: (emails || []) as any[],
    agentLogs: agentLogs || [],
    syncState: syncState || null,
    priorityEmails: urgentHigh as any[],
  };
}

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ sync?: string }> }) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect('/login');
  }

  const { stats, emails, agentLogs, syncState, priorityEmails } = await getDashboardData(session.user.id);
  const sp = await searchParams;
  const syncQueued = sp?.sync === 'queued';

  return (
    <div className="min-h-screen bg-gray-50 py-8 dark:bg-gray-900">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <DashboardSyncToast queued={!!syncQueued} />
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
            Welcome back! Here's an overview of your emails and tasks.
          </p>
        </div>

        {(syncQueued || syncState?.sync_status === 'error') && (
          <div className="mb-6 rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 dark:border-blue-900/50 dark:bg-blue-950 dark:text-blue-300">
            {syncState?.sync_status === 'error' && syncState?.error_message
              ? `Email sync error: ${syncState.error_message}`
              : 'Email sync job queued. This may take a moment.'}
          </div>
        )}

        {/* Quick Actions + Queue Status */}
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <QuickActionsRow />
          <QueueStatusWidget />
        </div>

        {/* Quick Stats */}
        <QuickStats
          unreadCount={stats.unreadCount}
          urgentCount={stats.urgentCount}
          tasksCount={stats.tasksCount}
          documentsCount={stats.documentsCount}
        />

        {/* Priority Queue */}
        <PriorityQueueCard emails={priorityEmails} />

        {/* Recent Emails */}
        <Card className="mb-8 dark:border-gray-800 dark:bg-gray-950">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recent Emails</CardTitle>
                <CardDescription>Your latest email messages with AI classification</CardDescription>
              </div>
              <Link
                href="/emails"
                className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
              >
                View all →
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {emails.length === 0 ? (
              <div className="text-center py-8">
                <Mail className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">No emails yet</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Sync your Gmail account to get started
                </p>
                <div className="mt-6">
                  <form action="/api/emails/sync" method="POST">
                    <button
                      type="submit"
                      className="inline-flex items-center gap-2 px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                    >
                      <RefreshCw className="h-4 w-4" />
                      Sync Emails
                    </button>
                  </form>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {emails.map((email) => {
                  const classification = email.email_classifications?.[0];

                  return (
                    <Link
                      key={email.id}
                      href={`/emails/${email.id}`}
                      className="block p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors dark:border-gray-800 dark:bg-gray-950 dark:hover:bg-gray-900"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {!email.is_read && (
                              <div className="h-2 w-2 bg-blue-600 rounded-full" />
                            )}
                            <h3 className="text-sm font-semibold text-gray-900 truncate dark:text-gray-100">
                              {email.subject}
                            </h3>
                          </div>
                          <p className="text-sm text-gray-600 mb-2 dark:text-gray-300">
                            From: {email.from_name || email.from_email}
                          </p>
                          {email.snippet && (
                            <p className="text-sm text-gray-500 line-clamp-2 dark:text-gray-400">
                              {email.snippet}
                            </p>
                          )}
                          {classification && (
                            <div className="flex flex-wrap gap-2 mt-2">
                              <CategoryBadge category={classification.category} />
                              <PriorityBadge priority={classification.priority} />
                              <SentimentBadge sentiment={classification.sentiment} />
                            </div>
                          )}
                        </div>
                        <div className="flex-shrink-0 text-sm text-gray-500">
                          {formatDate(email.received_at)}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Agent Activity */}
        {agentLogs.length > 0 && (
          <Card className="dark:border-gray-800 dark:bg-gray-950">
            <CardHeader>
              <CardTitle>Recent Agent Activity</CardTitle>
              <CardDescription>AI agents working on your emails</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {agentLogs.map((log) => (
                  <div key={log.id} className="flex items-center gap-3 text-sm">
                    <div className={`h-2 w-2 rounded-full ${log.success ? 'bg-green-500' : 'bg-red-500'}`} />
                    <span className="font-medium text-gray-900 dark:text-gray-100">{log.agent_type}</span>
                    <span className="text-gray-500 dark:text-gray-400">•</span>
                    <span className="text-gray-600 dark:text-gray-300">{log.action}</span>
                    <span className="text-gray-500 dark:text-gray-400 ml-auto">
                      {formatDate(log.created_at || '')}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
