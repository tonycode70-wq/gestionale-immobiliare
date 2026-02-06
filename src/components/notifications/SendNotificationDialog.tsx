import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useNotifications, reminderTemplates, smsTemplates } from '@/hooks/useNotifications';
import { Mail, MessageSquare, Send } from 'lucide-react';

const notificationSchema = z.object({
  type: z.enum(['email', 'sms']),
  to: z.string().min(1, 'Destinatario obbligatorio'),
  subject: z.string().optional(),
  body: z.string().min(1, 'Messaggio obbligatorio'),
});

type NotificationFormData = z.infer<typeof notificationSchema>;

interface SendNotificationDialogProps {
  trigger?: React.ReactNode;
  defaultTo?: string;
  defaultType?: 'email' | 'sms';
  tenantId?: string;
  leaseId?: string;
  reminderId?: string;
}

export function SendNotificationDialog({
  trigger,
  defaultTo = '',
  defaultType = 'email',
  tenantId,
  leaseId,
  reminderId,
}: SendNotificationDialogProps) {
  const [open, setOpen] = useState(false);
  const { sendNotification } = useNotifications();

  const form = useForm<NotificationFormData>({
    resolver: zodResolver(notificationSchema),
    defaultValues: {
      type: defaultType,
      to: defaultTo,
      subject: '',
      body: '',
    },
  });

  const notificationType = form.watch('type');

  const applyTemplate = (templateKey: string) => {
    if (notificationType === 'email') {
      const template = reminderTemplates[templateKey as keyof typeof reminderTemplates];
      if (template) {
        form.setValue('subject', template.subject);
        form.setValue('body', template.body);
      }
    } else {
      const template = smsTemplates[templateKey as keyof typeof smsTemplates];
      if (template) {
        form.setValue('body', template.body);
      }
    }
  };

  const onSubmit = async (data: NotificationFormData) => {
    await sendNotification.mutateAsync({
      type: data.type,
      to: data.to,
      subject: data.subject,
      body: data.body,
      tenantId,
      leaseId,
      reminderId,
    });
    form.reset();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline">
            <Send className="h-4 w-4 mr-2" />
            Invia Notifica
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Invia Notifica
          </DialogTitle>
          <DialogDescription>
            Invia una email o SMS al conduttore
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <Tabs
              defaultValue={defaultType}
              onValueChange={(v) => form.setValue('type', v as 'email' | 'sms')}
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="email" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email
                </TabsTrigger>
                <TabsTrigger value="sms" className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  SMS
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <FormField
              control={form.control}
              name="to"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {notificationType === 'email' ? 'Email destinatario' : 'Numero telefono'} *
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder={
                        notificationType === 'email'
                          ? 'esempio@email.it'
                          : '+39 333 1234567'
                      }
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Template selector */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Template rapido</label>
              <Select onValueChange={applyTemplate}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona template..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rentDue">Promemoria canone</SelectItem>
                  <SelectItem value="rentOverdue">Sollecito pagamento</SelectItem>
                  <SelectItem value="imuReminder">Promemoria IMU</SelectItem>
                  <SelectItem value="maintenanceReminder">Manutenzione</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {notificationType === 'email' && (
              <FormField
                control={form.control}
                name="subject"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Oggetto</FormLabel>
                    <FormControl>
                      <Input placeholder="Oggetto email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="body"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Messaggio *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Scrivi il messaggio..."
                      className="min-h-[150px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                  <p className="text-xs text-muted-foreground">
                    Usa {'{nome_conduttore}'}, {'{importo}'}, {'{data_scadenza}'}, {'{iban}'}, ecc.
                  </p>
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Annulla
              </Button>
              <Button type="submit" disabled={sendNotification.isPending}>
                {sendNotification.isPending ? 'Invio...' : 'Invia'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
