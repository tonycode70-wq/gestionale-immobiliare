import { useState } from 'react';
import { Bell, Check, CheckCheck, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useNotificationsApp, type AppNotification } from '@/hooks/useNotificationsApp';
import { formatDistanceToNow } from 'date-fns';
import { it } from 'date-fns/locale';
import { cn } from '@/lib/utils';

function NotificationItem({ 
  notification, 
  onMarkRead, 
  onDelete 
}: { 
  notification: AppNotification; 
  onMarkRead: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const getTypeColor = (tipo: string) => {
    switch (tipo) {
      case 'WARNING': return 'bg-warning text-warning-foreground';
      case 'ERROR': return 'bg-destructive text-destructive-foreground';
      case 'SUCCESS': return 'bg-success text-success-foreground';
      case 'REMINDER': return 'bg-info text-info-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getTypeLabel = (tipo: string) => {
    switch (tipo) {
      case 'WARNING': return 'Attenzione';
      case 'ERROR': return 'Errore';
      case 'SUCCESS': return 'Successo';
      case 'REMINDER': return 'Promemoria';
      default: return 'Info';
    }
  };

  return (
    <div className={cn(
      'p-3 border-b border-border/50 transition-colors',
      !notification.letta && 'bg-primary/5'
    )}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className={cn('text-xs', getTypeColor(notification.tipo))}>
              {getTypeLabel(notification.tipo)}
            </Badge>
            {!notification.letta && (
              <span className="w-2 h-2 bg-primary rounded-full" />
            )}
          </div>
          <h4 className="font-medium text-sm text-foreground truncate">{notification.titolo}</h4>
          {notification.messaggio && (
            <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{notification.messaggio}</p>
          )}
          <p className="text-xs text-muted-foreground mt-1">
            {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true, locale: it })}
          </p>
        </div>
        <div className="flex items-center gap-1">
          {!notification.letta && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => onMarkRead(notification.id)}
            >
              <Check className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            onClick={() => onDelete(notification.id)}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const { 
    notifications, 
    unreadCount, 
    markAsRead, 
    markAllAsRead, 
    deleteNotification,
    deleteAllRead,
  } = useNotificationsApp();

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs bg-destructive"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md p-0">
        <SheetHeader className="p-4 border-b">
          <div className="flex items-center justify-between">
            <div>
              <SheetTitle>Notifiche</SheetTitle>
              <SheetDescription>
                {unreadCount > 0 ? `${unreadCount} da leggere` : 'Nessuna nuova notifica'}
              </SheetDescription>
            </div>
            <div className="flex gap-1">
              {unreadCount > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => markAllAsRead.mutate()}
                  disabled={markAllAsRead.isPending}
                >
                  <CheckCheck className="h-4 w-4 mr-1" />
                  Leggi tutte
                </Button>
              )}
            </div>
          </div>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-140px)]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Bell className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground">Nessuna notifica</p>
            </div>
          ) : (
            notifications.map(notification => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onMarkRead={(id) => markAsRead.mutate(id)}
                onDelete={(id) => deleteNotification.mutate(id)}
              />
            ))
          )}
        </ScrollArea>

        {notifications.some(n => n.letta) && (
          <div className="p-3 border-t">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-muted-foreground"
              onClick={() => deleteAllRead.mutate()}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Elimina notifiche lette
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
