import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { CheckCircle, XCircle } from 'lucide-react';
import { ProjectHealthBadge } from './ProjectHealthBadge';
import type { ProjectHealth } from '@/lib/projects/health';

interface ProjectHealthDetailsProps {
  health: ProjectHealth;
}

export function ProjectHealthDetails({ health }: ProjectHealthDetailsProps) {
  return (
    <Card className="dark:border-gray-800 dark:bg-gray-950">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Project Health</CardTitle>
          <ProjectHealthBadge status={health.status} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            {health.score} of 4 health indicators are positive
          </div>

          {/* Budget Health */}
          <div className="flex items-start gap-3">
            {health.factors.budget.healthy ? (
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
            ) : (
              <XCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-900 dark:text-gray-100">Budget</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {health.factors.budget.reason}
              </div>
            </div>
          </div>

          {/* Schedule Health */}
          <div className="flex items-start gap-3">
            {health.factors.schedule.healthy ? (
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
            ) : (
              <XCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-900 dark:text-gray-100">Schedule</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {health.factors.schedule.reason}
              </div>
            </div>
          </div>

          {/* Activity Health */}
          <div className="flex items-start gap-3">
            {health.factors.activity.healthy ? (
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
            ) : (
              <XCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-900 dark:text-gray-100">Activity</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {health.factors.activity.reason}
              </div>
            </div>
          </div>

          {/* Task Health */}
          <div className="flex items-start gap-3">
            {health.factors.tasks.healthy ? (
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
            ) : (
              <XCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-900 dark:text-gray-100">Tasks</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {health.factors.tasks.reason}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
