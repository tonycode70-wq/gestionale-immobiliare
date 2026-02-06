import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from '@/components/ui/use-toast';

export interface Payment {
  id: string;
  lease_id: string;
  competenza_anno: number;
  competenza_mese: number;
  importo_canone_previsto: number;
  importo_spese_previste: number | null;
  importo_totale_previsto: number;
  data_scadenza: string;
  data_pagamento: string | null;
  importo_canone_pagato: number | null;
  importo_spese_pagato: number | null;
  importo_residuo_calcolato: number | null;
  stato_pagamento: 'ATTESO' | 'PARZIALE' | 'PAGATO' | 'IN_RITARDO' | null;
  metodo_pagamento_effettivo: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export function usePayments(leaseId?: string, year?: number) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: payments = [], isLoading, error } = useQuery({
    queryKey: ['payments', leaseId, year],
    queryFn: async () => {
      if (!user) return [];
      
      let query = supabase.from('payments').select('*');
      
      if (leaseId) {
        query = query.eq('lease_id', leaseId);
      }
      if (year) {
        query = query.eq('competenza_anno', year);
      }
      
      const { data, error } = await query.order('competenza_anno', { ascending: false }).order('competenza_mese', { ascending: false });
      if (error) throw error;
      return data as Payment[];
    },
    enabled: !!user,
  });

  const createPayment = useMutation({
    mutationFn: async (payment: Omit<Payment, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('payments')
        .insert(payment)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      toast({ title: 'Pagamento registrato', description: 'Il pagamento è stato aggiunto.' });
    },
    onError: (error) => {
      toast({ variant: 'destructive', title: 'Errore', description: error.message });
    }
  });

  const updatePayment = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Payment> & { id: string }) => {
      const { data, error } = await supabase
        .from('payments')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      toast({ title: 'Pagamento aggiornato', description: 'Le modifiche sono state salvate.' });
    },
    onError: (error) => {
      toast({ variant: 'destructive', title: 'Errore', description: error.message });
    }
  });

  const markAsPaid = useMutation({
    mutationFn: async ({ id, importo_canone_pagato, importo_spese_pagato, data_pagamento }: { 
      id: string; 
      importo_canone_pagato: number; 
      importo_spese_pagato: number;
      data_pagamento: string;
    }) => {
      const { data: current } = await supabase.from('payments').select('*').eq('id', id).single();
      if (!current) throw new Error('Pagamento non trovato');

      const totalePagato = importo_canone_pagato + importo_spese_pagato;
      const totalePrevisto = current.importo_totale_previsto;
      const residuo = totalePrevisto - totalePagato;
      
      let stato: 'PAGATO' | 'PARZIALE' | 'IN_RITARDO' = 'PAGATO';
      if (residuo > 0.01) {
        stato = 'PARZIALE';
      }

      const { data, error } = await supabase
        .from('payments')
        .update({
          importo_canone_pagato,
          importo_spese_pagato,
          data_pagamento,
          importo_residuo_calcolato: residuo,
          stato_pagamento: stato,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      toast({ title: 'Pagamento registrato', description: 'Il pagamento è stato confermato.' });
    },
    onError: (error) => {
      toast({ variant: 'destructive', title: 'Errore', description: error.message });
    }
  });

  const deletePayment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('payments').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      toast({ title: 'Pagamento eliminato', description: 'Il pagamento è stato rimosso.' });
    },
    onError: (error) => {
      toast({ variant: 'destructive', title: 'Errore', description: error.message });
    }
  });

  return { payments, isLoading, error, createPayment, updatePayment, markAsPaid, deletePayment };
}
