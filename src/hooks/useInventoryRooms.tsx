import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
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
      const { data, error } = await supabase
        .from('inventory_rooms')
        .select('*')
        .eq('unit_id', unitId)
        .order('ordine_visualizzazione', { ascending: true });
      if (error) throw error;
      return data as InventoryRoom[];
    },
    enabled: !!user && !!unitId,
  });

  const createRoom = useMutation({
    mutationFn: async (payload: Omit<InventoryRoom, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('inventory_rooms')
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return data;
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
      const { data, error } = await supabase
        .from('inventory_rooms')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
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
      const { error } = await supabase.from('inventory_rooms').delete().eq('id', id);
      if (error) throw error;
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
