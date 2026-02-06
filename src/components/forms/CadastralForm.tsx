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
import { useCadastral, type CadastralUnit } from '@/hooks/useCadastral';
import { Map, Plus, Trash2 } from 'lucide-react';

const cadastralSchema = z.object({
  tipo_unita: z.enum(['principale', 'pertinenza']),
  categoria_catastale: z.string().min(1, 'Seleziona la categoria'),
  rendita_euro: z.coerce.number().positive('Inserisci la rendita'),
  metratura_mq: z.coerce.number().optional(),
  sezione_urbana: z.string().optional(),
  foglio: z.string().min(1, 'Inserisci il foglio'),
  particella: z.string().min(1, 'Inserisci la particella'),
  subalterno: z.string().min(1, 'Inserisci il subalterno'),
  note: z.string().optional(),
});

type CadastralFormData = z.infer<typeof cadastralSchema>;

interface CadastralFormProps {
  cadastral?: CadastralUnit;
  unitId: string;
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

const CATEGORIE_CATASTALI = [
  { value: 'A/1', label: 'A/1 - Abitazione signorile' },
  { value: 'A/2', label: 'A/2 - Abitazione civile' },
  { value: 'A/3', label: 'A/3 - Abitazione economica' },
  { value: 'A/4', label: 'A/4 - Abitazione popolare' },
  { value: 'A/5', label: 'A/5 - Abitazione ultrapopolare' },
  { value: 'A/6', label: 'A/6 - Abitazione rurale' },
  { value: 'A/7', label: 'A/7 - Villino' },
  { value: 'A/8', label: 'A/8 - Villa' },
  { value: 'A/9', label: 'A/9 - Castello/Palazzo' },
  { value: 'A/10', label: 'A/10 - Ufficio' },
  { value: 'C/1', label: 'C/1 - Negozio' },
  { value: 'C/2', label: 'C/2 - Magazzino' },
  { value: 'C/3', label: 'C/3 - Laboratorio' },
  { value: 'C/6', label: 'C/6 - Box/Garage' },
  { value: 'C/7', label: 'C/7 - Tettoia' },
];

export function CadastralForm({ cadastral, unitId, trigger, onSuccess }: CadastralFormProps) {
  const [open, setOpen] = useState(false);
  const { createCadastral, updateCadastral, deleteCadastral } = useCadastral(unitId);
  const isEditing = !!cadastral;

  const form = useForm<CadastralFormData>({
    resolver: zodResolver(cadastralSchema),
    defaultValues: {
      tipo_unita: (cadastral?.tipo_unita as 'principale' | 'pertinenza') || 'principale',
      categoria_catastale: cadastral?.categoria_catastale || '',
      rendita_euro: cadastral?.rendita_euro || 0,
      metratura_mq: cadastral?.metratura_mq || undefined,
      sezione_urbana: cadastral?.sezione_urbana || '',
      foglio: cadastral?.foglio || '',
      particella: cadastral?.particella || '',
      subalterno: cadastral?.subalterno || '',
      note: cadastral?.note || '',
    },
  });

  const onSubmit = async (data: CadastralFormData) => {
    const payload = {
      unit_id: unitId,
      tipo_unita: data.tipo_unita,
      categoria_catastale: data.categoria_catastale,
      rendita_euro: data.rendita_euro,
      foglio: data.foglio,
      particella: data.particella,
      subalterno: data.subalterno,
      metratura_mq: data.metratura_mq || null,
      sezione_urbana: data.sezione_urbana || null,
      note: data.note || null,
    };

    if (isEditing) {
      await updateCadastral.mutateAsync({ id: cadastral.id, ...payload });
    } else {
      await createCadastral.mutateAsync(payload);
    }
    setOpen(false);
    form.reset();
    onSuccess?.();
  };

  const handleDelete = async () => {
    if (cadastral) {
      await deleteCadastral.mutateAsync(cadastral.id);
      setOpen(false);
      onSuccess?.();
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            {isEditing ? 'Modifica' : 'Aggiungi Dati Catastali'}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Map className="h-5 w-5" />
            {isEditing ? 'Modifica Dati Catastali' : 'Nuovi Dati Catastali'}
          </DialogTitle>
          <DialogDescription>
            {isEditing ? 'Modifica i riferimenti catastali' : 'Inserisci i dati catastali dell\'unità'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="tipo_unita"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo Unità *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="principale">Principale</SelectItem>
                      <SelectItem value="pertinenza">Pertinenza</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="categoria_catastale"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categoria Catastale *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona categoria" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {CATEGORIE_CATASTALI.map(cat => (
                        <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="rendita_euro"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rendita Catastale (€) *</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="metratura_mq"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Superficie (mq)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="foglio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Foglio *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="123" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="particella"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Particella *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="456" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="subalterno"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subalterno *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="1" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="sezione_urbana"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sezione Urbana</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Opzionale" />
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
                      <AlertDialogTitle>Eliminare i dati catastali?</AlertDialogTitle>
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
              <Button type="submit" disabled={createCadastral.isPending || updateCadastral.isPending}>
                {isEditing ? 'Salva' : 'Aggiungi'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
