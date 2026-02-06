// ============================================
// PropertyManager - TypeScript Type Definitions
// Database entities and application types
// ============================================

// ============ ENUMS ============

export type TipoUnita = 'appartamento' | 'locale_commerciale' | 'box' | 'cantina' | 'posto_auto' | 'altro';

export type DestinazioneUso = 'abitativo' | 'commerciale' | 'ufficio' | 'deposito' | 'altro';

export type TipoSoggetto = 'persona_fisica' | 'persona_giuridica';

export type TipoContratto = '4+4_abitativo' | '3+2_agevolato' | 'transitorio' | 'commerciale_6+6' | 'uso_foresteria' | 'altro';

export type RegimeLocativo = 'cedolare_21' | 'cedolare_10' | 'ordinario_irpef';

export type StatoDeposito = 'non_versato' | 'versato' | 'parzialmente_restituito' | 'restituito';

export type ModalitaPagamento = 'bonifico' | 'rid' | 'contanti' | 'altro';

export type StatoContratto = 'in_preparazione' | 'attivo' | 'cessato' | 'rinnovato' | 'contenzioso';

export type RuoloParteContratto = 'intestatario' | 'co_intestatario' | 'garante';

export type StatoPagamento = 'ATTESO' | 'PARZIALE' | 'PAGATO' | 'IN_RITARDO';

export type CategoriaSpesa = 'MANUTENZIONE' | 'STRAORDINARIA' | 'CONDOMINIALE' | 'FISCALE_ALTRO' | 'ASSICURATIVA' | 'ALTRO';

export type TipoUnitaCatastale = 'principale' | 'pertinenza';

export type TipoImposta = 'IMU' | 'TARI' | 'CEDOLARE_SECCA' | 'ALTRO';

export type StatoRata = 'DA_PAGARE' | 'PAGATA' | 'SCADUTA' | 'FUTURA';

export type TipoReminder = 'MANUTENZIONE' | 'FISCALE' | 'CONTRATTUALE' | 'ASSICURATIVO' | 'ALTRO';

export type UsoBancario = 'rate_condominiali' | 'affitti' | 'altro';

export type TipoPolizza = 'fabbricato' | 'rc_proprietario' | 'incendio' | 'furto' | 'all_risks' | 'altro';

export type CanaleMessaggio = 'EMAIL' | 'SMS';

export type EsitoMessaggio = 'INVIATO' | 'ERRORE';

// ============ ENTITIES ============

export interface User {
  id: string;
  nome: string;
  cognome: string;
  email: string;
  telefono?: string;
  created_at: string;
  updated_at: string;
}

export interface Property {
  id: string;
  user_id: string;
  nome_complesso: string;
  indirizzo_via: string;
  indirizzo_civico: string;
  cap: string;
  citta: string;
  provincia: string;
  codice_fiscale_ente?: string;
  note_generali?: string;
  created_at: string;
  updated_at: string;
}

export interface Unit {
  id: string;
  property_id: string;
  tipo_unita: TipoUnita;
  nome_interno: string;
  piano?: string;
  interno?: string;
  scala?: string;
  metratura_mq?: number;
  destinazione_uso: DestinazioneUso;
  attiva: boolean;
  valore_immobile_stimato?: number;
  note?: string;
  created_at: string;
  updated_at: string;
  // Relations for UI
  property?: Property;
  currentLease?: Lease;
  cadastralUnits?: CadastralUnit[];
}

export interface PropertyAdmin {
  id: string;
  property_id: string;
  ragione_sociale: string;
  nome_referente?: string;
  telefono_studio?: string;
  cellulare_urgenze?: string;
  email?: string;
  email_pec?: string;
  codice_fiscale?: string;
  partita_iva?: string;
  numero_rea?: string;
  sede_legale_indirizzo?: string;
  sede_legale_citta?: string;
  sede_legale_cap?: string;
  sede_legale_provincia?: string;
  sede_operativa_indirizzo?: string;
  sede_operativa_citta?: string;
  sede_operativa_cap?: string;
  sede_operativa_provincia?: string;
  note?: string;
  created_at: string;
  updated_at: string;
}

export interface BankAccount {
  id: string;
  property_id: string;
  intestatario: string;
  istituto_bancario: string;
  iban: string;
  uso: UsoBancario;
  note?: string;
  created_at: string;
  updated_at: string;
}

