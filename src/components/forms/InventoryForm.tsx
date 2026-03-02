 import { useState, useEffect } from 'react';
 import { useForm } from 'react-hook-form';
 import { zodResolver } from '@hookform/resolvers/zod';
 import { z } from 'zod';
 import { Button } from '@/components/ui/button';
 import { Input } from '@/components/ui/input';
 import { DatePicker } from '@/components/ui/date-picker';
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
import { useInventory, type InventoryItem } from '@/hooks/useInventory';
 import { Package, Trash2, Pencil, Plus } from 'lucide-react';
 
const inventorySchema = z.object({
   nome_bene: z.string().min(1, 'Inserisci il nome del bene'),
   descrizione: z.string().optional(),
   quantita: z.coerce.number().min(1, 'Quantità minima 1'),
   stato: z.string().optional(),
   data_inserimento: z.string().min(1, 'Inserisci la data'),
   note: z.string().optional(),
  room: z.string().optional(),
 });
 
 type InventoryFormData = z.infer<typeof inventorySchema>;
 
interface InventoryFormProps {
   item?: InventoryItem;
   unitId: string;
   cadastralUnitId?: string;
   trigger?: React.ReactNode;
   onSuccess?: () => void;
  defaultRoomName?: string;
 }
 
export function InventoryForm({ item, unitId, cadastralUnitId, trigger, onSuccess, defaultRoomName }: InventoryFormProps) {
   const [open, setOpen] = useState(false);
   const { createItem, updateItem, deleteItem } = useInventory(unitId, cadastralUnitId);
   const isEditing = !!item;
 
   const form = useForm<InventoryFormData>({
     resolver: zodResolver(inventorySchema),
     defaultValues: {
       nome_bene: item?.nome_bene || '',
       descrizione: item?.descrizione || '',
       quantita: item?.quantita || 1,
       stato: item?.stato || 'buono',
       data_inserimento: item?.data_inserimento || new Date().toISOString().split('T')[0],
       note: item?.note || '',
      room: item?.room || defaultRoomName || '',
     },
   });
 
  useEffect(() => {
    if (open && !isEditing && defaultRoomName) {
      form.setValue('room', defaultRoomName);
    }
  }, [open, isEditing, defaultRoomName, form]);

  useEffect(() => {
    const current = form.getValues('room');
    if (!isEditing && defaultRoomName && !current) {
      form.setValue('room', defaultRoomName);
    }
  }, [defaultRoomName, isEditing, form]);

  const normalizeRoomName = (name?: string) => {
    if (!name) return '';
    const t = name.trim().replace(/\s+/g, ' ').toLowerCase();
    return t.replace(/\b\w/g, s => s.toUpperCase());
  };

   const onSubmit = async (data: InventoryFormData) => {
    console.log('DATI FORM:', data);
    console.log('VALORE STANZA SUBMIT:', form.getValues('room'));
    const normalizedRoom = normalizeRoomName(data.room || '');
     const payload = {
       unit_id: unitId,
       cadastral_unit_id: cadastralUnitId || null,
       nome_bene: data.nome_bene,
       descrizione: data.descrizione || null,
       quantita: data.quantita,
       stato: data.stato || null,
       data_inserimento: data.data_inserimento,
       note: data.note || null,
      room: normalizedRoom || null,
     };
 
     if (isEditing) {
       await updateItem.mutateAsync({ id: item.id, ...payload });
     } else {
       await createItem.mutateAsync(payload);
     }
     setOpen(false);
     form.reset();
     onSuccess?.();
   };
 
   const handleDelete = async () => {
     if (item) {
       await deleteItem.mutateAsync(item.id);
       setOpen(false);
       onSuccess?.();
     }
   };
 
   return (
     <Dialog open={open} onOpenChange={setOpen}>
       <DialogTrigger asChild>
         {trigger || (
           <Button variant="outline" size="sm">
             {isEditing ? <Pencil className="h-4 w-4 mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
             {isEditing ? 'Modifica' : 'Aggiungi bene'}
           </Button>
         )}
       </DialogTrigger>
       <DialogContent className="max-w-md">
         <DialogHeader>
           <DialogTitle className="flex items-center gap-2">
             <Package className="h-5 w-5" />
             {isEditing ? 'Modifica Bene' : 'Nuovo Bene'}
           </DialogTitle>
           <DialogDescription>
             {isEditing ? 'Modifica i dettagli del bene' : 'Aggiungi un bene all\'inventario'}
           </DialogDescription>
         </DialogHeader>
 
         <Form {...form}>
           <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
             <FormField
               control={form.control}
               name="nome_bene"
               render={({ field }) => (
                 <FormItem>
                   <FormLabel>Nome Bene *</FormLabel>
                   <FormControl>
                     <Input {...field} placeholder="Es. Lavatrice, Frigorifero..." />
                   </FormControl>
                   <FormMessage />
                 </FormItem>
               )}
             />
 
             <FormField
               control={form.control}
               name="descrizione"
               render={({ field }) => (
                 <FormItem>
                   <FormLabel>Descrizione</FormLabel>
                   <FormControl>
                     <Textarea {...field} rows={2} placeholder="Marca, modello, caratteristiche..." />
                   </FormControl>
                   <FormMessage />
                 </FormItem>
               )}
             />
 
            <div className="grid grid-cols-2 gap-4">
               <FormField
                 control={form.control}
                 name="quantita"
                 render={({ field }) => (
                   <FormItem>
                     <FormLabel>Quantità *</FormLabel>
                     <FormControl>
                       <Input type="number" min={1} {...field} />
                     </FormControl>
                     <FormMessage />
                   </FormItem>
                 )}
               />
               <FormField
                 control={form.control}
                 name="stato"
                 render={({ field }) => (
                   <FormItem>
                     <FormLabel>Stato</FormLabel>
                     <Select onValueChange={field.onChange} value={field.value}>
                       <FormControl>
                         <SelectTrigger>
                           <SelectValue placeholder="Seleziona" />
                         </SelectTrigger>
                       </FormControl>
                       <SelectContent>
                         <SelectItem value="nuovo">Nuovo</SelectItem>
                         <SelectItem value="ottimo">Ottimo</SelectItem>
                         <SelectItem value="buono">Buono</SelectItem>
                         <SelectItem value="discreto">Discreto</SelectItem>
                         <SelectItem value="da_sostituire">Da sostituire</SelectItem>
                       </SelectContent>
                     </Select>
                     <FormMessage />
                   </FormItem>
                 )}
               />
              <FormField
                control={form.control}
                name="room"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stanza</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Es. Cucina, Bagno" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
             </div>
 
            <FormField
               control={form.control}
               name="data_inserimento"
               render={({ field }) => (
                 <FormItem>
                   <FormLabel>Data Inserimento *</FormLabel>
                   <DatePicker
                     value={field.value}
                     onChange={(v) => field.onChange(v || '')}
                     minYear={1900}
                     maxYear={2100}
                     placeholder="Seleziona data"
                   />
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
                     <Textarea {...field} rows={2} placeholder="Note aggiuntive..." />
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
                       <AlertDialogTitle>Eliminare questo bene?</AlertDialogTitle>
                       <AlertDialogDescription>
                         Il bene verrà rimosso dall'inventario.
                       </AlertDialogDescription>
                     </AlertDialogHeader>
                     <AlertDialogFooter>
                       <AlertDialogCancel>Annulla</AlertDialogCancel>
                       <AlertDialogAction onClick={handleDelete}>Elimina</AlertDialogAction>
                     </AlertDialogFooter>
                   </AlertDialogContent>
                 </AlertDialog>
               )}
               <Button type="submit" disabled={createItem.isPending || updateItem.isPending}>
                 {isEditing ? 'Salva' : 'Aggiungi'}
               </Button>
             </DialogFooter>
           </form>
         </Form>
       </DialogContent>
     </Dialog>
   );
 }
