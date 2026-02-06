import { useState } from 'react';
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
import { useInventoryRooms, type InventoryRoom } from '@/hooks/useInventoryRooms';
import { Pencil, Plus, Trash2 } from 'lucide-react';

const roomSchema = z.object({
  nome_ambiente: z.string().min(1, 'Inserisci il nome della stanza'),
  ordine_visualizzazione: z.coerce.number().min(1, 'Minimo 1'),
});

type RoomFormData = z.infer<typeof roomSchema>;

interface InventoryRoomFormProps {
  room?: InventoryRoom;
  unitId: string;
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

export function InventoryRoomForm({ room, unitId, trigger, onSuccess }: InventoryRoomFormProps) {
  const [open, setOpen] = useState(false);
  const { createRoom, updateRoom, deleteRoom } = useInventoryRooms(unitId);
  const isEditing = !!room;

  const form = useForm<RoomFormData>({
    resolver: zodResolver(roomSchema),
    defaultValues: {
      nome_ambiente: room?.nome_ambiente || '',
      ordine_visualizzazione: room?.ordine_visualizzazione || 1,
    },
  });

  const handleSubmit = async (values: RoomFormData) => {
    if (isEditing && room) {
      await updateRoom.mutateAsync({ id: room.id, nome_ambiente: values.nome_ambiente, ordine_visualizzazione: values.ordine_visualizzazione });
    } else {
      await createRoom.mutateAsync({ unit_id: unitId, nome_ambiente: values.nome_ambiente, ordine_visualizzazione: values.ordine_visualizzazione });
    }
    setOpen(false);
    onSuccess?.();
  };

  const handleDelete = async () => {
    if (!room) return;
    await deleteRoom.mutateAsync(room.id);
    setOpen(false);
    onSuccess?.();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm" variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            Aggiungi stanza
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Modifica stanza' : 'Nuova stanza'}</DialogTitle>
          <DialogDescription>Definisci il nome e l’ordine di visualizzazione.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="nome_ambiente"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome stanza *</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Es. Soggiorno" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="ordine_visualizzazione"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ordine *</FormLabel>
                  <FormControl>
                    <Input type="number" min={1} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="gap-2">
              {isEditing && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button type="button" variant="destructive" className="mr-auto" disabled={deleteRoom.isPending}>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Elimina
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Eliminare la stanza?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Tutti i beni collegati resteranno, ma non avranno più una stanza assegnata.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Annulla</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDelete}>Elimina</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
              <Button type="submit" disabled={createRoom.isPending || updateRoom.isPending}>
                {isEditing ? 'Salva' : 'Crea'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
