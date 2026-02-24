import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Building, FileText, Map, Calculator, Plus, Pencil, UserCog, Package, Loader2 } from 'lucide-react';
import { AppLayout } from '@/components/layout';
import { UnitSelector } from '@/components/common';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatDate, getContractTypeLabel, getRegimeLabel } from '@/lib/propertyUtils';
import { StatusBadge } from '@/components/common';
import { PropertyForm, UnitForm, TenantForm, LeaseForm } from '@/components/forms';
import { CadastralForm } from '@/components/forms/CadastralForm';
import { AdminForm } from '@/components/forms/AdminForm';
import { InventoryForm } from '@/components/forms/InventoryForm';
import { useProperties, useUnits } from '@/hooks/useProperties';
import { useLeases, useLeaseParties } from '@/hooks/useLeases';
import { useTenants } from '@/hooks/useTenants';
import { useCadastral } from '@/hooks/useCadastral';
import { usePropertyAdmins } from '@/hooks/usePropertyAdmins';
import { useInventory } from '@/hooks/useInventory';
import { useAuth } from '@/hooks/useAuth';
import { TaxCalculatorDialog } from '@/components/taxes/TaxCalculatorDialog';
import { useGlobalProperty } from '@/hooks/useGlobalProperty';
import { supabase } from '@/integrations/supabase/client';
import { BackupManager } from '@/components/BackupManager';

