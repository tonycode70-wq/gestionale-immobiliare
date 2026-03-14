import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '../../utils/localStorageDB.js';
import { useAuth } from './useAuth';
import { useToast } from '@/components/ui/use-toast';

export interface Property {
  id: string;
  user_id: string;
  nome_complesso: string;
  indirizzo_via: string | null;
  indirizzo_civico: string | null;
  cap: string | null;
  citta: string | null;
  provincia: string | null;
  codice_fiscale_ente: string | null;
  note_generali: string | null;
  admin_id: string | null;
  proprietario_nome: string | null;
  proprietario_indirizzo: string | null;
  proprietario_cf_piva: string | null;
  created_at: string;
  updated_at: string;
}

export interface Unit {
  id: string;
  property_id: string;
  tipo_unita: 'appartamento' | 'locale_commerciale' | 'box' | 'cantina' | 'posto_auto' | 'altro';
  nome_interno: string;
  piano: string | null;
  interno: string | null;
  scala: string | null;
  metratura_mq: number | null;
  destinazione_uso: string | null;
  attiva: boolean;
  valore_immobile_stimato: number | null;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export function useProperties() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: properties = [], isLoading, error } = useQuery({
    queryKey: ['properties'],
    queryFn: async () => {
      const all: unknown[] = db.getAll();
      const items = all
        .filter((x) => (x as { __table: string }).__table === 'properties')
        .map((x) => x as Property);
      items.sort((a, b) => (a.nome_complesso || '').localeCompare(b.nome_complesso || ''));
      return items;
    },
    enabled: true,
  });

  const createProperty = useMutation({
    mutationFn: async (property: Omit<Property, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
      if (!user) throw new Error('Non autenticato');
      const now = new Date().toISOString();
      const item: Property & { __table: 'properties' } = { __table: 'properties', id: crypto.randomUUID(), user_id: user.id, admin_id: null, created_at: now, updated_at: now, ...property };
      db.add(item);
      const ok = db.verifyItem(item.id);
      if (!ok) throw new Error('Errore di salvataggio immobile');
      return item as Property;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      toast({ title: 'Immobile creato', description: 'L\'immobile è stato aggiunto con successo.' });
    },
    onError: (error) => {
      toast({ variant: 'destructive', title: 'Errore', description: error.message });
    }
  });

  const updateProperty = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Property> & { id: string }) => {
      const payload = { ...updates, updated_at: new Date().toISOString() };
      db.update(id, payload);
      const all: unknown[] = db.getAll();
      const found = all.find((x) => (x as { id: string }).id === id) as Property | undefined;
      const ok = found ? db.verifyItem(id) : false;
      if (!ok) throw new Error('Errore di salvataggio immobile');
      return found as Property;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      toast({ title: 'Immobile aggiornato', description: 'Le modifiche sono state salvate.' });
    },
    onError: (error) => {
      toast({ variant: 'destructive', title: 'Errore', description: error.message });
    }
  });

  const deleteProperty = useMutation({
    mutationFn: async (id: string) => {
      // Cascade delete related entities
      const all: unknown[] = db.getAll();
      const units = all.filter((x) => (x as { __table: string; property_id: string }).__table === 'units' && (x as { property_id: string }).property_id === id) as { id: string }[];
      const leases = all.filter((x) => (x as { __table: string; unit_id: string }).__table === 'leases' && units.some(u => u.id === (x as { unit_id: string }).unit_id)) as { id: string }[];
      const payments = all.filter((x) => (x as { __table: string; lease_id: string }).__table === 'payments' && leases.some(l => l.id === (x as { lease_id: string }).lease_id)) as { id: string }[];
      const expenses = all.filter((x) => (x as { __table: string }).__table === 'extra_expenses' && ((x as { property_id: string | null }).property_id === id || units.some(u => u.id === (x as { unit_id: string | null }).unit_id))) as { id: string }[];
      const reminders = all.filter((x) => (x as { __table: string }).__table === 'reminders' && ((x as { property_id: string | null }).property_id === id || units.some(u => u.id === (x as { unit_id: string | null }).unit_id))) as { id: string }[];
      const cadastral = all.filter((x) => (x as { __table: string; unit_id: string }).__table === 'cadastral_units' && units.some(u => u.id === (x as { unit_id: string }).unit_id)) as { id: string }[];
      const inventories = all.filter((x) => (x as { __table: string; unit_id: string }).__table === 'unit_inventories' && units.some(u => u.id === (x as { unit_id: string }).unit_id)) as { id: string }[];
      const leaseParties = all.filter((x) => (x as { __table: string; lease_id: string }).__table === 'lease_parties' && leases.some(l => l.id === (x as { lease_id: string }).lease_id)) as { id: string }[];
      const admin = all.find((x) => (x as { __table: string; property_id: string }).__table === 'property_admins' && (x as { property_id: string }).property_id === id) as { id: string } | undefined;
      // Delete children
      [...payments, ...expenses, ...reminders, ...cadastral, ...inventories, ...leaseParties, ...leases, ...units].forEach(e => db.delete(e.id));
      // Optionally remove admin link (keep admin record)
      if (admin) db.update(admin.id, { property_id: null });
      // Finally delete property
      db.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      toast({ title: 'Immobile eliminato', description: 'Sono stati rimossi anche unità, contratti e dati correlati.' });
    },
    onError: (error) => {
      toast({ variant: 'destructive', title: 'Errore', description: error.message });
    }
  });

  return { properties, isLoading, error, createProperty, updateProperty, deleteProperty };
}

