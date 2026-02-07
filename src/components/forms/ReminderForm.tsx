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
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { CalendarDays, Plus, CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUnits } from '@/hooks/useProperties';

const reminderSchema = z.object({
  titolo: z.string().min(1, 'Il titolo è obbligatorio').max(200),
  tipo: z.enum(['MANUTENZIONE', 'FISCALE', 'CONTRATTUALE', 'ASSICURATIVO', 'ALTRO']),
  descrizione: z.string().max(1000).optional().nullable(),
  data_scadenza: z.date(),
  ricorrente: z.boolean().default(false),
  frequenza_mesi: z.coerce.number().min(1).optional().nullable(),
  giorni_anticipo_promemoria: z.coerce.number().min(0).default(7),
  note: z.string().max(1000).optional().nullable(),
  unit_id: z.string().default('general'),
});

type ReminderFormData = z.infer<typeof reminderSchema>;

interface ReminderFormProps {
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

const tipoOptions = [
  { value: 'MANUTENZIONE', label: 'Manutenzione', emoji: '🔧' },
  { value: 'FISCALE', label: 'Fiscale', emoji: '📋' },
  { value: 'CONTRATTUALE', label: 'Contrattuale', emoji: '📄' },
  { value: 'ASSICURATIVO', label: 'Assicurativo', emoji: '🛡️' },
  { value: 'ALTRO', label: 'Altro', emoji: '📌' },
];

export function ReminderForm({ trigger, onSuccess }: ReminderFormProps) {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { units } = useUnits();

  const form = useForm<ReminderFormData>({
    resolver: zodResolver(reminderSchema),
    defaultValues: {
      titolo: '',
      tipo: 'ALTRO',
      descrizione: '',
      data_scadenza: new Date(),
      ricorrente: false,
      frequenza_mesi: undefined,
      giorni_anticipo_promemoria: 7,
      note: '',
      unit_id: 'general',
    },
  });

  const isRicorrente = form.watch('ricorrente');

  const onSubmit = async (data: ReminderFormData) => {
    if (!user) return;
    
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('reminders').insert({
        user_id: user.id,
        unit_id: data.unit_id && data.unit_id !== 'general' ? data.unit_id : null,
        titolo: data.titolo,
        tipo: data.tipo,
        descrizione: data.descrizione || null,
        data_scadenza: format(data.data_scadenza, 'yyyy-MM-dd'),
        ricorrente: data.ricorrente,
        frequenza_mesi: data.ricorrente ? data.frequenza_mesi : null,
        giorni_anticipo_promemoria: data.giorni_anticipo_promemoria,
        note: data.note || null,
        completata: false,
      });

      if (error) throw error;

      toast({ title: 'Scadenza creata', description: 'La scadenza è stata aggiunta con successo.' });
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
      form.reset();
      setOpen(false);
      onSuccess?.();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Errore sconosciuto';
      toast({ variant: 'destructive', title: 'Errore', description: message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Nuova Scadenza
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            Nuova Scadenza
          </DialogTitle>
          <DialogDescription>
            Inserisci i dati della scadenza o promemoria
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="unit_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Unità Immobiliare *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona unità" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="general">Generale</SelectItem>
                      {units.map(u => (
                        <SelectItem key={u.id} value={u.id}>{u.nome_interno}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="titolo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Titolo *</FormLabel>
                  <FormControl>
                    <Input placeholder="Es: Pagamento IMU prima rata" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="tipo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {tipoOptions.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>
                            <span className="flex items-center gap-2">
                              <span>{opt.emoji}</span>
                              <span>{opt.label}</span>
                            </span>
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
                name="data_scadenza"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Data Scadenza *</FormLabel>
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

            <FormField
              control={form.control}
              name="descrizione"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrizione</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Descrizione dettagliata..." 
                      className="resize-none" 
                      {...field} 
                      value={field.value || ''} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="ricorrente"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>Scadenza Ricorrente</FormLabel>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            {isRicorrente && (
              <FormField
                control={form.control}
                name="frequenza_mesi"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Frequenza (mesi) *</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min={1} 
                        placeholder="12" 
                        {...field}
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="giorni_anticipo_promemoria"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Giorni Anticipo Promemoria</FormLabel>
                  <FormControl>
                    <Input type="number" min={0} placeholder="7" {...field} />
                  </FormControl>
                  <FormMessage />
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
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Salvataggio...' : 'Salva Scadenza'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
