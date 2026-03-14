import { useState, useMemo, useEffect } from 'react';
import { Check, AlertCircle, Loader2, Receipt } from 'lucide-react';
import { AppLayout } from '@/components/layout';
import { UnitSelector, MonthSelector, StatusBadge } from '@/components/common';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { EllipsisVertical, Pencil, Trash2, Mail, MessageCircle } from 'lucide-react';
import { formatCurrency } from '@/lib/propertyUtils';
import { calculateIMU, type IMUResult, calculateCedolareSecca, type CedolareResult } from '@/lib/taxCalculations';
import { useCadastral } from '@/hooks/useCadastral';
import { cn, calculateMonthlyNet, round2 } from '@/lib/utils';
import { usePayments, type Payment } from '@/hooks/usePayments';
import { useExpenses } from '@/hooks/useExpenses';
import { useProperties, useUnits } from '@/hooks/useProperties';
import { useLeases } from '@/hooks/useLeases';
import { useTenants } from '@/hooks/useTenants';
import { useAuth } from '@/hooks/useAuth';
import { ExpenseForm } from '@/components/forms/ExpenseForm';
import { PaymentForm } from '@/components/forms/PaymentForm';
import { db } from '../../utils/localStorageDB.js';
import type { Tenant } from '@/types';
import { useGlobalProperty } from '@/hooks/useGlobalProperty';
import { SyncIndicator } from '@/components/SyncIndicator';
import { ReportPreview } from '@/components/report/ReportPreview';
import { generateReceiptPDFForPayment, generateZipForPayments, downloadBlob } from '@/services/receiptService';