const DatiPage = () => {
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  
  const { properties, isLoading: loadingProperties } = useProperties();
  const { units, isLoading: loadingUnits } = useUnits();
  const { leases, isLoading: loadingLeases } = useLeases();
  const { tenants, isLoading: loadingTenants } = useTenants();

  const isLoading = loadingProperties || loadingUnits || loadingLeases || loadingTenants;
  const { selectedPropertyId } = useGlobalProperty();

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

  const initialUnit = searchParams.get('unit') || units[0]?.id || 'all';
  const [selectedUnit, setSelectedUnit] = useState<string>(initialUnit);

  const unit = units.find(u => u.id === selectedUnit && (selectedPropertyId === 'all' ? true : u.property_id === selectedPropertyId));
  const property = unit ? properties.find(p => p.id === unit.property_id) : null;
  const lease = unit ? leases.find(l => l.unit_id === unit.id && l.stato_contratto === 'attivo') : null;
  const { parties, createLeaseParty, deleteLeaseParty } = useLeaseParties(lease?.id);
  const { tenants: allTenants } = useTenants();
  const [showPartyEditor, setShowPartyEditor] = useState(false);
  const [selectedTenantForLease, setSelectedTenantForLease] = useState<string>('');
  const [addingGuarantor, setAddingGuarantor] = useState(false);
  const [guarantorTenantId, setGuarantorTenantId] = useState<string>('');

  // Fetch cadastral data for selected unit
  const { cadastralUnits, isLoading: loadingCadastral, totaleRendita } = useCadastral(unit?.id);
  
  // Fetch admin for selected property
  const { admin, isLoading: loadingAdmin } = usePropertyAdmins(property?.id);

  // Fetch inventory for selected unit
  const { inventoryItems, isLoading: loadingInventory } = useInventory(unit?.id);

  const groupedInventory = useMemo(() => {
    return inventoryItems.reduce((acc, item) => {
      const roomName = item.room ? item.room.trim() : 'Senza stanza';
      if (!acc[roomName]) {
        acc[roomName] = [];
      }
      acc[roomName].push(item);
      return acc;
    }, {} as Record<string, typeof inventoryItems>);
  }, [inventoryItems]);

  const sortedRooms = useMemo(() => {
    return Object.keys(groupedInventory || {}).sort((a, b) => {
      if (a === 'Senza stanza') return 1;
      if (b === 'Senza stanza') return -1;
      return a.localeCompare(b);
    });
  }, [groupedInventory]);

  if (isLoading) {
    return (
      <AppLayout title="Dati">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Dati">
      <div className="space-y-4">
        {/* Action buttons - smaller and scrollable */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          <PropertyForm trigger={<Button size="sm" variant="outline"><Plus className="h-4 w-4 mr-1" />Immobile</Button>} />
          <UnitForm trigger={<Button size="sm" variant="outline"><Plus className="h-4 w-4 mr-1" />Unità</Button>} />
          <TenantForm trigger={<Button size="sm" variant="outline"><Plus className="h-4 w-4 mr-1" />Conduttore</Button>} />
          <LeaseForm trigger={<Button size="sm" variant="outline"><Plus className="h-4 w-4 mr-1" />Contratto</Button>} />
        </div>
        
        <div className="mobile-card">
          <div className="space-y-2">
            <span className="text-xs text-muted-foreground">Backup dati</span>
            <BackupManager />
          </div>
        </div>
        
        <UnitSelector 
          value={selectedUnit} 
          onChange={setSelectedUnit}
          units={unitOptions}
        />

        {!unit && units.length === 0 ? (
          <div className="mobile-card text-center py-8">
            <Building className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg mb-2">Nessun immobile registrato</h3>
            <p className="text-muted-foreground text-sm mb-4">
              Inizia aggiungendo il tuo primo immobile
            </p>
            <PropertyForm trigger={<Button><Plus className="h-4 w-4 mr-2" />Aggiungi Immobile</Button>} />
          </div>
        ) : unit ? (
          <Tabs defaultValue="immobile" className="w-full">
            <TabsList className="grid w-full grid-cols-6 h-12">
              <TabsTrigger value="immobile" className="text-xs"><Building className="h-4 w-4" /></TabsTrigger>
              <TabsTrigger value="contratto" className="text-xs"><FileText className="h-4 w-4" /></TabsTrigger>
              <TabsTrigger value="catasto" className="text-xs"><Map className="h-4 w-4" /></TabsTrigger>
              <TabsTrigger value="admin" className="text-xs"><UserCog className="h-4 w-4" /></TabsTrigger>
              <TabsTrigger value="inventario" className="text-xs"><Package className="h-4 w-4" /></TabsTrigger>
              <TabsTrigger value="fiscale" className="text-xs"><Calculator className="h-4 w-4" /></TabsTrigger>
            </TabsList>

            {/* IMMOBILE TAB */}
            <TabsContent value="immobile" className="space-y-4 mt-4">
              {property && (
                <div className="mobile-card">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-semibold text-foreground">Complesso</h3>
                    <PropertyForm 
                      property={property}
                      trigger={<Button size="sm" variant="ghost"><Pencil className="h-4 w-4" /></Button>}
                    />
                  </div>
                  <p className="font-medium">{property.nome_complesso}</p>
                  {property.indirizzo_via && (
                    <p className="text-sm text-muted-foreground">{property.indirizzo_via} {property.indirizzo_civico}</p>
                  )}
                  {property.citta && (
                    <p className="text-sm text-muted-foreground">{property.cap} {property.citta} ({property.provincia})</p>
                  )}
                </div>
              )}

              <div className="mobile-card">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-semibold text-foreground">Unità</h3>
                  <UnitForm 
                    unit={unit}
                    trigger={<Button size="sm" variant="ghost"><Pencil className="h-4 w-4" /></Button>}
                  />
                </div>
                <p className="font-medium">{unit.nome_interno}</p>
                <div className="flex gap-4 text-sm text-muted-foreground mt-2">
                  {unit.piano && <span>Piano: {unit.piano}</span>}
                  {unit.interno && <span>Interno: {unit.interno}</span>}
                  {unit.scala && <span>Scala: {unit.scala}</span>}
                </div>
                {unit.metratura_mq && (
                  <p className="text-sm text-muted-foreground mt-1">Superficie: {unit.metratura_mq} mq</p>
                )}
                {unit.valore_immobile_stimato && (
                  <p className="text-sm text-muted-foreground">Valore: {formatCurrency(unit.valore_immobile_stimato)}</p>
                )}
                <div className="mt-2">
                  <StatusBadge status={unit.attiva ? 'success' : 'muted'}>
                    {unit.attiva ? 'Attiva' : 'Non attiva'}
                  </StatusBadge>
                </div>
              </div>
            </TabsContent>

            {/* CONTRATTO TAB */}
            <TabsContent value="contratto" className="space-y-4 mt-4">
              {lease ? (
                <div className="mobile-card">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-semibold text-foreground">Dati contratto</h3>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">Tipo</span><span>{getContractTypeLabel(lease.tipo_contratto)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Regime</span><span>{getRegimeLabel(lease.regime_locativo)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Inizio</span><span>{formatDate(lease.data_inizio)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Fine</span><span>{formatDate(lease.data_fine)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Canone Lordo</span><span className="font-semibold">{formatCurrency(lease.canone_mensile)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Canone Netto (stima)</span><span className="text-muted-foreground">{formatCurrency(lease.canone_mensile * 0.79)}</span></div>
                    {lease.deposito_cauzionale_importo && (
                      <div className="flex justify-between"><span className="text-muted-foreground">Deposito</span><span>{formatCurrency(lease.deposito_cauzionale_importo)}</span></div>
                    )}
                    <div className="flex justify-between"><span className="text-muted-foreground">Modalità Pagamento</span><span>{lease.modalita_pagamento || '—'}</span></div>
                    {lease.iban_pagamento && (
                      <div className="flex justify-between"><span className="text-muted-foreground">IBAN</span><span>{lease.iban_pagamento}</span></div>
                    )}
                    <div className="flex justify-between"><span className="text-muted-foreground">Stato Contratto</span><span>{lease.stato_contratto}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Primo Anno</span><span>{lease.primo_anno_locazione ? 'Sì' : 'No'}</span></div>
                    {lease.estremi_registrazione && (
                      <div className="flex justify-between"><span className="text-muted-foreground">Estremi Reg.</span><span>{lease.estremi_registrazione}</span></div>
                    )}
                    {lease.note && (
                      <div className="flex justify-between"><span className="text-muted-foreground">Note</span><span className="line-clamp-2">{lease.note}</span></div>
                    )}
                  </div>

                  <div className="mt-4 pt-4 border-t space-y-2">
                    <h4 className="font-medium text-foreground">Parti contrattuali</h4>
                    <div className="space-y-1">
                      {parties?.filter(p => p.ruolo !== 'garante').map(p => {
                        const t = p.tenant;
                        const name = t?.tipo_soggetto === 'persona_fisica'
                          ? `${t?.nome || ''} ${t?.cognome || ''}`.trim()
                          : t?.ragione_sociale || '';
                        return (
                          <div key={p.id} className="flex justify-between text-sm">
                            <span className="text-muted-foreground">{p.ruolo === 'intestatario' ? 'Conduttore' : 'Co-intestatario'}</span>
                            <span>{name || '—'}</span>
                          </div>
                        );
                      })}
                      {(!parties || parties.filter(p => p.ruolo !== 'garante').length === 0) && (
                        <div className="text-sm text-muted-foreground">Nessun conduttore associato</div>
                      )}
                    </div>
                    <Button size="sm" variant="outline" className="mt-2" onClick={() => setShowPartyEditor(true)}>
                      Modifica conduttore
                    </Button>
                  </div>

                  <div className="mt-4 pt-4 border-t space-y-2">
                    <h4 className="font-medium text-foreground">Garante</h4>
                    {parties?.find(p => p.ruolo === 'garante') ? (
                      (() => {
                        const g = parties.find(p => p.ruolo === 'garante')!;
                        const t = g.tenant;
                        const name = t?.tipo_soggetto === 'persona_fisica'
                          ? `${t?.nome || ''} ${t?.cognome || ''}`.trim()
                          : t?.ragione_sociale || '';
                        return (
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between"><span className="text-muted-foreground">Presenza</span><span>Sì</span></div>
                            <div className="flex justify-between"><span className="text-muted-foreground">Nome</span><span>{name || '—'}</span></div>
                            {t?.codice_fiscale && <div className="flex justify-between"><span className="text-muted-foreground">Codice Fiscale</span><span>{t.codice_fiscale}</span></div>}
                            {(t?.email || t?.telefono) && (
                              <div className="flex justify-between"><span className="text-muted-foreground">Contatti</span><span>{[t?.email, t?.telefono].filter(Boolean).join(' • ')}</span></div>
                            )}
                          </div>
                        );
                      })()
                    ) : (
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between"><span className="text-muted-foreground">Presenza</span><span>No</span></div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => setAddingGuarantor(true)}>Aggiungi garante</Button>
                        </div>
                      </div>
                    )}
                  </div>

                  {showPartyEditor && (
                    <div className="mt-4 pt-4 border-t">
                      <div className="space-y-2">
                        <h5 className="font-medium text-foreground text-sm">Seleziona nuovo conduttore</h5>
                        <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto border rounded-md p-2">
                          {allTenants.map(t => {
                            const label = t.tipo_soggetto === 'persona_fisica'
                              ? `${t.nome || ''} ${t.cognome || ''}`.trim()
                              : t.ragione_sociale || '';
                            return (
                              <label key={t.id} className="flex items-center gap-2 p-2 rounded cursor-pointer hover:bg-muted">
                                <input
                                  type="radio"
                                  name="tenant_select"
                                  checked={selectedTenantForLease === t.id}
                                  onChange={() => setSelectedTenantForLease(t.id)}
                                />
                                <span className="text-sm">{label || '—'}</span>
                              </label>
                            );
                          })}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={async () => {
                              if (!lease || !selectedTenantForLease) return;
                              const currentMain = parties?.find(p => p.ruolo === 'intestatario');
                              if (currentMain) {
                                await deleteLeaseParty.mutateAsync(currentMain.id);
                              }
                              await createLeaseParty.mutateAsync({
                                lease_id: lease.id,
                                tenant_id: selectedTenantForLease,
                                ruolo: 'intestatario',
                                quota_canone_percentuale: null,
                                note: null,
                              });
                              setShowPartyEditor(false);
                              setSelectedTenantForLease('');
                            }}
                          >
                            Salva
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setShowPartyEditor(false)}>Annulla</Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {addingGuarantor && (
                    <div className="mt-4 pt-4 border-t">
                      <div className="space-y-2">
                        <h5 className="font-medium text-foreground text-sm">Associa garante esistente</h5>
                        <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto border rounded-md p-2">
                          {allTenants.map(t => {
                            const label = t.tipo_soggetto === 'persona_fisica'
                              ? `${t.nome || ''} ${t.cognome || ''}`.trim()
                              : t.ragione_sociale || '';
                            return (
                              <label key={t.id} className="flex items-center gap-2 p-2 rounded cursor-pointer hover:bg-muted">
                                <input
                                  type="radio"
                                  name="guarantor_select"
                                  checked={guarantorTenantId === t.id}
                                  onChange={() => setGuarantorTenantId(t.id)}
                                />
                                <span className="text-sm">{label || '—'}</span>
                              </label>
                            );
                          })}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={async () => {
                              if (!lease || !guarantorTenantId) return;
                              await createLeaseParty.mutateAsync({
                                lease_id: lease.id,
                                tenant_id: guarantorTenantId,
                                ruolo: 'garante',
                                quota_canone_percentuale: null,
                                note: null,
                              });
                              setAddingGuarantor(false);
                              setGuarantorTenantId('');
                            }}
                          >
                            Salva garante
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => { setAddingGuarantor(false); setGuarantorTenantId(''); }}>Annulla</Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="mobile-card text-center py-6">
                  <FileText className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground mb-4">Nessun contratto attivo</p>
                  <LeaseForm 
                    unitId={unit.id}
                    trigger={<Button size="sm"><Plus className="h-4 w-4 mr-2" />Nuovo Contratto</Button>}
                  />
                </div>
              )}
            </TabsContent>

            {/* CATASTO TAB */}
            <TabsContent value="catasto" className="space-y-4 mt-4">
              {loadingCadastral ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : cadastralUnits.length === 0 ? (
                <div className="mobile-card text-center py-6">
                  <Map className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground mb-4">Nessun dato catastale registrato</p>
                  <CadastralForm unitId={unit.id} />
                </div>
              ) : (
                <>
                  {cadastralUnits.map(cadastral => (
                    <CadastralForm
                      key={cadastral.id}
                      cadastral={cadastral}
                      unitId={unit.id}
                      trigger={
                        <div className="mobile-card cursor-pointer hover:bg-muted/50">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <StatusBadge status={cadastral.tipo_unita === 'principale' ? 'info' : 'muted'}>
                                {cadastral.tipo_unita === 'principale' ? 'Principale' : 'Pertinenza'}
                              </StatusBadge>
                              <h4 className="font-medium mt-2">{cadastral.categoria_catastale}</h4>
                            </div>
                            <Button size="sm" variant="ghost"><Pencil className="h-4 w-4" /></Button>
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-sm mt-3">
                            <div><span className="text-muted-foreground">Foglio:</span> {cadastral.foglio}</div>
                            <div><span className="text-muted-foreground">Part.:</span> {cadastral.particella}</div>
                            <div><span className="text-muted-foreground">Sub:</span> {cadastral.subalterno}</div>
                          </div>
                          <div className="mt-2 pt-2 border-t">
                            <span className="text-muted-foreground text-sm">Rendita: </span>
                            <span className="font-semibold">{formatCurrency(cadastral.rendita_euro)}</span>
                          </div>
                        </div>
                      }
                    />
                  ))}
                  <CadastralForm 
                    unitId={unit.id}
                    trigger={
                      <Button variant="outline" size="sm" className="w-full">
                        <Plus className="h-4 w-4 mr-2" />
                        Aggiungi pertinenza
                      </Button>
                    }
                  />
                  {totaleRendita > 0 && (
                    <div className="mobile-card bg-primary/5">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">Rendita Totale</span>
                        <span className="font-bold text-lg">{formatCurrency(totaleRendita)}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Rivalutata (5%): {formatCurrency(totaleRendita * 1.05)}
                      </p>
                    </div>
                  )}
                </>
              )}
            </TabsContent>

            {/* ADMIN TAB */}
            <TabsContent value="admin" className="space-y-4 mt-4">
              {!property ? (
                <div className="mobile-card text-center py-6">
                  <p className="text-muted-foreground">Seleziona un immobile</p>
                </div>
              ) : loadingAdmin ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : !admin ? (
                <div className="mobile-card text-center py-6">
                  <UserCog className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground mb-4">Nessun amministratore associato</p>
                  <AdminForm propertyId={property.id} />
                </div>
              ) : (
                <AdminForm
                  admin={admin}
                  propertyId={property.id}
                  trigger={
                    <div className="mobile-card cursor-pointer hover:bg-muted/50">
                      <div className="flex justify-between items-start mb-3">
                        <h3 className="font-semibold text-foreground">Amministratore</h3>
                        <Button size="sm" variant="ghost"><Pencil className="h-4 w-4" /></Button>
                      </div>
                      <p className="font-medium">{admin.ragione_sociale}</p>
                      {admin.nome_referente && (
                        <p className="text-sm text-muted-foreground">{admin.nome_referente}</p>
                      )}
                      <div className="mt-3 space-y-1 text-sm">
                        {admin.telefono_studio && (
                          <p><span className="text-muted-foreground">Tel:</span> {admin.telefono_studio}</p>
                        )}
                        {admin.cellulare_urgenze && (
                          <p><span className="text-muted-foreground">Cell:</span> {admin.cellulare_urgenze}</p>
                        )}
                        {admin.email && (
                          <p><span className="text-muted-foreground">Email:</span> {admin.email}</p>
                        )}
                        {admin.email_pec && (
                          <p><span className="text-muted-foreground">PEC:</span> {admin.email_pec}</p>
                        )}
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        {(() => {
                          const mobile = admin.cellulare_urgenze || '';
                          const studio = admin.telefono_studio || '';
                          const phone = mobile || studio;
                          if (!phone) return null;
                          const cleanPhone = phone.replace(/[^\d]/g, '');
                          const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent("Ciao, ti scrivo dall'App Gestione Immobili per...")}`;
                          return (
                            <a
                              href={waUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              aria-label="Contatta su WhatsApp"
                              className="p-1 rounded hover:bg-muted"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor">
                                <path d="M12 2a9 9 0 0 0-7.8 13.5L3 22l6.7-1.8A9 9 0 1 0 12 2z" strokeWidth="1.5" className="text-green-600" />
                              </svg>
                            </a>
                          );
                        })()}
                        {admin.email && (
                          <a
                            href={`mailto:${admin.email}?subject=${encodeURIComponent('Comunicazione Gestione Immobiliare')}`}
                            aria-label="Invia Email"
                            className="p-1 rounded hover:bg-muted"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M3 7l9 6 9-6M5 19h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2z" />
                            </svg>
                          </a>
                        )}
                      </div>
                      {(admin.codice_fiscale || admin.partita_iva) && (
                        <div className="mt-3 pt-3 border-t text-sm">
                          {admin.codice_fiscale && <p><span className="text-muted-foreground">CF:</span> {admin.codice_fiscale}</p>}
                          {admin.partita_iva && <p><span className="text-muted-foreground">P.IVA:</span> {admin.partita_iva}</p>}
                        </div>
                      )}
                      {(admin.iban_pagamento || admin.nome_banca) && (
                        <div className="mt-3 pt-3 border-t text-sm">
                          <p className="font-medium mb-1">Dati Bancari</p>
                          {admin.nome_banca && <p><span className="text-muted-foreground">Banca:</span> {admin.nome_banca}</p>}
                          {admin.intestatario_conto && <p><span className="text-muted-foreground">Intestatario:</span> {admin.intestatario_conto}</p>}
                          {admin.iban_pagamento && <p className="font-mono text-xs mt-1">{admin.iban_pagamento}</p>}
                        </div>
                      )}
                    </div>
                  }
                />
              )}
            </TabsContent>

            {/* INVENTARIO TAB */}
            <TabsContent value="inventario" className="space-y-4 mt-4">
              {loadingInventory ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : (inventoryItems.length === 0) ? (
                <div className="mobile-card text-center py-6">
                  <Package className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground mb-4">Nessun bene registrato nell'inventario</p>
                  <div className="flex gap-2 justify-center">
                    <InventoryForm unitId={unit.id} />
                  </div>
                </div>
              ) : (
                <>
                  {sortedRooms.map(roomName => {
                    const roomItems = groupedInventory[roomName] || [];
                    return (
                      <div key={String(roomName)} className="space-y-2">
                        <div className="mobile-card bg-muted/50">
                          <div className="flex justify-between items-center">
                            <h3 className="font-semibold text-foreground">{roomName}</h3>
                            <div className="flex gap-2">
                              <InventoryForm unitId={unit.id} defaultRoomName={String(roomName)} trigger={<Button size="sm" variant="outline"><Plus className="h-4 w-4 mr-1" />Aggiungi</Button>} />
                            </div>
                          </div>
                        </div>
                        {roomItems.length === 0 ? (
                          <div className="mobile-card text-sm text-muted-foreground">Nessun bene in questa stanza</div>
                        ) : (
                          roomItems.map(item => (
                            <InventoryForm
                              key={item.id}
                              item={item}
                              unitId={unit.id}
                              defaultRoomName={String(roomName)}
                              trigger={
                                <div className="mobile-card cursor-pointer hover:bg-muted/50">
                                  <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                      <h4 className="font-medium text-foreground">{item.nome_bene}</h4>
                                      {item.descrizione && (
                                        <p className="text-sm text-muted-foreground line-clamp-1">{item.descrizione}</p>
                                      )}
                                      <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
                                        <span>Qtà: {item.quantita}</span>
                                        {item.stato && (
                                          <StatusBadge status={
                                            item.stato === 'nuovo' || item.stato === 'ottimo' ? 'success' :
                                            item.stato === 'buono' ? 'info' :
                                            item.stato === 'discreto' ? 'warning' : 'error'
                                          }>
                                            {item.stato}
                                          </StatusBadge>
                                        )}
                                      </div>
                                    </div>
                                    <Button size="sm" variant="ghost"><Pencil className="h-4 w-4" /></Button>
                                  </div>
                                </div>
                              }
                            />
                          ))
                        )}
                      </div>
                    );
                  })}
                  <div className="mobile-card bg-muted/50">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Totale beni</span>
                      <span className="font-semibold">{inventoryItems.reduce((sum, i) => sum + i.quantita, 0)}</span>
                    </div>
                  </div>
                </>
              )}
            </TabsContent>

            {/* FISCALE TAB */}
            <TabsContent value="fiscale" className="space-y-4 mt-4">
              <TaxCalculatorDialog 
                unit={unit}
                lease={lease}
                trigger={
                  <div className="mobile-card cursor-pointer hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-primary/10 rounded-lg">
                        <Calculator className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold">Calcolatore Fiscale</h3>
                        <p className="text-sm text-muted-foreground">IMU e Cedolare Secca</p>
                      </div>
                    </div>
                  </div>
                }
              />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="mobile-card">
                  <h3 className="font-semibold text-foreground mb-2">Dati Catastali</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">Rendita Totale</span><span className="font-semibold">{formatCurrency(totaleRendita || 0)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Rivalutata (5%)</span><span className="font-semibold">{formatCurrency((totaleRendita || 0) * 1.05)}</span></div>
                  </div>
                </div>
                <div className="mobile-card">
                  <h3 className="font-semibold text-foreground mb-2">Dati Contratto</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">Canone annuo</span><span className="font-semibold">{formatCurrency((lease?.canone_mensile || 0) * 12)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Regime fiscale</span><span>{lease ? getRegimeLabel(lease.regime_locativo) : '—'}</span></div>
                  </div>
                </div>
              </div>
              
              <div className="mobile-card">
                <h3 className="font-semibold text-foreground mb-3">Scadenze Fiscali {new Date().getFullYear()}</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center p-2 bg-muted rounded-lg">
                    <span>IMU Acconto</span>
                    <span className="font-medium">16 Giugno</span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-muted rounded-lg">
                    <span>Cedolare 1° Acconto</span>
                    <span className="font-medium">30 Giugno</span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-muted rounded-lg">
                    <span>Cedolare 2° Acconto</span>
                    <span className="font-medium">30 Novembre</span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-muted rounded-lg">
                    <span>IMU Saldo</span>
                    <span className="font-medium">16 Dicembre</span>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        ) : (
          <div className="mobile-card text-center py-6">
            <p className="text-muted-foreground">Seleziona un'unità per visualizzare i dettagli</p>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default DatiPage;
