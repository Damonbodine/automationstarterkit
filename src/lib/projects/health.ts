import type { Database } from '@/types/database';

type Project = Database['public']['Tables']['projects']['Row'];
type Task = Database['public']['Tables']['tasks']['Row'];

export type HealthStatus = 'green' | 'yellow' | 'red';

export interface ProjectHealth {
  status: HealthStatus;
  score: number; // 0-4, number of healthy factors
  factors: {
    budget: { healthy: boolean; reason: string };
    schedule: { healthy: boolean; reason: string };
    activity: { healthy: boolean; reason: string };
    tasks: { healthy: boolean; reason: string };
  };
}

interface HealthOptions {
  project: Project;
  tasks?: Task[];
  actualSpent?: number; // Optional: actual money spent on project
}

/**
 * Calculate project health based on 4 key factors:
 * 1. Budget - within budget or no overspend
 * 2. Schedule - on track with deadline
 * 3. Activity - recent updates
 * 4. Tasks - tasks being completed
 */
export function calculateProjectHealth({
  project,
  tasks = [],
  actualSpent = 0,
}: HealthOptions): ProjectHealth {
  const factors = {
    budget: checkBudgetHealth(project, actualSpent),
    schedule: checkScheduleHealth(project),
    activity: checkActivityHealth(project),
    tasks: checkTaskHealth(tasks),
  };

  const score = Object.values(factors).filter((f) => f.healthy).length;

  let status: HealthStatus;
  if (score >= 3) {
    status = 'green';
  } else if (score === 2) {
    status = 'yellow';
  } else {
    status = 'red';
  }

  return { status, score, factors };
}

function checkBudgetHealth(
  project: Project,
  actualSpent: number
): { healthy: boolean; reason: string } {
  // If no budget is set, consider it healthy (not tracking)
  if (!project.budget) {
    return { healthy: true, reason: 'No budget set' };
  }

  const budget = project.budget;
  const percentSpent = (actualSpent / budget) * 100;

  if (percentSpent > 100) {
    return { healthy: false, reason: `Over budget (${percentSpent.toFixed(0)}%)` };
  } else if (percentSpent > 90) {
    return { healthy: false, reason: `Near budget limit (${percentSpent.toFixed(0)}%)` };
  } else {
    return { healthy: true, reason: `Within budget (${percentSpent.toFixed(0)}% spent)` };
  }
}

function checkScheduleHealth(project: Project): { healthy: boolean; reason: string } {
  // If no end date is set, consider it healthy (not tracking)
  if (!project.end_date) {
    return { healthy: true, reason: 'No deadline set' };
  }

  const now = new Date();
  const endDate = new Date(project.end_date);
  const startDate = project.start_date ? new Date(project.start_date) : null;

  // If project is already past deadline and not completed
  if (endDate < now && project.status !== 'completed') {
    const daysOverdue = Math.floor((now.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24));
    return { healthy: false, reason: `${daysOverdue} days overdue` };
  }

  // Calculate time remaining
  const daysRemaining = Math.floor((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  // If we have start date, calculate progress
  if (startDate && startDate < now) {
    const totalDuration = endDate.getTime() - startDate.getTime();
    const elapsed = now.getTime() - startDate.getTime();
    const percentComplete = (elapsed / totalDuration) * 100;

    if (percentComplete > 90 && daysRemaining < 7) {
      return { healthy: false, reason: `Due in ${daysRemaining} days` };
    }
  }

  return { healthy: true, reason: `${daysRemaining} days until deadline` };
}

function checkActivityHealth(project: Project): { healthy: boolean; reason: string } {
  const now = new Date();
  const updatedAt = project.updated_at ? new Date(project.updated_at) : new Date(project.created_at || now);

  const daysSinceUpdate = Math.floor((now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60 * 24));

  // No activity in 14+ days is unhealthy
  if (daysSinceUpdate > 14) {
    return { healthy: false, reason: `No activity for ${daysSinceUpdate} days` };
  }

  // Activity in last 7 days is healthy
  if (daysSinceUpdate <= 7) {
    return { healthy: true, reason: 'Active this week' };
  }

  // 8-14 days is marginal but still healthy
  return { healthy: true, reason: `Updated ${daysSinceUpdate} days ago` };
}

function checkTaskHealth(tasks: Task[]): { healthy: boolean; reason: string } {
  if (tasks.length === 0) {
    return { healthy: true, reason: 'No tasks yet' };
  }

  const completedTasks = tasks.filter((t) => t.status === 'completed').length;
  const totalTasks = tasks.length;
  const completionRate = (completedTasks / totalTasks) * 100;

  // If completion rate is very low and we have many tasks, it's unhealthy
  if (totalTasks >= 5 && completionRate < 30) {
    return { healthy: false, reason: `Low completion rate (${completionRate.toFixed(0)}%)` };
  }

  // Check for overdue tasks
  const now = new Date();
  const overdueTasks = tasks.filter(
    (t) => t.status !== 'completed' && t.due_date && new Date(t.due_date) < now
  ).length;

  if (overdueTasks > 0) {
    return { healthy: false, reason: `${overdueTasks} overdue tasks` };
  }

  return { healthy: true, reason: `${completedTasks}/${totalTasks} tasks completed` };
}

/**
 * Get health color class for Tailwind CSS
 */
export function getHealthColorClass(status: HealthStatus): string {
  switch (status) {
    case 'green':
      return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
    case 'yellow':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
    case 'red':
      return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
  }
}

/**
 * Get health label
 */
export function getHealthLabel(status: HealthStatus): string {
  switch (status) {
    case 'green':
      return 'Healthy';
    case 'yellow':
      return 'At Risk';
    case 'red':
      return 'Critical';
  }
}
