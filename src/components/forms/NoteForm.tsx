import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useNotes, type NoteItem } from '@/hooks/useNotes';

const noteSchema = z.object({
  titolo: z.string().min(1, 'Titolo obbligatorio').max(120),
  contenuto: z.string().min(1, 'Contenuto obbligatorio').max(2000),
  data_nota: z.string().optional().nullable(),
  unit_id: z.string().optional().nullable(),
  property_id: z.string().optional().nullable(),
});

type NoteFormData = z.infer<typeof noteSchema>;

interface NoteFormProps {
  note?: NoteItem;
  unitId?: string;
  propertyId?: string;
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

export function NoteForm({ note, unitId, propertyId, trigger, onSuccess }: NoteFormProps) {
  const [open, setOpen] = useState(false);
  const { createNote, updateNote, deleteNote } = useNotes();
  const isEditing = !!note;

  const form = useForm<NoteFormData>({
    resolver: zodResolver(noteSchema),
    defaultValues: {
      titolo: note?.titolo || '',
      contenuto: note?.contenuto || '',
      data_nota: note?.data_nota || new Date().toISOString().split('T')[0],
      unit_id: note?.unit_id || unitId || null,
      property_id: note?.property_id || propertyId || null,
    },
  });

  useEffect(() => {
    if (note) {
      form.reset({
        titolo: note.titolo || '',
        contenuto: note.contenuto || '',
        data_nota: note.data_nota || new Date().toISOString().split('T')[0],
        unit_id: note.unit_id || unitId || null,
        property_id: note.property_id || propertyId || null,
      });
    }
  }, [note, unitId, propertyId, form]);

  const onSubmit = async (data: NoteFormData) => {
    if (isEditing && note) {
      await updateNote.mutateAsync({
        id: note.id,
        titolo: data.titolo,
        contenuto: data.contenuto,
        data_nota: data.data_nota || null,
        unit_id: data.unit_id || null,
        property_id: data.property_id || null,
      });
    } else {
      await createNote.mutateAsync({
        titolo: data.titolo,
        contenuto: data.contenuto,
        data_nota: data.data_nota || null,
        unit_id: data.unit_id || unitId || null,
        property_id: data.property_id || propertyId || null,
      });
    }
    form.reset();
    setOpen(false);
    onSuccess?.();
  };

  const handleDelete = async () => {
    if (note) {
      await deleteNote.mutateAsync(note.id);
      setOpen(false);
      onSuccess?.();
    }
  };

  const isPending = createNote.isPending || updateNote.isPending;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger || <Button>Nuova Nota</Button>}</DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Modifica Nota' : 'Nuova Nota'}</DialogTitle>
          <DialogDescription>Inserisci una nota libera per l’unità o l’immobile</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="titolo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Titolo *</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Titolo nota" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="data_nota"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} value={field.value || ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="contenuto"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contenuto *</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={6} placeholder="Scrivi la nota..." />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-2">
              {isEditing && (
                <Button type="button" variant="destructive" onClick={handleDelete} disabled={deleteNote.isPending}>
                  Elimina
                </Button>
              )}
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Salvataggio...' : isEditing ? 'Salva' : 'Aggiungi'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
