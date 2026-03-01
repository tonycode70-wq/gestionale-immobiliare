import { useState } from 'react';
import { Plus, X, Building2, Users, FileText, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { PropertyForm } from '@/components/forms/PropertyForm';
import { TenantForm } from '@/components/forms/TenantForm';
import { LeaseForm } from '@/components/forms/LeaseForm';
import { ReminderForm } from '@/components/forms/ReminderForm';
import { UnitForm } from '@/components/forms/UnitForm';
import { useGlobalProperty } from '@/hooks/useGlobalProperty';
import type { ReactNode, ElementType } from 'react';

export function FAB() {
  const [isOpen, setIsOpen] = useState(false);
  const { selectedPropertyId, setSelection } = useGlobalProperty();

  const actions: Array<{ icon: ElementType; label: string; color: string; render: (trigger: ReactNode) => JSX.Element }> = [
    { 
      icon: Building2, 
      label: 'Nuovo immobile', 
      color: 'bg-primary',
      render: (trigger) => <PropertyForm trigger={trigger} />
    },
    { 
      icon: Building2, 
      label: 'Aggiungi nuova unità', 
      color: 'bg-primary',
      render: (trigger) => (
        <UnitForm 
          trigger={trigger} 
          propertyId={selectedPropertyId !== 'all' ? selectedPropertyId : undefined} 
          onSuccess={() => { if (selectedPropertyId !== 'all') setSelection(selectedPropertyId, 'all'); }} 
        />
      )
    },
    { 
      icon: Users, 
      label: 'Nuovo conduttore', 
      color: 'bg-info',
      render: (trigger) => <TenantForm trigger={trigger} />
    },
    { 
      icon: FileText, 
      label: 'Nuovo contratto', 
      color: 'bg-success',
      render: (trigger) => <LeaseForm trigger={trigger} />
    },
    { 
      icon: Calendar, 
      label: 'Nuova scadenza / nota', 
      color: 'bg-warning',
      render: (trigger) => <ReminderForm trigger={trigger} />
    },
  ];

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-foreground/20 z-40 backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Action buttons - positioned higher to avoid overlap */}
      <div className={cn(
        'fixed bottom-36 right-4 z-50 flex flex-col-reverse gap-3 transition-all duration-200',
        isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
      )}>
        {actions.map((action, index) => {
          return (
            <div 
              key={action.label}
              className="flex items-center gap-3 animate-fade-in"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <span className="bg-card px-3 py-1.5 rounded-lg shadow-md text-sm font-medium text-foreground">
                {action.label}
              </span>
              {action.render(
                <Button
                  size="icon"
                  className={cn(
                    'w-12 h-12 rounded-full shadow-lg',
                    action.color,
                    'hover:opacity-90 text-white'
                  )}
                  onClick={() => setIsOpen(false)}
                >
                  <action.icon className="h-5 w-5" />
                </Button>
              )}
            </div>
          );
        })}
      </div>

      {/* Main FAB button - positioned above bottom nav */}
      <Button
        size="icon"
        className={cn(
          'fixed bottom-24 right-4 z-50 w-14 h-14 rounded-full shadow-lg transition-transform duration-200',
          'bg-primary hover:bg-primary/90',
          isOpen && 'rotate-45'
        )}
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
      </Button>
    </>
  );
}
