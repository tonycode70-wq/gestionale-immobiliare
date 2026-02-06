import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
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
      
      let query = supabase.from('property_admins').select('*');
      
      if (propertyId) {
        query = query.eq('property_id', propertyId);
      }
      
      const { data, error } = await query.order('ragione_sociale');
      if (error) throw error;
      return data as PropertyAdmin[];
    },
    enabled: !!user,
  });

  // Get admin for a specific property (1:1 relationship)
  const admin = propertyId ? admins.find(a => a.property_id === propertyId) : null;

  const createAdmin = useMutation({
    mutationFn: async (admin: Omit<PropertyAdmin, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('property_admins')
        .insert(admin)
        .select()
        .single();
      
      if (error) throw error;
      return data;
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
      const { data, error } = await supabase
        .from('property_admins')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
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
      const { error } = await supabase.from('property_admins').delete().eq('id', id);
      if (error) throw error;
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
