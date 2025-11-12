import { cn } from '@/lib/utils';
import { type VariantProps, cva } from 'class-variance-authority';

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100',
        primary: 'bg-blue-100 text-blue-900 dark:bg-blue-900/30 dark:text-blue-300',
        success: 'bg-green-100 text-green-900 dark:bg-green-900/30 dark:text-green-300',
        warning: 'bg-yellow-100 text-yellow-900 dark:bg-yellow-900/30 dark:text-yellow-300',
        danger: 'bg-red-100 text-red-900 dark:bg-red-900/30 dark:text-red-300',
        info: 'bg-sky-100 text-sky-900 dark:bg-sky-900/30 dark:text-sky-300',
        purple: 'bg-purple-100 text-purple-900 dark:bg-purple-900/30 dark:text-purple-300',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

// Category-specific badges
export function CategoryBadge({ category }: { category: string }) {
  const variantMap: Record<string, BadgeProps['variant']> = {
    client_request: 'primary',
    invoice: 'success',
    contract: 'purple',
    meeting: 'info',
    notification: 'default',
    marketing: 'warning',
    internal: 'default',
  };

  return (
    <Badge variant={variantMap[category] || 'default'}>
      {category.replace('_', ' ')}
    </Badge>
  );
}

// Priority-specific badges
export function PriorityBadge({ priority }: { priority: string }) {
  const variantMap: Record<string, BadgeProps['variant']> = {
    urgent: 'danger',
    high: 'warning',
    medium: 'info',
    low: 'default',
  };

  return (
    <Badge variant={variantMap[priority] || 'default'}>
      {priority}
    </Badge>
  );
}

// Sentiment-specific badges
export function SentimentBadge({ sentiment }: { sentiment: string }) {
  const variantMap: Record<string, BadgeProps['variant']> = {
    positive: 'success',
    neutral: 'default',
    negative: 'danger',
    action_required: 'warning',
  };

  return (
    <Badge variant={variantMap[sentiment] || 'default'}>
      {sentiment.replace('_', ' ')}
    </Badge>
  );
}
