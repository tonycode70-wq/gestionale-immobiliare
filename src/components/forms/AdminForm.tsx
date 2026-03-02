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
import { usePropertyAdmins, type PropertyAdmin } from '@/hooks/usePropertyAdmins';
import { UserCog, Trash2, Pencil, Plus } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useQueryClient } from '@tanstack/react-query';
import { db } from '../../../utils/localStorageDB.js';
import { DatePicker } from '@/components/ui/date-picker';

const adminSchema = z.object({
  ragione_sociale: z.string().min(1, 'Inserisci la ragione sociale'),
  nome_referente: z.string().optional(),
  telefono_studio: z.string().optional(),
  cellulare_urgenze: z.string().optional(),
  email: z.string().email('Email non valida').optional().or(z.literal('')),
  email_pec: z.string().email('PEC non valida').optional().or(z.literal('')),
  codice_fiscale: z.string().optional(),
  partita_iva: z.string().optional(),
  sede_legale_indirizzo: z.string().optional(),
  sede_legale_citta: z.string().optional(),
  sede_legale_cap: z.string().optional(),
  sede_legale_provincia: z.string().optional(),
  note: z.string().optional(),
  iban_pagamento: z.string().optional(),
  bic_swift: z.string().optional(),
  nome_banca: z.string().optional(),
  intestatario_conto: z.string().optional(),
  sito_web: z.string().url('URL non valido').optional().or(z.literal('')),
  pid: z.string().optional(),
  admin_login: z.string().optional(),
  admin_password: z.string().optional(),
  meeting_titolo: z.string().optional(),
  meeting_data: z.string().optional(),
});

type AdminFormData = z.infer<typeof adminSchema>;

