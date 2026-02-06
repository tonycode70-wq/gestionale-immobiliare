import { Check, Clock, AlertTriangle, Calendar } from 'lucide-react';
import { formatCurrency, formatDate, getReminderTypeIcon, getReminderTypeLabel, getDaysRemaining } from '@/lib/propertyUtils';
import { StatusBadge } from '@/components/common';
import { cn } from '@/lib/utils';
import type { ReminderWithContext } from '@/types';

interface ReminderListProps {
  reminders: ReminderWithContext[];
  onComplete?: (id: string) => void;
  title?: string;
}

export function ReminderList({ reminders, onComplete, title = 'Scadenziario' }: ReminderListProps) {
  if (reminders.length === 0) {
    return (
      <div className="mobile-card text-center py-6">
        <Calendar className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" />
        <p className="text-sm text-muted-foreground">Nessuna scadenza in programma</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {title && (
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          {title}
        </h3>
      )}
      
      {reminders.map((reminder) => (
        <div 
          key={reminder.id}
          className={cn(
            'mobile-card',
            reminder.isOverdue && !reminder.completata && 'border-destructive/50 bg-destructive/5'
          )}
        >
          <div className="flex items-start gap-3">
            <div className="text-2xl">
              {getReminderTypeIcon(reminder.tipo)}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <h4 className="font-medium text-foreground text-sm line-clamp-2">
                  {reminder.titolo}
                </h4>
                <StatusBadge 
                  status={
                    reminder.completata ? 'success' : 
                    reminder.isOverdue ? 'error' : 
                    reminder.daysRemaining <= 7 ? 'warning' : 'muted'
                  }
                >
                  {reminder.completata ? 'Completata' :
                   reminder.isOverdue ? 'Scaduta' :
                   reminder.daysRemaining === 0 ? 'Oggi' :
                   reminder.daysRemaining === 1 ? 'Domani' :
                   `${reminder.daysRemaining} gg`}
                </StatusBadge>
              </div>

              <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                <span>{getReminderTypeLabel(reminder.tipo)}</span>
                <span>•</span>
                <span>{formatDate(reminder.data_scadenza)}</span>
                {reminder.unitName && (
                  <>
                    <span>•</span>
                    <span>{reminder.unitName}</span>
                  </>
                )}
              </div>

              {reminder.descrizione && (
                <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                  {reminder.descrizione}
                </p>
              )}
            </div>
          </div>

          {!reminder.completata && onComplete && (
            <button
              onClick={() => onComplete(reminder.id)}
              className="mt-3 w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors"
            >
              <Check className="h-4 w-4" />
              Segna come completata
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
