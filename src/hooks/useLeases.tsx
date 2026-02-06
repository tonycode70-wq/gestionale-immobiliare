import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from '@/components/ui/use-toast';

export interface Lease {
  id: string;
  unit_id: string;
  codice_contratto_interno: string | null;
  tipo_contratto: '4+4_abitativo' | '3+2_agevolato' | 'transitorio' | 'commerciale_6+6' | 'uso_foresteria' | 'altro';
  regime_locativo: 'cedolare_21' | 'cedolare_10' | 'ordinario_irpef';
  data_inizio: string;
  data_fine: string;
  durata_mesi: number | null;
  canone_mensile: number;
  spese_condominiali_mensili_previste: number;
  altre_spese_mensili_previste: number;
  deposito_cauzionale_importo: number;
  deposito_cauzionale_mesi: number;
  deposito_stato: 'non_versato' | 'versato' | 'parzialmente_restituito' | 'restituito';
  data_versamento_deposito: string | null;
  data_restituzione_deposito: string | null;
  modalita_pagamento: string;
  iban_pagamento: string | null;
  stato_contratto: 'in_preparazione' | 'attivo' | 'cessato' | 'rinnovato' | 'contenzioso';
  primo_anno_locazione: boolean;
  estremi_registrazione: string | null;
  modello_rli_protocollo: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface LeaseParty {
  id: string;
  lease_id: string;
  tenant_id: string;
  ruolo: 'intestatario' | 'co_intestatario' | 'garante';
  quota_canone_percentuale: number | null;
  note: string | null;
  created_at: string;
}

export function useLeases(unitId?: string) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: leases = [], isLoading, error } = useQuery({
    queryKey: ['leases', unitId],
    queryFn: async () => {
      if (!user) return [];
      
      let query = supabase.from('leases').select('*');
      if (unitId) {
        query = query.eq('unit_id', unitId);
      }
      
      const { data, error } = await query.order('data_inizio', { ascending: false });
      if (error) throw error;
      return data as Lease[];
    },
    enabled: !!user,
  });

  const createLease = useMutation({
    mutationFn: async (lease: Omit<Lease, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('leases')
        .insert(lease)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leases'] });
      toast({ title: 'Contratto creato', description: 'Il contratto è stato aggiunto con successo.' });
    },
    onError: (error) => {
      toast({ variant: 'destructive', title: 'Errore', description: error.message });
    }
  });

  const updateLease = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Lease> & { id: string }) => {
      const { data, error } = await supabase
        .from('leases')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leases'] });
      toast({ title: 'Contratto aggiornato', description: 'Le modifiche sono state salvate.' });
    },
    onError: (error) => {
      toast({ variant: 'destructive', title: 'Errore', description: error.message });
    }
  });

  const deleteLease = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('leases').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leases'] });
      toast({ title: 'Contratto eliminato', description: 'Il contratto è stato rimosso.' });
    },
    onError: (error) => {
      toast({ variant: 'destructive', title: 'Errore', description: error.message });
    }
  });

  return { leases, isLoading, error, createLease, updateLease, deleteLease };
}

export function useLeaseParties(leaseId?: string) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: parties = [], isLoading, error } = useQuery({
    queryKey: ['lease_parties', leaseId],
    queryFn: async () => {
      if (!user || !leaseId) return [];
      
      const { data, error } = await supabase
        .from('lease_parties')
        .select('*, tenant:tenants(*)')
        .eq('lease_id', leaseId);
      
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!leaseId,
  });

  const createLeaseParty = useMutation({
    mutationFn: async (party: Omit<LeaseParty, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('lease_parties')
        .insert(party)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lease_parties'] });
      toast({ title: 'Parte contrattuale aggiunta', description: 'La parte è stata aggiunta al contratto.' });
    },
    onError: (error) => {
      toast({ variant: 'destructive', title: 'Errore', description: error.message });
    }
  });

  const deleteLeaseParty = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('lease_parties').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lease_parties'] });
      toast({ title: 'Parte rimossa', description: 'La parte è stata rimossa dal contratto.' });
    },
    onError: (error) => {
      toast({ variant: 'destructive', title: 'Errore', description: error.message });
    }
  });

  return { parties, isLoading, error, createLeaseParty, deleteLeaseParty };
}
