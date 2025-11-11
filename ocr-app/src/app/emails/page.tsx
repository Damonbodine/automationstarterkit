import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { redirect } from 'next/navigation';
import { getSupabaseServerClient } from '@/lib/db/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { CategoryBadge, PriorityBadge, SentimentBadge } from '@/components/ui/Badge';
import { formatDate } from '@/lib/utils';
import Link from 'next/link';
import { Mail, Filter, Search, RefreshCw } from 'lucide-react';
import type { EmailWithClassification } from '@/types/ui';
import SearchBar from '@/components/email/SearchBar';
import BulkActionsBar from '@/components/email/BulkActionsBar';
import EmailListItem from '@/components/email/EmailListItem';
import EmailsClient from '@/components/email/EmailsClient';

async function getEmails(userId: string, filters: {
  category?: string;
  priority?: string;
  unread?: boolean;
  sentiment?: string;
}) {
  const supabase = getSupabaseServerClient();

  let query = supabase
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
    `,
      { count: 'exact' }
    )
    .eq('user_id', userId)
    .order('received_at', { ascending: false })
    .limit(50);

  if (filters.unread) {
    query = query.eq('is_read', false);
  }

  const { data: emails, error } = await query;

  if (error) {
    console.error('Error fetching emails:', error);
    return [];
  }

  // Filter by classification on client side (Supabase doesn't support nested filters well)
  let filteredEmails = emails || [];

  const getFirst = (cls: any) => (Array.isArray(cls) ? cls[0] : cls);

  if (filters.category) {
    filteredEmails = filteredEmails.filter((email) => getFirst(email.email_classifications)?.category === filters.category);
  }

  if (filters.priority) {
    filteredEmails = filteredEmails.filter((email) => getFirst(email.email_classifications)?.priority === filters.priority);
  }

  if (filters.sentiment) {
    filteredEmails = filteredEmails.filter((email) => getFirst(email.email_classifications)?.sentiment === filters.sentiment);
  }

  return filteredEmails as any[];
}

interface PageProps {
  searchParams: Promise<{
    category?: string;
    priority?: string;
    unread?: string;
    sentiment?: string;
  }>;
}

export default async function EmailsPage({ searchParams }: PageProps) {
  const session = await getServerSession(authOptions);
  const params = await searchParams;

  if (!session?.user?.id) {
    redirect('/login');
  }

  const filters = {
    category: params.category,
    priority: params.priority,
    unread: params.unread === 'true',
    sentiment: params.sentiment,
  };

  const emails = await getEmails(session.user.id, filters);

  return (
    <div className="min-h-screen bg-gray-50 py-8 dark:bg-gray-900">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Emails</h1>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
              {emails.length} email{emails.length !== 1 ? 's' : ''} found
            </p>
          </div>
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

        <div className="grid gap-6 lg:grid-cols-4">
          {/* Filters Sidebar */}
          <Card className="lg:col-span-1 h-fit dark:border-gray-800 dark:bg-gray-950">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Filter className="h-4 w-4" />
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Read Status */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Status</h3>
                <div className="space-y-2">
                  <Link
                    href="/emails"
                    className={`block text-sm px-2 py-1 rounded ${
                      !filters.unread ? 'bg-blue-50 text-blue-600 dark:bg-gray-800 dark:text-blue-400' : 'text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800'
                    }`}
                  >
                    All
                  </Link>
                  <Link
                    href="/emails?unread=true"
                    className={`block text-sm px-2 py-1 rounded ${
                      filters.unread ? 'bg-blue-50 text-blue-600 dark:bg-gray-800 dark:text-blue-400' : 'text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800'
                    }`}
                  >
                    Unread only
                  </Link>
                </div>
              </div>

              {/* Category Filter */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Category</h3>
                <div className="space-y-2">
                  {['client_request', 'invoice', 'contract', 'meeting', 'notification', 'marketing', 'internal'].map(
                    (cat) => (
                      <Link
                        key={cat}
                        href={`/emails?category=${cat}`}
                        className={`block text-sm px-2 py-1 rounded capitalize ${
                          filters.category === cat
                            ? 'bg-blue-50 text-blue-600 dark:bg-gray-800 dark:text-blue-400'
                            : 'text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800'
                        }`}
                      >
                        {cat.replace('_', ' ')}
                      </Link>
                    )
                  )}
                </div>
              </div>

              {/* Priority Filter */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Priority</h3>
                <div className="space-y-2">
                  {['urgent', 'high', 'medium', 'low'].map((pri) => (
                    <Link
                      key={pri}
                      href={`/emails?priority=${pri}`}
                      className={`block text-sm px-2 py-1 rounded capitalize ${
                        filters.priority === pri
                          ? 'bg-blue-50 text-blue-600 dark:bg-gray-800 dark:text-blue-400'
                          : 'text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800'
                      }`}
                    >
                      {pri}
                    </Link>
                  ))}
                </div>
              </div>

              {filters.category || filters.priority || filters.unread ? (
                <Link
                  href="/emails"
                  className="block text-center text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 pt-2"
                >
                  Clear filters
                </Link>
              ) : null}
            </CardContent>
          </Card>

          {/* Email List */}
          <div className="lg:col-span-3">
            {/* Client-side selection + search */}
            {/* This wrapper is client-only to avoid TS noise from DB typing */}
            <EmailsClient initialEmails={emails} />
          </div>
        </div>
      </div>
    </div>
  );
}

// Client wrapper moved to a separate component to keep this page server-rendered
