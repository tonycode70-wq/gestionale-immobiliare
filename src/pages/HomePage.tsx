
import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout';
import { UnitSelector } from '@/components/common';
import { FinancialSummaryCard, PropertyCard, ReminderList, TodayPayments } from '@/components/home';
import { SyncIndicator } from '@/components/SyncIndicator';
import { enrichReminder, formatCurrency } from '@/lib/propertyUtils';
import { useCadastral } from '@/hooks/useCadastral';
import { useProperties, useUnits } from '@/hooks/useProperties';
import { useLeases } from '@/hooks/useLeases';
import { useTenants } from '@/hooks/useTenants';
import { usePayments } from '@/hooks/usePayments';
import { useReminders } from '@/hooks/useReminders';
import { useExpenses } from '@/hooks/useExpenses';
import { useAuth } from '@/hooks/useAuth';
import type { ReminderWithContext, Reminder, Payment, Lease, Tenant, Unit } from '@/types';
import { Loader2 } from 'lucide-react';
import { db } from '../../utils/localStorageDB.js';
import type { Tenant } from '@/types';
import { useGlobalProperty } from '@/hooks/useGlobalProperty';

const HomePage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedUnit, setSelectedUnit] = useState<string>('all');
  
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  // Fetch real data from database
  const { properties, isLoading: loadingProperties } = useProperties();
  const { units, isLoading: loadingUnits } = useUnits();
  const { leases, isLoading: loadingLeases } = useLeases();
  const { tenants, isLoading: loadingTenants } = useTenants();
  const { payments, isLoading: loadingPayments } = usePayments(undefined, currentYear);
  const { expenses } = useExpenses(undefined, currentYear);
  const { reminders, isLoading: loadingReminders, completeReminder } = useReminders();
  const { selectedPropertyId, setSelectedPropertyId, setSelection } = useGlobalProperty();

  const isLoading = loadingProperties || loadingUnits || loadingLeases || loadingTenants || loadingPayments || loadingReminders;

  const [leaseTenantMap, setLeaseTenantMap] = useState<Record<string, Tenant | undefined>>({});

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

  // Filter data based on global property and selected unit
  const filteredData = useMemo(() => {
    const activeLeases = leases.filter(l => l.stato_contratto === 'attivo');
    const activeUnitsAll = units.filter(u => u.attiva);
    const activeUnits = selectedPropertyId === 'all' ? activeUnitsAll : activeUnitsAll.filter(u => u.property_id === selectedPropertyId);
    const leasesByUnits = activeLeases.filter(l => activeUnits.some(u => u.id === l.unit_id));
    
    if (selectedUnit === 'all') {
      return {
        units: activeUnits,
        leases: leasesByUnits,
        payments: payments.filter(p => {
          const lease = leases.find(l => l.id === p.lease_id);
          const unit = lease ? units.find(u => u.id === lease.unit_id) : undefined;
          return selectedPropertyId === 'all' ? true : unit?.property_id === selectedPropertyId;
        }),
      };
    }
    
    return {
      units: activeUnits.filter(u => u.id === selectedUnit),
      leases: leasesByUnits.filter(l => l.unit_id === selectedUnit),
      payments: payments.filter(p => {
        const lease = leasesByUnits.find(l => l.id === p.lease_id);
        return lease?.unit_id === selectedUnit;
      }),
    };
  }, [selectedUnit, units, leases, payments, selectedPropertyId]);

  // Calculate financial summary
  const financialSummary = useMemo(() => {
    const monthPayments = filteredData.payments.filter(
      p => p.competenza_anno === currentYear && p.competenza_mese === currentMonth
    );
    
    const incassoPrevisto = monthPayments.reduce((sum, p) => sum + (p.importo_totale_previsto || 0), 0);
    const incassoEffettivo = monthPayments.reduce((sum, p) => sum + (p.importo_canone_pagato || 0) + (p.importo_spese_pagato || 0), 0);
    
    const lordoMensile = filteredData.leases.reduce((sum, l) => 
      sum + l.canone_mensile + (l.spese_condominiali_mensili_previste || 0), 0
    );

    const nettoReale = incassoEffettivo * 0.79;
    const meseCompleto = monthPayments.length > 0 && monthPayments.every(p => p.stato_pagamento === 'PAGATO');

    return {
      nettoReale,
      incassoPrevisto,
      incassoEffettivo,
      lordoMensile,
      meseCompleto,
    };
  }, [filteredData, currentYear, currentMonth]);

  // Get next deadline
  const prossimaScadenza = useMemo(() => {
    const upcomingReminders = reminders
      .filter(r => selectedPropertyId === 'all' ? true : r.property_id === selectedPropertyId || r.unit_id && units.find(u => u.id === r.unit_id)?.property_id === selectedPropertyId)
      .filter(r => !r.completata && new Date(r.data_scadenza) >= new Date())
      .sort((a, b) => new Date(a.data_scadenza).getTime() - new Date(b.data_scadenza).getTime());
    
    return upcomingReminders[0] ? {
      titolo: upcomingReminders[0].titolo,
      data: upcomingReminders[0].data_scadenza,
    } : undefined;
  }, [reminders, selectedPropertyId, units]);

  // Enrich reminders
  const enrichedReminders: ReminderWithContext[] = useMemo(() => {
    return reminders
      .filter(r => selectedPropertyId === 'all' ? true : r.property_id === selectedPropertyId || r.unit_id && units.find(u => u.id === r.unit_id)?.property_id === selectedPropertyId)
      .filter(r => !r.completata)
      .map(r => {
        const unit = r.unit_id ? units.find(u => u.id === r.unit_id) : undefined;
        const property = r.property_id ? properties.find(p => p.id === r.property_id) : undefined;
        return enrichReminder(
          r as unknown as Reminder,
          unit?.nome_interno,
          property?.nome_complesso
        );
      })
      .filter(r => r.daysRemaining <= 30 || r.isOverdue)
      .sort((a, b) => a.daysRemaining - b.daysRemaining)
      .slice(0, 5);
  }, [reminders, units, properties, selectedPropertyId]);

  // Today's payments
  const todayPayments = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    
    return payments
      .filter(p => p.data_scadenza === today || p.stato_pagamento === 'ATTESO')
      .filter(p => {
        const lease = leases.find(l => l.id === p.lease_id);
        const unit = lease ? units.find(u => u.id === lease.unit_id) : undefined;
        return selectedPropertyId === 'all' ? true : unit?.property_id === selectedPropertyId;
      })
      .slice(0, 3)
      .map(payment => {
        const lease = leases.find(l => l.id === payment.lease_id);
        const unit = lease ? units.find(u => u.id === lease.unit_id) : undefined;
        const tenant = lease ? leaseTenantMap[lease.id] : undefined;
        
        return {
          payment: {
            ...payment,
            importo_canone_pagato: payment.importo_canone_pagato || 0,
            importo_spese_pagato: payment.importo_spese_pagato || 0,
            importo_residuo_calcolato: payment.importo_residuo_calcolato || 0,
          } as unknown as Payment,
          lease: lease as unknown as Lease,
          tenant: tenant as Tenant | undefined,
          unitName: unit?.nome_interno || 'Unità',
        };
      });
  }, [payments, leases, units, leaseTenantMap, selectedPropertyId]);

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

  const selectedLease = useMemo(() => {
    if (selectedUnit === 'all') return null;
    return leases.find(l => l.unit_id === selectedUnit) || null;
  }, [leases, selectedUnit]);
  const { cadastralUnits } = useCadastral(selectedUnit === 'all' ? undefined : selectedUnit);

  const monthsStatusForSelected = useMemo(() => {
    if (selectedUnit === 'all') return [];
    const lease = selectedLease;
    const arr: Array<'paid'|'missing'|'future'> = [];
    const year = currentYear;
    const start = lease ? new Date(lease.data_inizio) : null;
    const end = lease ? new Date(lease.data_fine) : null;
    const unitPayments = payments.filter(p => p.lease_id === (lease?.id || '') && p.competenza_anno === year);
    for (let m = 1; m <= 12; m++) {
      const inContract = !!(start && end) && new Date(year, m - 1, 15) >= start! && new Date(year, m - 1, 15) <= end!;
      if (!inContract) {
        arr.push('future');
        continue;
      }
      const pmt = unitPayments.find(p => p.competenza_mese === m);
      if (pmt && pmt.stato_pagamento === 'PAGATO') {
        arr.push('paid');
      } else if (m <= currentMonth) {
        arr.push('missing');
      } else {
        arr.push('future');
      }
    }
    return arr;
  }, [selectedUnit, selectedLease, payments, currentYear, currentMonth]);

  const monthlyAmountsForSelected = useMemo(() => {
    if (selectedUnit === 'all') return [];
    const lease = selectedLease;
    const year = currentYear;
    const unitPayments = payments.filter(p => p.lease_id === (lease?.id || '') && p.competenza_anno === year);
    const arr: number[] = [];
    for (let m = 1; m <= 12; m++) {
      const pmt = unitPayments.find(p => p.competenza_mese === m);
      const importo = (pmt?.importo_canone_pagato || 0) + (pmt?.importo_spese_pagato || 0);
      arr.push(importo);
    }
    return arr;
  }, [selectedUnit, selectedLease, payments, currentYear]);

  if (isLoading) {
    return (
      <AppLayout title="Home">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Home">
      <div className="space-y-4">
        <div className="flex items-center justify-end"><SyncIndicator /></div>
        {/* Unit Selector */}
        <UnitSelector 
          value={selectedUnit} 
          onChange={setSelectedUnit}
          units={unitOptions}
        />

        {/* Financial Summary Card */}
        <FinancialSummaryCard
          year={currentYear}
          nettoReale={(selectedLease && selectedUnit !== 'all')
            ? (() => {
                const l = selectedLease!;
                const aliquota = l.regime_locativo === 'cedolare_21' ? 0.21 : (l.regime_locativo === 'cedolare_10' ? 0.10 : 0);
                const cedolareMensile = Math.round(l.canone_mensile * aliquota * 100) / 100;
                const imuMensile = (() => {
                  if (!cadastralUnits || cadastralUnits.length === 0) return 0;
                  const renditaTot = cadastralUnits.reduce((s, cu) => s + cu.rendita_euro, 0);
                  const baseImp = renditaTot * 1.05 * 160;
                  const imuAnnua = Math.round(baseImp * (10.6 / 1000) * 100) / 100;
                  return Math.round((imuAnnua / 12) * 100) / 100;
                })();
                const spese = l.spese_condominiali_mensili_previste || 0;
                const speseStraordMensili = expenses
                  .filter(e => e.unit_id === selectedUnit && (() => {
                    const d = new Date(e.data_competenza);
                    return d.getFullYear() === currentYear && d.getMonth() + 1 === currentMonth;
                  })())
                  .reduce((sum, e) => sum + (e.importo_effettivo || 0), 0);
                return Math.round((l.canone_mensile - cedolareMensile - spese - imuMensile - speseStraordMensili) * 100) / 100;
              })()
            : financialSummary.nettoReale}
          incassoMensePrevisto={financialSummary.incassoPrevisto}
          incassoMeseEffettivo={financialSummary.incassoEffettivo}
          prossimaScadenza={prossimaScadenza}
          lordoMensile={financialSummary.lordoMensile}
          meseCorrenteRegistrato={financialSummary.meseCompleto}
          monthsStatus={monthsStatusForSelected}
          monthlyAmounts={monthlyAmountsForSelected}
          unitsMenu={unitOptions}
          selectedUnitId={selectedUnit === 'all' ? undefined : selectedUnit}
          onSelectUnit={(id) => {
            setSelectedUnit(id);
            const unit = units.find(u => u.id === id);
            if (unit) {
              setSelectedPropertyId(unit.property_id);
              setSelection(unit.property_id, id);
            }
          }}
          cedolareMensile={(selectedLease && selectedUnit !== 'all') ? (() => {
            const l = selectedLease!;
            const rate = l.regime_locativo === 'cedolare_21' ? 0.21 : (l.regime_locativo === 'cedolare_10' ? 0.10 : 0);
            return Math.round(l.canone_mensile * rate * 100) / 100;
          })() : 0}
          imuMensile={(selectedUnit !== 'all' && cadastralUnits && cadastralUnits.length > 0) ? (() => {
            const renditaTot = cadastralUnits.reduce((s, cu) => s + cu.rendita_euro, 0);
            const baseImp = renditaTot * 1.05 * 160;
            const imuAnnua = Math.round(baseImp * (10.6 / 1000) * 100) / 100;
            return Math.round((imuAnnua / 12) * 100) / 100;
          })() : 0}
          speseMensili={(selectedLease && selectedUnit !== 'all') ? (selectedLease.spese_condominiali_mensili_previste || 0) : 0}
          proiezioneNettoAnnua={(selectedLease && selectedUnit !== 'all') ? (() => {
            const l = selectedLease!;
            const startY = new Date(l.data_inizio).getFullYear();
            const endY = new Date(l.data_fine).getFullYear();
            const annoContratto = currentYear - startY + 1;
            const aliquota = l.regime_locativo === 'cedolare_21' ? 0.21 : (l.regime_locativo === 'cedolare_10' ? 0.10 : 0);
            const cedolareMensile = (annoContratto === 1) ? 0 : Math.round(l.canone_mensile * aliquota * 100) / 100;
            const monthsActive = (() => {
              let m = 0;
              for (let month = 1; month <= 12; month++) {
                const mid = new Date(currentYear, month - 1, 15);
                if (mid >= new Date(l.data_inizio) && mid <= new Date(l.data_fine)) m++;
              }
              return m;
            })();
            const renditaTot = (cadastralUnits || []).reduce((s, cu) => s + cu.rendita_euro, 0);
            const baseImp = renditaTot * 1.05 * 160;
            const imuAnnua = Math.round(baseImp * (10.6 / 1000) * 100) / 100;
            const speseStraordAnnua = expenses
              .filter(e => e.unit_id === selectedUnit && new Date(e.data_competenza).getFullYear() === currentYear)
              .reduce((sum, e) => sum + (e.importo_effettivo || 0), 0);
            const canoneMensileNetto = l.canone_mensile - cedolareMensile;
            return Math.round(((canoneMensileNetto * monthsActive) - imuAnnua - speseStraordAnnua) * 100) / 100;
          })() : 0}
        />

        {/* Property Cards */}
        <div className="space-y-3">
          <h3 className="font-semibold text-foreground">Patrimonio Immobiliare</h3>
          {filteredData.units.length === 0 ? (
            <div className="mobile-card text-center py-6">
              <p className="text-muted-foreground">Nessuna unità registrata</p>
              <p className="text-sm text-muted-foreground mt-1">Usa il pulsante + per aggiungere un immobile</p>
            </div>
          ) : (
            filteredData.units.map(unit => {
              const lease = filteredData.leases.find(l => l.unit_id === unit.id);
              const tenant = lease ? leaseTenantMap[lease.id] : undefined;
              const monthsStatus = (() => {
                const arr: Array<'paid'|'missing'|'future'> = [];
                const year = currentYear;
                const start = lease ? new Date(lease.data_inizio) : null;
                const end = lease ? new Date(lease.data_fine) : null;
                const unitPayments = payments.filter(p => p.lease_id === (lease?.id || '') && p.competenza_anno === year);
                for (let m = 1; m <= 12; m++) {
                  const inContract = !!(start && end) && new Date(year, m - 1, 15) >= start! && new Date(year, m - 1, 15) <= end!;
                  if (!inContract) {
                    arr.push('future');
                    continue;
                  }
                  const pmt = unitPayments.find(p => p.competenza_mese === m);
                  if (pmt && pmt.stato_pagamento === 'PAGATO') {
                    arr.push('paid');
                  } else if (m <= currentMonth) {
                    arr.push('missing');
                  } else {
                    arr.push('future');
                  }
                }
                return arr;
              })();
              return (
                <PropertyCard
                  key={unit.id}
                  unit={unit as unknown as Unit}
                  lease={lease as unknown as Lease}
                  tenant={tenant as Tenant | undefined}
                  monthsStatus={monthsStatus}
                  onClick={() => {
                    setSelectedPropertyId(unit.property_id);
                    setSelection(unit.property_id, unit.id);
                    localStorage.setItem('active_unit_id', unit.id);
                    navigate(`/dati?unit=${unit.id}`);
                  }}
                />
              );
            })
          )}
        </div>

        {/* Reminders */}
        {enrichedReminders.length > 0 && (
          <ReminderList 
            reminders={enrichedReminders}
            onComplete={(id) => completeReminder.mutate(id)}
          />
        )}

        {/* Today's Payments */}
        {todayPayments.length > 0 && (
          <TodayPayments 
            payments={todayPayments}
            onMarkPaid={(id) => console.log('Mark paid:', id)}
          />
        )}
      </div>
    </AppLayout>
  );
};

export default HomePage;
