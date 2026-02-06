import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { useLeases } from '@/hooks/useLeases';
import { useUnits } from '@/hooks/useProperties';
import { useTenants } from '@/hooks/useTenants';
import { FileText, Plus, CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

const leaseSchema = z.object({
  unit_id: z.string().uuid('Seleziona un\'unità'),
  tenant_ids: z.array(z.string()).min(1, 'Seleziona almeno un conduttore'),
  codice_contratto_interno: z.string().max(50).optional().nullable(),
  tipo_contratto: z.enum(['4+4_abitativo', '3+2_agevolato', 'transitorio', 'commerciale_6+6', 'uso_foresteria', 'altro']),
  regime_locativo: z.enum(['cedolare_21', 'cedolare_10', 'ordinario_irpef']),
  data_inizio: z.date(),
  data_fine: z.date(),
  canone_mensile: z.coerce.number().positive('Il canone deve essere positivo'),
  spese_condominiali_mensili_previste: z.coerce.number().min(0).default(0),
  altre_spese_mensili_previste: z.coerce.number().min(0).default(0),
  deposito_cauzionale_importo: z.coerce.number().min(0).default(0),
  deposito_cauzionale_mesi: z.coerce.number().min(0).default(0),
  deposito_stato: z.enum(['non_versato', 'versato', 'parzialmente_restituito', 'restituito']),
  modalita_pagamento: z.string().max(50).default('bonifico'),
  iban_pagamento: z.string().max(34).optional().nullable(),
  stato_contratto: z.enum(['in_preparazione', 'attivo', 'cessato', 'rinnovato', 'contenzioso']),
  primo_anno_locazione: z.boolean().default(true),
  estremi_registrazione: z.string().max(100).optional().nullable(),
  note: z.string().max(1000).optional().nullable(),
}).refine((data) => data.data_fine > data.data_inizio, {
  message: 'La data di fine deve essere successiva alla data di inizio',
  path: ['data_fine'],
});

type LeaseFormData = z.infer<typeof leaseSchema>;

interface LeaseFormProps {
  unitId?: string;
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

const tipoContrattoOptions = [
  { value: '4+4_abitativo', label: '4+4 Abitativo' },
  { value: '3+2_agevolato', label: '3+2 Agevolato' },
  { value: 'transitorio', label: 'Transitorio' },
  { value: 'commerciale_6+6', label: 'Commerciale 6+6' },
  { value: 'uso_foresteria', label: 'Uso Foresteria' },
  { value: 'altro', label: 'Altro' },
];

const regimeOptions = [
  { value: 'cedolare_21', label: 'Cedolare 21%' },
  { value: 'cedolare_10', label: 'Cedolare 10%' },
  { value: 'ordinario_irpef', label: 'IRPEF Ordinario' },
];

const statoDepositoOptions = [
  { value: 'non_versato', label: 'Non versato' },
  { value: 'versato', label: 'Versato' },
  { value: 'parzialmente_restituito', label: 'Parzialmente restituito' },
  { value: 'restituito', label: 'Restituito' },
];

const statoContrattoOptions = [
  { value: 'in_preparazione', label: 'In preparazione' },
  { value: 'attivo', label: 'Attivo' },
  { value: 'cessato', label: 'Cessato' },
  { value: 'rinnovato', label: 'Rinnovato' },
  { value: 'contenzioso', label: 'Contenzioso' },
];

export function LeaseForm({ unitId, trigger, onSuccess }: LeaseFormProps) {
  const [open, setOpen] = useState(false);
  const { createLease } = useLeases();
  const { units } = useUnits();
  const { tenants } = useTenants();
  const queryClient = useQueryClient();

  const form = useForm<LeaseFormData>({
    resolver: zodResolver(leaseSchema),
    defaultValues: {
      unit_id: unitId || '',
      tenant_ids: [],
      codice_contratto_interno: '',
      tipo_contratto: '4+4_abitativo',
      regime_locativo: 'cedolare_21',
      data_inizio: new Date(),
      data_fine: new Date(new Date().setFullYear(new Date().getFullYear() + 4)),
      canone_mensile: 0,
      spese_condominiali_mensili_previste: 0,
      altre_spese_mensili_previste: 0,
      deposito_cauzionale_importo: 0,
      deposito_cauzionale_mesi: 0,
      deposito_stato: 'non_versato',
      modalita_pagamento: 'bonifico',
      iban_pagamento: '',
      stato_contratto: 'in_preparazione',
      primo_anno_locazione: true,
      estremi_registrazione: '',
      note: '',
    },
  });

  const [selectedTenants, setSelectedTenants] = useState<string[]>([]);

  const onSubmit = async (data: LeaseFormData) => {
    // Calculate duration in months
    const startDate = new Date(data.data_inizio);
    const endDate = new Date(data.data_fine);
    const durata_mesi = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30));
    
    const created = await createLease.mutateAsync({
      unit_id: data.unit_id,
      codice_contratto_interno: data.codice_contratto_interno || null,
      tipo_contratto: data.tipo_contratto,
      regime_locativo: data.regime_locativo,
      data_inizio: format(data.data_inizio, 'yyyy-MM-dd'),
      data_fine: format(data.data_fine, 'yyyy-MM-dd'),
      durata_mesi,
      canone_mensile: data.canone_mensile,
      spese_condominiali_mensili_previste: data.spese_condominiali_mensili_previste,
      altre_spese_mensili_previste: data.altre_spese_mensili_previste,
      deposito_cauzionale_importo: data.deposito_cauzionale_importo,
      deposito_cauzionale_mesi: data.deposito_cauzionale_mesi,
      deposito_stato: data.deposito_stato,
      data_versamento_deposito: null,
      data_restituzione_deposito: null,
      modalita_pagamento: data.modalita_pagamento,
      iban_pagamento: data.iban_pagamento || null,
      stato_contratto: data.stato_contratto,
      primo_anno_locazione: data.primo_anno_locazione,
      estremi_registrazione: data.estremi_registrazione || null,
      modello_rli_protocollo: null,
      note: data.note || null,
    });

    if (created && selectedTenants.length > 0) {
      const leaseId = created.id as string;
      const inserts = selectedTenants.map(tenantId => ({
        lease_id: leaseId,
        tenant_id: tenantId,
        ruolo: 'intestatario',
        quota_canone_percentuale: null,
        note: null,
      }));
      await supabase.from('lease_parties').insert(inserts);
      queryClient.invalidateQueries({ queryKey: ['lease_parties'] });
    }
    
    form.reset();
    setSelectedTenants([]);
    setOpen(false);
    onSuccess?.();
  };

  const toggleTenant = (tenantId: string) => {
    setSelectedTenants(prev => {
      const newSelection = prev.includes(tenantId)
        ? prev.filter(id => id !== tenantId)
        : [...prev, tenantId];
      form.setValue('tenant_ids', newSelection);
      return newSelection;
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Nuovo Contratto
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Nuovo Contratto di Locazione
          </DialogTitle>
          <DialogDescription>
            Inserisci i dati del contratto
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Unità */}
            <FormField
              control={form.control}
              name="unit_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Unità Immobiliare *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona unità" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {units.map(unit => (
                        <SelectItem key={unit.id} value={unit.id}>
                          {unit.nome_interno}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Conduttori */}
            <FormField
              control={form.control}
              name="tenant_ids"
              render={() => (
                <FormItem>
                  <FormLabel>Conduttori *</FormLabel>
                  <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto border rounded-md p-2">
                    {tenants.map(tenant => (
                      <label 
                        key={tenant.id} 
                        className={cn(
                          "flex items-center gap-2 p-2 rounded cursor-pointer hover:bg-muted",
                          selectedTenants.includes(tenant.id) && "bg-primary/10"
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={selectedTenants.includes(tenant.id)}
                          onChange={() => toggleTenant(tenant.id)}
                          className="rounded"
                        />
                        <span className="text-sm">
                          {tenant.tipo_soggetto === 'persona_fisica' 
                            ? `${tenant.nome} ${tenant.cognome}`
                            : tenant.ragione_sociale}
                        </span>
                      </label>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="tipo_contratto"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo Contratto *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {tipoContrattoOptions.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="regime_locativo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Regime Fiscale *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {regimeOptions.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Date */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="data_inizio"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Data Inizio *</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? format(field.value, "PPP", { locale: it }) : "Seleziona data"}
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
              <FormField
                control={form.control}
                name="data_fine"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Data Fine *</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? format(field.value, "PPP", { locale: it }) : "Seleziona data"}
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
            </div>

            {/* Importi */}
            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="canone_mensile"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Canone Mensile (€) *</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="800.00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="spese_condominiali_mensili_previste"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Spese Cond. (€)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="50.00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="altre_spese_mensili_previste"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Altre Spese (€)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="0.00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Deposito */}
            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="deposito_cauzionale_importo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Deposito (€)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="2400.00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="deposito_cauzionale_mesi"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mesi Deposito</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="3" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="deposito_stato"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stato Deposito</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {statoDepositoOptions.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Pagamento */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="modalita_pagamento"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Modalità Pagamento</FormLabel>
                    <FormControl>
                      <Input placeholder="Bonifico" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="iban_pagamento"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>IBAN Pagamento</FormLabel>
                    <FormControl>
                      <Input placeholder="IT60X0542811101000000123456" {...field} value={field.value || ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Stato e registrazione */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="stato_contratto"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stato Contratto</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {statoContrattoOptions.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="estremi_registrazione"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estremi Registrazione</FormLabel>
                    <FormControl>
                      <Input placeholder="N. protocollo" {...field} value={field.value || ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="primo_anno_locazione"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>Primo Anno di Locazione</FormLabel>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Note</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Note aggiuntive..." 
                      className="resize-none" 
                      {...field} 
                      value={field.value || ''} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Annulla
              </Button>
              <Button type="submit" disabled={createLease.isPending}>
                {createLease.isPending ? 'Salvataggio...' : 'Salva Contratto'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
