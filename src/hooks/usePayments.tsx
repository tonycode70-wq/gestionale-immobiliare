import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '../../utils/localStorageDB.js';
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
      const all: unknown[] = db.getAll();
      let items = all.filter((x) => (x as { __table: string }).__table === 'payments').map((x) => x as Payment);
      if (leaseId) items = items.filter((x) => x.lease_id === leaseId);
      if (year) items = items.filter((x) => x.competenza_anno === year);
      items.sort((a: Payment, b: Payment) => {
        if (a.competenza_anno !== b.competenza_anno) return b.competenza_anno - a.competenza_anno;
        return b.competenza_mese - a.competenza_mese;
      });
      return items;
    },
    enabled: !!user,
  });

  const createPayment = useMutation({
    mutationFn: async (payment: Omit<Payment, 'id' | 'created_at' | 'updated_at'>) => {
      const now = new Date().toISOString();
      const item: Payment & { __table: 'payments' } = { __table: 'payments', id: crypto.randomUUID(), created_at: now, updated_at: now, ...payment };
      db.add(item);
      return item;
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
      db.update(id, { ...updates, updated_at: new Date().toISOString() });
      const all: unknown[] = db.getAll();
      const found = all.find((x) => (x as { id: string }).id === id) as Payment | undefined;
      return found as Payment;
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
      const current = db.getAll().find((x) => (x as { id: string }).id === id) as (Payment & { __table?: string }) | undefined;
      if (!current || current.__table !== 'payments') throw new Error('Pagamento non trovato');

      const totalePagato = importo_canone_pagato + importo_spese_pagato;
      const totalePrevisto = current.importo_totale_previsto;
      const residuo = totalePrevisto - totalePagato;
      
      let stato: 'PAGATO' | 'PARZIALE' | 'IN_RITARDO' = 'PAGATO';
      if (residuo > 0.01) {
        stato = 'PARZIALE';
      }

      db.update(id, {
        importo_canone_pagato,
        importo_spese_pagato,
        data_pagamento,
        importo_residuo_calcolato: residuo,
        stato_pagamento: stato,
        updated_at: new Date().toISOString(),
      });
      const updated = db.getAll().find((x) => (x as { id: string }).id === id) as Payment | undefined;
      return updated as Payment;
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
      db.delete(id);
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
