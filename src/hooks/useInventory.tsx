 import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
 import { db } from '../../utils/localStorageDB.js';
 import { useAuth } from './useAuth';
 import { useToast } from '@/components/ui/use-toast';
 
 export interface InventoryItem {
   id: string;
   unit_id: string;
   cadastral_unit_id: string | null;
  room: string | null;
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
       const all: unknown[] = db.getAll();
       let items = all
         .filter((x) => (x as { __table: string; unit_id: string }).__table === 'unit_inventories' && (x as { unit_id: string }).unit_id === unitId)
         .map((x) => x as InventoryItem);
       if (cadastralUnitId) {
         items = items.filter((x) => x.cadastral_unit_id === cadastralUnitId);
       }
       if (roomId) {
         items = items.filter((x) => x.room === roomId);
       }
       items.sort((a, b) => (a.nome_bene || '').localeCompare(b.nome_bene || ''));
       return items;
     },
     enabled: !!user && !!unitId,
   });
 
   const createItem = useMutation({
    mutationFn: async (item: Omit<InventoryItem, 'id' | 'created_at' | 'updated_at'>) => {
       const now = new Date().toISOString();
       const created: InventoryItem & { __table: 'unit_inventories' } = { __table: 'unit_inventories', id: crypto.randomUUID(), created_at: now, updated_at: now, ...item };
       db.add(created);
       return created;
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
       db.update(id, { ...updates, updated_at: new Date().toISOString() });
       const found = db.getAll().find((x) => (x as { id: string }).id === id) as InventoryItem | undefined;
       return found as InventoryItem;
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
       db.delete(id);
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