interface AdminFormProps {
  admin?: PropertyAdmin;
  propertyId: string;
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

export function AdminForm({ admin, propertyId, trigger, onSuccess }: AdminFormProps) {
  const [open, setOpen] = useState(false);
  const { createAdmin, updateAdmin, deleteAdmin } = usePropertyAdmins(propertyId);
  const isEditing = !!admin;
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const form = useForm<AdminFormData>({
    resolver: zodResolver(adminSchema),
    defaultValues: {
      ragione_sociale: admin?.ragione_sociale || '',
      nome_referente: admin?.nome_referente || '',
      telefono_studio: admin?.telefono_studio || '',
      cellulare_urgenze: admin?.cellulare_urgenze || '',
      email: admin?.email || '',
      email_pec: admin?.email_pec || '',
      codice_fiscale: admin?.codice_fiscale || '',
      partita_iva: admin?.partita_iva || '',
      sede_legale_indirizzo: admin?.sede_legale_indirizzo || '',
      sede_legale_citta: admin?.sede_legale_citta || '',
      sede_legale_cap: admin?.sede_legale_cap || '',
      sede_legale_provincia: admin?.sede_legale_provincia || '',
      note: admin?.note || '',
      iban_pagamento: admin?.iban_pagamento || '',
      bic_swift: admin?.bic_swift || '',
      nome_banca: admin?.nome_banca || '',
      intestatario_conto: admin?.intestatario_conto || '',
      sito_web: admin?.sito_web || '',
      pid: admin?.pid || '',
      admin_login: admin?.admin_login || '',
      admin_password: admin?.admin_password || '',
      meeting_titolo: '',
      meeting_data: '',
    },
  });

  const onSubmit = async (data: AdminFormData) => {
    const payload = {
      property_id: propertyId,
      ragione_sociale: data.ragione_sociale || null,
      nome_referente: data.nome_referente || null,
      telefono_studio: data.telefono_studio || null,
      cellulare_urgenze: data.cellulare_urgenze || null,
      email: data.email || null,
      email_pec: data.email_pec || null,
      codice_fiscale: data.codice_fiscale || null,
      partita_iva: data.partita_iva || null,
      numero_rea: null,
      sede_legale_indirizzo: data.sede_legale_indirizzo || null,
      sede_legale_citta: data.sede_legale_citta || null,
      sede_legale_cap: data.sede_legale_cap || null,
      sede_legale_provincia: data.sede_legale_provincia || null,
      sede_operativa_indirizzo: null,
      sede_operativa_citta: null,
      sede_operativa_cap: null,
      sede_operativa_provincia: null,
      note: data.note || null,
      iban_pagamento: data.iban_pagamento || null,
      bic_swift: data.bic_swift || null,
      nome_banca: data.nome_banca || null,
      intestatario_conto: data.intestatario_conto || null,
      sito_web: data.sito_web || null,
      pid: data.pid || null,
      admin_login: data.admin_login || null,
      admin_password: data.admin_password || null,
    };

    if (isEditing) {
      await updateAdmin.mutateAsync({ id: admin.id, ...payload });
    } else {
      await createAdmin.mutateAsync(payload);
    }
    if (user && data.meeting_titolo && data.meeting_data) {
      const now = new Date().toISOString();
      // Property-level reminder
      const reminderId = crypto.randomUUID();
      db.add({
        __table: 'reminders',
        id: reminderId,
        user_id: user.id,
        property_id: propertyId,
        unit_id: null,
        titolo: data.meeting_titolo,
        tipo: 'CONTRATTUALE',
        descrizione: null,
        data_scadenza: data.meeting_data,
        ricorrente: false,
        frequenza_mesi: null,
        giorni_anticipo_promemoria: 7,
        note: null,
        completata: false,
        created_at: now,
        updated_at: now,
      });
      // Replicate as unit-level alerts for all units of the property
      const all: unknown[] = db.getAll();
      const units = all.filter((x) => (x as { __table: string; property_id: string }).__table === 'units' && (x as { property_id: string }).property_id === propertyId) as { id: string }[];
      units.forEach(u => {
        db.add({
          __table: 'reminders',
          id: crypto.randomUUID(),
          user_id: user.id,
          property_id: propertyId,
          unit_id: u.id,
          titolo: data.meeting_titolo,
          tipo: 'CONTRATTUALE',
          descrizione: null,
          data_scadenza: data.meeting_data,
          ricorrente: false,
          frequenza_mesi: null,
          giorni_anticipo_promemoria: 7,
          note: null,
          completata: false,
          created_at: now,
          updated_at: now,
          reminder_padre_id: reminderId,
        });
      });
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
    }
    setOpen(false);
    form.reset();
    onSuccess?.();
  };

  const handleDelete = async () => {
    if (admin) {
      await deleteAdmin.mutateAsync(admin.id);
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
            {isEditing ? 'Modifica' : 'Aggiungi Amministratore'}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCog className="h-5 w-5" />
            {isEditing ? 'Modifica Amministratore' : 'Nuovo Amministratore'}
          </DialogTitle>
          <DialogDescription>
            {isEditing ? 'Modifica i dati dell\'amministratore' : 'Inserisci i dati dell\'amministratore condominiale'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="ragione_sociale"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ragione Sociale / Nome Studio *</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Studio Rossi Amministrazioni" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="nome_referente"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome Referente</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Dott. Mario Rossi" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="telefono_studio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefono Studio</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="02 12345678" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="cellulare_urgenze"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cellulare Urgenze</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="+39 333 1234567" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} placeholder="info@studio.it" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email_pec"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>PEC</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} placeholder="studio@pec.it" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="codice_fiscale"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Codice Fiscale</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="RSSMRA70A01F205X" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="partita_iva"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Partita IVA</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="12345678901" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="sede_legale_indirizzo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Indirizzo Sede</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Via Roma 10" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="sede_legale_citta"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Città</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Milano" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="sede_legale_cap"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CAP</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="20121" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="sede_legale_provincia"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prov.</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="MI" maxLength={2} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

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

            {/* DATI BANCARI */}
            <div className="pt-4 border-t">
              <h4 className="font-medium text-sm mb-3">Dati Bancari per Pagamenti</h4>
              
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="nome_banca"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome Banca</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Es. Intesa Sanpaolo" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="intestatario_conto"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Intestatario Conto</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Condominio Via Roma 10" />
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
                      <FormLabel>IBAN</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="IT60X0542811101000000123456" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="bic_swift"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>BIC/SWIFT (opzionale)</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="BCITITMM" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="pt-4 border-t">
              <h4 className="font-medium text-sm mb-3">Accesso Portale Amministratore</h4>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="sito_web"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sito Web</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="https://studio.it" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="pid"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>PID</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="PID portale" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="admin_login"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Login</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="username" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="admin_password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input type="password" {...field} placeholder="password" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="pt-4 border-t">
              <h4 className="font-medium text-sm mb-3">Agenda Riunioni</h4>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="meeting_titolo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Titolo Riunione</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Riunione condominiale" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="meeting_data"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data</FormLabel>
                      <DatePicker
                        value={field.value || null}
                        onChange={(v) => field.onChange(v || '')}
                        minYear={1900}
                        maxYear={2100}
                        placeholder="YYYY-MM-DD"
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

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
                      <AlertDialogTitle>Rimuovere l'amministratore?</AlertDialogTitle>
                      <AlertDialogDescription>
                        L'amministratore verrà rimosso dall'immobile.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Annulla</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDelete}>Rimuovi</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
              <Button type="submit" disabled={createAdmin.isPending || updateAdmin.isPending}>
                {isEditing ? 'Salva' : 'Aggiungi'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
