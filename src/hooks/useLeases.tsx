import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '../../utils/localStorageDB.js';
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
      const all: unknown[] = db.getAll();
      let items = all.filter((x) => (x as { __table: string }).__table === 'leases').map((x) => x as Lease);
      if (unitId) {
        items = items.filter((x) => x.unit_id === unitId);
      }
      items.sort((a, b) => (b.data_inizio || '').localeCompare(a.data_inizio || ''));
      return items;
    },
    enabled: !!user,
  });

  const createLease = useMutation({
    mutationFn: async (lease: Omit<Lease, 'id' | 'created_at' | 'updated_at'>) => {
      const now = new Date().toISOString();
      const item: Lease & { __table: 'leases' } = { __table: 'leases', id: crypto.randomUUID(), created_at: now, updated_at: now, ...lease };
      db.add(item);
      return item;
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
      const payload = { ...updates, updated_at: new Date().toISOString() };
      db.update(id, payload);
      const all: unknown[] = db.getAll();
      const found = all.find((x) => (x as { id: string }).id === id) as Lease | undefined;
      return found as Lease;
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
      db.delete(id);
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
      const all: unknown[] = db.getAll();
      const parties = all
        .filter((x) => (x as { __table: string; lease_id: string }).__table === 'lease_parties' && (x as { lease_id: string }).lease_id === leaseId)
        .map((x) => x as LeaseParty);
      const tenants = all.filter((x) => (x as { __table: string }).__table === 'tenants').map((x) => x as { id: string } & Record<string, unknown>);
      const joined = parties.map((p) => ({ ...p, tenant: tenants.find((t) => t.id === p.tenant_id) || null }));
      return joined as (LeaseParty & { tenant: Record<string, unknown> | null })[];
    },
    enabled: !!user && !!leaseId,
  });

  const createLeaseParty = useMutation({
    mutationFn: async (party: Omit<LeaseParty, 'id' | 'created_at'>) => {
      const item: LeaseParty & { __table: 'lease_parties' } = { __table: 'lease_parties', id: crypto.randomUUID(), created_at: new Date().toISOString(), ...party };
      db.add(item);
      return item as LeaseParty;
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
      db.delete(id);
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
