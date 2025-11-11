import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { redirect } from 'next/navigation';
import { getSupabaseServerClient } from '@/lib/db/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { PriorityBadge, Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { formatDate } from '@/lib/utils';
import Link from 'next/link';
import { CheckSquare, Square, Calendar, Mail, Filter } from 'lucide-react';
import type { Task } from '@/types/ui';
import { TasksHeader } from '@/components/tasks/TasksHeader';
import { TaskActions } from '@/components/tasks/TaskActions';

async function getTasks(
  userId: string,
  filters: { status?: string; priority?: string }
) {
  const supabase = getSupabaseServerClient();

  let query = supabase
    .from('tasks')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (filters.status) {
    query = query.eq('status', filters.status as any);
  }

  if (filters.priority) {
    query = query.eq('priority', filters.priority as any);
  }

  const { data: tasks, error } = await query;

  if (error) {
    console.error('Error fetching tasks:', error);
    return [];
  }

  return tasks as Task[];
}

interface PageProps {
  searchParams: Promise<{
    status?: string;
    priority?: string;
  }>;
}

export default async function TasksPage({ searchParams }: PageProps) {
  const session = await getServerSession(authOptions);
  const params = await searchParams;

  if (!session?.user?.id) {
    redirect('/login');
  }

  const filters = {
    status: params.status,
    priority: params.priority,
  };

  const tasks = await getTasks(session.user.id, filters);
  const pendingTasks = tasks.filter((t) => t.status === 'pending');
  const completedTasks = tasks.filter((t) => t.status === 'completed');

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <TasksHeader
          pendingCount={pendingTasks.length}
          completedCount={completedTasks.length}
        />

        <div className="grid gap-6 lg:grid-cols-4">
          {/* Filters Sidebar */}
          <Card className="lg:col-span-1 h-fit">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Filter className="h-4 w-4" />
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Status Filter */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Status</h3>
                <div className="space-y-2">
                  <Link
                    href="/tasks"
                    className={`block text-sm px-2 py-1 rounded ${
                      !filters.status ? 'bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                  >
                    All
                  </Link>
                  <Link
                    href="/tasks?status=pending"
                    className={`block text-sm px-2 py-1 rounded ${
                      filters.status === 'pending'
                        ? 'bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                  >
                    Pending
                  </Link>
                  <Link
                    href="/tasks?status=completed"
                    className={`block text-sm px-2 py-1 rounded ${
                      filters.status === 'completed'
                        ? 'bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                  >
                    Completed
                  </Link>
                </div>
              </div>

              {/* Priority Filter */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Priority</h3>
                <div className="space-y-2">
                  {['urgent', 'high', 'medium', 'low'].map((pri) => (
                    <Link
                      key={pri}
                      href={`/tasks?priority=${pri}`}
                      className={`block text-sm px-2 py-1 rounded capitalize ${
                        filters.priority === pri
                          ? 'bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400'
                          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                      }`}
                    >
                      {pri}
                    </Link>
                  ))}
                </div>
              </div>

              {filters.status || filters.priority ? (
                <Link
                  href="/tasks"
                  className="block text-center text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 pt-2"
                >
                  Clear filters
                </Link>
              ) : null}
            </CardContent>
          </Card>

          {/* Tasks List */}
          <div className="lg:col-span-3">
            {tasks.length === 0 ? (
              <Card>
                <CardContent className="py-12">
                  <div className="text-center">
                    <CheckSquare className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">No tasks found</h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      Tasks will appear here when extracted from emails by AI
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {tasks.map((task) => (
                  <Card key={task.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        {/* Checkbox */}
                        <button className="mt-1 flex-shrink-0">
                          {task.status === 'completed' ? (
                            <CheckSquare className="h-5 w-5 text-green-600" />
                          ) : (
                            <Square className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                          )}
                        </button>

                        {/* Task Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <h3
                              className={`text-base font-semibold ${
                                task.status === 'completed'
                                  ? 'text-gray-400 dark:text-gray-600 line-through'
                                  : 'text-gray-900 dark:text-gray-100'
                              }`}
                            >
                              {task.title}
                            </h3>
                            <PriorityBadge priority={task.priority || 'medium'} />
                          </div>

                          {task.description && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                              {task.description}
                            </p>
                          )}

                          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                            {task.due_date && (
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                Due: {new Date(task.due_date).toLocaleDateString()}
                              </div>
                            )}
                            {task.email_id && (
                              <Link
                                href={`/emails/${task.email_id}`}
                                className="flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                              >
                                <Mail className="h-3 w-3" />
                                View email
                              </Link>
                            )}
                            <div>
                              Created: {formatDate(task.created_at || '')}
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <TaskActions taskId={task.id} status={task.status} />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
