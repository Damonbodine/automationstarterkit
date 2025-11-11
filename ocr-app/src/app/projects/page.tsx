import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { redirect } from 'next/navigation';
import { getSupabaseServerClient } from '@/lib/db/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import Link from 'next/link';
import { calculateProjectHealth } from '@/lib/projects/health';
import { ProjectHealthBadge } from '@/components/projects/ProjectHealthBadge';

async function getProjectsWithHealth(userId: string) {
  const supabase = getSupabaseServerClient();

  // Fetch projects
  const { data: projects } = await supabase
    .from('projects')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (!projects) return [];

  // Fetch all tasks for these projects
  const { data: allTasks } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', userId)
    .in('project_id', projects.map(p => p.id));

  // Calculate health for each project
  return projects.map(project => {
    const projectTasks = (allTasks || []).filter(t => t.project_id === project.id);
    const health = calculateProjectHealth({ project, tasks: projectTasks });
    return { ...project, health };
  });
}

export default async function ProjectsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect('/login');

  const projects = await getProjectsWithHealth(session.user.id);

  return (
    <div className="min-h-screen bg-gray-50 py-8 dark:bg-gray-900">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Projects</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{projects.length} total</p>
        </div>

        {projects.length === 0 ? (
          <Card className="dark:border-gray-800 dark:bg-gray-950">
            <CardContent className="py-12 text-center text-sm text-gray-600 dark:text-gray-300">
              No projects yet
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((p: any) => (
              <Link key={p.id} href={`/projects/${p.id}`}>
                <Card className="hover:shadow-md transition-shadow dark:border-gray-800 dark:bg-gray-950">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <CardTitle className="text-base">{p.name || 'Untitled Project'}</CardTitle>
                        <CardDescription>{p.status || 'active'}</CardDescription>
                      </div>
                      <ProjectHealthBadge status={p.health.status} />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="line-clamp-2 text-sm text-gray-600 dark:text-gray-300">{p.description || 'No description'}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

