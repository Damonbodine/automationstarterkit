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
  Calendar,
  User,
  Mail,
  AlertCircle,
} from 'lucide-react';
import type { EmailWithClassification, Task } from '@/types/ui';
import RunAgentActions from '@/components/email/RunAgentActions';
import AutoSummarizer from '@/components/email/AutoSummarizer';

async function getEmailDetails(emailId: string, userId: string) {
  const supabase = getSupabaseServerClient();

  // Get email with classification and summary
  const { data: email, error: emailError } = await supabase
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
    .eq('id', emailId)
    .eq('user_id', userId)
    .single();

  if (emailError || !email) {
    return null;
  }

  // Get tasks associated with this email
  const { data: tasks } = await supabase
    .from('tasks')
    .select('*')
    .eq('email_id', emailId)
    .eq('user_id', userId)
    .order('priority', { ascending: false });

  // Get attachments/documents
  const { data: documents } = await supabase
    .from('documents')
    .select('*')
    .eq('email_id', emailId)
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

  const { email, tasks, documents, summary } = data as any;
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
            {/* Email Header */}
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <CardTitle className="text-2xl mb-2">
                      {email.subject || '(No subject)'}
                    </CardTitle>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-400" />
                        <span className="font-medium">From:</span>
                        <span>{email.from_name || email.from_email}</span>
                      </div>
                      {email.to_emails && email.to_emails.length > 0 && (
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-gray-400" />
                          <span className="font-medium">To:</span>
                          <span>{email.to_emails.join(', ')}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span className="font-medium">Date:</span>
                        <span>{new Date(email.received_at).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                  {!email.is_read && (
                    <Badge variant="primary">Unread</Badge>
                  )}
                </div>
              </CardHeader>
            </Card>

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

            {/* Email Body */}
            <Card>
              <CardHeader>
                <CardTitle>Message</CardTitle>
              </CardHeader>
              <CardContent>
                {email.body_html ? (
                  <div
                    className="prose max-w-none"
                    dangerouslySetInnerHTML={{ __html: email.body_html }}
                  />
                ) : email.body_plain ? (
                  <pre className="whitespace-pre-wrap font-sans text-sm text-gray-700">
                    {email.body_plain}
                  </pre>
                ) : (
                  <p className="text-gray-500 italic">No message content</p>
                )}
              </CardContent>
            </Card>

            {/* Attachments */}
            {documents.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Paperclip className="h-5 w-5" />
                    Attachments ({documents.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {documents.map((doc: any) => (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <FileText className="h-5 w-5 text-gray-400" />
                          <div>
                            <p className="font-medium text-sm">{doc.filename}</p>
                            <p className="text-xs text-gray-500">
                              {doc.file_type} •{' '}
                              {doc.file_size_bytes
                                ? `${(doc.file_size_bytes / 1024).toFixed(0)} KB`
                                : 'Unknown size'}
                            </p>
                          </div>
                        </div>
                        {doc.gcs_url && (
                          <a
                            href={doc.gcs_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-700"
                          >
                            <Download className="h-4 w-4" />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Extracted Tasks */}
            {tasks.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Extracted Tasks ({tasks.length})</CardTitle>
                  <CardDescription>AI-identified action items from this email</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {tasks.map((task: any) => (
                      <div
                        key={task.id}
                        className="p-3 border border-gray-200 rounded-lg"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <h4 className="font-medium text-sm mb-1">{task.title}</h4>
                            {task.description && (
                              <p className="text-sm text-gray-600">{task.description}</p>
                            )}
                          </div>
                          <PriorityBadge priority={task.priority} />
                        </div>
                        {task.due_date && (
                          <p className="text-xs text-gray-500 mt-2">
                            Due: {new Date(task.due_date).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    ))}
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
                <CardTitle>Email Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Thread ID</span>
                  <span className="font-mono text-xs">{email.thread_id.substring(0, 12)}...</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Status</span>
                  <span>{email.is_read ? 'Read' : 'Unread'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Attachments</span>
                  <span>{documents.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Tasks</span>
                  <span>{tasks.length}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
