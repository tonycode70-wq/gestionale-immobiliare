import { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, Printer } from 'lucide-react';
import { useProperties, useUnits } from '@/hooks/useProperties';
import { useLeases, useLeaseParties } from '@/hooks/useLeases';
import { usePayments } from '@/hooks/usePayments';
import { useExpenses } from '@/hooks/useExpenses';
import { useCadastral } from '@/hooks/useCadastral';
import { usePropertyAdmins } from '@/hooks/usePropertyAdmins';
import { formatCurrency, formatDate } from '@/lib/propertyUtils';
import { db } from '../../../utils/localStorageDB.js';

interface ReportPreviewProps {
  unitId: string;
  year: number;
  trigger?: React.ReactNode;
}

export function ReportPreview({ unitId, year, trigger }: ReportPreviewProps) {
  const [open, setOpen] = useState(false);
  const { units } = useUnits();
  const unit = units.find(u => u.id === unitId);
  const { properties } = useProperties();
  const property = unit ? properties.find(p => p.id === unit.property_id) : undefined;
  const { leases } = useLeases();
  const lease = leases.find(l => l.unit_id === unitId);
  const { payments } = usePayments(undefined, year);
  const { expenses } = useExpenses(unitId, year);
  const { cadastralUnits, totaleRendita } = useCadastral(unitId);
  const { admin } = usePropertyAdmins(property?.id);
  const { parties } = useLeaseParties(lease?.id);

  const paymentsYear = useMemo(() => {
    return payments.filter(p => {
      const l = leases.find(ll => ll.id === p.lease_id);
      return l?.unit_id === unitId && p.competenza_anno === year;
    });
  }, [payments, leases, unitId, year]);

  const totals = useMemo(() => {
    const incassato = paymentsYear.reduce((sum, p) => sum + (p.importo_canone_pagato || 0) + (p.importo_spese_pagato || 0), 0);
    const spese = expenses.reduce((sum, e) => sum + (e.importo_effettivo || 0), 0);
    return { incassato, spese };
  }, [paymentsYear, expenses]);

  return (
    <Dialog open={open} onOpenChange={(v) => {
      if (v) db.syncStorage();
      setOpen(v);
    }}>
      <DialogTrigger asChild>
        {trigger || <Button variant="outline">Report PDF</Button>}
      </DialogTrigger>
      <DialogContent className="max-w-[95vw] h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Report Unità • {unit?.nome_interno} • {year}</span>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => window.print()}><Printer className="h-4 w-4 mr-2" />Stampa/Download</Button>
              <DialogClose asChild>
                <Button variant="ghost"><X className="h-4 w-4" /></Button>
              </DialogClose>
            </div>
          </DialogTitle>
          <DialogDescription>Anteprima a tutto schermo, senza uscire dall’app</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="mobile-card">
            <h3 className="font-semibold">Intestazione</h3>
            <p className="text-sm">Immobile: {property?.nome_complesso}</p>
            {property?.indirizzo_via && <p className="text-sm text-muted-foreground">{property.indirizzo_via} {property.indirizzo_civico}, {property.cap} {property.citta} ({property.provincia})</p>}
            {admin && (
              <div className="text-sm mt-2">
                <p>Amministratore: {admin.ragione_sociale}</p>
                {admin.telefono_studio && <p>Tel: {admin.telefono_studio}</p>}
                {admin.email && <p>Email: {admin.email}</p>}
              </div>
            )}
          </div>
          <div className="mobile-card">
            <h3 className="font-semibold">Unità & Catasto</h3>
            <p className="text-sm">Interno: {unit?.interno || '—'} • Piano: {unit?.piano || '—'} • Scala: {unit?.scala || '—'}</p>
            {cadastralUnits.map(c => (
              <div key={c.id} className="text-sm text-muted-foreground">
                Catasto: Foglio {c.foglio} • Particella {c.particella} • Sub {c.subalterno} • Rendita {formatCurrency(c.rendita_euro)}
              </div>
            ))}
            {totaleRendita > 0 && <p className="text-sm">Rendita Totale: {formatCurrency(totaleRendita)}</p>}
          </div>
          <div className="mobile-card">
            <h3 className="font-semibold">Situazione Contrattuale</h3>
            {lease ? (
              <div className="text-sm">
                <p>Conduttore: {(parties || []).find(p => p.ruolo === 'intestatario')?.tenant ? 'Presente' : '—'}</p>
                <p>Canone: {formatCurrency(lease.canone_mensile)} • Periodo: {formatDate(lease.data_inizio)} – {formatDate(lease.data_fine)}</p>
              </div>
            ) : <p className="text-sm">Nessun contratto attivo</p>}
          </div>
          <div className="mobile-card">
            <h3 className="font-semibold">Incassi {year}</h3>
            <div className="grid grid-cols-12 gap-1 text-xs">
              {Array.from({ length: 12 }).map((_, i) => {
                const mese = i + 1;
                const row = paymentsYear.find(p => p.competenza_mese === mese);
                const stato = row?.stato_pagamento || 'NON PAGATO';
                const importo = (row?.importo_canone_pagato || 0) + (row?.importo_spese_pagato || 0);
                return (
                  <div key={mese} className="p-2 rounded bg-muted/30">
                    <div className="font-medium">{String(mese).padStart(2, '0')}</div>
                    <div>{formatCurrency(importo)}</div>
                    <div className="text-muted-foreground">{stato}</div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="mobile-card">
            <h3 className="font-semibold">Spese Straordinarie</h3>
            <div className="space-y-1 text-sm">
              {expenses.length === 0 ? <p className="text-muted-foreground">Nessuna spesa registrata</p> : expenses.map(e => (
                <div key={e.id} className="flex justify-between">
                  <span>{formatDate(e.data_competenza)} • {e.descrizione}</span>
                  <span>{formatCurrency(e.importo_effettivo)}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="mobile-card">
            <h3 className="font-semibold">Bilancio</h3>
            <div className="flex justify-between text-sm">
              <span>Totale Incassi</span><span>{formatCurrency(totals.incassato)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Totale Spese</span><span>{formatCurrency(totals.spese)}</span>
            </div>
            <div className="flex justify-between text-sm font-semibold">
              <span>Utile Netto Reale</span><span>{formatCurrency(totals.incassato - totals.spese)}</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
