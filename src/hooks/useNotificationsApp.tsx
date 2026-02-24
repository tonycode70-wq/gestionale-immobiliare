import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '../../utils/localStorageDB.js';
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
      const all: unknown[] = db.getAll();
      const items = all
        .filter((x) => (x as { __table: string; user_id: string }).__table === 'notifications' && (x as { user_id: string }).user_id === user.id)
        .map((x) => x as AppNotification)
        .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
        .slice(0, 50);
      return items;
    },
    enabled: !!user,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const unreadCount = notifications.filter(n => !n.letta).length;

  const markAsRead = useMutation({
    mutationFn: async (id: string) => {
      db.update(id, { letta: true, data_lettura: new Date().toISOString() });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markAllAsRead = useMutation({
    mutationFn: async () => {
      if (!user) return;
      const all: unknown[] = db.getAll();
      const targetIds = all
        .filter((x) => (x as { __table: string; user_id: string; letta: boolean }).__table === 'notifications'
          && (x as { user_id: string }).user_id === user.id
          && !(x as { letta: boolean }).letta)
        .map((x) => (x as { id: string }).id);
      targetIds.forEach((id) => db.update(id, { letta: true, data_lettura: new Date().toISOString() }));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast({ title: 'Notifiche lette', description: 'Tutte le notifiche sono state segnate come lette.' });
    },
  });

  const createNotification = useMutation({
    mutationFn: async (notification: Omit<AppNotification, 'id' | 'user_id' | 'letta' | 'data_lettura' | 'created_at'>) => {
      if (!user) throw new Error('Non autenticato');
      const now = new Date().toISOString();
      const item: AppNotification & { __table: 'notifications' } = {
        __table: 'notifications',
        id: crypto.randomUUID(),
        user_id: user.id,
        titolo: notification.titolo,
        tipo: notification.tipo,
        messaggio: notification.messaggio ?? null,
        letta: false,
        data_lettura: null,
        riferimento_tipo: notification.riferimento_tipo ?? null,
        riferimento_id: notification.riferimento_id ?? null,
        created_at: now,
      };
      db.add(item);
      return item;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const deleteNotification = useMutation({
    mutationFn: async (id: string) => {
      db.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const deleteAllRead = useMutation({
    mutationFn: async () => {
      if (!user) return;
      const all: unknown[] = db.getAll();
      const targetIds = all
        .filter((x) => (x as { __table: string; user_id: string; letta: boolean }).__table === 'notifications'
          && (x as { user_id: string }).user_id === user.id
          && (x as { letta: boolean }).letta)
        .map((x) => (x as { id: string }).id);
      targetIds.forEach((id) => db.delete(id));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast({ title: 'Notifiche eliminate', description: 'Le notifiche lette sono state eliminate.' });
    },
  });

  // Check fiscal deadlines on mount
  const checkFiscalDeadlines = useCallback(async () => {
    if (!user) return;
    // Simulazione locale: nessuna azione remota
  }, [user]);

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
