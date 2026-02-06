import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
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
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/components/ui/use-toast';
import { useProperties, useUnits } from '@/hooks/useProperties';
import { useLeases, useLeaseParties } from '@/hooks/useLeases';
import { usePayments } from '@/hooks/usePayments';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import type { Unit, Lease, Tenant, Payment as PaymentType } from '@/types';
import { Euro, CalendarIcon, Plus } from 'lucide-react';

const paymentSchema = z.object({
  unit_id: z.string().min(1, 'Seleziona l’unità'),
  lease_id: z.string().min(1, 'Seleziona il contratto'),
  tenant_id: z.string().min(1, 'Seleziona il conduttore'),
  data_pagamento: z.date(),
  importo_totale_incassato: z.coerce.number().min(0, 'Importo non valido'),
  quota_affitto: z.coerce.number().min(0, 'Quota affitto non valida'),
  quota_spese: z.coerce.number().min(0, 'Quota spese non valida'),
  metodo_pagamento_effettivo: z.enum(['bonifico', 'contanti']),
}).refine((d) => Math.abs((d.quota_affitto + d.quota_spese) - d.importo_totale_incassato) < 0.01, {
  message: 'Somma quote deve uguagliare l’importo totale',
  path: ['importo_totale_incassato'],
});

type PaymentFormData = z.infer<typeof paymentSchema>;

interface PaymentFormProps {
  trigger?: React.ReactNode;
  unitId?: string;
  payment?: PaymentType;
  lease?: Lease;
  unit?: Unit;
  tenant?: Tenant;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSuccess?: () => void;
}