export interface InsurancePolicy {
  id: string;
  user_id: string;
  property_id?: string;
  unit_id?: string;
  compagnia_assicurativa: string;
  numero_polizza: string;
  tipo_polizza: TipoPolizza;
  data_inizio_copertura: string;
  data_fine_copertura: string;
  premio_annuo: number;
  massimale?: number;
  franchigia?: number;
  note?: string;
  attiva: boolean;
  created_at: string;
  updated_at: string;
}

export interface Tenant {
  id: string;
  tipo_soggetto: TipoSoggetto;
  nome: string;
  cognome?: string;
  ragione_sociale?: string;
  codice_fiscale: string;
  partita_iva?: string;
  indirizzo_residenza?: string;
  cap_residenza?: string;
  citta_residenza?: string;
  provincia_residenza?: string;
  email?: string;
  telefono?: string;
  iban?: string;
  note?: string;
  created_at: string;
  updated_at: string;
}

export interface Lease {
  id: string;
  unit_id: string;
  codice_contratto_interno?: string;
  tipo_contratto: TipoContratto;
  regime_locativo: RegimeLocativo;
  data_inizio: string;
  data_fine: string;
  durata_mesi: number;
  canone_mensile: number;
  spese_condominiali_mensili_previste: number;
  altre_spese_mensili_previste: number;
  deposito_cauzionale_importo: number;
  deposito_cauzionale_mesi: number;
  deposito_stato: StatoDeposito;
  data_versamento_deposito?: string;
  data_restituzione_deposito?: string;
  modalita_pagamento: ModalitaPagamento;
  iban_pagamento?: string;
  stato_contratto: StatoContratto;
  primo_anno_locazione: boolean;
  estremi_registrazione?: string;
  modello_rli_protocollo?: string;
  note?: string;
  created_at: string;
  updated_at: string;
  // Relations for UI
  unit?: Unit;
  parties?: LeaseParty[];
  payments?: Payment[];
}

export interface LeaseParty {
  id: string;
  lease_id: string;
  tenant_id: string;
  ruolo: RuoloParteContratto;
  quota_canone_percentuale?: number;
  note?: string;
  created_at: string;
  updated_at: string;
  // Relations
  tenant?: Tenant;
}

export interface LeaseAttachment {
  id: string;
  lease_id: string;
  tipo_documento: string;
  nome_file: string;
  path_file: string;
  data_caricamento: string;
  note?: string;
}

export interface Payment {
  id: string;
  lease_id: string;
  competenza_anno: number;
  competenza_mese: number;
  importo_canone_previsto: number;
  importo_spese_previste: number;
  importo_totale_previsto: number;
  data_scadenza: string;
  data_pagamento?: string;
  importo_canone_pagato: number;
  importo_spese_pagato: number;
  importo_residuo_calcolato: number;
  stato_pagamento: StatoPagamento;
  metodo_pagamento_effettivo?: ModalitaPagamento;
  note?: string;
  created_at: string;
  updated_at: string;
  // Relations
  lease?: Lease;
}

export interface ExtraExpense {
  id: string;
  unit_id?: string;
  lease_id?: string;
  categoria: CategoriaSpesa;
  descrizione: string;
  importo_previsto: number;
  importo_effettivo: number;
  data_competenza: string;
  data_pagamento?: string;
  fornitore?: string;
  deducibile_fiscalmente: boolean;
  reminder_id?: string;
  attachment_id?: string;
  note?: string;
  created_at: string;
  updated_at: string;
}

export interface CadastralUnit {
  id: string;
  unit_id: string;
  tipo_unita: TipoUnitaCatastale;
  categoria_catastale: string;
  rendita_euro: number;
  metratura_mq?: number;
  sezione_urbana?: string;
  foglio: string;
  particella: string;
  subalterno: string;
  note?: string;
  created_at: string;
  updated_at: string;
}

export interface TaxParameter {
  id: string;
  unit_id: string;
  anno_riferimento: number;
  comune: string;
  tipo_imposta: TipoImposta;
  aliquota_per_mille: number;
  percentuale_possesso: number;
  detrazioni_euro: number;
  note?: string;
  created_at: string;
  updated_at: string;
}

export interface Tax {
  id: string;
  unit_id: string;
  tipo_imposta: TipoImposta;
  anno: number;
  base_imponibile: number;
  aliquota: number;
  importo_totale_calcolato: number;
  calcolato_il: string;
  note?: string;
  created_at: string;
  updated_at: string;
  // Relations
  installments?: TaxInstallment[];
}

