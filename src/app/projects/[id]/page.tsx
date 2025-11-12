import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { redirect } from 'next/navigation';
import { getSupabaseServerClient } from '@/lib/db/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { GoogleWorkspaceFiles } from '@/components/projects/GoogleWorkspaceFiles';
import { calculateProjectHealth } from '@/lib/projects/health';
import { ProjectHealthDetails } from '@/components/projects/ProjectHealthDetails';
import { MilestoneList } from '@/components/projects/MilestoneList';
import { BudgetTracker } from '@/components/projects/BudgetTracker';

async function getProject(userId: string, id: string) {
  const supabase = getSupabaseServerClient();
  const { data } = await supabase
    .from('projects')
    .select('*')
    .eq('user_id', userId)
    .eq('id', id)
    .single();
  return data;
}

async function getRelated(userId: string, projectId: string) {
  const supabase = getSupabaseServerClient();
  const [{ data: tasks }, { data: sows }, { data: milestones }] = await Promise.all([
    supabase.from('tasks').select('*').eq('user_id', userId).eq('project_id', projectId).order('created_at', { ascending: false }),
    supabase.from('scope_of_works').select('*').eq('user_id', userId).eq('project_id', projectId).order('created_at', { ascending: false }),
    supabase.from('milestones').select('*').eq('user_id', userId).eq('project_id', projectId).order('due_date', { ascending: true }),
  ]);
  return {
    tasks: tasks || [],
    sows: sows || [],
    milestones: milestones || [],
  };
}

export default async function ProjectPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect('/login');

  const project = await getProject(session.user.id, params.id);
  if (!project) {
    redirect('/projects');
  }
  const related = await getRelated(session.user.id, params.id);

  // Calculate project health
  const health = calculateProjectHealth({
    project,
    tasks: related.tasks,
  });

  return (
    <div className="min-h-screen bg-gray-50 py-8 dark:bg-gray-900">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{project.name || 'Untitled Project'}</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{project.description || 'No description'}</p>
        </div>

        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="emails">Emails</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="space-y-6">
              {/* Project Health */}
              <ProjectHealthDetails health={health} />

              {/* Budget Tracker */}
              <BudgetTracker project={project} />

              <Card className="dark:border-gray-800 dark:bg-gray-950">
                <CardHeader>
                  <CardTitle>Overview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <div className="text-sm text-gray-500">Status</div>
                      <div className="text-sm font-medium">{project.status || 'active'}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">Updated</div>
                      <div className="text-sm font-medium">{project.updated_at || '—'}</div>
                    </div>
                    {project.client_name && (
                      <div>
                        <div className="text-sm text-gray-500">Client</div>
                        <div className="text-sm font-medium">{project.client_name}</div>
                      </div>
                    )}
                    {project.start_date && (
                      <div>
                        <div className="text-sm text-gray-500">Start Date</div>
                        <div className="text-sm font-medium">{new Date(project.start_date).toLocaleDateString()}</div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <GoogleWorkspaceFiles project={project} />
            </div>
          </TabsContent>

          <TabsContent value="emails">
            <Card className="dark:border-gray-800 dark:bg-gray-950">
              <CardHeader>
                <CardTitle>Linked Emails</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  No direct email links yet.
                  <div className="mt-1 text-xs text-gray-500">Link emails from the email detail page.</div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="documents">
            <Card className="dark:border-gray-800 dark:bg-gray-950">
              <CardHeader>
                <CardTitle>Documents</CardTitle>
              </CardHeader>
              <CardContent>
                {related.sows.length > 0 ? (
                  <div className="space-y-2">
                    {related.sows.map((sow: any) => (
                      <div key={sow.id} className="rounded border p-3 text-sm dark:border-gray-800">
                        <div className="font-medium">{sow.title}</div>
                        <div className="text-xs text-gray-500">Status: {sow.status || 'draft'}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-gray-600 dark:text-gray-300">
                    No documents linked to this project yet.
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tasks">
            <Card className="dark:border-gray-800 dark:bg-gray-950">
              <CardHeader>
                <CardTitle>Tasks</CardTitle>
              </CardHeader>
              <CardContent>
                {related.tasks.length > 0 ? (
                  <div className="space-y-2">
                    {related.tasks.map((t: any) => (
                      <div key={t.id} className="rounded border p-3 text-sm dark:border-gray-800">
                        <div className="flex items-center justify-between">
                          <div className="font-medium">{t.title}</div>
                          <div className="text-xs text-gray-500">{t.status || 'pending'}</div>
                        </div>
                        {t.description && (
                          <div className="mt-1 text-xs text-gray-600 dark:text-gray-400">{t.description}</div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-gray-600 dark:text-gray-300">
                    No tasks yet. Extract tasks from emails to populate this list.
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="timeline">
            <MilestoneList projectId={params.id} milestones={related.milestones} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
