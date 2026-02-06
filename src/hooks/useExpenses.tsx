import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from '@/components/ui/use-toast';

export interface ExtraExpense {
  id: string;
  user_id: string;
  property_id: string | null;
  unit_id: string | null;
  lease_id: string | null;
  categoria: string;
  descrizione: string;
  importo_previsto: number;
  importo_effettivo: number;
  data_competenza: string;
  data_pagamento: string | null;
  fornitore: string | null;
  deducibile_fiscalmente: boolean;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export function useExpenses(unitId?: string, year?: number) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: expenses = [], isLoading, error } = useQuery({
    queryKey: ['expenses', unitId, year],
    queryFn: async () => {
      if (!user) return [];
      
      let query = supabase.from('extra_expenses').select('*');
      
      if (unitId) {
        query = query.eq('unit_id', unitId);
      }
      
      if (year) {
        query = query
          .gte('data_competenza', `${year}-01-01`)
          .lte('data_competenza', `${year}-12-31`);
      }
      
      const { data, error } = await query.order('data_competenza', { ascending: false });
      if (error) throw error;
      return data as ExtraExpense[];
    },
    enabled: !!user,
  });

  const createExpense = useMutation({
    mutationFn: async (expense: Omit<ExtraExpense, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
      if (!user) throw new Error('Non autenticato');
      
      const { data, error } = await supabase
        .from('extra_expenses')
        .insert({ ...expense, user_id: user.id })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      toast({ title: 'Spesa registrata', description: 'La spesa è stata aggiunta con successo.' });
    },
    onError: (error) => {
      toast({ variant: 'destructive', title: 'Errore', description: error.message });
    }
  });

  const updateExpense = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ExtraExpense> & { id: string }) => {
      const { data, error } = await supabase
        .from('extra_expenses')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      toast({ title: 'Spesa aggiornata', description: 'Le modifiche sono state salvate.' });
    },
    onError: (error) => {
      toast({ variant: 'destructive', title: 'Errore', description: error.message });
    }
  });

  const deleteExpense = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('extra_expenses').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      toast({ title: 'Spesa eliminata', description: 'La spesa è stata rimossa.' });
    },
    onError: (error) => {
      toast({ variant: 'destructive', title: 'Errore', description: error.message });
    }
  });

  // Calculate totals
  const totals = {
    totalePrevisto: expenses.reduce((sum, e) => sum + e.importo_previsto, 0),
    totaleEffettivo: expenses.reduce((sum, e) => sum + e.importo_effettivo, 0),
    totaleDeducibile: expenses.filter(e => e.deducibile_fiscalmente).reduce((sum, e) => sum + e.importo_effettivo, 0),
  };

  return { expenses, isLoading, error, createExpense, updateExpense, deleteExpense, totals };
}
