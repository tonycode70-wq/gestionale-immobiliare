import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '../../utils/localStorageDB.js';
import { useAuth } from './useAuth';
import { useToast } from '@/components/ui/use-toast';

export interface Tenant {
  id: string;
  user_id: string;
  tipo_soggetto: 'persona_fisica' | 'persona_giuridica';
  nome: string | null;
  cognome: string | null;
  ragione_sociale: string | null;
  codice_fiscale: string | null;
  partita_iva: string | null;
  indirizzo_residenza: string | null;
  cap_residenza: string | null;
  citta_residenza: string | null;
  provincia_residenza: string | null;
  email: string | null;
  telefono: string | null;
  iban: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export function useTenants() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: tenants = [], isLoading, error } = useQuery({
    queryKey: ['tenants', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const all: unknown[] = db.getAll();
      const items = all
        .filter((x) => (x as { __table: string; user_id: string }).__table === 'tenants' && (x as { user_id: string }).user_id === user.id)
        .map((x) => x as Tenant);
      items.sort((a, b) => (a.cognome || '').localeCompare(b.cognome || ''));
      return items;
    },
    enabled: !!user,
  });

  const createTenant = useMutation({
    mutationFn: async (tenant: Omit<Tenant, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
      if (!user) throw new Error('Non autenticato');
      const now = new Date().toISOString();
      const item: Tenant & { __table: 'tenants' } = { __table: 'tenants', id: crypto.randomUUID(), user_id: user.id, created_at: now, updated_at: now, ...tenant };
      db.add(item);
      return item;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      toast({ title: 'Conduttore creato', description: 'Il conduttore è stato aggiunto con successo.' });
    },
    onError: (error) => {
      toast({ variant: 'destructive', title: 'Errore', description: error.message });
    }
  });

  const updateTenant = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Tenant> & { id: string }) => {
      const payload = { ...updates, updated_at: new Date().toISOString() };
      db.update(id, payload);
      const all: unknown[] = db.getAll();
      const found = all.find((x) => (x as { id: string }).id === id) as Tenant | undefined;
      return found as Tenant;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      toast({ title: 'Conduttore aggiornato', description: 'Le modifiche sono state salvate.' });
    },
    onError: (error) => {
      toast({ variant: 'destructive', title: 'Errore', description: error.message });
    }
  });

  const deleteTenant = useMutation({
    mutationFn: async (id: string) => {
      db.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      toast({ title: 'Conduttore eliminato', description: 'Il conduttore è stato rimosso.' });
    },
    onError: (error) => {
      toast({ variant: 'destructive', title: 'Errore', description: error.message });
    }
  });

  return { tenants, isLoading, error, createTenant, updateTenant, deleteTenant };
}
