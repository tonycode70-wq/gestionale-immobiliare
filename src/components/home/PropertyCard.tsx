import { useEffect, useState } from 'react';
import { User, FileText, Calendar, Clock, Pencil, Mail, MessageCircle } from 'lucide-react';
import { formatCurrency, formatDate, getDaysRemaining, getContractProgress, getContractTypeLabel, getRegimeLabel } from '@/lib/propertyUtils';
import { ProgressBar } from '@/components/common';
import { cn } from '@/lib/utils';
import type { Unit, Lease, Tenant } from '@/types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useTenants } from '@/hooks/useTenants';

interface PropertyCardProps {
  unit: Unit;
  lease?: Lease;
  tenant?: Tenant;
  onClick?: () => void;
}

export function PropertyCard({ unit, lease, tenant, onClick }: PropertyCardProps) {
  const daysRemaining = lease ? getDaysRemaining(lease.data_fine) : null;
  const progress = lease ? getContractProgress(lease.data_inizio, lease.data_fine) : 0;
  const { updateTenant } = useTenants();
  const [openEdit, setOpenEdit] = useState(false);
  const [tenantData, setTenantData] = useState<Partial<Tenant>>({
    id: tenant?.id,
    tipo_soggetto: tenant?.tipo_soggetto,
    nome: tenant?.nome,
    cognome: tenant?.cognome || undefined,
    ragione_sociale: tenant?.ragione_sociale || undefined,
    codice_fiscale: tenant?.codice_fiscale || undefined,
    partita_iva: tenant?.partita_iva || undefined,
    indirizzo_residenza: tenant?.indirizzo_residenza || undefined,
    citta_residenza: tenant?.citta_residenza || undefined,
    cap_residenza: tenant?.cap_residenza || undefined,
    provincia_residenza: tenant?.provincia_residenza || undefined,
    email: tenant?.email || undefined,
    telefono: tenant?.telefono || undefined,
    iban: tenant?.iban || undefined,
    note: tenant?.note || undefined,
  });

  useEffect(() => {
    if (openEdit && tenant) {
      setTenantData({
        id: tenant.id,
        tipo_soggetto: tenant.tipo_soggetto,
        nome: tenant.nome || undefined,
        cognome: tenant.cognome || undefined,
        ragione_sociale: tenant.ragione_sociale || undefined,
        codice_fiscale: tenant.codice_fiscale || undefined,
        partita_iva: tenant.partita_iva || undefined,
        indirizzo_residenza: tenant.indirizzo_residenza || undefined,
        citta_residenza: tenant.citta_residenza || undefined,
        cap_residenza: tenant.cap_residenza || undefined,
        provincia_residenza: tenant.provincia_residenza || undefined,
        email: tenant.email || undefined,
        telefono: tenant.telefono || undefined,
        iban: tenant.iban || undefined,
        note: tenant.note || undefined,
      });
    }
  }, [openEdit, tenant]);

  return (
    <div 
      className="mobile-card cursor-pointer hover:shadow-md transition-shadow"
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-foreground">{unit.nome_interno}</h3>
          <p className="text-sm text-muted-foreground">{unit.piano ? `Piano ${unit.piano}` : ''} {unit.metratura_mq ? `• ${unit.metratura_mq} mq` : ''}</p>
        </div>
        {lease && (
          <span className="text-lg font-bold text-primary">
            {formatCurrency(lease.canone_mensile)}
          </span>
        )}
      </div>

      {tenant && (
        <div className="flex items-center gap-2 mb-3 text-sm">
          <User className="h-4 w-4 text-muted-foreground" />
          <span className="text-foreground">
            {tenant.tipo_soggetto === 'persona_fisica' 
              ? `${tenant.nome} ${tenant.cognome}` 
              : tenant.ragione_sociale}
          </span>
          <div className="ml-auto flex items-center gap-1">
            {tenant.telefono && (
              (() => {
                const cleanPhone = (tenant.telefono || '').replace(/[^\d]/g, '');
                const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent("Ciao, ti scrivo dall'App Gestione Immobili per...")}`;
                return (
                  <a
                    href={waUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    aria-label="Contatta su WhatsApp"
                    className="p-1 rounded hover:bg-muted"
                  >
                    <MessageCircle className="h-4 w-4 text-green-600" />
                  </a>
                );
              })()
            )}
            {tenant.email && (
              <a
                href={`mailto:${tenant.email}?subject=${encodeURIComponent('Comunicazione Gestione Immobiliare')}`}
                onClick={(e) => e.stopPropagation()}
                aria-label="Invia Email"
                className="p-1 rounded hover:bg-muted"
              >
                <Mail className="h-4 w-4 text-primary" />
              </a>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto"
            onClick={(e) => { e.stopPropagation(); setOpenEdit(true); }}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Dialog open={openEdit} onOpenChange={(o) => setOpenEdit(o)}>
            <DialogContent onClick={(e) => e.stopPropagation()} className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Scheda Anagrafica Conduttore</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Input 
                    placeholder="Ragione Sociale"
                    value={tenantData.ragione_sociale || ''}
                    onChange={e => setTenantData(d => ({ ...d, ragione_sociale: e.target.value }))}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <Input 
                      placeholder="Nome"
                      value={tenantData.nome || ''}
                      onChange={e => setTenantData(d => ({ ...d, nome: e.target.value }))}
                    />
                    <Input 
                      placeholder="Cognome"
                      value={tenantData.cognome || ''}
                      onChange={e => setTenantData(d => ({ ...d, cognome: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Input 
                    placeholder="Codice Fiscale"
                    value={tenantData.codice_fiscale || ''}
                    onChange={e => setTenantData(d => ({ ...d, codice_fiscale: e.target.value }))}
                  />
                  <Input 
                    placeholder="Partita IVA"
                    value={tenantData.partita_iva || ''}
                    onChange={e => setTenantData(d => ({ ...d, partita_iva: e.target.value }))}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Input 
                    placeholder="Via"
                    value={tenantData.indirizzo_residenza || ''}
                    onChange={e => setTenantData(d => ({ ...d, indirizzo_residenza: e.target.value }))}
                  />
                  <Input 
                    placeholder="Città"
                    value={tenantData.citta_residenza || ''}
                    onChange={e => setTenantData(d => ({ ...d, citta_residenza: e.target.value }))}
                  />
                  <Input 
                    placeholder="CAP"
                    value={tenantData.cap_residenza || ''}
                    onChange={e => setTenantData(d => ({ ...d, cap_residenza: e.target.value }))}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="flex items-center gap-2">
                    <Input 
                      placeholder="Telefono"
                      value={tenantData.telefono || ''}
                      onChange={e => setTenantData(d => ({ ...d, telefono: e.target.value }))}
                    />
                    <a
                      href={`https://wa.me/${(tenantData.telefono || '').replace(/[^\d]/g, '')}?text=${encodeURIComponent("Ciao, ti scrivo dall'App Gestione Immobili per...")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center p-2 rounded bg-green-600 hover:bg-green-700 text-white"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MessageCircle className="h-4 w-4" />
                    </a>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input 
                      type="email"
                      placeholder="Email"
                      value={tenantData.email || ''}
                      onChange={e => setTenantData(d => ({ ...d, email: e.target.value }))}
                    />
                    <a
                      href={`mailto:${tenantData.email || ''}?subject=${encodeURIComponent('Comunicazione Gestione Immobiliare')}`}
                      className="inline-flex items-center justify-center p-2 rounded bg-blue-600 hover:bg-blue-700 text-white"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Mail className="h-4 w-4" />
                    </a>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setOpenEdit(false)}>Annulla</Button>
                  <Button 
                    className="bg-orange-500 hover:bg-orange-600 text-white"
                    onClick={async () => {
                      if (!tenantData.id) { setOpenEdit(false); return; }
                      await updateTenant.mutateAsync({ id: tenantData.id, ...tenantData });
                      setOpenEdit(false);
                    }}
                    disabled={updateTenant.isPending}
                  >
                    Salva
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {lease && (
        <>
          <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
            <div className="flex items-center gap-1">
              <FileText className="h-3 w-3" />
              <span>{getContractTypeLabel(lease.tipo_contratto)}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="font-medium">{getRegimeLabel(lease.regime_locativo)}</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-1 text-muted-foreground">
                <Calendar className="h-3 w-3" />
                <span>Scadenza: {formatDate(lease.data_fine)}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3 text-muted-foreground" />
                <span className={cn(
                  'font-medium',
                  daysRemaining && daysRemaining < 90 ? 'text-warning' : 'text-foreground'
                )}>
                  {daysRemaining} giorni
                </span>
              </div>
            </div>
            
            <ProgressBar value={progress} />
          </div>
        </>
      )}

      {!lease && (
        <div className="py-4 text-center text-muted-foreground text-sm">
          Unità non locata
        </div>
      )}
    </div>
  );
}