export function useUnits(propertyId?: string) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: units = [], isLoading, error } = useQuery({
    queryKey: ['units', propertyId],
    queryFn: async () => {
      const all: unknown[] = db.getAll();
      let items = all.filter((x) => (x as { __table: string }).__table === 'units').map((x) => x as Unit);
      if (propertyId) {
        items = items.filter((x) => x.property_id === propertyId);
      }
      items.sort((a, b) => (a.nome_interno || '').localeCompare(b.nome_interno || ''));
      return items;
    },
    enabled: true,
  });

  const createUnit = useMutation({
    mutationFn: async (unit: Omit<Unit, 'id' | 'created_at' | 'updated_at'>) => {
      const now = new Date().toISOString();
      const item: Unit & { __table: 'units' } = { __table: 'units', id: crypto.randomUUID(), created_at: now, updated_at: now, ...unit };
      db.add(item);
      const ok = db.verifyItem(item.id);
      if (!ok) throw new Error('Errore di salvataggio unità');
      return item;
    },
    onSuccess: async (created: Unit) => {
      queryClient.invalidateQueries({ queryKey: ['units'] });
      // Semplificazione: niente stanze relazionali predefinite
      toast({ title: 'Unità creata', description: 'Ora puoi aggiungere beni e indicare la stanza come testo.' });
    },
    onError: (error) => {
      toast({ variant: 'destructive', title: 'Errore', description: error.message });
    }
  });

  const updateUnit = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Unit> & { id: string }) => {
      const payload = { ...updates, updated_at: new Date().toISOString() };
      db.update(id, payload);
      const all: unknown[] = db.getAll();
      const found = all.find((x) => (x as { id: string }).id === id) as Unit | undefined;
      return found as Unit;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['units'] });
      toast({ title: 'Unità aggiornata', description: 'Le modifiche sono state salvate.' });
    },
    onError: (error) => {
      toast({ variant: 'destructive', title: 'Errore', description: error.message });
    }
  });

  const deleteUnit = useMutation({
    mutationFn: async (id: string) => {
      db.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['units'] });
      toast({ title: 'Unità eliminata', description: 'L\'unità è stata rimossa.' });
    },
    onError: (error) => {
      toast({ variant: 'destructive', title: 'Errore', description: error.message });
    }
  });

  return { units, isLoading, error, createUnit, updateUnit, deleteUnit };
}
