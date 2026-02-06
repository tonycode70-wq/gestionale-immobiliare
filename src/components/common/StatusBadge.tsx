import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: 'success' | 'warning' | 'error' | 'info' | 'muted';
  children: React.ReactNode;
  className?: string;
}

export function StatusBadge({ status, children, className }: StatusBadgeProps) {
  const statusStyles = {
    success: 'bg-success/15 text-success border-success/30',
    warning: 'bg-warning/15 text-warning-foreground border-warning/30',
    error: 'bg-destructive/15 text-destructive border-destructive/30',
    info: 'bg-info/15 text-info border-info/30',
    muted: 'bg-muted text-muted-foreground border-muted',
  };

  return (
    <span className={cn(
      'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border',
      statusStyles[status],
      className
    )}>
      {children}
    </span>
  );
}
