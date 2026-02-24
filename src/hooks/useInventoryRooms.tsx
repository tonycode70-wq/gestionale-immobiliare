import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '../../utils/localStorageDB.js';
import { useAuth } from './useAuth';
import { useToast } from '@/components/ui/use-toast';

export interface InventoryRoom {
  id: string;
  unit_id: string;
  nome_ambiente: string;
  ordine_visualizzazione: number;
  created_at: string;
  updated_at: string;
}

export function useInventoryRooms(unitId?: string) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: rooms = [], isLoading, error } = useQuery({
    queryKey: ['inventory_rooms', unitId],
    queryFn: async () => {
      if (!user || !unitId) return [];
      const all: unknown[] = db.getAll();
      const items = all
        .filter((x) => (x as { __table: string; unit_id: string }).__table === 'inventory_rooms' && (x as { unit_id: string }).unit_id === unitId)
        .map((x) => x as InventoryRoom)
        .sort((a, b) => (a.ordine_visualizzazione || 0) - (b.ordine_visualizzazione || 0));
      return items;
    },
    enabled: !!user && !!unitId,
  });

  const createRoom = useMutation({
    mutationFn: async (payload: Omit<InventoryRoom, 'id' | 'created_at' | 'updated_at'>) => {
      const now = new Date().toISOString();
      const created: InventoryRoom & { __table: 'inventory_rooms' } = { __table: 'inventory_rooms', id: crypto.randomUUID(), created_at: now, updated_at: now, ...payload };
      db.add(created);
      return created;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory_rooms'] });
      toast({ title: 'Stanza aggiunta', description: 'L\'inventario è stato aggiornato.' });
    },
    onError: (error) => {
      toast({ variant: 'destructive', title: 'Errore', description: error.message });
    }
  });

  const updateRoom = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<InventoryRoom> & { id: string }) => {
      db.update(id, { ...updates, updated_at: new Date().toISOString() });
      const found = db.getAll().find((x) => (x as { id: string }).id === id) as InventoryRoom | undefined;
      return found as InventoryRoom;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory_rooms'] });
      toast({ title: 'Stanza aggiornata', description: 'Le modifiche sono state salvate.' });
    },
    onError: (error) => {
      toast({ variant: 'destructive', title: 'Errore', description: error.message });
    }
  });

  const deleteRoom = useMutation({
    mutationFn: async (id: string) => {
      db.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory_rooms'] });
      toast({ title: 'Stanza eliminata', description: 'La stanza è stata rimossa.' });
    },
    onError: (error) => {
      toast({ variant: 'destructive', title: 'Errore', description: error.message });
    }
  });

  return { rooms, isLoading, error, createRoom, updateRoom, deleteRoom };
}
