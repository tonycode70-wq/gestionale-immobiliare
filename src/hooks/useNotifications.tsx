import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

interface SendNotificationParams {
  type: 'email' | 'sms';
  to: string;
  subject?: string;
  body: string;
  templateData?: Record<string, string>;
  leaseId?: string;
  tenantId?: string;
  reminderId?: string;
}

export function useNotifications() {
  const { toast } = useToast();

  const sendNotification = useMutation({
    mutationFn: async (params: SendNotificationParams) => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Non autenticato');
      }

      const response = await supabase.functions.invoke('send-notification', {
        body: params,
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      return response.data;
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: 'Notifica inviata',
          description: data.message,
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Invio fallito',
          description: data.message,
        });
      }
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Errore',
        description: error.message,
      });
    },
  });

  return { sendNotification };
}

// Utility function to get reminder templates
export const reminderTemplates = {
  rentDue: {
    subject: 'Promemoria: Canone in scadenza',
    body: `<p>Gentile {nome_conduttore},</p>
<p>Le ricordiamo che il canone di locazione di <strong>€ {importo}</strong> per l'immobile in <strong>{indirizzo_immobile}</strong> è in scadenza il <strong>{data_scadenza}</strong>.</p>
<p>Modalità di pagamento: Bonifico su IBAN <strong>{iban}</strong></p>
<p>Cordiali saluti,<br/>PropertyManager</p>`,
  },
  rentOverdue: {
    subject: 'Sollecito: Canone non pagato',
    body: `<p>Gentile {nome_conduttore},</p>
<p>Risulta non ancora ricevuto il pagamento del canone di locazione di <strong>€ {importo}</strong> relativo al mese di <strong>{mese}</strong> per l'immobile in <strong>{indirizzo_immobile}</strong>.</p>
<p>La preghiamo di provvedere al pagamento con la massima urgenza.</p>
<p>IBAN: <strong>{iban}</strong></p>
<p>Cordiali saluti,<br/>PropertyManager</p>`,
  },
  imuReminder: {
    subject: 'Promemoria: Scadenza IMU',
    body: `<p>Promemoria: la scadenza per il pagamento dell'IMU ({rata}) per l'anno {anno} è fissata per il <strong>{data_scadenza}</strong>.</p>
<p>Importo: <strong>€ {importo}</strong></p>`,
  },
  maintenanceReminder: {
    subject: 'Promemoria: Manutenzione programmata',
    body: `<p>Promemoria: è prevista una manutenzione per <strong>{titolo}</strong> in data <strong>{data_scadenza}</strong>.</p>
<p>{descrizione}</p>`,
  },
};

// SMS templates (shorter versions)
export const smsTemplates = {
  rentDue: {
    body: 'Promemoria: canone € {importo} in scadenza il {data_scadenza}. IBAN: {iban}',
  },
  rentOverdue: {
    body: 'URGENTE: canone € {importo} mese {mese} non pagato. Contattare per info.',
  },
  imuReminder: {
    body: 'Promemoria IMU {rata} {anno}: € {importo} entro {data_scadenza}',
  },
};
