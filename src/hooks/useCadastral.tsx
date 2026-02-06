import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
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
      
      const { data, error } = await supabase
        .from('cadastral_units')
        .select('*')
        .eq('unit_id', unitId)
        .order('tipo_unita');
      
      if (error) throw error;
      return data as CadastralUnit[];
    },
    enabled: !!user && !!unitId,
  });

  const createCadastral = useMutation({
    mutationFn: async (cadastral: Omit<CadastralUnit, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('cadastral_units')
        .insert(cadastral)
        .select()
        .single();
      
      if (error) throw error;
      return data;
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
      const { data, error } = await supabase
        .from('cadastral_units')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
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
      const { error } = await supabase.from('cadastral_units').delete().eq('id', id);
      if (error) throw error;
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