const RegistroPage = () => {
  const now = new Date();
  const { user } = useAuth();
  const { selectedPropertyId, selectedUnitId } = useGlobalProperty();
  const [selectedUnit, setSelectedUnit] = useState<string>(selectedUnitId || 'all');
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [activeTab, setActiveTab] = useState<'incassi' | 'spese'>('incassi');

  const { properties } = useProperties();
  const { units, isLoading: loadingUnits } = useUnits();
  const { leases } = useLeases();
  const { tenants } = useTenants();
  const { payments, isLoading: loadingPayments, markAsPaid, deletePayment } = usePayments(undefined, selectedYear);
  const { expenses, isLoading: loadingExpenses } = useExpenses(undefined, selectedYear);
  
  const { cadastralUnits } = useCadastral(selectedUnit === 'all' ? undefined : selectedUnit);

  const isLoading = loadingUnits || loadingPayments || loadingExpenses;

  const [leaseTenantMap, setLeaseTenantMap] = useState<Record<string, Tenant | undefined>>({});
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [editPaymentOpen, setEditPaymentOpen] = useState(false);
  const [tenantEditOpen, setTenantEditOpen] = useState<string | null>(null);
  const [tenantEditData, setTenantEditData] = useState<Partial<Tenant>>({});

  useEffect(() => {
    const fetchParties = async () => {
      if (!user || leases.length === 0) {
        setLeaseTenantMap({});
        return;
      }
      const leaseIds = leases.map(l => l.id);
      const all: unknown[] = db.getAll();
      const parties = all
        .filter((x) => (x as { __table: string; ruolo: string; lease_id: string }).__table === 'lease_parties'
          && (x as { ruolo: string }).ruolo === 'intestatario'
          && leaseIds.includes((x as { lease_id: string }).lease_id))
        .map((x) => x as { lease_id: string; tenant_id: string });
      const tenantsAll = all.filter((x) => (x as { __table: string }).__table === 'tenants').map((x) => x as Tenant);
      const map: Record<string, Tenant | undefined> = {};
      parties.forEach((p) => {
        const t = tenantsAll.find((tt) => tt.id === p.tenant_id);
        map[p.lease_id] = t;
      });
      setLeaseTenantMap(map);
    };
    fetchParties();
  }, [user, leases]);

  // Unit options for selector
  const unitOptions = useMemo(() => {
    const list = selectedPropertyId === 'all' ? units : units.filter(u => u.property_id === selectedPropertyId);
    return list.map(u => {
      const property = properties.find(p => p.id === u.property_id);
      return {
        id: u.id,
        nome_interno: u.nome_interno,
        property_name: property?.nome_complesso,
      };
    });
  }, [units, properties, selectedPropertyId]);

  // Filter payments for selected month/year
  const filteredPayments = useMemo(() => {
    return payments
      .filter(p => p.competenza_anno === selectedYear && p.competenza_mese === selectedMonth)
      .filter(p => {
        const lease = leases.find(l => l.id === p.lease_id);
        const unit = lease ? units.find(u => u.id === lease.unit_id) : undefined;
        const matchProperty = selectedPropertyId === 'all' ? true : unit?.property_id === selectedPropertyId;
        const matchUnit = selectedUnit === 'all' ? true : lease?.unit_id === selectedUnit;
        return matchProperty && matchUnit;
      })
      .map(payment => {
        const lease = leases.find(l => l.id === payment.lease_id);
        const unit = lease ? units.find(u => u.id === lease.unit_id) : undefined;
        const tenant = lease ? leaseTenantMap[lease.id] : undefined;
        return {
          payment,
          lease,
          unit,
          tenant,
        };
      })
      .filter(p => p.lease && p.unit);
  }, [selectedMonth, selectedYear, selectedUnit, payments, leases, units, leaseTenantMap, selectedPropertyId]);

  // Filter extra expenses
  const filteredExpenses = useMemo(() => {
    const byMonth = expenses.filter(e => {
      const date = new Date(e.data_competenza);
      return date.getFullYear() === selectedYear && date.getMonth() + 1 === selectedMonth;
    });
    if (selectedUnit !== 'all') {
      return byMonth.filter(e => (e.unit_id === selectedUnit) || (e.owner_type === 'unit' && e.owner_id === selectedUnit));
    }
    if (selectedPropertyId !== 'all') {
      return byMonth.filter(e => (e.property_id === selectedPropertyId) || (e.owner_type === 'property' && e.owner_id === selectedPropertyId));
    }
    return byMonth;
  }, [selectedMonth, selectedYear, selectedUnit, expenses, selectedPropertyId]);

  const totals = useMemo(() => {
    const imponibile = filteredPayments.reduce((sum, p) => sum + (p.payment.importo_canone_pagato || 0), 0);
    const speseCondominialiIncassate = filteredPayments.reduce((sum, p) => sum + (p.payment.importo_spese_pagato || 0), 0);
    const incassatoTotale = imponibile + speseCondominialiIncassate;
    const cedolareTasse = Math.round(
      filteredPayments.reduce((sum, p) => {
        const regime = p.lease?.regime_locativo;
        if (!regime || (regime !== 'cedolare_21' && regime !== 'cedolare_10')) return sum;
        const aliquota = regime === 'cedolare_21' ? 0.21 : 0.10;
        const annoContratto = p.lease ? (selectedYear - new Date(p.lease.data_inizio).getFullYear() + 1) : 0;
        const imponibileRata = p.payment.importo_canone_pagato || 0;
        const tax = annoContratto === 1 ? 0 : imponibileRata * aliquota;
        return sum + tax;
      }, 0) * 100
    ) / 100;
    const speseStraord = filteredExpenses.reduce((sum, e) => sum + (e.importo_effettivo || 0), 0);
    // Monthly breakdown for Card Blu 2.0
    const unitLease = selectedUnit === 'all' 
      ? null 
      : leases.find(l => l.unit_id === selectedUnit 
          && new Date(l.data_inizio) <= new Date(selectedYear, selectedMonth - 1, 28) 
          && new Date(l.data_fine) >= new Date(selectedYear, selectedMonth - 1, 1));
    const isCedolare = unitLease ? (unitLease.regime_locativo === 'cedolare_21' || unitLease.regime_locativo === 'cedolare_10') : false;
    const aliquota = unitLease?.regime_locativo === 'cedolare_21' ? 0.21 : unitLease?.regime_locativo === 'cedolare_10' ? 0.10 : 0;
    const annoContratto = unitLease ? (selectedYear - new Date(unitLease.data_inizio).getFullYear() + 1) : 0;
    const cedolareAnnua = isCedolare ? (annoContratto === 1 ? 0 : (unitLease!.canone_mensile * 12) * aliquota) : 0;
    const cedolareMensile = Math.round((cedolareAnnua / 12) * 100) / 100;
    let imuMensile = 0;
    if (selectedUnit !== 'all' && cadastralUnits && cadastralUnits.length > 0) {
      const property = units.find(u => u.id === selectedUnit)?.property_id ? properties.find(p => p.id === units.find(u => u.id === selectedUnit)?.property_id) : null;
      const comune = (property?.citta || 'Desenzano del Garda').toLowerCase();
      const data = cadastralUnits.map(cu => ({ categoria_catastale: cu.categoria_catastale, rendita_euro: cu.rendita_euro }));
      const hasConcordato = unitLease?.tipo_contratto === '3+2_agevolato';
      const imuResult: IMUResult = calculateIMU(data, {
        anno: selectedYear,
        comune,
        aliquota_per_mille: 10.6,
        percentuale_possesso: 100,
        mesi_possesso: 12,
        is_prima_casa: false,
        detrazioni_euro: 0,
        riduzione_canone_concordato: !!hasConcordato,
      });
      imuMensile = Math.round((imuResult.impostaAnnua / 12) * 100) / 100;
    }
    const affittoIncassatoMese = imponibile;
    const speseIncassateMese = speseCondominialiIncassate;
    const incassatoTotaleMese = incassatoTotale;
    const nettoMese = calculateMonthlyNet({
      incassatoTotaleMese,
      speseIncassateMese,
      speseStraordMese: speseStraord,
      imuMensile,
    });
    const nettoReale = round2(nettoMese);
    const nettoRealeMensile = round2(nettoMese);
    const statoPagamenti = filteredPayments.every(p => p.payment.stato_pagamento === 'PAGATO') ? 'OK' : 'MANCANTI';
    const scadenzeAttive: Array<{ label: string; importo: number }> = [];
    if (selectedUnit !== 'all' && unitLease) {
      const ced: CedolareResult = calculateCedolareSecca({
        anno: selectedYear,
        regime: unitLease.regime_locativo as 'cedolare_21' | 'cedolare_10',
        dataInizioContratto: unitLease.data_inizio,
        dataFineContratto: unitLease.data_fine,
        canoneAnnuo: unitLease.canone_mensile * 12,
        isPrimoAnno: (selectedYear - new Date(unitLease.data_inizio).getFullYear() + 1) === 1,
      });
      ced.rate.forEach(r => {
        const d = new Date(r.scadenza);
        if (d.getFullYear() === selectedYear && d.getMonth() + 1 === selectedMonth) {
          scadenzeAttive.push({ label: r.descrizione, importo: r.importo });
        }
      });
      if (imuMensile > 0 && (selectedMonth === 6 || selectedMonth === 12)) {
        scadenzeAttive.push({ label: selectedMonth === 6 ? 'IMU Acconto' : 'IMU Saldo', importo: selectedMonth === 6 ? Math.round(imuMensile * 6 * 100) / 100 : Math.round(imuMensile * 6 * 100) / 100 });
      }
    }
    return {
      totaleAffittoImponibile: imponibile,
      totaleSpese: speseCondominialiIncassate,
      speseIncassateMese: speseCondominialiIncassate,
      affittoIncassatoMese: affittoIncassatoMese,
      incassatoTotaleMese: incassatoTotaleMese,
      incassatoTotale,
      cedolareTasse,
      speseStraord,
      nettoReale,
      cedolareMensile,
      imuMensile,
      nettoRealeMensile,
      statoPagamenti,
      scadenzeAttive,
    };
  }, [filteredPayments, filteredExpenses, selectedYear, selectedMonth, selectedUnit, leases, units, properties, cadastralUnits]);

  const monthsStatus = useMemo(() => {
    if (selectedUnit === 'all') return [];
    const lease = leases.find(l => l.unit_id === selectedUnit);
    const year = selectedYear;
    const start = lease ? new Date(lease.data_inizio) : null;
    const end = lease ? new Date(lease.data_fine) : null;
    const unitPayments = payments.filter(p => p.lease_id === (lease?.id || '') && p.competenza_anno === year);
    const arr: Array<'paid'|'missing'|'future'> = [];
    for (let m = 1; m <= 12; m++) {
      const inContract = !!(start && end) && new Date(year, m - 1, 15) >= start! && new Date(year, m - 1, 15) <= end!;
      if (!inContract) {
        arr.push('future');
        continue;
      }
      const pmt = unitPayments.find(p => p.competenza_mese === m);
      if (pmt && pmt.stato_pagamento === 'PAGATO') {
        arr.push('paid');
      } else if (m <= selectedMonth) {
        arr.push('missing');
      } else {
        arr.push('future');
      }
    }
    return arr;
  }, [selectedUnit, selectedYear, selectedMonth, payments, leases]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PAGATO':
        return <StatusBadge status="success">Pagato</StatusBadge>;
      case 'PARZIALE':
        return <StatusBadge status="warning">Parziale</StatusBadge>;
      case 'IN_RITARDO':
        return <StatusBadge status="error">In ritardo</StatusBadge>;
      default:
        return <StatusBadge status="muted">Atteso</StatusBadge>;
    }
  };

  const handleMarkAsPaid = async (paymentId: string, payment: Payment) => {
    await markAsPaid.mutateAsync({
      id: paymentId,
      importo_canone_pagato: payment.importo_canone_previsto,
      importo_spese_pagato: payment.importo_spese_previste || 0,
      data_pagamento: new Date().toISOString().split('T')[0],
    });
  };

  const { updateTenant, deleteTenant } = useTenants();
  const openTenantEdit = (tenant?: Tenant) => {
    if (!tenant) return;
    setTenantEditData({
      id: tenant.id,
      tipo_soggetto: tenant.tipo_soggetto,
      nome: tenant.nome,
      cognome: tenant.cognome,
      ragione_sociale: tenant.ragione_sociale,
      codice_fiscale: tenant.codice_fiscale || undefined,
      partita_iva: tenant.partita_iva || undefined,
      indirizzo_residenza: tenant.indirizzo_residenza || undefined,
      citta_residenza: tenant.citta_residenza || undefined,
      cap_residenza: tenant.cap_residenza || undefined,
      provincia_residenza: tenant.provincia_residenza || undefined,
      email: tenant.email,
      telefono: tenant.telefono,
      iban: tenant.iban || undefined,
      note: tenant.note || undefined,
    });
    setTenantEditOpen(tenant.id);
  };
  const saveTenantEdit = async () => {
    if (!tenantEditData.id) return;
    await updateTenant.mutateAsync({ id: tenantEditData.id as string, ...tenantEditData });
    setTenantEditOpen(null);
  };
  const removeTenant = async (id?: string) => {
    if (!id) return;
    await deleteTenant.mutateAsync(id);
  };

  if (isLoading) {
    return (
      <AppLayout title="Registro">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Registro">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Registro</h2>
          {activeTab === 'spese' ? (
            <ExpenseForm 
              unitId={selectedUnit === 'all' ? undefined : selectedUnit} 
              trigger={<Button className="shrink-0"><Receipt className="h-4 w-4 mr-2" />Nuova Spesa</Button>} 
            />
          ) : (
            <PaymentForm trigger={<Button className="shrink-0">Registra Incasso</Button>} />
          )}
        </div>
        {/* Selectors */}
        <div className="flex items-center justify-between">
          <UnitSelector value={selectedUnit} onChange={setSelectedUnit} units={unitOptions} />
          <div className="flex items-center gap-2">
            {selectedUnit !== 'all' && <ReportPreview unitId={selectedUnit} year={selectedYear} />}
            <SyncIndicator />
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                const ids = filteredPayments
                  .filter(p => p.payment.stato_pagamento === 'PAGATO')
                  .map(p => p.payment.id);
                if (ids.length === 0) return;
                const blob = await generateZipForPayments(ids, 'property');
                downloadBlob(`Ricevute_${selectedYear}_${String(selectedMonth).padStart(2, '0')}.zip`, blob);
              }}
            >
              Ricevute mese (ZIP)
            </Button>
          </div>
        </div>
        <MonthSelector 
          month={selectedMonth} 
          year={selectedYear} 
          onChange={(m, y) => { setSelectedMonth(m); setSelectedYear(y); }}
        />

        {monthsStatus.length === 12 && (
          <div className="grid grid-cols-12 gap-0.5 mb-2">
            {monthsStatus.map((st, idx) => (
              <div
                key={`m-${idx}`}
                className={cn(
                  'h-3 rounded-[3px] border',
                  st === 'paid' ? 'bg-green-500 border-green-600' : st === 'missing' ? 'bg-red-500 border-red-600' : 'bg-gray-400 border-gray-500'
                )}
                aria-label={st}
                title={`Mese ${idx + 1}: ${st}`}
              />
            ))}
          </div>
        )}

        <div className="financial-card">
          <div className="grid grid-cols-2 gap-4">
            <div className="financial-card-inner">
              <p className="text-xs text-white/60 uppercase mb-1">Incassato Totale</p>
              <p className="text-lg font-bold text-white">{formatCurrency(totals.incassatoTotale)}</p>
            </div>
            <div className="financial-card-inner">
              <p className="text-xs text-white/60 uppercase mb-1">Reddito Imponibile</p>
              <p className="text-lg font-bold text-white">{formatCurrency(totals.totaleAffittoImponibile)}</p>
            </div>
            <div className="financial-card-inner">
              <p className="text-xs text-white/60 uppercase mb-1">Cedolare/Tasse</p>
              <p className="text-lg font-bold text-white">{formatCurrency(totals.cedolareTasse)}</p>
            </div>
            <div className="financial-card-inner">
              <p className="text-xs text-white/60 uppercase mb-1">Spese Straord.</p>
              <p className="text-lg font-bold text-red-300">{formatCurrency(totals.speseStraord)}</p>
            </div>
          </div>
          <div className="mt-3">
            <p className="text-xs text-white/60 uppercase mb-1">NETTO REALE</p>
            <p className="text-xl font-extrabold text-white">{formatCurrency(totals.nettoReale)}</p>
            <div className="grid grid-cols-3 gap-2 mt-2">
              <div className="financial-card-inner text-center">
                <p className="text-[10px] text-white/60 uppercase">Cedolare/12</p>
                <p className="text-sm font-bold text-white/80">{formatCurrency(totals.cedolareMensile || 0)}</p>
              </div>
              <div className="financial-card-inner text-center">
                <p className="text-[10px] text-white/60 uppercase">IMU/12</p>
                <p className="text-sm font-bold text-white/80">{formatCurrency(totals.imuMensile || 0)}</p>
              </div>
              <div className="financial-card-inner text-center">
                <p className="text-[10px] text-white/60 uppercase">Netto mese</p>
                <p className="text-sm font-bold text-green-300">{formatCurrency(totals.nettoRealeMensile || 0)}</p>
              </div>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-[10px] text-white/60 uppercase">Stato Pagamenti</span>
              <span className={cn('text-xs font-bold', totals.statoPagamenti === 'OK' ? 'text-green-300' : 'text-red-300')}>{totals.statoPagamenti}</span>
            </div>
            {totals.scadenzeAttive && totals.scadenzeAttive.length > 0 && (
              <div className="mt-2 p-2 rounded bg-muted/30">
                {totals.scadenzeAttive.map((s, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs text-white/80">
                    <span>{s.label}</span>
                    <span>{formatCurrency(s.importo)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button 
            variant={activeTab === 'incassi' ? 'default' : 'outline'} 
            onClick={() => setActiveTab('incassi')}
            className={cn('px-3 py-2')}
          >
            Incassi ({filteredPayments.length})
          </Button>
          <Button 
            variant={activeTab === 'spese' ? 'default' : 'outline'} 
            onClick={() => setActiveTab('spese')}
            className={cn('px-3 py-2')}
          >
            Spese ({filteredExpenses.length})
          </Button>
        </div>

        {activeTab === 'incassi' ? (
          <div className="space-y-3">
            <h3 className="font-semibold text-foreground">Incassi del mese</h3>
            {filteredPayments.length === 0 ? (
              <div className="mobile-card text-center py-6">
                <AlertCircle className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">Nessun incasso per questo periodo</p>
              </div>
            ) : (
              filteredPayments.map(({ payment, lease, unit, tenant }) => (
                <div key={payment.id} className="mobile-card">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-medium text-foreground">
                        {(() => {
                          const property = unit ? properties.find(p => p.id === unit.property_id) : undefined;
                          return `${property?.nome_complesso || 'Immobile'} • ${unit?.nome_interno || 'Unità'}`;
                        })()}
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        Contratto: {lease?.tipo_contratto}{lease?.codice_contratto_interno ? ` • ${lease.codice_contratto_interno}` : ''}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {tenant?.tipo_soggetto === 'persona_fisica' 
                          ? `${tenant?.nome || ''} ${tenant?.cognome || ''}`.trim()
                          : tenant?.ragione_sociale || 'Conduttore'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(payment.stato_pagamento || 'ATTESO')}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <EllipsisVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => removeTenant(tenant?.id)}>
                            <Trash2 className="h-4 w-4 mr-2" /> Elimina conduttore
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openTenantEdit(tenant)}>
                            <Pencil className="h-4 w-4 mr-2" /> Modifica conduttore
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => deletePayment.mutateAsync(payment.id)}>
                            <Trash2 className="h-4 w-4 mr-2" /> Elimina incasso
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => { setEditingPayment(payment); setEditPaymentOpen(true); }}>
                            <Pencil className="h-4 w-4 mr-2" /> Modifica incasso
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm mb-3">
                    <div className="text-muted-foreground">
                      <span>Data incasso: {payment.data_pagamento || '—'}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-lg font-bold text-foreground">
                        {formatCurrency((payment.importo_canone_pagato || 0) + (payment.importo_spese_pagato || 0))}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Affitto: {formatCurrency(payment.importo_canone_pagato || 0)} • Spese: {formatCurrency(payment.importo_spese_pagato || 0)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          const blob = await generateReceiptPDFForPayment(payment.id, 'property');
                          downloadBlob(`Ricevuta_${payment.id}.pdf`, blob);
                        }}
                      >
                        Ricevuta
                      </Button>
                    {payment.stato_pagamento !== 'PAGATO' && (
                      <Button 
                        size="sm" 
                        className="bg-success hover:bg-success/90"
                        onClick={() => handleMarkAsPaid(payment.id, payment)}
                        disabled={markAsPaid.isPending}
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Pagato oggi
                      </Button>
                    )}
                    </div>
                  </div>
                  {payment.stato_pagamento === 'PARZIALE' && (
                    <div className="mt-2 p-2 bg-warning/10 rounded-lg text-xs text-warning-foreground">
                      Pagato: {formatCurrency((payment.importo_canone_pagato || 0) + (payment.importo_spese_pagato || 0))} • 
                      Residuo: {formatCurrency(payment.importo_residuo_calcolato || 0)}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <h3 className="font-semibold text-foreground">Spese del mese</h3>
            {filteredExpenses.length === 0 ? (
              <div className="mobile-card text-center py-6">
                <AlertCircle className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">Nessuna spesa per questo periodo</p>
              </div>
            ) : (
              filteredExpenses.map(exp => {
                const unit = exp.unit_id ? units.find(u => u.id === exp.unit_id) : undefined;
                const property = exp.property_id ? properties.find(p => p.id === exp.property_id) : (unit ? properties.find(p => p.id === unit.property_id) : undefined);
                return (
                  <div key={exp.id} className="mobile-card">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-medium text-foreground">
                          {property?.nome_complesso || 'Immobile'}{unit ? ` • ${unit.nome_interno}` : ''}
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          {exp.categoria} • {exp.descrizione}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-lg font-bold text-foreground">
                          {formatCurrency(exp.importo_effettivo || 0)}
                        </span>
                      </div>
                      <ExpenseForm expense={exp} trigger={<Button size="sm" variant="outline"><Pencil className="h-4 w-4 mr-2" />Modifica</Button>} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        <PaymentForm
          open={editPaymentOpen}
          onOpenChange={(o) => { if (!o) setEditingPayment(null); setEditPaymentOpen(o); }}
          payment={editingPayment as unknown as import('@/types').Payment}
          lease={editingPayment ? leases.find(l => l.id === editingPayment.lease_id) : undefined}
          unit={editingPayment ? units.find(u => u.id === (leases.find(l => l.id === editingPayment.lease_id)?.unit_id || '')) : undefined}
          tenant={editingPayment ? (editingPayment.lease_id ? leaseTenantMap[editingPayment.lease_id] : undefined) : undefined}
          trigger={<div className="hidden" />}
        />

        <Dialog open={!!tenantEditOpen} onOpenChange={(o) => !o && setTenantEditOpen(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Scheda Anagrafica Conduttore</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Input 
                  placeholder="Ragione Sociale"
                  value={tenantEditData.ragione_sociale || ''}
                  onChange={e => setTenantEditData(d => ({ ...d, ragione_sociale: e.target.value }))}
                />
                <div className="grid grid-cols-2 gap-3">
                  <Input 
                    placeholder="Nome"
                    value={tenantEditData.nome || ''}
                    onChange={e => setTenantEditData(d => ({ ...d, nome: e.target.value }))}
                  />
                  <Input 
                    placeholder="Cognome"
                    value={tenantEditData.cognome || ''}
                    onChange={e => setTenantEditData(d => ({ ...d, cognome: e.target.value }))}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Input 
                  placeholder="Codice Fiscale"
                  value={tenantEditData.codice_fiscale || ''}
                  onChange={e => setTenantEditData(d => ({ ...d, codice_fiscale: e.target.value }))}
                />
                <Input 
                  placeholder="Partita IVA"
                  value={tenantEditData.partita_iva || ''}
                  onChange={e => setTenantEditData(d => ({ ...d, partita_iva: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Input 
                  placeholder="Via"
                  value={tenantEditData.indirizzo_residenza || ''}
                  onChange={e => setTenantEditData(d => ({ ...d, indirizzo_residenza: e.target.value }))}
                />
                <Input 
                  placeholder="Città"
                  value={tenantEditData.citta_residenza || ''}
                  onChange={e => setTenantEditData(d => ({ ...d, citta_residenza: e.target.value }))}
                />
                <Input 
                  placeholder="CAP"
                  value={tenantEditData.cap_residenza || ''}
                  onChange={e => setTenantEditData(d => ({ ...d, cap_residenza: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex items-center gap-2">
                  <Input 
                    placeholder="Telefono"
                    value={tenantEditData.telefono || ''}
                    onChange={e => setTenantEditData(d => ({ ...d, telefono: e.target.value }))}
                  />
                  <a
                    href={`https://wa.me/${(tenantEditData.telefono || '').replace(/[^\d]/g, '')}?text=${encodeURIComponent("Ciao, ti scrivo dall'App Gestione Immobili per...")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center p-2 rounded bg-green-600 hover:bg-green-700 text-white"
                  >
                    <MessageCircle className="h-4 w-4" />
                  </a>
                </div>
                <div className="flex items-center gap-2">
                  <Input 
                    type="email"
                    placeholder="Email"
                    value={tenantEditData.email || ''}
                    onChange={e => setTenantEditData(d => ({ ...d, email: e.target.value }))}
                  />
                  <a
                    href={`mailto:${tenantEditData.email || ''}?subject=${encodeURIComponent('Comunicazione Gestione Immobiliare')}`}
                    className="inline-flex items-center justify-center p-2 rounded bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <Mail className="h-4 w-4" />
                  </a>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setTenantEditOpen(null)}>Annulla</Button>
                <Button 
                  className="bg-orange-500 hover:bg-orange-600 text-white"
                  onClick={saveTenantEdit} 
                  disabled={updateTenant.isPending}
                >
                  Salva
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
};

export default RegistroPage;
