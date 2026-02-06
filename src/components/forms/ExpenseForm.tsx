import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useExpenses, type ExtraExpense } from '@/hooks/useExpenses';
import { useProperties, useUnits } from '@/hooks/useProperties';
import { Receipt, Trash2 } from 'lucide-react';

const expenseSchema = z.object({
  property_id: z.string().optional(),
  unit_id: z.string().optional(),
  categoria: z.string().min(1, 'Seleziona una categoria'),
  descrizione: z.string().min(1, 'Inserisci una descrizione'),
  importo_previsto: z.coerce.number().min(0),
  importo_effettivo: z.coerce.number().min(0, 'Inserisci l\'importo'),
  data_competenza: z.string().min(1, 'Seleziona la data'),
  data_pagamento: z.string().optional(),
  fornitore: z.string().optional(),
  deducibile_fiscalmente: z.boolean(),
  note: z.string().optional(),
});

type ExpenseFormData = z.infer<typeof expenseSchema>;

interface ExpenseFormProps {
  expense?: ExtraExpense;
  unitId?: string;
  trigger?: React.ReactNode;
}

const CATEGORIE_SPESA = [
  { value: 'MANUTENZIONE', label: 'Manutenzione ordinaria' },
  { value: 'STRAORDINARIA', label: 'Manutenzione straordinaria' },
  { value: 'CONDOMINIALE', label: 'Spese condominiali' },
  { value: 'FISCALE_ALTRO', label: 'Imposte e tasse' },
  { value: 'ASSICURATIVA', label: 'Assicurazioni' },
  { value: 'ALTRO', label: 'Altro' },
];

export function ExpenseForm({ expense, unitId, trigger }: ExpenseFormProps) {
  const [open, setOpen] = useState(false);
  const { createExpense, updateExpense, deleteExpense } = useExpenses();
  const { properties } = useProperties();
  const { units } = useUnits();
  const isEditing = !!expense;

  const form = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      property_id: expense?.property_id || undefined,
      unit_id: expense?.unit_id || unitId || undefined,
      categoria: expense?.categoria || 'ALTRO',
      descrizione: expense?.descrizione || '',
      importo_previsto: expense?.importo_previsto || 0,
      importo_effettivo: expense?.importo_effettivo || 0,
      data_competenza: expense?.data_competenza || new Date().toISOString().split('T')[0],
      data_pagamento: expense?.data_pagamento || undefined,
      fornitore: expense?.fornitore || '',
      deducibile_fiscalmente: expense?.deducibile_fiscalmente || false,
      note: expense?.note || '',
    },
  });

  const onSubmit = async (data: ExpenseFormData) => {
    const payload = {
      categoria: data.categoria,
      descrizione: data.descrizione,
      importo_previsto: data.importo_previsto,
      importo_effettivo: data.importo_effettivo,
      data_competenza: data.data_competenza,
      deducibile_fiscalmente: data.deducibile_fiscalmente,
      property_id: data.property_id || null,
      unit_id: data.unit_id || null,
      lease_id: null,
      data_pagamento: data.data_pagamento || null,
      fornitore: data.fornitore || null,
      note: data.note || null,
    };

    if (isEditing) {
      await updateExpense.mutateAsync({ id: expense.id, ...payload });
    } else {
      await createExpense.mutateAsync(payload);
    }
    setOpen(false);
    form.reset();
  };

  const handleDelete = async () => {
    if (expense) {
      await deleteExpense.mutateAsync(expense.id);
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Receipt className="h-4 w-4 mr-2" />
            {isEditing ? 'Modifica' : 'Nuova Spesa'}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Modifica Spesa' : 'Nuova Spesa'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Modifica i dati della spesa' : 'Registra una nuova spesa straordinaria'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="categoria"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categoria *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona categoria" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {CATEGORIE_SPESA.map(cat => (
                        <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="descrizione"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrizione *</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Es. Riparazione caldaia" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="importo_effettivo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Importo (€) *</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="data_competenza"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="unit_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Unità</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona unità (opzionale)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
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
              name="fornitore"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fornitore</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Nome fornitore" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="data_pagamento"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data Pagamento</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="deducibile_fiscalmente"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>Deducibile fiscalmente</FormLabel>
                    <p className="text-xs text-muted-foreground">Impatta sul calcolo delle imposte</p>
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
                    <Textarea {...field} rows={2} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="flex gap-2">
              {isEditing && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button type="button" variant="destructive" size="sm">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Eliminare la spesa?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Questa azione non può essere annullata.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Annulla</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDelete}>Elimina</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
              <Button type="submit" disabled={createExpense.isPending || updateExpense.isPending}>
                {isEditing ? 'Salva' : 'Registra Spesa'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
