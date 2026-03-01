import { Button } from '@/components/ui/button';
import { db } from '../../utils/localStorageDB.js';
import { useToast } from '@/components/ui/use-toast';

export function MaintenanceActions() {
  const { toast } = useToast();
  return (
    <div className="flex gap-2">
      <Button
        variant="outline"
        onClick={() => {
          const ok = db.healthCheck();
          toast({
            title: ok ? 'Health Check OK' : 'Health Check KO',
            description: ok ? 'JSON integro o ripristinato' : 'Nessun backup valido trovato',
            variant: ok ? 'default' : 'destructive',
          });
        }}
      >
        Health Check
      </Button>
      <Button
        variant="outline"
        onClick={() => {
          db.cleanupOrphans();
          toast({
            title: 'Pulizia Orfani',
            description: 'Spese/Note non collegate rimosse',
          });
        }}
      >
        Pulizia Orfani
      </Button>
    </div>
  );
}
