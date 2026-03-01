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
import { useProperties, Property } from '@/hooks/useProperties';
import { usePropertyAdmins } from '@/hooks/usePropertyAdmins';
import { Building2, Plus, Pencil, Trash2 } from 'lucide-react';

const propertySchema = z.object({
  nome_complesso: z.string().min(1, 'Il nome è obbligatorio').max(100),
  indirizzo_via: z.string().max(200).optional().nullable(),
  indirizzo_civico: z.string().max(20).optional().nullable(),
  cap: z.string().max(10).optional().nullable(),
  citta: z.string().max(100).optional().nullable(),
  provincia: z.string().max(50).optional().nullable(),
  codice_fiscale_ente: z.string().max(20).optional().nullable(),
  note_generali: z.string().max(1000).optional().nullable(),
});

type PropertyFormData = z.infer<typeof propertySchema>;

interface PropertyFormProps {
  property?: Property;
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

export function PropertyForm({ property, trigger, onSuccess }: PropertyFormProps) {
  const [open, setOpen] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const { createProperty, updateProperty, deleteProperty } = useProperties();
  const { createAdmin } = usePropertyAdmins();
  const isEditing = !!property;
  const [step, setStep] = useState<'property' | 'admin'>('property');
  const [createdPropertyId, setCreatedPropertyId] = useState<string | null>(null);
  const [adminData, setAdminData] = useState<{ ragione_sociale: string; sito_web?: string; pid?: string; admin_login?: string; admin_password?: string }>({ ragione_sociale: '' });

  const form = useForm<PropertyFormData>({
    resolver: zodResolver(propertySchema),
    defaultValues: {
      nome_complesso: property?.nome_complesso || '',
      indirizzo_via: property?.indirizzo_via || '',
      indirizzo_civico: property?.indirizzo_civico || '',
      cap: property?.cap || '',
      citta: property?.citta || '',
      provincia: property?.provincia || '',
      codice_fiscale_ente: property?.codice_fiscale_ente || '',
      note_generali: property?.note_generali || '',
    },
  });

  useEffect(() => {
    if (property) {
      form.reset({
        nome_complesso: property.nome_complesso || '',
        indirizzo_via: property.indirizzo_via || '',
        indirizzo_civico: property.indirizzo_civico || '',
        cap: property.cap || '',
        citta: property.citta || '',
        provincia: property.provincia || '',
        codice_fiscale_ente: property.codice_fiscale_ente || '',
        note_generali: property.note_generali || '',
      });
    }
  }, [property, form]);

  const onSubmit = async (data: PropertyFormData) => {
    if (isEditing && property) {
      await updateProperty.mutateAsync({
        id: property.id,
        nome_complesso: data.nome_complesso,
        indirizzo_via: data.indirizzo_via || null,
        indirizzo_civico: data.indirizzo_civico || null,
        cap: data.cap || null,
        citta: data.citta || null,
        provincia: data.provincia || null,
        codice_fiscale_ente: data.codice_fiscale_ente || null,
        note_generali: data.note_generali || null,
      });
    } else {
      const created = await createProperty.mutateAsync({
        nome_complesso: data.nome_complesso,
        indirizzo_via: data.indirizzo_via || null,
        indirizzo_civico: data.indirizzo_civico || null,
        cap: data.cap || null,
        citta: data.citta || null,
        provincia: data.provincia || null,
        codice_fiscale_ente: data.codice_fiscale_ente || null,
        note_generali: data.note_generali || null,
      });
      setCreatedPropertyId((created as unknown as Property).id);
      setStep('admin');
      return;
    }
    form.reset();
    setOpen(false);
    onSuccess?.();
  };

  const handleDelete = async () => {
    if (property) {
      await deleteProperty.mutateAsync(property.id);
      setShowDeleteDialog(false);
      setOpen(false);
      onSuccess?.();
    }
  };

  const isPending = createProperty.isPending || updateProperty.isPending;

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          {trigger || (
            <Button>
              {isEditing ? <Pencil className="h-4 w-4 mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
              {isEditing ? 'Modifica' : 'Nuovo Immobile'}
            </Button>
          )}
        </DialogTrigger>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              {isEditing ? 'Modifica Immobile' : 'Nuovo Immobile'}
            </DialogTitle>
            <DialogDescription>
              {isEditing ? 'Modifica i dati dell\'immobile' : 'Inserisci i dati dell\'immobile o complesso immobiliare'}
            </DialogDescription>
          </DialogHeader>
          
          {step === 'property' ? (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="nome_complesso"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome Complesso *</FormLabel>
                    <FormControl>
                      <Input placeholder="Es: Condominio Via Roma 10" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <FormField
                    control={form.control}
                    name="indirizzo_via"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Indirizzo</FormLabel>
                        <FormControl>
                          <Input placeholder="Via/Piazza" {...field} value={field.value || ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="indirizzo_civico"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Civico</FormLabel>
                      <FormControl>
                        <Input placeholder="10" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="cap"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CAP</FormLabel>
                      <FormControl>
                        <Input placeholder="00100" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="citta"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Città</FormLabel>
                      <FormControl>
                        <Input placeholder="Roma" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="provincia"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Provincia</FormLabel>
                      <FormControl>
                        <Input placeholder="RM" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="codice_fiscale_ente"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Codice Fiscale Ente</FormLabel>
                    <FormControl>
                      <Input placeholder="Codice fiscale condominio" {...field} value={field.value || ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="note_generali"
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
                      disabled={deleteProperty.isPending}
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
                    {isPending ? 'Salvataggio...' : isEditing ? 'Salva Modifiche' : 'Salva Immobile'}
                  </Button>
                </div>
              </div>
            </form>
          </Form>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold">Amministratore (obbligatorio)</h4>
                <span className="text-xs text-muted-foreground">Immobile: {form.getValues('nome_complesso') || ''}</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <FormLabel>Ragione Sociale *</FormLabel>
                  <Input value={adminData.ragione_sociale} onChange={e => setAdminData(d => ({ ...d, ragione_sociale: e.target.value }))} placeholder="Studio Amministrazioni Rossi" />
                </div>
                <div>
                  <FormLabel>Sito Web</FormLabel>
                  <Input value={adminData.sito_web || ''} onChange={e => setAdminData(d => ({ ...d, sito_web: e.target.value }))} placeholder="https://studio.it" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <FormLabel>PID</FormLabel>
                  <Input value={adminData.pid || ''} onChange={e => setAdminData(d => ({ ...d, pid: e.target.value }))} placeholder="PID portale" />
                </div>
                <div>
                  <FormLabel>Login</FormLabel>
                  <Input value={adminData.admin_login || ''} onChange={e => setAdminData(d => ({ ...d, admin_login: e.target.value }))} placeholder="username" />
                </div>
                <div>
                  <FormLabel>Password</FormLabel>
                  <Input type="password" value={adminData.admin_password || ''} onChange={e => setAdminData(d => ({ ...d, admin_password: e.target.value }))} placeholder="password" />
                </div>
              </div>
              <div className="flex justify-between gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setStep('property')}>
                  Indietro
                </Button>
                <Button
                  onClick={async () => {
                    if (!createdPropertyId || !adminData.ragione_sociale) return;
                    await createAdmin.mutateAsync({
                      property_id: createdPropertyId,
                      ragione_sociale: adminData.ragione_sociale,
                      nome_referente: null,
                      telefono_studio: null,
                      cellulare_urgenze: null,
                      email: null,
                      email_pec: null,
                      codice_fiscale: null,
                      partita_iva: null,
                      numero_rea: null,
                      sede_legale_indirizzo: null,
                      sede_legale_citta: null,
                      sede_legale_cap: null,
                      sede_legale_provincia: null,
                      sede_operativa_indirizzo: null,
                      sede_operativa_citta: null,
                      sede_operativa_cap: null,
                      sede_operativa_provincia: null,
                      note: null,
                      iban_pagamento: null,
                      bic_swift: null,
                      nome_banca: null,
                      intestatario_conto: null,
                      sito_web: adminData.sito_web || null,
                      pid: adminData.pid || null,
                      admin_login: adminData.admin_login || null,
                      admin_password: adminData.admin_password || null,
                    });
                    setOpen(false);
                    setStep('property');
                    setCreatedPropertyId(null);
                    onSuccess?.();
                  }}
                >
                  Salva Amministratore
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Conferma Eliminazione</AlertDialogTitle>
            <AlertDialogDescription>
              Sei sicuro di voler eliminare l'immobile "{property?.nome_complesso}"? 
              Questa azione eliminerà anche tutte le unità, contratti e dati associati. 
              L'operazione non può essere annullata.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteProperty.isPending ? 'Eliminazione...' : 'Elimina'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
