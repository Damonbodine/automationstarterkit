import { Badge } from '@/components/ui/Badge';
import { getHealthColorClass, getHealthLabel } from '@/lib/projects/health';
import type { HealthStatus } from '@/lib/projects/health';

interface ProjectHealthBadgeProps {
  status: HealthStatus;
  className?: string;
}

export function ProjectHealthBadge({ status, className }: ProjectHealthBadgeProps) {
  const colorClass = getHealthColorClass(status);
  const label = getHealthLabel(status);

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${colorClass} ${className}`}
    >
      {label}
    </span>
  );
}
