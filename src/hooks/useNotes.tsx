import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '../../utils/localStorageDB.js';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from './useAuth';

export interface NoteItem {
  id: string;
  property_id: string | null;
  unit_id: string | null;
  titolo: string;
  contenuto: string;
  data_nota: string | null;
  created_at: string;
  updated_at: string;
}

export function useNotes(unitId?: string, propertyId?: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: notes = [], isLoading, error } = useQuery({
    queryKey: ['notes', unitId, propertyId],
    queryFn: async () => {
      const all: unknown[] = db.getAll();
      let items = all.filter((x) => (x as { __table: string }).__table === 'notes').map((x) => x as NoteItem);
      if (unitId) items = items.filter((x) => x.unit_id === unitId);
      if (!unitId && propertyId) items = items.filter((x) => x.property_id === propertyId);
      items.sort((a, b) => (b.updated_at || '').localeCompare(a.updated_at || ''));
      return items;
    },
    enabled: true,
  });

  const createNote = useMutation({
    mutationFn: async (note: Omit<NoteItem, 'id' | 'created_at' | 'updated_at'>) => {
      const now = new Date().toISOString();
      const item: NoteItem & { __table: 'notes' } = { __table: 'notes', id: crypto.randomUUID(), created_at: now, updated_at: now, ...note };
      db.add(item);
      return item;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      toast({ title: 'Nota salvata', description: 'La nota è stata aggiunta.' });
    },
    onError: (error) => {
      toast({ variant: 'destructive', title: 'Errore', description: (error as Error).message });
    }
  });

  const updateNote = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<NoteItem> & { id: string }) => {
      db.update(id, { ...updates, updated_at: new Date().toISOString() });
      const all: unknown[] = db.getAll();
      const found = all.find((x) => (x as { id: string }).id === id) as NoteItem | undefined;
      return found as NoteItem;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      toast({ title: 'Nota aggiornata', description: 'Le modifiche sono state salvate.' });
    },
    onError: (error) => {
      toast({ variant: 'destructive', title: 'Errore', description: (error as Error).message });
    }
  });

  const deleteNote = useMutation({
    mutationFn: async (id: string) => {
      db.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      toast({ title: 'Nota eliminata', description: 'La nota è stata rimossa.' });
    },
    onError: (error) => {
      toast({ variant: 'destructive', title: 'Errore', description: (error as Error).message });
    }
  });

  return { notes, isLoading, error, createNote, updateNote, deleteNote };
}
