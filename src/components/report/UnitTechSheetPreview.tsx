import { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, Printer, FileText } from 'lucide-react';
import { useProperties, useUnits } from '@/hooks/useProperties';
import { useLeases, useLeaseParties } from '@/hooks/useLeases';
import { useTenants } from '@/hooks/useTenants';
import { useCadastral } from '@/hooks/useCadastral';
import { usePropertyAdmins } from '@/hooks/usePropertyAdmins';
import { useInventory } from '@/hooks/useInventory';
import { useNotes } from '@/hooks/useNotes';
import { formatCurrency, formatDate } from '@/lib/propertyUtils';
import { useGlobalProperty } from '@/hooks/useGlobalProperty';
import { db } from '../../../utils/localStorageDB.js';

interface UnitTechSheetPreviewProps {
  unitId?: string;
  trigger?: React.ReactNode;
}

export function UnitTechSheetPreview({ unitId, trigger }: UnitTechSheetPreviewProps) {
  const [open, setOpen] = useState(false);
  const { selectedUnitId } = useGlobalProperty();
  const targetUnitId = unitId || selectedUnitId || localStorage.getItem('active_unit_id') || undefined;

  const { units } = useUnits();
  const { properties } = useProperties();
  const unit = useMemo(() => units.find(u => u.id === targetUnitId), [units, targetUnitId]);
  const property = useMemo(() => properties.find(p => p.id === (unit?.property_id || '')), [properties, unit]);

  const { cadastralUnits } = useCadastral(unit?.id);
  const { leases } = useLeases();
  const lease = useMemo(() => leases.find(l => l.unit_id === unit?.id), [leases, unit?.id]);
  const { parties } = useLeaseParties(lease?.id);
  const mainTenant = useMemo(() => parties.find(p => p.ruolo === 'intestatario')?.tenant as any, [parties]);
  const { rooms } = useInventory(unit?.id);
  const { notes } = useNotes();
  const unitNotes = useMemo(() => notes.filter(n => n.unit_id === unit?.id), [notes, unit?.id]);
  const { admins } = usePropertyAdmins();
  const admin = useMemo(() => admins.find(a => a.property_id === unit?.property_id), [admins, unit?.property_id]);

  const netProjection = useMemo(() => {
    if (!lease || !unit) return 0;
    const year = new Date().getFullYear();
    let monthsActive = 0;
    for (let m = 1; m <= 12; m++) {
      const mid = new Date(year, m - 1, 15);
      if (mid >= new Date(lease.data_inizio) && mid <= new Date(lease.data_fine)) monthsActive++;
    }
    const rate = lease.regime_locativo === 'cedolare_21' ? 0.21 : lease.regime_locativo === 'cedolare_10' ? 0.10 : 0;
    const isFirstYear = (year - new Date(lease.data_inizio).getFullYear() + 1) === 1;
    const cedolareMensile = isFirstYear ? 0 : Math.round(lease.canone_mensile * rate * 100) / 100;
    const canoneMensileNetto = lease.canone_mensile - cedolareMensile;
    const renditaTot = (cadastralUnits || []).reduce((s, cu) => s + cu.rendita_euro, 0);
    const baseImp = renditaTot * 1.05 * 160;
    const imuAnnua = Math.round(baseImp * (10.6 / 1000) * 100) / 100;
    const speseStraord = db.getAll()
      .filter((x: any) => x.__table === 'extra_expenses' && x.unit_id === unit.id && (x.data_competenza || '').startsWith(`${year}-`))
      .reduce((sum: number, e: any) => sum + (e.importo_effettivo || 0), 0);
    return Math.round(((canoneMensileNetto * monthsActive) - imuAnnua - speseStraord) * 100) / 100;
  }, [lease, unit, cadastralUnits, rooms]);

  const buildHtml = () => {
    const lines: string[] = [];
    const safe = (v: any) => (v ?? '') as string;
    const section = (title: string) => `<h2>${title}</h2>`;
    const row = (label: string, value: string) => `<tr><td><strong>${label}</strong></td><td>${value}</td></tr>`;
    const table = (rows: string) => `<table>${rows}</table>`;
    const invRows = rooms.map(r => `<tr><td>${r.nome_ambiente}</td><td>ordine ${r.ordine_visualizzazione}</td></tr>`).join('');
    const catRows = (cadastralUnits || []).map(c => 
      `<tr>
        <td>${safe(c.foglio)}</td>
        <td>${safe(c.particella)}</td>
        <td>${safe(c.subalterno)}</td>
        <td>${safe(c.categoria_catastale)}</td>
        <td>${formatCurrency(c.rendita_euro || 0)}</td>
      </tr>`
    ).join('');
    const notesRows = unitNotes.map(n => `<tr><td>${safe(n.titolo)}</td><td>${safe(n.contenuto)}</td></tr>`).join('');
    lines.push(`
      <h1>Scheda Tecnica Unità</h1>
      ${section('Identità Immobile & Amministratore')}
      ${table(
        row('Nome Condominio', safe(property?.nome_complesso)) +
        row('Indirizzo', [safe(property?.indirizzo_via), safe(property?.indirizzo_civico), safe(property?.cap), safe(property?.citta), safe(property?.provincia)].filter(Boolean).join(' ')) +
        row('Studio Amministrativo', safe(admin?.ragione_sociale)) +
        row('URL Portale', safe(admin?.sito_web)) +
        row('Codice PID', safe(admin?.pid)) +
        row('Login', safe(admin?.admin_login)) +
        row('Password', safe(admin?.admin_password))
      )}
      ${section('Anagrafica Catastale')}
      <table>
        <tr><th>Foglio</th><th>Particella</th><th>Subalterno</th><th>Categoria</th><th>Rendita</th></tr>
        ${catRows}
      </table>
      ${section('Inquilino e Contratto')}
      ${table(
        row('Conduttore', mainTenant ? (mainTenant.ragione_sociale || `${safe(mainTenant.nome)} ${safe(mainTenant.cognome)}`) : '') +
        row('Tipo Contratto', safe(lease?.tipo_contratto)) +
        row('Canone', formatCurrency(lease?.canone_mensile || 0)) +
        row('Data Inizio', lease?.data_inizio ? formatDate(lease.data_inizio) : '') +
        row('Data Fine', lease?.data_fine ? formatDate(lease.data_fine) : '')
      )}
      ${section('Sezione Economica')}
      ${table(
        row('Proiezione Netto Annua', formatCurrency(netProjection))
      )}
      ${section('Garanzie')}
      ${table(
        row('Garante', safe(lease?.garante_nome)) +
        row('Fideiussione Bancaria', lease?.fideiussione_bancaria ? 'Sì' : 'No') +
        row('Dettagli Fideiussione', safe(lease?.fideiussione_dettagli))
      )}
      ${section('Inventario')}
      <table>
        <tr><th>Ambiente</th><th>Dettagli</th></tr>
        ${invRows}
      </table>
      ${section('Note Tecniche')}
      <table>
        <tr><th>Titolo</th><th>Contenuto</th></tr>
        ${notesRows}
      </table>
    `);
    return `
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Scheda Tecnica Unità</title>
          <style>
            body { font-family: Arial, sans-serif; color: #000; }
            h1 { font-size: 18px; margin: 12px 0; }
            h2 { font-size: 14px; margin: 10px 0; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
            td, th { border: 1px solid #333; padding: 6px; font-size: 12px; text-align: left; }
          </style>
        </head>
        <body>
          ${lines.join('\n')}
        </body>
      </html>
    `;
  };

  const handlePrint = () => {
    const html = buildHtml();
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.open();
    w.document.write(html);
    w.document.close();
    w.focus();
    w.print();
    // Do not auto-close to let user reprint or save
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <FileText className="h-4 w-4 mr-2" />
            Scarica Scheda Tecnica
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Scheda Tecnica Unità</DialogTitle>
        </DialogHeader>
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm text-muted-foreground">
            Unità: {unit?.nome_interno || '-'} • Condominio: {property?.nome_complesso || '-'}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
              <X className="h-4 w-4 mr-1" /> Chiudi
            </Button>
            <Button size="sm" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-1" /> Stampa/Salva PDF
            </Button>
          </div>
        </div>
        <div className="space-y-4 text-sm">
          <div className="mobile-card">
            <h3 className="font-semibold text-foreground mb-2">Identità Immobile & Amministratore</h3>
            <div>
              <div>Nome Condominio: {property?.nome_complesso || '-'}</div>
              <div>Indirizzo: {[property?.indirizzo_via, property?.indirizzo_civico, property?.cap, property?.citta, property?.provincia].filter(Boolean).join(' ')}</div>
              <div>Studio Amministrativo: {admin?.ragione_sociale || '-'}</div>
              <div>URL Portale: {admin?.sito_web || '-'}</div>
              <div>Codice PID: {admin?.pid || '-'}</div>
              <div>Login: {admin?.admin_login || '-'}</div>
              <div>Password: {admin?.admin_password || '-'}</div>
            </div>
          </div>

          <div className="mobile-card">
            <h3 className="font-semibold text-foreground mb-2">Anagrafica Catastale</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-muted-foreground">
                    <th className="text-left p-1">Foglio</th>
                    <th className="text-left p-1">Particella</th>
                    <th className="text-left p-1">Subalterno</th>
                    <th className="text-left p-1">Categoria</th>
                    <th className="text-left p-1">Rendita</th>
                  </tr>
                </thead>
                <tbody>
                  {(cadastralUnits || []).map(c => (
                    <tr key={c.id}>
                      <td className="p-1">{c.foglio}</td>
                      <td className="p-1">{c.particella}</td>
                      <td className="p-1">{c.subalterno}</td>
                      <td className="p-1">{c.categoria_catastale}</td>
                      <td className="p-1">{formatCurrency(c.rendita_euro || 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mobile-card">
            <h3 className="font-semibold text-foreground mb-2">Inquilino e Contratto</h3>
            <div>
              <div>Conduttore: {mainTenant ? (mainTenant.ragione_sociale || `${mainTenant.nome || ''} ${mainTenant.cognome || ''}`.trim()) : '-'}</div>
              <div>Tipo Contratto: {lease?.tipo_contratto || '-'}</div>
              <div>Canone: {formatCurrency(lease?.canone_mensile || 0)}</div>
              <div>Data Inizio: {lease?.data_inizio ? formatDate(lease.data_inizio) : '-'}</div>
              <div>Data Fine: {lease?.data_fine ? formatDate(lease.data_fine) : '-'}</div>
            </div>
          </div>
          <div className="mobile-card">
            <h3 className="font-semibold text-foreground mb-2">Sezione Economica</h3>
            <div>
              <div>Proiezione Netto Annua: {formatCurrency(netProjection)}</div>
            </div>
          </div>

          <div className="mobile-card">
            <h3 className="font-semibold text-foreground mb-2">Garanzie</h3>
            <div>
              <div>Garante: {lease?.garante_nome || '-'}</div>
              <div>Fideiussione Bancaria: {lease?.fideiussione_bancaria ? 'Sì' : 'No'}</div>
              <div>Dettagli: {lease?.fideiussione_dettagli || '-'}</div>
            </div>
          </div>

          <div className="mobile-card">
            <h3 className="font-semibold text-foreground mb-2">Inventario</h3>
            <div className="space-y-1">
              {(rooms || []).map(r => (
                <div key={r.id} className="text-xs text-muted-foreground">• {r.nome_ambiente}</div>
              ))}
            </div>
          </div>

          <div className="mobile-card">
            <h3 className="font-semibold text-foreground mb-2">Note Tecniche</h3>
            <div className="space-y-1">
              {unitNotes.length === 0 ? (
                <div className="text-xs text-muted-foreground">Nessuna nota</div>
              ) : unitNotes.map(n => (
                <div key={n.id} className="text-xs text-muted-foreground">• {n.titolo}: {n.contenuto}</div>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
