import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '../../utils/localStorageDB.js';
import { useAuth } from './useAuth';
import { useToast } from '@/components/ui/use-toast';

export interface Reminder {
  id: string;
  user_id: string;
  property_id: string | null;
  unit_id: string | null;
  lease_id: string | null;
  tipo: 'MANUTENZIONE' | 'FISCALE' | 'CONTRATTUALE' | 'ASSICURATIVO' | 'ALTRO';
  titolo: string;
  descrizione: string | null;
  data_scadenza: string;
  completata: boolean | null;
  data_completamento: string | null;
  ricorrente: boolean | null;
  frequenza_mesi: number | null;
  giorni_anticipo_promemoria: number | null;
  reminder_padre_id: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export function useReminders() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: reminders = [], isLoading, error } = useQuery({
    queryKey: ['reminders', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const all: unknown[] = db.getAll();
      const items = all
        .filter((x) => (x as { __table: string; user_id: string }).__table === 'reminders' && (x as { user_id: string }).user_id === user.id)
        .map((x) => x as Reminder);
      items.sort((a, b) => (a.data_scadenza || '').localeCompare(b.data_scadenza || ''));
      return items;
    },
    enabled: !!user,
  });

  const createReminder = useMutation({
    mutationFn: async (reminder: Omit<Reminder, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
      if (!user) throw new Error('Non autenticato');
      const now = new Date().toISOString();
      const item: Reminder & { __table: 'reminders' } = { __table: 'reminders', id: crypto.randomUUID(), user_id: user.id, created_at: now, updated_at: now, ...reminder };
      db.add(item);
      return item;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
      toast({ title: 'Promemoria creato', description: 'Il promemoria è stato aggiunto.' });
    },
    onError: (error) => {
      toast({ variant: 'destructive', title: 'Errore', description: error.message });
    }
  });

  const updateReminder = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Reminder> & { id: string }) => {
      db.update(id, { ...updates, updated_at: new Date().toISOString() });
      const all: unknown[] = db.getAll();
      const found = all.find((x) => (x as { id: string }).id === id) as Reminder | undefined;
      return found as Reminder;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
      toast({ title: 'Promemoria aggiornato', description: 'Le modifiche sono state salvate.' });
    },
    onError: (error) => {
      toast({ variant: 'destructive', title: 'Errore', description: error.message });
    }
  });

  const completeReminder = useMutation({
    mutationFn: async (id: string) => {
      const payload = { 
        completata: true, 
        data_completamento: new Date().toISOString().split('T')[0],
        updated_at: new Date().toISOString() 
      };
      db.update(id, payload);
      const all: unknown[] = db.getAll();
      const found = all.find((x) => (x as { id: string }).id === id) as Reminder | undefined;
      return found as Reminder;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
      toast({ title: 'Completato', description: 'Il promemoria è stato segnato come completato.' });
    },
    onError: (error) => {
      toast({ variant: 'destructive', title: 'Errore', description: error.message });
    }
  });

  const deleteReminder = useMutation({
    mutationFn: async (id: string) => {
      db.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
      toast({ title: 'Promemoria eliminato', description: 'Il promemoria è stato rimosso.' });
    },
    onError: (error) => {
      toast({ variant: 'destructive', title: 'Errore', description: error.message });
    }
  });

  return { reminders, isLoading, error, createReminder, updateReminder, completeReminder, deleteReminder };
}
