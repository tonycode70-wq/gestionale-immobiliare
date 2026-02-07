import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
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
    queryKey: ['properties', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .order('nome_complesso');
      
      if (error) throw error;
      return data as Property[];
    },
    enabled: !!user,
  });

  const createProperty = useMutation({
    mutationFn: async (property: Omit<Property, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
      if (!user) throw new Error('Non autenticato');
      
      const { data, error } = await supabase
        .from('properties')
        .insert({ ...property, user_id: user.id })
        .select()
        .single();
      
      if (error) throw error;
      return data;
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
      const { data, error } = await supabase
        .from('properties')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
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
      const { error } = await supabase.from('properties').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      toast({ title: 'Immobile eliminato', description: 'L\'immobile è stato rimosso.' });
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
      if (!user) return [];
      
      let query = supabase.from('units').select('*');
      if (propertyId) {
        query = query.eq('property_id', propertyId);
      }
      
      const { data, error } = await query.order('nome_interno');
      if (error) throw error;
      return data as Unit[];
    },
    enabled: !!user,
  });

  const createUnit = useMutation({
    mutationFn: async (unit: Omit<Unit, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('units')
        .insert(unit)
        .select()
        .single();
      
      if (error) throw error;
      return data;
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
      const { data, error } = await supabase
        .from('units')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
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
      const { error } = await supabase.from('units').delete().eq('id', id);
      if (error) throw error;
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
