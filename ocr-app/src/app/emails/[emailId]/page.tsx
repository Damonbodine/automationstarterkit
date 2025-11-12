import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { redirect } from 'next/navigation';
import { getSupabaseServerClient } from '@/lib/db/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { CategoryBadge, PriorityBadge, SentimentBadge, Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { formatDate } from '@/lib/utils';
import Link from 'next/link';
import {
  ArrowLeft,
  FileText,
  Download,
  Paperclip,
  AlertCircle,
} from 'lucide-react';
import type { EmailWithClassification, Task } from '@/types/ui';
import RunAgentActions from '@/components/email/RunAgentActions';
import AutoSummarizer from '@/components/email/AutoSummarizer';
import EmailThread from '@/components/email/EmailThread';

async function getEmailDetails(emailId: string, userId: string) {
  const supabase = getSupabaseServerClient();

  // Get the current email to find its thread_id
  const { data: currentEmail, error: currentEmailError } = await supabase
    .from('email_messages')
    .select('thread_id')
    .eq('id', emailId)
    .eq('user_id', userId)
    .single();

  if (currentEmailError || !currentEmail || !currentEmail.thread_id) {
    return null;
  }

  // Get all emails in the thread with classifications
  const { data: threadEmails, error: threadError } = await supabase
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
    .eq('thread_id', currentEmail.thread_id)
    .eq('user_id', userId)
    .order('received_at', { ascending: true });

  if (threadError || !threadEmails || threadEmails.length === 0) {
    return null;
  }

  // Find the current email in the thread
  const email = threadEmails.find(e => e.id === emailId) || threadEmails[threadEmails.length - 1];

  // Get tasks associated with any email in this thread
  const { data: tasks } = await supabase
    .from('tasks')
    .select('*')
    .in('email_id', threadEmails.map(e => e.id))
    .eq('user_id', userId)
    .order('priority', { ascending: false });

  // Get attachments/documents for all emails in thread
  const { data: documents } = await supabase
    .from('documents')
    .select('*')
    .in('email_id', threadEmails.map(e => e.id))
    .eq('user_id', userId);

  // Get summary - prefer the one from email record, fallback to agent_logs
  let summary = email?.ai_summary || null;
  if (!summary) {
    const { data: summaryLog } = await supabase
      .from('agent_logs')
      .select('output_data, created_at')
      .eq('email_id', emailId)
      .eq('user_id', userId)
      .eq('agent_type', 'document-summarizer')
      .eq('success', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    summary = summaryLog?.output_data || null;
  }

  return {
    email: email as any,
    threadEmails: threadEmails as any[],
    tasks: (tasks || []) as Task[],
    documents: documents || [],
    summary: summary as any,
  };
}

interface PageProps {
  params: Promise<{ emailId: string }>;
}

export default async function EmailDetailPage({ params }: PageProps) {
  const session = await getServerSession(authOptions);
  const { emailId } = await params;

  if (!session?.user?.id) {
    redirect('/login');
  }

  const data = await getEmailDetails(emailId, session.user.id);

  if (!data) {
    redirect('/emails');
  }

  const { email, threadEmails, tasks, documents, summary } = data as any;
  const classification = Array.isArray(email.email_classifications)
    ? email.email_classifications[0]
    : email.email_classifications;

  // Calculate word count for auto-summarization
  const emailBody = email.body_plain || email.body_html || '';
  const wordCount = emailBody.split(/\s+/).length;

  return (
    <div className="min-h-screen bg-gray-50 py-8 dark:bg-gray-900">
      {/* Auto-summarizer modal */}
      <AutoSummarizer
        emailId={email.id}
        hasSummary={!!summary}
        wordCount={wordCount}
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Back Button */}
        <Link
          href="/emails"
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to emails
        </Link>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Email Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Email Subject Header */}
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                {email.subject || '(No subject)'}
              </h1>
              {threadEmails.length > 1 && (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Conversation with {threadEmails.length} messages
                </p>
              )}
            </div>

            {/* AI Summary */}
            {summary && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
                    <FileText className="h-5 w-5" />
                    AI Summary
                  </CardTitle>
                  <CardDescription>
                    AI-generated summary • {summary.word_count} words • {summary.document_type}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{summary.summary}</p>
                  </div>
                  {summary.key_points && summary.key_points.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold mb-2 text-gray-900 dark:text-gray-100">Key Points:</h4>
                      <ul className="list-disc list-inside space-y-1">
                        {summary.key_points.map((point: string, idx: number) => (
                          <li key={idx} className="text-sm text-gray-700 dark:text-gray-300">
                            {point}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Email Thread */}
            <EmailThread emails={threadEmails} currentEmailId={emailId} />

            {/* Attachments */}
            {documents.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Paperclip className="h-5 w-5" />
                    Attachments ({documents.length})
                  </CardTitle>
                  <CardDescription>
                    {threadEmails.length > 1 ? 'All attachments from this conversation' : 'Attachments from this email'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {documents.map((doc: any) => {
                      // Find which email this document belongs to
                      const docEmail = threadEmails.find((e: any) => e.id === doc.email_id);
                      return (
                        <div
                          key={doc.id}
                          className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg"
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <FileText className="h-5 w-5 text-gray-400 shrink-0" />
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-sm truncate">{doc.filename}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {doc.file_type} •{' '}
                                {doc.file_size_bytes
                                  ? `${(doc.file_size_bytes / 1024).toFixed(0)} KB`
                                  : 'Unknown size'}
                                {threadEmails.length > 1 && docEmail && (
                                  <> • from {docEmail.from_name || docEmail.from_email}</>
                                )}
                              </p>
                            </div>
                          </div>
                          {doc.gcs_url && (
                            <a
                              href={doc.gcs_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 shrink-0"
                            >
                              <Download className="h-4 w-4" />
                            </a>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Extracted Tasks */}
            {tasks.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Extracted Tasks ({tasks.length})</CardTitle>
                  <CardDescription>
                    {threadEmails.length > 1 ? 'AI-identified action items from this conversation' : 'AI-identified action items from this email'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {tasks.map((task: any) => {
                      // Find which email this task belongs to
                      const taskEmail = threadEmails.find((e: any) => e.id === task.email_id);
                      return (
                        <div
                          key={task.id}
                          className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <h4 className="font-medium text-sm mb-1">{task.title}</h4>
                              {task.description && (
                                <p className="text-sm text-gray-600 dark:text-gray-300">{task.description}</p>
                              )}
                              {threadEmails.length > 1 && taskEmail && (
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                  From {taskEmail.from_name || taskEmail.from_email}
                                </p>
                              )}
                            </div>
                            <PriorityBadge priority={task.priority} />
                          </div>
                          {task.due_date && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                              Due: {new Date(task.due_date).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Classification */}
            <Card>
              <CardHeader>
                <CardTitle>Classification</CardTitle>
                <CardDescription>AI-powered email categorization</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {classification ? (
                  <>
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-2">Category</p>
                      <CategoryBadge category={classification.category} />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-2">Priority</p>
                      <PriorityBadge priority={classification.priority} />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-2">Sentiment</p>
                      <SentimentBadge sentiment={classification.sentiment} />
                    </div>
                    {classification.tags && classification.tags.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-gray-500 mb-2">Tags</p>
                        <div className="flex flex-wrap gap-2">
                          {classification.tags.map((tag: string) => (
                            <Badge key={tag} variant="default">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-2">Confidence</p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{
                              width: `${(classification.confidence_score || 0) * 100}%`,
                            }}
                          />
                        </div>
                        <span className="text-xs text-gray-600">
                          {((classification.confidence_score || 0) * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-4">
                    <AlertCircle className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                    <p className="text-sm text-gray-500">Not yet classified</p>
                    <Button size="sm" variant="outline" className="mt-3">
                      Classify Now
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* AI Actions */}
            <Card>
              <CardHeader>
                <CardTitle>AI Actions</CardTitle>
                <CardDescription>Generate documents and insights</CardDescription>
              </CardHeader>
              <CardContent>
                <RunAgentActions emailId={email.id} />
              </CardContent>
            </Card>

            {/* Quick Info */}
            <Card>
              <CardHeader>
                <CardTitle>{threadEmails.length > 1 ? 'Conversation Info' : 'Email Info'}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {threadEmails.length > 1 && (
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Messages</span>
                    <span className="font-medium">{threadEmails.length}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Thread ID</span>
                  <span className="font-mono text-xs">{email.thread_id.substring(0, 12)}...</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Status</span>
                  <span>{email.is_read ? 'Read' : 'Unread'}</span>
                </div>
                {documents.length > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Attachments</span>
                    <span>{documents.length}</span>
                  </div>
                )}
                {tasks.length > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Tasks</span>
                    <span>{tasks.length}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
