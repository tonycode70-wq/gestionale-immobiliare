import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTenants } from '@/hooks/useTenants';
import { useLeaseParties } from '@/hooks/useLeases';
import { ShieldPlus, Plus } from 'lucide-react';

const personSchema = z.object({
  tipo_soggetto: z.enum(['persona_fisica', 'persona_giuridica']),
  nome: z.string().max(100).optional().nullable(),
  cognome: z.string().max(100).optional().nullable(),
  ragione_sociale: z.string().max(200).optional().nullable(),
  codice_fiscale: z.string().max(20).optional().nullable(),
  telefono: z.string().max(20).optional().nullable(),
  email: z.string().email('Email non valida').optional().nullable().or(z.literal('')),
  indirizzo_residenza: z.string().max(200).optional().nullable(),
}).refine(
  (d) => (d.tipo_soggetto === 'persona_fisica' ? !!(d.nome && d.cognome) : !!d.ragione_sociale),
  { message: 'Nome e cognome obbligatori (fisica) o ragione sociale (giuridica)' }
);

type PersonFormData = z.infer<typeof personSchema>;

interface GuarantorFormProps {
  leaseId: string;
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

export function GuarantorForm({ leaseId, trigger, onSuccess }: GuarantorFormProps) {
  const [open, setOpen] = useState(false);
  const { createTenant } = useTenants();
  const { createLeaseParty } = useLeaseParties(leaseId);

  const form = useForm<PersonFormData>({
    resolver: zodResolver(personSchema),
    defaultValues: {
      tipo_soggetto: 'persona_fisica',
      nome: '',
      cognome: '',
      ragione_sociale: '',
      codice_fiscale: '',
      telefono: '',
      email: '',
      indirizzo_residenza: '',
    },
  });
  const tipo = form.watch('tipo_soggetto');

  const onSubmit = async (data: PersonFormData) => {
    const t = await createTenant.mutateAsync({
      tipo_soggetto: data.tipo_soggetto,
      nome: data.nome || null,
      cognome: data.cognome || null,
      ragione_sociale: data.ragione_sociale || null,
      codice_fiscale: data.codice_fiscale || null,
      partita_iva: null,
      indirizzo_residenza: data.indirizzo_residenza || null,
      cap_residenza: null,
      citta_residenza: null,
      provincia_residenza: null,
      email: data.email || null,
      telefono: data.telefono || null,
      iban: null,
      note: null,
    });
    await createLeaseParty.mutateAsync({
      lease_id: leaseId,
      tenant_id: t.id,
      ruolo: 'garante',
      quota_canone_percentuale: null,
      note: null,
    });
    setOpen(false);
    onSuccess?.();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button size="sm" variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            Aggiungi garante
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldPlus className="h-5 w-5" />
            Nuovo Garante
          </DialogTitle>
          <DialogDescription>Compila i dati del garante</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="tipo_soggetto"
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
                      <SelectItem value="persona_fisica">Persona Fisica</SelectItem>
                      <SelectItem value="persona_giuridica">Persona Giuridica</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            {tipo === 'persona_fisica' ? (
              <div className="grid grid-cols-2 gap-4">
                <FormField name="nome" control={form.control} render={({ field }) => (
                  <FormItem><FormLabel>Nome *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField name="cognome" control={form.control} render={({ field }) => (
                  <FormItem><FormLabel>Cognome *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
            ) : (
              <FormField name="ragione_sociale" control={form.control} render={({ field }) => (
                <FormItem><FormLabel>Ragione Sociale *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            )}
            <FormField name="codice_fiscale" control={form.control} render={({ field }) => (
              <FormItem><FormLabel>Codice Fiscale</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField name="telefono" control={form.control} render={({ field }) => (
              <FormItem><FormLabel>Telefono</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField name="email" control={form.control} render={({ field }) => (
              <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField name="indirizzo_residenza" control={form.control} render={({ field }) => (
              <FormItem><FormLabel>Indirizzo</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField name="note" control={form.control} render={({ field }) => (
              <FormItem><FormLabel>Note</FormLabel><FormControl><Textarea rows={3} {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Annulla</Button>
              <Button type="submit">Salva Garante</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
