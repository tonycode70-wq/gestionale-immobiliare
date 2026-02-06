 import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
 import { supabase } from '@/integrations/supabase/client';
 import { useAuth } from './useAuth';
 import { useToast } from '@/components/ui/use-toast';
 
 export interface InventoryItem {
   id: string;
   unit_id: string;
   cadastral_unit_id: string | null;
  inventory_room_id: string | null;
   nome_bene: string;
   descrizione: string | null;
   quantita: number;
   stato: string | null;
   data_inserimento: string;
   note: string | null;
   created_at: string;
   updated_at: string;
 }
 
export function useInventory(unitId?: string, cadastralUnitId?: string, roomId?: string) {
   const { user } = useAuth();
   const { toast } = useToast();
   const queryClient = useQueryClient();
 
   const { data: inventoryItems = [], isLoading, error } = useQuery({
    queryKey: ['unit_inventories', unitId, cadastralUnitId, roomId],
     queryFn: async () => {
       if (!user || !unitId) return [];
       
       let query = supabase
         .from('unit_inventories')
         .select('*')
         .eq('unit_id', unitId);
       
       if (cadastralUnitId) {
         query = query.eq('cadastral_unit_id', cadastralUnitId);
       }
      if (roomId) {
        query = query.eq('inventory_room_id', roomId);
      }
       
       const { data, error } = await query.order('nome_bene');
       if (error) throw error;
       return data as InventoryItem[];
     },
     enabled: !!user && !!unitId,
   });
 
   const createItem = useMutation({
    mutationFn: async (item: Omit<InventoryItem, 'id' | 'created_at' | 'updated_at'>) => {
       const { data, error } = await supabase
         .from('unit_inventories')
         .insert(item)
         .select()
         .single();
       
       if (error) throw error;
       return data;
     },
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ['unit_inventories'] });
       toast({ title: 'Bene aggiunto', description: 'L\'inventario è stato aggiornato.' });
     },
     onError: (error) => {
       toast({ variant: 'destructive', title: 'Errore', description: error.message });
     }
   });
 
   const updateItem = useMutation({
     mutationFn: async ({ id, ...updates }: Partial<InventoryItem> & { id: string }) => {
       const { data, error } = await supabase
         .from('unit_inventories')
         .update({ ...updates, updated_at: new Date().toISOString() })
         .eq('id', id)
         .select()
         .single();
       
       if (error) throw error;
       return data;
     },
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ['unit_inventories'] });
       toast({ title: 'Bene aggiornato', description: 'Le modifiche sono state salvate.' });
     },
     onError: (error) => {
       toast({ variant: 'destructive', title: 'Errore', description: error.message });
     }
   });
 
   const deleteItem = useMutation({
     mutationFn: async (id: string) => {
       const { error } = await supabase.from('unit_inventories').delete().eq('id', id);
       if (error) throw error;
     },
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ['unit_inventories'] });
       toast({ title: 'Bene eliminato', description: 'Il bene è stato rimosso dall\'inventario.' });
     },
     onError: (error) => {
       toast({ variant: 'destructive', title: 'Errore', description: error.message });
     }
   });
 
   return { inventoryItems, isLoading, error, createItem, updateItem, deleteItem };
 }
