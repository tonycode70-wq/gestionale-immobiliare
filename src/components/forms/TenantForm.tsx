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
import { useTenants } from '@/hooks/useTenants';
import { Users, Plus } from 'lucide-react';

const tenantSchema = z.object({
  tipo_soggetto: z.enum(['persona_fisica', 'persona_giuridica']),
  nome: z.string().max(100).optional().nullable(),
  cognome: z.string().max(100).optional().nullable(),
  ragione_sociale: z.string().max(200).optional().nullable(),
  codice_fiscale: z.string().max(20).optional().nullable(),
  partita_iva: z.string().max(15).optional().nullable(),
  indirizzo_residenza: z.string().max(200).optional().nullable(),
  cap_residenza: z.string().max(10).optional().nullable(),
  citta_residenza: z.string().max(100).optional().nullable(),
  provincia_residenza: z.string().max(50).optional().nullable(),
  email: z.string().email('Email non valida').max(255).optional().nullable().or(z.literal('')),
  telefono: z.string().max(20).optional().nullable(),
  iban: z.string().max(34).optional().nullable(),
  note: z.string().max(1000).optional().nullable(),
}).refine((data) => {
  if (data.tipo_soggetto === 'persona_fisica') {
    return data.nome && data.cognome;
  }
  return data.ragione_sociale;
}, {
  message: 'Inserisci nome e cognome per persona fisica o ragione sociale per persona giuridica',
  path: ['nome'],
});

type TenantFormData = z.infer<typeof tenantSchema>;

interface TenantFormProps {
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

export function TenantForm({ trigger, onSuccess }: TenantFormProps) {
  const [open, setOpen] = useState(false);
  const { createTenant } = useTenants();

  const form = useForm<TenantFormData>({
    resolver: zodResolver(tenantSchema),
    defaultValues: {
      tipo_soggetto: 'persona_fisica',
      nome: '',
      cognome: '',
      ragione_sociale: '',
      codice_fiscale: '',
      partita_iva: '',
      indirizzo_residenza: '',
      cap_residenza: '',
      citta_residenza: '',
      provincia_residenza: '',
      email: '',
      telefono: '',
      iban: '',
      note: '',
    },
  });

  const tipoSoggetto = form.watch('tipo_soggetto');

  const onSubmit = async (data: TenantFormData) => {
    await createTenant.mutateAsync({
      tipo_soggetto: data.tipo_soggetto,
      nome: data.nome || null,
      cognome: data.cognome || null,
      ragione_sociale: data.ragione_sociale || null,
      codice_fiscale: data.codice_fiscale || null,
      partita_iva: data.partita_iva || null,
      indirizzo_residenza: data.indirizzo_residenza || null,
      cap_residenza: data.cap_residenza || null,
      citta_residenza: data.citta_residenza || null,
      provincia_residenza: data.provincia_residenza || null,
      email: data.email || null,
      telefono: data.telefono || null,
      iban: data.iban || null,
      note: data.note || null,
    });
    form.reset();
    setOpen(false);
    onSuccess?.();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Nuovo Conduttore
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Nuovo Conduttore
          </DialogTitle>
          <DialogDescription>
            Inserisci i dati del conduttore (inquilino)
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="tipo_soggetto"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo Soggetto *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="persona_fisica">Persona Fisica</SelectItem>
                      <SelectItem value="persona_giuridica">Persona Giuridica</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {tipoSoggetto === 'persona_fisica' ? (
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="nome"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome *</FormLabel>
                      <FormControl>
                        <Input placeholder="Mario" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="cognome"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cognome *</FormLabel>
                      <FormControl>
                        <Input placeholder="Rossi" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            ) : (
              <FormField
                control={form.control}
                name="ragione_sociale"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ragione Sociale *</FormLabel>
                    <FormControl>
                      <Input placeholder="Azienda S.r.l." {...field} value={field.value || ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="codice_fiscale"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Codice Fiscale</FormLabel>
                    <FormControl>
                      <Input placeholder="RSSMRA80A01H501Z" {...field} value={field.value || ''} />
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
                      <Input placeholder="01234567890" {...field} value={field.value || ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="indirizzo_residenza"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Indirizzo Residenza</FormLabel>
                  <FormControl>
                    <Input placeholder="Via Roma, 1" {...field} value={field.value || ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="cap_residenza"
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
                name="citta_residenza"
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
                name="provincia_residenza"
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

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input 
                        type="email" 
                        placeholder="mario@email.it" 
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
                name="telefono"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefono</FormLabel>
                    <FormControl>
                      <Input placeholder="+39 333 1234567" {...field} value={field.value || ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="iban"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>IBAN</FormLabel>
                  <FormControl>
                    <Input placeholder="IT60X0542811101000000123456" {...field} value={field.value || ''} />
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
              <Button type="submit" disabled={createTenant.isPending}>
                {createTenant.isPending ? 'Salvataggio...' : 'Salva Conduttore'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