export function PaymentForm({ trigger, unitId, payment, lease, unit, tenant, open, onOpenChange, onSuccess }: PaymentFormProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const { toast } = useToast();
  const { properties } = useProperties();
  const { units } = useUnits();
  const { leases } = useLeases();
  const [selectedLeaseId, setSelectedLeaseId] = useState<string>('');
  const { parties } = useLeaseParties(selectedLeaseId || undefined);
  const { createPayment, updatePayment } = usePayments();

  const form = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      unit_id: payment ? (unit?.id || '') : (unitId || ''),
      lease_id: payment ? payment.lease_id : '',
      tenant_id: payment ? (tenant?.id || '') : '',
      data_pagamento: payment?.data_pagamento ? new Date(payment.data_pagamento) : new Date(),
      importo_totale_incassato: payment ? (payment.importo_canone_pagato + payment.importo_spese_pagato) : 0,
      quota_affitto: payment ? payment.importo_canone_pagato : 0,
      quota_spese: payment ? payment.importo_spese_pagato : 0,
      metodo_pagamento_effettivo: payment?.metodo_pagamento_effettivo || 'bonifico',
    },
  });

  const unitOptions = useMemo(() => {
    return units.map((u: Unit) => {
      const property = properties.find(p => p.id === u.property_id);
      return { id: u.id, label: property ? `${property.nome_complesso} • ${u.nome_interno}` : u.nome_interno };
    });
  }, [units, properties]);

  const unitIdSelected = form.watch('unit_id');
  const leaseIdSelected = form.watch('lease_id');
  const tenantIdSelected = form.watch('tenant_id');
  const leaseOptions = useMemo(() => {
    return leases
      .filter((l: Lease) => !unitIdSelected || l.unit_id === unitIdSelected)
      .map(l => ({ id: l.id, label: `${l.tipo_contratto} • ${format(new Date(l.data_inizio), 'dd/MM/yyyy')} - ${format(new Date(l.data_fine), 'dd/MM/yyyy')}` }));
  }, [leases, unitIdSelected]);

  const tenantOptions = useMemo(() => {
    return (parties || [])
      .filter(p => p.ruolo === 'intestatario' || p.ruolo === 'co_intestatario')
      .map(p => {
        const t = p.tenant as Tenant;
        const label = t?.tipo_soggetto === 'persona_fisica' ? `${t?.nome || ''} ${t?.cognome || ''}`.trim() : t?.ragione_sociale || '';
        return { id: p.tenant_id, label: label || 'Conduttore' };
      });
  }, [parties]);

  useEffect(() => {
    setSelectedLeaseId(leaseIdSelected);
  }, [leaseIdSelected]);

  useEffect(() => {
    const leaseSelected = leases.find(l => l.id === leaseIdSelected);
    const canone = leaseSelected?.canone_mensile || 0;
    const spese = leaseSelected?.spese_condominiali_mensili_previste || 0;
    if (tenantIdSelected && leaseSelected) {
      form.setValue('quota_affitto', canone, { shouldValidate: true });
      form.setValue('quota_spese', spese, { shouldValidate: true });
      form.setValue('importo_totale_incassato', canone + spese, { shouldValidate: true });
    }
  }, [tenantIdSelected, leaseIdSelected, leases, form]);

  const onSubmit = async (data: PaymentFormData) => {
    try {
      if (payment) {
        const totalePagato = data.quota_affitto + data.quota_spese;
        const residuo = (payment.importo_totale_previsto || 0) - totalePagato;
        const stato = residuo > 0.01 ? 'PARZIALE' as const : 'PAGATO' as const;
        await updatePayment.mutateAsync({
          id: payment.id,
          importo_canone_pagato: data.quota_affitto,
          importo_spese_pagato: data.quota_spese,
          data_pagamento: format(data.data_pagamento, 'yyyy-MM-dd'),
          importo_residuo_calcolato: residuo,
          stato_pagamento: stato,
          metodo_pagamento_effettivo: data.metodo_pagamento_effettivo,
        });
        toast({ title: 'Incasso aggiornato', description: 'Le modifiche sono state salvate.' });
      } else {
        const year = new Date(data.data_pagamento).getFullYear();
        const month = new Date(data.data_pagamento).getMonth() + 1;
        const totalePrevisto = data.quota_affitto + data.quota_spese;
        const payload = {
          lease_id: data.lease_id,
          competenza_anno: year,
          competenza_mese: month,
          importo_canone_previsto: data.quota_affitto,
          importo_spese_previste: data.quota_spese,
          importo_totale_previsto: totalePrevisto,
          data_scadenza: format(data.data_pagamento, 'yyyy-MM-dd'),
          data_pagamento: format(data.data_pagamento, 'yyyy-MM-dd'),
          importo_canone_pagato: data.quota_affitto,
          importo_spese_pagato: data.quota_spese,
          importo_residuo_calcolato: 0,
          stato_pagamento: 'PAGATO' as const,
          metodo_pagamento_effettivo: data.metodo_pagamento_effettivo,
          note: null,
        };
        await createPayment.mutateAsync(payload);
        toast({ title: 'Incasso registrato', description: 'Il pagamento è stato salvato correttamente.' });
      }
      if (onOpenChange) {
        onOpenChange(false);
      } else {
        setInternalOpen(false);
      }
      form.reset();
      onSuccess?.();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Errore sconosciuto';
      toast({ variant: 'destructive', title: 'Errore', description: message });
    }
  };

  return (
    <Dialog open={open ?? internalOpen} onOpenChange={onOpenChange ?? setInternalOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Registra incasso
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Euro className="h-5 w-5" />
            {payment ? 'Modifica incasso' : 'Registra incasso'}
          </DialogTitle>
          <DialogDescription>
            {payment ? 'Aggiorna i dettagli dell’incasso' : 'Inserisci i dettagli dell’incasso manuale'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="unit_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Unità *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={!!payment}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona unità" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {unitOptions.map(u => (
                        <SelectItem key={u.id} value={u.id}>{u.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="lease_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contratto *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={!!payment}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona contratto" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {leaseOptions.map(l => (
                        <SelectItem key={l.id} value={l.id}>{l.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="tenant_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Conduttore *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={!!payment}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona conduttore" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {tenantOptions.map(t => (
                        <SelectItem key={t.id || 'tenant-null'} value={t.id || ''}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="data_pagamento"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Data incasso *</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn('pl-3 text-left font-normal', !field.value && 'text-muted-foreground')}
                        >
                          {field.value ? format(field.value, 'PPP', { locale: it }) : 'Seleziona data'}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="importo_totale_incassato"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Importo totale (€) *</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="1000.00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="quota_affitto"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quota affitto (€) *</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="900.00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="quota_spese"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quota spese (€) *</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="100.00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="metodo_pagamento_effettivo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Metodo di pagamento *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona metodo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="bonifico">Bonifico</SelectItem>
                      <SelectItem value="contanti">Contanti</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  if (onOpenChange) onOpenChange(false); else setInternalOpen(false);
                }}
              >
                Annulla
              </Button>
              <Button 
                type="submit" 
                disabled={payment ? updatePayment.isPending : createPayment.isPending}
              >
                {payment ? 'Salva modifiche' : 'Registra incasso'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
