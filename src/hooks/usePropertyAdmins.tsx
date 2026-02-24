import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '../../utils/localStorageDB.js';
import { useAuth } from './useAuth';
import { useToast } from '@/components/ui/use-toast';

export interface PropertyAdmin {
  id: string;
  property_id: string;
  ragione_sociale: string | null;
  nome_referente: string | null;
  telefono_studio: string | null;
  cellulare_urgenze: string | null;
  email: string | null;
  email_pec: string | null;
  codice_fiscale: string | null;
  partita_iva: string | null;
  numero_rea: string | null;
  sede_legale_indirizzo: string | null;
  sede_legale_citta: string | null;
  sede_legale_cap: string | null;
  sede_legale_provincia: string | null;
  sede_operativa_indirizzo: string | null;
  sede_operativa_citta: string | null;
  sede_operativa_cap: string | null;
  sede_operativa_provincia: string | null;
  note: string | null;
  iban_pagamento: string | null;
  bic_swift: string | null;
  nome_banca: string | null;
  intestatario_conto: string | null;
  created_at: string;
  updated_at: string;
}

export function usePropertyAdmins(propertyId?: string) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: admins = [], isLoading, error } = useQuery({
    queryKey: ['property_admins', propertyId],
    queryFn: async () => {
      if (!user) return [];
      
      const all: unknown[] = db.getAll();
      let items = all.filter((x) => (x as { __table: string }).__table === 'property_admins').map((x) => x as PropertyAdmin);
      if (propertyId) {
        items = items.filter((x) => x.property_id === propertyId);
      }
      items.sort((a, b) => (a.ragione_sociale || '').localeCompare(b.ragione_sociale || ''));
      return items;
    },
    enabled: !!user,
  });

  // Get admin for a specific property (1:1 relationship)
  const admin = propertyId ? admins.find(a => a.property_id === propertyId) : null;

  const createAdmin = useMutation({
    mutationFn: async (admin: Omit<PropertyAdmin, 'id' | 'created_at' | 'updated_at'>) => {
      const now = new Date().toISOString();
      const item: PropertyAdmin & { __table: 'property_admins' } = { __table: 'property_admins', id: crypto.randomUUID(), created_at: now, updated_at: now, ...admin };
      db.add(item);
      return item;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['property_admins'] });
      toast({ title: 'Amministratore aggiunto', description: 'L\'amministratore è stato associato all\'immobile.' });
    },
    onError: (error) => {
      toast({ variant: 'destructive', title: 'Errore', description: error.message });
    }
  });

  const updateAdmin = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<PropertyAdmin> & { id: string }) => {
      db.update(id, { ...updates, updated_at: new Date().toISOString() });
      const all: unknown[] = db.getAll();
      const found = all.find((x) => (x as { id: string }).id === id) as PropertyAdmin | undefined;
      return found as PropertyAdmin;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['property_admins'] });
      toast({ title: 'Amministratore aggiornato', description: 'Le modifiche sono state salvate.' });
    },
    onError: (error) => {
      toast({ variant: 'destructive', title: 'Errore', description: error.message });
    }
  });

  const deleteAdmin = useMutation({
    mutationFn: async (id: string) => {
      db.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['property_admins'] });
      toast({ title: 'Amministratore rimosso', description: 'L\'amministratore è stato rimosso dall\'immobile.' });
    },
    onError: (error) => {
      toast({ variant: 'destructive', title: 'Errore', description: error.message });
    }
  });

  return { admins, admin, isLoading, error, createAdmin, updateAdmin, deleteAdmin };
}
