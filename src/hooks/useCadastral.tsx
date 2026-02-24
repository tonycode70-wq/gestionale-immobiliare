import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '../../utils/localStorageDB.js';
import { useAuth } from './useAuth';
import { useToast } from '@/components/ui/use-toast';

export interface CadastralUnit {
  id: string;
  unit_id: string;
  tipo_unita: 'principale' | 'pertinenza';
  categoria_catastale: string;
  rendita_euro: number;
  metratura_mq: number | null;
  sezione_urbana: string | null;
  foglio: string;
  particella: string;
  subalterno: string;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export function useCadastral(unitId?: string) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: cadastralUnits = [], isLoading, error } = useQuery({
    queryKey: ['cadastral_units', unitId],
    queryFn: async () => {
      if (!user || !unitId) return [];
      const all: unknown[] = db.getAll();
      const items = all
        .filter((x) => (x as { __table: string; unit_id: string }).__table === 'cadastral_units' && (x as { unit_id: string }).unit_id === unitId)
        .map((x) => x as CadastralUnit)
        .sort((a, b) => (a.tipo_unita || '').localeCompare(b.tipo_unita || ''));
      return items;
    },
    enabled: !!user && !!unitId,
  });

  const createCadastral = useMutation({
    mutationFn: async (cadastral: Omit<CadastralUnit, 'id' | 'created_at' | 'updated_at'>) => {
      const now = new Date().toISOString();
      const item: CadastralUnit & { __table: 'cadastral_units' } = { __table: 'cadastral_units', id: crypto.randomUUID(), created_at: now, updated_at: now, ...cadastral };
      db.add(item);
      return item;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cadastral_units'] });
      toast({ title: 'Dati catastali salvati', description: 'I dati catastali sono stati aggiunti.' });
    },
    onError: (error) => {
      toast({ variant: 'destructive', title: 'Errore', description: error.message });
    }
  });

  const updateCadastral = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CadastralUnit> & { id: string }) => {
      db.update(id, { ...updates, updated_at: new Date().toISOString() });
      const found = db.getAll().find((x) => (x as { id: string }).id === id) as CadastralUnit | undefined;
      return found as CadastralUnit;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cadastral_units'] });
      toast({ title: 'Dati catastali aggiornati', description: 'Le modifiche sono state salvate.' });
    },
    onError: (error) => {
      toast({ variant: 'destructive', title: 'Errore', description: error.message });
    }
  });

  const deleteCadastral = useMutation({
    mutationFn: async (id: string) => {
      db.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cadastral_units'] });
      toast({ title: 'Dati catastali eliminati', description: 'I dati catastali sono stati rimossi.' });
    },
    onError: (error) => {
      toast({ variant: 'destructive', title: 'Errore', description: error.message });
    }
  });

  // Calculate total rendita
  const totaleRendita = cadastralUnits.reduce((sum, cu) => sum + cu.rendita_euro, 0);

  return { cadastralUnits, isLoading, error, createCadastral, updateCadastral, deleteCadastral, totaleRendita };
}