export interface TaxInstallment {
  id: string;
  tax_id: string;
  numero_rata: number;
  descrizione_rata: string;
  scadenza: string;
  importo_rata: number;
  data_pagamento?: string;
  stato_pagamento: StatoRata;
  note?: string;
  created_at: string;
  updated_at: string;
}

export interface Reminder {
  id: string;
  user_id: string;
  property_id?: string;
  unit_id?: string;
  lease_id?: string;
  insurance_policy_id?: string;
  tipo: TipoReminder;
  titolo: string;
  descrizione?: string;
  data_scadenza: string;
  completata: boolean;
  data_completamento?: string;
  ricorrente: boolean;
  frequenza_mesi?: number;
  giorni_anticipo_promemoria?: number;
  reminder_padre_id?: string;
  note?: string;
  created_at: string;
  updated_at: string;
}

export interface LegalReference {
  id: string;
  categoria: string;
  titolo: string;
  descrizione_breve: string;
  fonte_ufficiale: string;
  url_ufficiale: string;
  testo_nota_rapida?: string;
  data_ultimo_aggiornamento: string;
  preferito?: boolean;
}

export interface InventoryRoom {
  id: string;
  unit_id: string;
  nome_ambiente: string;
  ordine_visualizzazione: number;
  note?: string;
  created_at: string;
  updated_at: string;
  // Relations
  items?: InventoryItem[];
}

export interface InventoryItem {
  id: string;
  inventory_room_id: string;
  descrizione: string;
  stato: 'buono' | 'da_riparare' | 'da_sostituire';
  note?: string;
  created_at: string;
  updated_at: string;
}

export interface MessageTemplate {
  id: string;
  user_id: string;
  nome_template: string;
  canale: CanaleMessaggio;
  oggetto_email?: string;
  corpo_testo: string;
  attivo: boolean;
  note?: string;
  created_at: string;
  updated_at: string;
}

export interface MessageSent {
  id: string;
  user_id: string;
  lease_id?: string;
  tenant_id?: string;
  reminder_id?: string;
  canale: CanaleMessaggio;
  destinatario: string;
  oggetto?: string;
  corpo_inviato: string;
  inviato_il: string;
  esito: EsitoMessaggio;
  dettaglio_esito?: string;
  note?: string;
}

export interface YearlySnapshot {
  id: string;
  user_id: string;
  anno: number;
  dati_riepilogo_json: string;
  creato_il: string;
  note?: string;
}

export interface AuditLog {
  id: string;
  user_id: string;
  entity_name: string;
  entity_id: string;
  campo: string;
  valore_precedente?: string;
  valore_nuovo?: string;
  modificato_il: string;
  nota_operazione?: string;
}

// ============ COMPUTED/VIEW TYPES ============

export interface FinancialSummary {
  entrateLorde: number;
  speseTotali: number;
  imposte: number;
  utileNetto: number;
  incassoMensePrevisto: number;
  incassoMeseEffettivo: number;
  arretratiTotali: number;
}

export interface UnitSummary {
  unit: Unit;
  currentTenant?: Tenant;
  currentLease?: Lease;
  nextPaymentDue?: Payment;
  occupancyRate: number;
  annualYieldGross: number;
  annualYieldNet: number;
}

export interface ReminderWithContext extends Reminder {
  unitName?: string;
  propertyName?: string;
  isOverdue: boolean;
  daysRemaining: number;
}

// ============ FORM TYPES ============

export interface PaymentFormData {
  importo_canone_pagato: number;
  importo_spese_pagato: number;
  data_pagamento: string;
  metodo_pagamento_effettivo: ModalitaPagamento;
  note?: string;
}

export interface ExtraExpenseFormData {
  unit_id?: string;
  lease_id?: string;
  categoria: CategoriaSpesa;
  descrizione: string;
  importo_previsto: number;
  importo_effettivo: number;
  data_competenza: string;
  data_pagamento?: string;
  fornitore?: string;
  deducibile_fiscalmente: boolean;
  note?: string;
}

export interface ReminderFormData {
  property_id?: string;
  unit_id?: string;
  lease_id?: string;
  tipo: TipoReminder;
  titolo: string;
  descrizione?: string;
  data_scadenza: string;
  ricorrente: boolean;
  frequenza_mesi?: number;
  giorni_anticipo_promemoria?: number;
}
