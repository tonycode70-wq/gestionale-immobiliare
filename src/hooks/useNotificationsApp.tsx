import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from '@/components/ui/use-toast';
import { useEffect, useCallback } from 'react';

export interface AppNotification {
  id: string;
  user_id: string;
  tipo: 'INFO' | 'WARNING' | 'ERROR' | 'SUCCESS' | 'REMINDER';
  titolo: string;
  messaggio: string | null;
  letta: boolean;
  data_lettura: string | null;
  riferimento_tipo: string | null;
  riferimento_id: string | null;
  created_at: string;
}

export function useNotificationsApp() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading, error } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data as AppNotification[];
    },
    enabled: !!user,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const unreadCount = notifications.filter(n => !n.letta).length;

  const markAsRead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ letta: true, data_lettura: new Date().toISOString() })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markAllAsRead = useMutation({
    mutationFn: async () => {
      if (!user) return;
      
      const { error } = await supabase
        .from('notifications')
        .update({ letta: true, data_lettura: new Date().toISOString() })
        .eq('user_id', user.id)
        .eq('letta', false);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast({ title: 'Notifiche lette', description: 'Tutte le notifiche sono state segnate come lette.' });
    },
  });

  const createNotification = useMutation({
    mutationFn: async (notification: Omit<AppNotification, 'id' | 'user_id' | 'letta' | 'data_lettura' | 'created_at'>) => {
      if (!user) throw new Error('Non autenticato');
      
      const { data, error } = await supabase
        .from('notifications')
        .insert({ ...notification, user_id: user.id })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const deleteNotification = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('notifications').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const deleteAllRead = useMutation({
    mutationFn: async () => {
      if (!user) return;
      
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', user.id)
        .eq('letta', true);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast({ title: 'Notifiche eliminate', description: 'Le notifiche lette sono state eliminate.' });
    },
  });

  // Check fiscal deadlines on mount
  const checkFiscalDeadlines = useCallback(async () => {
    if (!user) return;
    
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) return;

      const response = await supabase.functions.invoke('check-fiscal-deadlines', {
        headers: {
          Authorization: `Bearer ${session.session.access_token}`,
        },
      });
      
      if (response.data?.notificationsCreated > 0) {
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
      }
    } catch (error) {
      console.error('Error checking fiscal deadlines:', error);
    }
  }, [user, queryClient]);

  // Check deadlines on mount (riattivato)
  useEffect(() => {
    if (user) {
      checkFiscalDeadlines();
    }
  }, [user, checkFiscalDeadlines]);

  return { 
    notifications, 
    unreadCount,
    isLoading, 
    error, 
    markAsRead, 
    markAllAsRead,
    createNotification,
    deleteNotification,
    deleteAllRead,
    checkFiscalDeadlines,
  };
}
