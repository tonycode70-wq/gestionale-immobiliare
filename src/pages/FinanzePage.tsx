import React, { useState, useMemo, useEffect } from 'react';
import { Calendar, PiggyBank, Loader2 } from 'lucide-react';
import { AppLayout } from '@/components/layout';
import { UnitSelector, StatusBadge } from '@/components/common';
import { formatCurrency, calculateYield } from '@/lib/propertyUtils';
import { calculateCedolareSecca, calculateIMU, type CedolareResult, type IMUResult } from '@/lib/taxCalculations';
import { useProperties, useUnits } from '@/hooks/useProperties';
import { useLeases } from '@/hooks/useLeases';
import { usePayments } from '@/hooks/usePayments';
import { useExpenses } from '@/hooks/useExpenses';
import { useCadastral } from '@/hooks/useCadastral';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { TaxCalculatorDialog } from '@/components/taxes/TaxCalculatorDialog';
import { useGlobalProperty } from '@/hooks/useGlobalProperty';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegendContent } from '@/components/ui/chart';
import { ResponsiveContainer, BarChart as ReBarChart, Bar, XAxis, YAxis } from 'recharts';

class SafeBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: unknown) {
    console.error('Errore pagina Finanze:', error);
  }
  render() {
    if (this.state.hasError) {
      return (
        <AppLayout title="Finanze">
          <div className="mobile-card text-center py-6">
            <p className="text-muted-foreground text-sm">Si è verificato un errore. Ricarica la pagina o correggi i dati locali.</p>
          </div>
        </AppLayout>
      );
    }
    return this.props.children as React.ReactNode;
  }
}
const FinanzePage = () => {
  const navigate = useNavigate();
  const now = useMemo(() => new Date(), []);
  const { selectedPropertyId, selectedUnitId, setSelection } = useGlobalProperty();
  const [selectedUnit, setSelectedUnit] = useState<string>(selectedUnitId || 'all');
  const selectedYear = 2026;

  // Fetch real data
  const { properties, isLoading: loadingProperties } = useProperties();
  const { units, isLoading: loadingUnits } = useUnits();
  const { leases, isLoading: loadingLeases } = useLeases();
  const { payments, isLoading: loadingPayments } = usePayments(undefined, selectedYear);
  const { expenses, isLoading: loadingExpenses } = useExpenses(undefined, selectedYear);
  const { cadastralUnits, isLoading: loadingCadastral } = useCadastral(selectedUnit === 'all' ? undefined : selectedUnit);

  const isLoading = loadingProperties || loadingUnits || loadingLeases || loadingPayments || loadingExpenses || loadingCadastral;

  const hasLocalData = useMemo(() => {
    return (properties.length + units.length + leases.length + payments.length + expenses.length) > 0;
  }, [properties.length, units.length, leases.length, payments.length, expenses.length]);

  // Keep in sync with global selection
  useEffect(() => {
    if (selectedUnitId && selectedUnitId !== selectedUnit) {
      setSelectedUnit(selectedUnitId);
    }
  }, [selectedUnitId, selectedUnit]);

  // Initialize from localStorage active_unit_id when available
  useEffect(() => {
    const saved = localStorage.getItem('active_unit_id');
    if (saved && saved !== 'all' && saved !== selectedUnit) {
      const unit = units.find(u => u.id === saved);
      if (unit) {
        setSelectedUnit(saved);
        setSelection(unit.property_id, saved);
      }
    }
  }, [units, selectedUnit, setSelection]);

  // Unit selector options
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

  const unitLeasesForYear = useMemo(() => {
    return leases.filter(l => {
      const startY = new Date(l.data_inizio).getFullYear();
      const endY = new Date(l.data_fine).getFullYear();
      const overlapsYear = selectedYear >= startY && selectedYear <= endY;
      const unit = units.find(u => u.id === l.unit_id);
      const matchProperty = selectedPropertyId === 'all' ? true : unit?.property_id === selectedPropertyId;
      const matchUnit = selectedUnit === 'all' ? true : l.unit_id === selectedUnit;
      return overlapsYear && matchUnit && matchProperty;
    }).sort((a, b) => new Date(a.data_inizio).getTime() - new Date(b.data_inizio).getTime());
  }, [leases, units, selectedUnit, selectedPropertyId]);

  const mainLease = useMemo(() => unitLeasesForYear[0], [unitLeasesForYear]);

  const filteredPayments = useMemo(() => {
    const targetLeaseId = mainLease?.id;
    return payments.filter(p => {
      if (p.competenza_anno !== selectedYear) return false;
      if (selectedUnit !== 'all') return p.lease_id === targetLeaseId;
      const lease = leases.find(l => l.id === p.lease_id);
      const unit = lease ? units.find(u => u.id === lease.unit_id) : undefined;
      const matchProperty = selectedPropertyId === 'all' ? true : unit?.property_id === selectedPropertyId;
      return matchProperty;
    });
  }, [payments, leases, units, mainLease?.id, selectedUnit, selectedYear, selectedPropertyId]);

  const expensesForSelection = useMemo(() => {
    if (selectedUnit !== 'all') {
      return expenses.filter(e => (e.unit_id === selectedUnit) || (e.owner_type === 'unit' && e.owner_id === selectedUnit));
    }
    if (selectedPropertyId !== 'all') {
      return expenses.filter(e => (e.property_id === selectedPropertyId) || (e.owner_type === 'property' && e.owner_id === selectedPropertyId));
    }
    return expenses;
  }, [expenses, selectedUnit, selectedPropertyId]);

  const annualNumbers = useMemo(() => {
    const canoneMensile = mainLease ? mainLease.canone_mensile : 0;
    const lordoAnnuo = canoneMensile * 12;
    const incassatoAnno = filteredPayments.reduce((sum, p) => sum + (p.importo_canone_pagato || 0), 0);
    const speseAnno = expensesForSelection
      .reduce((sum, e) => sum + (e.importo_effettivo || 0), 0);
    const regime = mainLease?.regime_locativo;
    const isCedolare = regime === 'cedolare_21' || regime === 'cedolare_10';
    const aliquota = regime === 'cedolare_21' ? 0.21 : regime === 'cedolare_10' ? 0.10 : 0;
    const annoContratto = mainLease ? (selectedYear - new Date(mainLease.data_inizio).getFullYear() + 1) : 0;
    const cedolareTot = isCedolare
      ? (annoContratto === 1 ? 0 : Math.round(lordoAnnuo * aliquota * 100) / 100)
      : 0;
    const nettoAnnuo = Math.round((incassatoAnno - speseAnno - cedolareTot) * 100) / 100;
    const mesiTrascorsi = selectedYear === now.getFullYear() ? Math.min(now.getMonth() + 1, 12) : 12;
    const nettoMedioMensile = Math.round((nettoAnnuo / Math.max(1, mesiTrascorsi)) * 100) / 100;
    return { canoneMensile, lordoAnnuo, incassatoAnno, speseAnno, cedolareTot, nettoAnnuo, nettoMedioMensile, regime, isCedolare, aliquota, annoContratto };
  }, [filteredPayments, expensesForSelection, mainLease, now, selectedYear]);

  const cedolareIndicators = useMemo(() => {
    const annoContratto = annualNumbers.annoContratto;
    const meseCorrente = now.getMonth() + 1;
    const totale = annualNumbers.cedolareTot;
    let versata = 0;
    if (annoContratto === 1 || !annualNumbers.isCedolare) {
      versata = 0;
    } else if (annoContratto === 2) {
      versata = meseCorrente >= 11 ? totale : 0;
    } else if (annoContratto >= 3) {
      versata = (meseCorrente >= 6 ? totale * 0.4 : 0) + (meseCorrente >= 11 ? totale * 0.6 : 0);
    }
    const scadenze = [];
    if (annualNumbers.isCedolare && annoContratto === 2) {
      scadenze.push({ data: `${selectedYear}-11-30`, importo: totale, stato: meseCorrente >= 11 ? 'Versato' : 'Da Versare', label: 'Rata unica 30/11' });
    } else if (annualNumbers.isCedolare && annoContratto >= 3) {
      scadenze.push({ data: `${selectedYear}-06-30`, importo: Math.round(totale * 0.4 * 100) / 100, stato: meseCorrente >= 6 ? 'Versato' : 'Da Versare', label: 'Acconto 40% 30/06' });
      scadenze.push({ data: `${selectedYear}-11-30`, importo: Math.round(totale * 0.6 * 100) / 100, stato: meseCorrente >= 11 ? 'Versato' : 'Da Versare', label: 'Saldo 60% 30/11' });
    }
    return { annoContratto, totale, versata, scadenze };
  }, [annualNumbers.cedolareTot, annualNumbers.isCedolare, annualNumbers.annoContratto, now, selectedYear]);

  const nextCedolare = useMemo(() => {
    if (!annualNumbers.isCedolare) return null;
    const upcoming = cedolareIndicators.scadenze
      .map(s => ({ ...s, d: new Date(s.data) }))
      .filter(s => s.d >= now)
      .sort((a, b) => a.d.getTime() - b.d.getTime())[0];
    return upcoming || null;
  }, [annualNumbers.isCedolare, cedolareIndicators.scadenze, now]);

  // IMU summary (annua) per calcolare la quota mensile da accantonare
  const imuSummary: IMUResult | null = useMemo(() => {
    if (selectedUnit === 'all' || !cadastralUnits || cadastralUnits.length === 0) return null;
    const unit = units.find(u => u.id === selectedUnit);
    const property = unit ? properties.find(p => p.id === unit.property_id) : null;
    const comune = (property?.citta || 'Desenzano del Garda').toLowerCase();
    const hasConcordato = (() => {
      const lease = leases.find(l => l.unit_id === selectedUnit && l.stato_contratto === 'attivo');
      return lease?.tipo_contratto === '3+2_agevolato';
    })();
    const data = cadastralUnits.map(cu => ({
      categoria_catastale: cu.categoria_catastale,
      rendita_euro: cu.rendita_euro,
    }));
    return calculateIMU(data, {
      anno: selectedYear,
      comune,
      aliquota_per_mille: 10.6,
      percentuale_possesso: 100,
      mesi_possesso: 12,
      is_prima_casa: false,
      detrazioni_euro: 0,
      riduzione_canone_concordato: !!hasConcordato,
    });
  }, [cadastralUnits, properties, units, selectedUnit, selectedYear, leases]);
  const { utileOggi, nettoMedioMensileOggi } = useMemo(() => {
    const today = now;
    const donePmts = filteredPayments
      .filter(p => p.data_pagamento && new Date(p.data_pagamento).getFullYear() === selectedYear && new Date(p.data_pagamento) <= today);
    const incassatoTotaleAdOggi = donePmts.reduce((sum, p) => sum + (p.importo_canone_pagato || 0) + (p.importo_spese_pagato || 0), 0);
    const speseIncassateAdOggi = donePmts.reduce((sum, p) => sum + (p.importo_spese_pagato || 0), 0);
    const speseStraordAdOggi = expensesForSelection
      .filter(e => e.data_pagamento && new Date(e.data_pagamento).getFullYear() === selectedYear && new Date(e.data_pagamento) <= today)
      .reduce((sum, e) => sum + (e.importo_effettivo || 0), 0);
    const imuAnnua = imuSummary?.impostaAnnua || 0;
    const imuMensile = Math.round(((imuAnnua / 12) || 0) * 100) / 100;
    const isFirstYear = annualNumbers.annoContratto === 1;
    const cedolareMensile = (!annualNumbers.isCedolare || isFirstYear || !mainLease)
      ? 0
      : Math.round((mainLease.canone_mensile * (annualNumbers.aliquota || 0)) * 100) / 100;
    const mesiTrascorsi = selectedYear === now.getFullYear() ? Math.min(now.getMonth() + 1, 12) : 12;
    const utile = Math.round((incassatoTotaleAdOggi - speseIncassateAdOggi - speseStraordAdOggi - (imuMensile * mesiTrascorsi) - (cedolareMensile * mesiTrascorsi)) * 100) / 100;
    const medio = Math.round(((utile / Math.max(1, mesiTrascorsi)) || 0) * 100) / 100;
    // Debug delle componenti del calcolo
    console.debug('[UtileNettoAdOggi]', {
      incassatoTotaleAdOggi,
      speseIncassateAdOggi,
      speseStraordAdOggi,
      imuMensile,
      cedolareMensile,
      mesiTrascorsi,
      utile,
      medio,
    });
    return { utileOggi: utile, nettoMedioMensileOggi: medio };
  }, [filteredPayments, expensesForSelection, imuSummary?.impostaAnnua, annualNumbers.annoContratto, annualNumbers.aliquota, annualNumbers.isCedolare, mainLease, now, selectedYear]);

  // (ImuSummary già dichiarato sopra)

  const netProjection = useMemo(() => {
    if (!mainLease || selectedUnit === 'all') return 0;
    const start = new Date(mainLease.data_inizio);
    const end = new Date(mainLease.data_fine);
    let monthsActive = 0;
    for (let m = 1; m <= 12; m++) {
      const mid = new Date(selectedYear, m - 1, 15);
      if (mid >= start && mid <= end) monthsActive++;
    }
    const aliquota = annualNumbers.aliquota || 0;
    const isFirstYear = annualNumbers.annoContratto === 1;
    const cedolareMensile = mainLease.regime_locativo === 'ordinario_irpef' ? 0 : (isFirstYear ? 0 : Math.round(mainLease.canone_mensile * aliquota * 100) / 100);
    const canoneMensileNetto = mainLease.canone_mensile - cedolareMensile;
    const imuAnnua = imuSummary?.impostaAnnua || 0;
    const speseAnnua = annualNumbers.speseAnno || 0;
    return Math.round(((canoneMensileNetto * monthsActive) - imuAnnua - speseAnnua) * 100) / 100;
  }, [mainLease, selectedUnit, selectedYear, annualNumbers.aliquota, annualNumbers.annoContratto, annualNumbers.speseAnno, imuSummary?.impostaAnnua]);

  // Yield analysis per unit (spese + cedolare)
  const yieldAnalysis = useMemo(() => {
    const list = units
      .filter(u => u.attiva && u.valore_immobile_stimato)
      .filter(u => (selectedPropertyId === 'all' ? true : u.property_id === selectedPropertyId))
      .filter(u => (selectedUnit === 'all' ? true : u.id === selectedUnit))
      .map(unit => {
        const lease = leases.find(l => l.unit_id === unit.id && l.stato_contratto === 'attivo');
        const canoniAnnui = lease ? lease.canone_mensile * 12 : 0;
        const speseAnnue = expenses
          .filter(e => e.unit_id === unit.id || e.property_id === unit.property_id)
          .reduce((sum, e) => sum + (e.importo_effettivo || 0), 0);
        const regime = lease?.regime_locativo;
        const isCedolare = regime === 'cedolare_21' || regime === 'cedolare_10';
        const aliquota = regime === 'cedolare_21' ? 0.21 : regime === 'cedolare_10' ? 0.10 : 0;
        const annoContratto = lease ? (selectedYear - new Date(lease.data_inizio).getFullYear() + 1) : 0;
        const cedolareTax = isCedolare ? (annoContratto === 1 ? 0 : Math.round(canoniAnnui * aliquota * 100) / 100) : 0;
        const imuTax = (selectedUnit !== 'all' && unit.id === selectedUnit && imuSummary) ? imuSummary.impostaAnnua : 0;
        const imposte = cedolareTax + imuTax;
        const yields = calculateYield(canoniAnnui, unit.valore_immobile_stimato || 1, speseAnnue, imposte);
        return {
          unit,
          canoniAnnui,
          yields,
          isRented: !!lease,
        };
      });
    return list.sort((a, b) => b.yields.netto - a.yields.netto);
  }, [units, leases, expenses, selectedUnit, selectedYear, imuSummary, selectedPropertyId]);

  // Cedolare Secca summary for selected year
  const cedolareSummary = useMemo(() => {
    const relevantLeases = leases.filter(l => {
      const startY = new Date(l.data_inizio).getFullYear();
      const endY = new Date(l.data_fine).getFullYear();
      const overlapsYear = selectedYear >= startY && selectedYear <= endY;
      const isCedolare = l.regime_locativo === 'cedolare_21' || l.regime_locativo === 'cedolare_10';
      const unit = units.find(u => u.id === l.unit_id);
      const matchProperty = selectedPropertyId === 'all' ? true : unit?.property_id === selectedPropertyId;
      const matchUnit = selectedUnit === 'all' ? true : l.unit_id === selectedUnit;
      return overlapsYear && isCedolare && matchUnit && matchProperty;
    });

    const results: CedolareResult[] = relevantLeases.map(l => 
      calculateCedolareSecca({
        anno: selectedYear,
        regime: l.regime_locativo as 'cedolare_21' | 'cedolare_10',
        dataInizioContratto: l.data_inizio,
        dataFineContratto: l.data_fine,
        canoneAnnuo: l.canone_mensile * 12,
        isPrimoAnno: (selectedYear - new Date(l.data_inizio).getFullYear() + 1) === 1,
      })
    );

    const totaleCedolare = results.reduce((sum, r) => sum + r.impostaTotale, 0);

    const scadenzeAnno = results.flatMap(r => r.rate)
      .filter(rata => new Date(rata.scadenza).getFullYear() === selectedYear);

    return { totaleCedolare, scadenzeAnno, leasesCount: relevantLeases.length };
  }, [leases, units, selectedYear, selectedUnit, selectedPropertyId]);

  if (isLoading) {
    return (
      <AppLayout title="Finanze">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (!hasLocalData) {
    return (
      <AppLayout title="Finanze">
        <div className="mobile-card text-center py-6">
          <p className="text-muted-foreground text-sm">Caricamento dati locali...</p>
        </div>
      </AppLayout>
    );
  }
  return (
    <SafeBoundary>
    <AppLayout title="Finanze">
      <div className="space-y-4">
        {selectedUnit === 'all' && (
          <div className="mobile-card">
            <p className="text-sm text-muted-foreground">Seleziona un'unità dalla Home o dal menu sopra per vedere il dettaglio finanziario.</p>
          </div>
        )}
        {/* Unit Selector */}
        <UnitSelector 
          value={selectedUnit} 
          onChange={(id) => {
            setSelectedUnit(id);
            const unit = units.find(u => u.id === id);
            if (unit) setSelection(unit.property_id, id);
          }}
          units={unitOptions}
        />

        <div className="financial-card">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-white/70">Dati annuali {selectedYear}</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="financial-card-inner text-center">
              <p className="text-xs text-white/60 mb-1">Previsto</p>
              <p className="text-sm font-bold text-white/80">{formatCurrency(annualNumbers.lordoAnnuo)}</p>
            </div>
            <div className="financial-card-inner text-center">
              <p className="text-xs text-white/60 mb-1">Incassato</p>
              <p className="text-sm font-bold text-green-300">{formatCurrency(annualNumbers.incassatoAnno)}</p>
            </div>
            <div className="financial-card-inner text-center">
              <p className="text-xs text-white/60 mb-1">Proiezione Anno</p>
              <p className={cn(
                'text-sm font-bold',
                netProjection >= 0 ? 'text-white' : 'text-red-300'
              )}>
                {formatCurrency(netProjection)}
              </p>
            </div>
          </div>
        </div>

        {/* Annual Summary */}
        <div className="mobile-card">
          <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <PiggyBank className="h-4 w-4" />
            Riepilogo annuale {selectedYear}
          </h3>
          
          {payments.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-4">
              Nessun pagamento registrato per il {selectedYear}
            </p>
          ) : (
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-sm text-muted-foreground">Lordo medio mensile</span>
                <span className="font-semibold text-foreground">{formatCurrency(annualNumbers.canoneMensile)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-sm text-muted-foreground">Netto medio mensile</span>
                <span className="font-semibold text-success">{formatCurrency(nettoMedioMensileOggi)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-sm text-muted-foreground">Spese straordinarie (anno)</span>
                <span className="font-semibold text-destructive">{formatCurrency(annualNumbers.speseAnno)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-sm text-muted-foreground">Imposte stimate (cedolare)</span>
                <span className="font-semibold text-destructive">{formatCurrency(annualNumbers.cedolareTot)}</span>
              </div>
              {imuSummary && (
                <div className="flex justify-between items-center py-2 border-b border-border">
                  <span className="text-sm text-muted-foreground">IMU Annua (acconto/saldo)</span>
                  <span className="font-semibold text-foreground">
                    {formatCurrency(imuSummary.acconto)} / {formatCurrency(imuSummary.saldo)}
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center py-2">
                <span className="text-sm font-medium text-foreground">Utile netto ad oggi</span>
                <span className={cn(
                  'text-lg font-bold',
                  utileOggi >= 0 ? 'text-success' : 'text-destructive'
                )}>
                  {formatCurrency(utileOggi)}
                </span>
              </div>
              {cedolareSummary.leasesCount > 0 && (
                <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-muted-foreground">Cedolare Secca (contratti cedolare, {cedolareSummary.leasesCount})</span>
                    <span className="font-semibold text-foreground">{formatCurrency(annualNumbers.cedolareTot)}</span>
                  </div>
                  <div className="space-y-1">
                    {!annualNumbers.isCedolare && (
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Cedolare non prevista per l'anno {selectedYear}</span>
                        <span>{formatCurrency(0)}</span>
                      </div>
                    )}
                    {annualNumbers.isCedolare && cedolareIndicators.annoContratto === 1 && (
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Nessun versamento nell'anno</span>
                        <span>{formatCurrency(0)}</span>
                      </div>
                    )}
                    {annualNumbers.isCedolare && nextCedolare && (
                      <div className="flex justify-between text-xs text-foreground font-medium">
                        <span>Prossima scadenza • {nextCedolare.label}</span>
                        <span>{formatCurrency(nextCedolare.importo)}</span>
                      </div>
                    )}
                    {cedolareIndicators.scadenze.map((r, idx) => (
                      <div key={`${r.data}-${idx}`} className="flex justify-between text-xs text-muted-foreground">
                        <span>{r.label} • {r.stato}</span>
                        <span>{formatCurrency(r.importo)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {imuSummary && (
                <div className="mt-2 p-3 bg-muted/50 rounded-lg">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs text-muted-foreground">IMU Totale annuo</span>
                    <span className="text-xs font-semibold text-foreground">{formatCurrency(imuSummary.impostaAnnua)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Acconto • 16/06</span>
                    <span>{formatCurrency(imuSummary.acconto)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Saldo • 16/12</span>
                    <span>{formatCurrency(imuSummary.saldo)}</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Tax Calculator Access */}
        <TaxCalculatorDialog 
          trigger={
            <div className="mobile-card cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <Calendar className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Calcolatore Fiscale</h3>
                  <p className="text-sm text-muted-foreground">Calcola IMU e Cedolare Secca</p>
                </div>
              </div>
            </div>
          }
        />

        {/* Yield Analysis */}
        {yieldAnalysis.length > 0 && (
          <div className="mobile-card">
            <h3 className="font-semibold text-foreground mb-4">Analisi Rendimento</h3>
            
            <div className="space-y-3">
              {yieldAnalysis.map(({ unit, canoniAnnui, yields, isRented }) => (
                <div key={unit.id} className="p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-medium text-foreground">{unit.nome_interno}</h4>
                      <p className="text-xs text-muted-foreground">
                        Valore: {formatCurrency(unit.valore_immobile_stimato || 0)}
                      </p>
                    </div>
                    <StatusBadge status={isRented ? 'success' : 'muted'}>
                      {isRented ? 'Locato' : 'Sfitto'}
                    </StatusBadge>
                  </div>
                  
                  {isRented && (
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div>
                        <p className="text-xs text-muted-foreground">Canoni annui</p>
                        <p className="text-sm font-semibold text-foreground">{formatCurrency(canoniAnnui)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Rend. lordo</p>
                        <p className="text-sm font-semibold text-success">{yields.lordo.toFixed(1)}%</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Rend. netto</p>
                        <p className="text-sm font-semibold text-primary">{yields.netto.toFixed(1)}%</p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-4">
              <ChartContainer
                config={{
                  lordo: { label: 'ROI Lordo %', color: 'hsl(var(--success))' },
                  netto: { label: 'ROI Netto %', color: 'hsl(var(--primary))' },
                }}
                className="h-56 w-full"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <ReBarChart
                    data={yieldAnalysis.map(y => ({
                      name: y.unit.nome_interno,
                      lordo: y.yields.lordo,
                      netto: y.yields.netto,
                    }))}
                    margin={{ left: 20, right: 10, top: 10, bottom: 0 }}
                  >
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis tickFormatter={(v) => `${v}%`} width={30} />
                    <Bar dataKey="lordo" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="netto" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <ChartLegendContent />
                  </ReBarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
    </SafeBoundary>
  );
};

export default FinanzePage;
