import { useState, useEffect } from 'react';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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
import { Switch } from '@/components/ui/switch';
import { useUnits, useProperties, Unit } from '@/hooks/useProperties';
import { useGlobalProperty } from '@/hooks/useGlobalProperty';
import { Home, Plus, Pencil, Trash2 } from 'lucide-react';

const unitSchema = z.object({
  property_id: z.string().min(1, 'Seleziona un immobile'),
  nome_interno: z.string().min(1, 'Il nome è obbligatorio').max(100),
  tipo_unita: z.enum(['appartamento', 'locale_commerciale', 'box', 'cantina', 'posto_auto', 'altro']),
  piano: z.string().max(20).optional().nullable(),
  interno: z.string().max(20).optional().nullable(),
  scala: z.string().max(20).optional().nullable(),
  metratura_mq: z.coerce.number().positive().optional().nullable(),
  destinazione_uso: z.string().max(100).optional().nullable(),
  attiva: z.boolean().default(true),
  valore_immobile_stimato: z.coerce.number().positive().optional().nullable(),
  note: z.string().max(1000).optional().nullable(),
});

type UnitFormData = z.infer<typeof unitSchema>;

interface UnitFormProps {
  unit?: Unit;
  propertyId?: string;
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

const tipoUnitaOptions = [
  { value: 'appartamento', label: 'Appartamento' },
  { value: 'locale_commerciale', label: 'Locale Commerciale' },
  { value: 'box', label: 'Box' },
  { value: 'cantina', label: 'Cantina' },
  { value: 'posto_auto', label: 'Posto Auto' },
  { value: 'altro', label: 'Altro' },
];

export function UnitForm({ unit, propertyId, trigger, onSuccess }: UnitFormProps) {
  const [open, setOpen] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const { createUnit, updateUnit, deleteUnit } = useUnits();
  const { properties } = useProperties();
  const { selectedPropertyId } = useGlobalProperty();
  const isEditing = !!unit;

  const form = useForm<UnitFormData>({
    resolver: zodResolver(unitSchema),
    defaultValues: {
      property_id: unit?.property_id || propertyId || '',
      nome_interno: unit?.nome_interno || '',
      tipo_unita: unit?.tipo_unita || 'appartamento',
      piano: unit?.piano || '',
      interno: unit?.interno || '',
      scala: unit?.scala || '',
      metratura_mq: unit?.metratura_mq ?? undefined,
      destinazione_uso: unit?.destinazione_uso || '',
      attiva: unit?.attiva ?? true,
      valore_immobile_stimato: unit?.valore_immobile_stimato ?? undefined,
      note: unit?.note || '',
    },
  });

  useEffect(() => {
    if (unit) {
      form.reset({
        property_id: unit.property_id || propertyId || '',
        nome_interno: unit.nome_interno || '',
        tipo_unita: unit.tipo_unita || 'appartamento',
        piano: unit.piano || '',
        interno: unit.interno || '',
        scala: unit.scala || '',
        metratura_mq: unit.metratura_mq ?? undefined,
        destinazione_uso: unit.destinazione_uso || '',
        attiva: unit.attiva ?? true,
        valore_immobile_stimato: unit.valore_immobile_stimato ?? undefined,
        note: unit.note || '',
      });
    }
  }, [unit, propertyId, form]);

  useEffect(() => {
    const current = form.getValues('property_id');
    if (!current) {
      if (propertyId) {
        form.setValue('property_id', propertyId);
      } else if (selectedPropertyId && selectedPropertyId !== 'all') {
        form.setValue('property_id', selectedPropertyId);
      } else if (properties.length === 1) {
        form.setValue('property_id', properties[0].id);
      }
    }
  }, [properties, propertyId, selectedPropertyId, form]);

  const onSubmit = async (data: UnitFormData) => {
    if (isEditing && unit) {
      await updateUnit.mutateAsync({
        id: unit.id,
        property_id: data.property_id,
        nome_interno: data.nome_interno,
        tipo_unita: data.tipo_unita,
        piano: data.piano || null,
        interno: data.interno || null,
        scala: data.scala || null,
        metratura_mq: data.metratura_mq || null,
        destinazione_uso: data.destinazione_uso || null,
        attiva: data.attiva,
        valore_immobile_stimato: data.valore_immobile_stimato || null,
        note: data.note || null,
      });
    } else {
      await createUnit.mutateAsync({
        property_id: data.property_id,
        nome_interno: data.nome_interno,
        tipo_unita: data.tipo_unita,
        piano: data.piano || null,
        interno: data.interno || null,
        scala: data.scala || null,
        metratura_mq: data.metratura_mq || null,
        destinazione_uso: data.destinazione_uso || null,
        attiva: data.attiva,
        valore_immobile_stimato: data.valore_immobile_stimato || null,
        note: data.note || null,
      });
    }
    form.reset();
    setOpen(false);
    onSuccess?.();
  };

  const handleDelete = async () => {
    if (unit) {
      await deleteUnit.mutateAsync(unit.id);
      setShowDeleteDialog(false);
      setOpen(false);
      onSuccess?.();
    }
  };

  const isPending = createUnit.isPending || updateUnit.isPending;

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          {trigger || (
            <Button>
              {isEditing ? <Pencil className="h-4 w-4 mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
              {isEditing ? 'Modifica' : 'Nuova Unità'}
            </Button>
          )}
        </DialogTrigger>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Home className="h-5 w-5" />
              {isEditing ? 'Modifica Unità' : 'Nuova Unità Immobiliare'}
            </DialogTitle>
            <DialogDescription>
              {isEditing ? 'Modifica i dati dell\'unità' : 'Inserisci i dati dell\'unità (appartamento, box, locale, ecc.)'}
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="property_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Immobile *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleziona immobile" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {properties.map(prop => (
                          <SelectItem key={prop.id} value={prop.id}>
                            {prop.nome_complesso}
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
                name="nome_interno"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome/Identificativo *</FormLabel>
                    <FormControl>
                      <Input placeholder="Es: Appartamento A1" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tipo_unita"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo Unità *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleziona tipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {tipoUnitaOptions.map(opt => (
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

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="piano"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Piano</FormLabel>
                      <FormControl>
                        <Input placeholder="2°" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="interno"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Interno</FormLabel>
                      <FormControl>
                        <Input placeholder="5" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="scala"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Scala</FormLabel>
                      <FormControl>
                        <Input placeholder="A" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="metratura_mq"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Metratura (mq)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01" 
                          placeholder="85.50" 
                          {...field}
                          value={field.value ?? ''}
                          onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="valore_immobile_stimato"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Valore Stimato (€)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01" 
                          placeholder="150000" 
                          {...field}
                          value={field.value ?? ''}
                          onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="destinazione_uso"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Destinazione d'Uso</FormLabel>
                    <FormControl>
                      <Input placeholder="Abitativo, Commerciale..." {...field} value={field.value || ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="attiva"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Unità Attiva</FormLabel>
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

              <div className="flex justify-between gap-3 pt-4">
                <div>
                  {isEditing && (
                    <Button 
                      type="button" 
                      variant="destructive" 
                      onClick={() => setShowDeleteDialog(true)}
                      disabled={deleteUnit.isPending}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Elimina
                    </Button>
                  )}
                </div>
                <div className="flex gap-3">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                    Annulla
                  </Button>
                  <Button type="submit" disabled={isPending}>
                    {isPending ? 'Salvataggio...' : isEditing ? 'Salva Modifiche' : 'Salva Unità'}
                  </Button>
                </div>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Conferma Eliminazione</AlertDialogTitle>
            <AlertDialogDescription>
              Sei sicuro di voler eliminare l'unità "{unit?.nome_interno}"? 
              Questa azione eliminerà anche tutti i contratti e dati associati. 
              L'operazione non può essere annullata.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteUnit.isPending ? 'Eliminazione...' : 'Elimina'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
