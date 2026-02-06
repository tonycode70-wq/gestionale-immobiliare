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
import { cn } from '@/lib/utils';
import { usePayments, type Payment } from '@/hooks/usePayments';
import { useExpenses } from '@/hooks/useExpenses';
import { useProperties, useUnits } from '@/hooks/useProperties';
import { useLeases } from '@/hooks/useLeases';
import { useTenants } from '@/hooks/useTenants';
import { useAuth } from '@/hooks/useAuth';
import { ExpenseForm } from '@/components/forms/ExpenseForm';
import { PaymentForm } from '@/components/forms/PaymentForm';
import { supabase } from '@/integrations/supabase/client';
import type { Tenant } from '@/types';
import { useGlobalProperty } from '@/hooks/useGlobalProperty';

const RegistroPage = () => {
  const now = new Date();
  const { user } = useAuth();
  const [selectedUnit, setSelectedUnit] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [activeTab, setActiveTab] = useState<'incassi' | 'spese'>('incassi');

  const { properties } = useProperties();
  const { units, isLoading: loadingUnits } = useUnits();
  const { leases } = useLeases();
  const { tenants } = useTenants();
  const { payments, isLoading: loadingPayments, markAsPaid, deletePayment } = usePayments(undefined, selectedYear);
  const { expenses, isLoading: loadingExpenses } = useExpenses(undefined, selectedYear);
  const { selectedPropertyId } = useGlobalProperty();

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
      const { data } = await supabase
        .from('lease_parties')
        .select('*, tenant:tenants(*)')
        .in('lease_id', leaseIds)
        .eq('ruolo', 'intestatario');
      const map: Record<string, Tenant | undefined> = {};
      const rows = (data ?? []) as Array<{ lease_id: string; tenant: Tenant }>;
      rows.forEach(p => { map[p.lease_id] = p.tenant; });
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
    return expenses
      .filter(e => {
        const date = new Date(e.data_competenza);
        return date.getFullYear() === selectedYear && date.getMonth() + 1 === selectedMonth;
      })
      .filter(e => {
        const matchProperty = selectedPropertyId === 'all' ? true : e.property_id === selectedPropertyId;
        const matchUnit = selectedUnit === 'all' ? true : e.unit_id === selectedUnit;
        return matchProperty && matchUnit;
      });
  }, [selectedMonth, selectedYear, selectedUnit, expenses, selectedPropertyId]);

  const totals = useMemo(() => {
    const imponibile = filteredPayments.reduce((sum, p) => sum + (p.payment.importo_canone_pagato || 0), 0);
    const speseCondominialiIncassate = filteredPayments.reduce((sum, p) => sum + (p.payment.importo_spese_pagato || 0), 0);
    const incassatoTotale = imponibile + speseCondominialiIncassate;
    const cedolareTasse = imponibile * 0.21;
    const speseStraord = filteredExpenses.reduce((sum, e) => sum + (e.importo_effettivo || 0), 0);
    const nettoReale = incassatoTotale - cedolareTasse - speseStraord;
    return {
      totaleAffittoImponibile: imponibile,
      totaleSpese: speseCondominialiIncassate,
      incassatoTotale,
      cedolareTasse,
      speseStraord,
      nettoReale,
    };
  }, [filteredPayments, filteredExpenses]);

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
            <ExpenseForm trigger={<Button className="shrink-0"><Receipt className="h-4 w-4 mr-2" />Nuova Spesa</Button>} />
          ) : (
            <PaymentForm trigger={<Button className="shrink-0">Registra Incasso</Button>} />
          )}
        </div>
        {/* Selectors */}
        <UnitSelector value={selectedUnit} onChange={setSelectedUnit} units={unitOptions} />
        <MonthSelector 
          month={selectedMonth} 
          year={selectedYear} 
          onChange={(m, y) => { setSelectedMonth(m); setSelectedYear(y); }}
        />

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
              <p className="text-xs text-white/60 uppercase mb-1">Cedolare/Tasse (21%)</p>
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
