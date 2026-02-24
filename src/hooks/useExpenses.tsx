import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '../../utils/localStorageDB.js';
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
      const all: unknown[] = db.getAll();
      let items = all
        .filter((x) => (x as { __table: string; user_id: string }).__table === 'extra_expenses' && (x as { user_id: string }).user_id === user.id)
        .map((x) => x as ExtraExpense);
      if (unitId) items = items.filter((x) => x.unit_id === unitId);
      if (year) items = items.filter((x) => (x.data_competenza || '').startsWith(`${year}-`));
      items.sort((a, b) => (b.data_competenza || '').localeCompare(a.data_competenza || ''));
      return items;
    },
    enabled: !!user,
  });

  const createExpense = useMutation({
    mutationFn: async (expense: Omit<ExtraExpense, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
      if (!user) throw new Error('Non autenticato');
      const now = new Date().toISOString();
      const item: ExtraExpense & { __table: 'extra_expenses' } = { __table: 'extra_expenses', id: crypto.randomUUID(), user_id: user.id, created_at: now, updated_at: now, ...expense };
      db.add(item);
      return item;
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
      db.update(id, { ...updates, updated_at: new Date().toISOString() });
      const all: unknown[] = db.getAll();
      const found = all.find((x) => (x as { id: string }).id === id) as ExtraExpense | undefined;
      return found as ExtraExpense;
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
      db.delete(id);
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
