export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      cadastral_units: {
        Row: {
          categoria_catastale: string
          created_at: string
          foglio: string
          id: string
          metratura_mq: number | null
          note: string | null
          particella: string
          rendita_euro: number
          sezione_urbana: string | null
          subalterno: string
          tipo_unita: string
          unit_id: string
          updated_at: string
        }
        Insert: {
          categoria_catastale: string
          created_at?: string
          foglio: string
          id?: string
          metratura_mq?: number | null
          note?: string | null
          particella: string
          rendita_euro?: number
          sezione_urbana?: string | null
          subalterno: string
          tipo_unita?: string
          unit_id: string
          updated_at?: string
        }
        Update: {
          categoria_catastale?: string
          created_at?: string
          foglio?: string
          id?: string
          metratura_mq?: number | null
          note?: string | null
          particella?: string
          rendita_euro?: number
          sezione_urbana?: string | null
          subalterno?: string
          tipo_unita?: string
          unit_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cadastral_units_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      extra_expenses: {
        Row: {
          categoria: string
          created_at: string
          data_competenza: string
          data_pagamento: string | null
          deducibile_fiscalmente: boolean | null
          descrizione: string
          fornitore: string | null
          id: string
          importo_effettivo: number
          importo_previsto: number
          lease_id: string | null
          note: string | null
          property_id: string | null
          unit_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          categoria?: string
          created_at?: string
          data_competenza: string
          data_pagamento?: string | null
          deducibile_fiscalmente?: boolean | null
          descrizione: string
          fornitore?: string | null
          id?: string
          importo_effettivo?: number
          importo_previsto?: number
          lease_id?: string | null
          note?: string | null
          property_id?: string | null
          unit_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          categoria?: string
          created_at?: string
          data_competenza?: string
          data_pagamento?: string | null
          deducibile_fiscalmente?: boolean | null
          descrizione?: string
          fornitore?: string | null
          id?: string
          importo_effettivo?: number
          importo_previsto?: number
          lease_id?: string | null
          note?: string | null
          property_id?: string | null
          unit_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "extra_expenses_lease_id_fkey"
            columns: ["lease_id"]
            isOneToOne: false
            referencedRelation: "leases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extra_expenses_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extra_expenses_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      lease_parties: {
        Row: {
          created_at: string
          id: string
          lease_id: string
          note: string | null
          quota_canone_percentuale: number | null
          ruolo: Database["public"]["Enums"]["ruolo_contrattuale"]
          tenant_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          lease_id: string
          note?: string | null
          quota_canone_percentuale?: number | null
          ruolo?: Database["public"]["Enums"]["ruolo_contrattuale"]
          tenant_id: string
        }
        Update: {
          created_at?: string
          id?: string
          lease_id?: string
          note?: string | null
          quota_canone_percentuale?: number | null
          ruolo?: Database["public"]["Enums"]["ruolo_contrattuale"]
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lease_parties_lease_id_fkey"
            columns: ["lease_id"]
            isOneToOne: false
            referencedRelation: "leases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lease_parties_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      leases: {
        Row: {
          altre_spese_mensili_previste: number | null
          canone_mensile: number
          codice_contratto_interno: string | null
          created_at: string
          data_fine: string
          data_inizio: string
          data_restituzione_deposito: string | null
          data_versamento_deposito: string | null
          deposito_cauzionale_importo: number | null
          deposito_cauzionale_mesi: number | null
          deposito_stato: Database["public"]["Enums"]["stato_deposito"] | null
          durata_mesi: number | null
          estremi_registrazione: string | null
          iban_pagamento: string | null
          id: string
          modalita_pagamento: string | null
          modello_rli_protocollo: string | null
          note: string | null
          primo_anno_locazione: boolean | null
          regime_locativo: Database["public"]["Enums"]["regime_locativo"]
          spese_condominiali_mensili_previste: number | null
          stato_contratto: Database["public"]["Enums"]["stato_contratto"] | null
          tipo_contratto: Database["public"]["Enums"]["tipo_contratto"]
          unit_id: string
          updated_at: string
        }
        Insert: {
          altre_spese_mensili_previste?: number | null
          canone_mensile: number
          codice_contratto_interno?: string | null
          created_at?: string
          data_fine: string
          data_inizio: string
          data_restituzione_deposito?: string | null
          data_versamento_deposito?: string | null
          deposito_cauzionale_importo?: number | null
          deposito_cauzionale_mesi?: number | null
          deposito_stato?: Database["public"]["Enums"]["stato_deposito"] | null
          durata_mesi?: number | null
          estremi_registrazione?: string | null
          iban_pagamento?: string | null
          id?: string
          modalita_pagamento?: string | null
          modello_rli_protocollo?: string | null
          note?: string | null
          primo_anno_locazione?: boolean | null
          regime_locativo?: Database["public"]["Enums"]["regime_locativo"]
          spese_condominiali_mensili_previste?: number | null
          stato_contratto?:
            | Database["public"]["Enums"]["stato_contratto"]
            | null
          tipo_contratto?: Database["public"]["Enums"]["tipo_contratto"]
          unit_id: string
          updated_at?: string
        }
        Update: {
          altre_spese_mensili_previste?: number | null
          canone_mensile?: number
          codice_contratto_interno?: string | null
          created_at?: string
          data_fine?: string
          data_inizio?: string
          data_restituzione_deposito?: string | null
          data_versamento_deposito?: string | null
          deposito_cauzionale_importo?: number | null
          deposito_cauzionale_mesi?: number | null
          deposito_stato?: Database["public"]["Enums"]["stato_deposito"] | null
          durata_mesi?: number | null
          estremi_registrazione?: string | null
          iban_pagamento?: string | null
          id?: string
          modalita_pagamento?: string | null
          modello_rli_protocollo?: string | null
          note?: string | null
          primo_anno_locazione?: boolean | null
          regime_locativo?: Database["public"]["Enums"]["regime_locativo"]
          spese_condominiali_mensili_previste?: number | null
          stato_contratto?:
            | Database["public"]["Enums"]["stato_contratto"]
            | null
          tipo_contratto?: Database["public"]["Enums"]["tipo_contratto"]
          unit_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leases_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      message_templates: {
        Row: {
          attivo: boolean | null
          canale: Database["public"]["Enums"]["canale_messaggio"]
          corpo_testo: string
          created_at: string
          id: string
          nome_template: string
          note: string | null
          oggetto_email: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          attivo?: boolean | null
          canale?: Database["public"]["Enums"]["canale_messaggio"]
          corpo_testo: string
          created_at?: string
          id?: string
          nome_template: string
          note?: string | null
          oggetto_email?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          attivo?: boolean | null
          canale?: Database["public"]["Enums"]["canale_messaggio"]
          corpo_testo?: string
          created_at?: string
          id?: string
          nome_template?: string
          note?: string | null
          oggetto_email?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      messages_sent: {
        Row: {
          canale: Database["public"]["Enums"]["canale_messaggio"]
          corpo_inviato: string
          destinatario: string
          dettaglio_esito: string | null
          esito: Database["public"]["Enums"]["esito_messaggio"]
          id: string
          inviato_il: string
          lease_id: string | null
          note: string | null
          oggetto: string | null
          reminder_id: string | null
          tenant_id: string | null
          user_id: string
        }
        Insert: {
          canale: Database["public"]["Enums"]["canale_messaggio"]
          corpo_inviato: string
          destinatario: string
          dettaglio_esito?: string | null
          esito?: Database["public"]["Enums"]["esito_messaggio"]
          id?: string
          inviato_il?: string
          lease_id?: string | null
          note?: string | null
          oggetto?: string | null
          reminder_id?: string | null
          tenant_id?: string | null
          user_id: string
        }
        Update: {
          canale?: Database["public"]["Enums"]["canale_messaggio"]
          corpo_inviato?: string
          destinatario?: string
          dettaglio_esito?: string | null
          esito?: Database["public"]["Enums"]["esito_messaggio"]
          id?: string
          inviato_il?: string
          lease_id?: string | null
          note?: string | null
          oggetto?: string | null
          reminder_id?: string | null
          tenant_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_sent_lease_id_fkey"
            columns: ["lease_id"]
            isOneToOne: false
            referencedRelation: "leases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sent_reminder_id_fkey"
            columns: ["reminder_id"]
            isOneToOne: false
            referencedRelation: "reminders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sent_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          data_lettura: string | null
          id: string
          letta: boolean
          messaggio: string | null
          riferimento_id: string | null
          riferimento_tipo: string | null
          tipo: string
          titolo: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data_lettura?: string | null
          id?: string
          letta?: boolean
          messaggio?: string | null
          riferimento_id?: string | null
          riferimento_tipo?: string | null
          tipo?: string
          titolo: string
          user_id: string
        }
        Update: {
          created_at?: string
          data_lettura?: string | null
          id?: string
          letta?: boolean
          messaggio?: string | null
          riferimento_id?: string | null
          riferimento_tipo?: string | null
          tipo?: string
          titolo?: string
          user_id?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          competenza_anno: number
          competenza_mese: number
          created_at: string
          data_pagamento: string | null
          data_scadenza: string
          id: string
          importo_canone_pagato: number | null
          importo_canone_previsto: number
          importo_residuo_calcolato: number | null
          importo_spese_pagato: number | null
          importo_spese_previste: number | null
          importo_totale_previsto: number
          lease_id: string
          metodo_pagamento_effettivo: string | null
          note: string | null
          stato_pagamento: Database["public"]["Enums"]["stato_pagamento"] | null
          updated_at: string
        }
        Insert: {
          competenza_anno: number
          competenza_mese: number
          created_at?: string
          data_pagamento?: string | null
          data_scadenza: string
          id?: string
          importo_canone_pagato?: number | null
          importo_canone_previsto: number
          importo_residuo_calcolato?: number | null
          importo_spese_pagato?: number | null
          importo_spese_previste?: number | null
          importo_totale_previsto: number
          lease_id: string
          metodo_pagamento_effettivo?: string | null
          note?: string | null
          stato_pagamento?:
            | Database["public"]["Enums"]["stato_pagamento"]
            | null
          updated_at?: string
        }
        Update: {
          competenza_anno?: number
          competenza_mese?: number
          created_at?: string
          data_pagamento?: string | null
          data_scadenza?: string
          id?: string
          importo_canone_pagato?: number | null
          importo_canone_previsto?: number
          importo_residuo_calcolato?: number | null
          importo_spese_pagato?: number | null
          importo_spese_previste?: number | null
          importo_totale_previsto?: number
          lease_id?: string
          metodo_pagamento_effettivo?: string | null
          note?: string | null
          stato_pagamento?:
            | Database["public"]["Enums"]["stato_pagamento"]
            | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_lease_id_fkey"
            columns: ["lease_id"]
            isOneToOne: false
            referencedRelation: "leases"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          cognome: string | null
          created_at: string
          id: string
          nome: string | null
          telefono: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cognome?: string | null
          created_at?: string
          id?: string
          nome?: string | null
          telefono?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cognome?: string | null
          created_at?: string
          id?: string
          nome?: string | null
          telefono?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      properties: {
        Row: {
          cap: string | null
          citta: string | null
          codice_fiscale_ente: string | null
          created_at: string
          id: string
          indirizzo_civico: string | null
          indirizzo_via: string | null
          nome_complesso: string
          note_generali: string | null
          provincia: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cap?: string | null
          citta?: string | null
          codice_fiscale_ente?: string | null
          created_at?: string
          id?: string
          indirizzo_civico?: string | null
          indirizzo_via?: string | null
          nome_complesso: string
          note_generali?: string | null
          provincia?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cap?: string | null
          citta?: string | null
          codice_fiscale_ente?: string | null
          created_at?: string
          id?: string
          indirizzo_civico?: string | null
          indirizzo_via?: string | null
          nome_complesso?: string
          note_generali?: string | null
          provincia?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      property_admins: {
        Row: {
          bic_swift: string | null
          cellulare_urgenze: string | null
          codice_fiscale: string | null
          created_at: string
          email: string | null
          email_pec: string | null
          iban_pagamento: string | null
          id: string
          intestatario_conto: string | null
          nome_banca: string | null
          nome_referente: string | null
          note: string | null
          numero_rea: string | null
          partita_iva: string | null
          property_id: string
          ragione_sociale: string | null
          sede_legale_cap: string | null
          sede_legale_citta: string | null
          sede_legale_indirizzo: string | null
          sede_legale_provincia: string | null
          sede_operativa_cap: string | null
          sede_operativa_citta: string | null
          sede_operativa_indirizzo: string | null
          sede_operativa_provincia: string | null
          telefono_studio: string | null
          updated_at: string
        }
        Insert: {
          bic_swift?: string | null
          cellulare_urgenze?: string | null
          codice_fiscale?: string | null
          created_at?: string
          email?: string | null
          email_pec?: string | null
          iban_pagamento?: string | null
          id?: string
          intestatario_conto?: string | null
          nome_banca?: string | null
          nome_referente?: string | null
          note?: string | null
          numero_rea?: string | null
          partita_iva?: string | null
          property_id: string
          ragione_sociale?: string | null
          sede_legale_cap?: string | null
          sede_legale_citta?: string | null
          sede_legale_indirizzo?: string | null
          sede_legale_provincia?: string | null
          sede_operativa_cap?: string | null
          sede_operativa_citta?: string | null
          sede_operativa_indirizzo?: string | null
          sede_operativa_provincia?: string | null
          telefono_studio?: string | null
          updated_at?: string
        }
        Update: {
          bic_swift?: string | null
          cellulare_urgenze?: string | null
          codice_fiscale?: string | null
          created_at?: string
          email?: string | null
          email_pec?: string | null
          iban_pagamento?: string | null
          id?: string
          intestatario_conto?: string | null
          nome_banca?: string | null
          nome_referente?: string | null
          note?: string | null
          numero_rea?: string | null
          partita_iva?: string | null
          property_id?: string
          ragione_sociale?: string | null
          sede_legale_cap?: string | null
          sede_legale_citta?: string | null
          sede_legale_indirizzo?: string | null
          sede_legale_provincia?: string | null
          sede_operativa_cap?: string | null
          sede_operativa_citta?: string | null
          sede_operativa_indirizzo?: string | null
          sede_operativa_provincia?: string | null
          telefono_studio?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_admins_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      reminders: {
        Row: {
          completata: boolean | null
          created_at: string
          data_completamento: string | null
          data_scadenza: string
          descrizione: string | null
          frequenza_mesi: number | null
          giorni_anticipo_promemoria: number | null
          id: string
          lease_id: string | null
          note: string | null
          property_id: string | null
          reminder_padre_id: string | null
          ricorrente: boolean | null
          tipo: Database["public"]["Enums"]["tipo_reminder"]
          titolo: string
          unit_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          completata?: boolean | null
          created_at?: string
          data_completamento?: string | null
          data_scadenza: string
          descrizione?: string | null
          frequenza_mesi?: number | null
          giorni_anticipo_promemoria?: number | null
          id?: string
          lease_id?: string | null
          note?: string | null
          property_id?: string | null
          reminder_padre_id?: string | null
          ricorrente?: boolean | null
          tipo?: Database["public"]["Enums"]["tipo_reminder"]
          titolo: string
          unit_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          completata?: boolean | null
          created_at?: string
          data_completamento?: string | null
          data_scadenza?: string
          descrizione?: string | null
          frequenza_mesi?: number | null
          giorni_anticipo_promemoria?: number | null
          id?: string
          lease_id?: string | null
          note?: string | null
          property_id?: string | null
          reminder_padre_id?: string | null
          ricorrente?: boolean | null
          tipo?: Database["public"]["Enums"]["tipo_reminder"]
          titolo?: string
          unit_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reminders_lease_id_fkey"
            columns: ["lease_id"]
            isOneToOne: false
            referencedRelation: "leases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reminders_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reminders_reminder_padre_id_fkey"
            columns: ["reminder_padre_id"]
            isOneToOne: false
            referencedRelation: "reminders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reminders_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      tax_parameters: {
        Row: {
          aliquota_per_mille: number
          anno_riferimento: number
          comune: string
          created_at: string
          detrazioni_euro: number | null
          id: string
          note: string | null
          percentuale_possesso: number
          tipo_imposta: string
          unit_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          aliquota_per_mille?: number
          anno_riferimento: number
          comune: string
          created_at?: string
          detrazioni_euro?: number | null
          id?: string
          note?: string | null
          percentuale_possesso?: number
          tipo_imposta?: string
          unit_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          aliquota_per_mille?: number
          anno_riferimento?: number
          comune?: string
          created_at?: string
          detrazioni_euro?: number | null
          id?: string
          note?: string | null
          percentuale_possesso?: number
          tipo_imposta?: string
          unit_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tax_parameters_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          cap_residenza: string | null
          citta_residenza: string | null
          codice_fiscale: string | null
          cognome: string | null
          created_at: string
          email: string | null
          iban: string | null
          id: string
          indirizzo_residenza: string | null
          nome: string | null
          note: string | null
          partita_iva: string | null
          provincia_residenza: string | null
          ragione_sociale: string | null
          telefono: string | null
          tipo_soggetto: Database["public"]["Enums"]["tipo_soggetto"]
          updated_at: string
          user_id: string
        }
        Insert: {
          cap_residenza?: string | null
          citta_residenza?: string | null
          codice_fiscale?: string | null
          cognome?: string | null
          created_at?: string
          email?: string | null
          iban?: string | null
          id?: string
          indirizzo_residenza?: string | null
          nome?: string | null
          note?: string | null
          partita_iva?: string | null
          provincia_residenza?: string | null
          ragione_sociale?: string | null
          telefono?: string | null
          tipo_soggetto?: Database["public"]["Enums"]["tipo_soggetto"]
          updated_at?: string
          user_id: string
        }
        Update: {
          cap_residenza?: string | null
          citta_residenza?: string | null
          codice_fiscale?: string | null
          cognome?: string | null
          created_at?: string
          email?: string | null
          iban?: string | null
          id?: string
          indirizzo_residenza?: string | null
          nome?: string | null
          note?: string | null
          partita_iva?: string | null
          provincia_residenza?: string | null
          ragione_sociale?: string | null
          telefono?: string | null
          tipo_soggetto?: Database["public"]["Enums"]["tipo_soggetto"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      unit_inventories: {
        Row: {
          cadastral_unit_id: string | null
          created_at: string
          data_inserimento: string
          descrizione: string | null
          id: string
          nome_bene: string
          note: string | null
          quantita: number
          stato: string | null
          unit_id: string
          updated_at: string
        }
        Insert: {
          cadastral_unit_id?: string | null
          created_at?: string
          data_inserimento?: string
          descrizione?: string | null
          id?: string
          nome_bene: string
          note?: string | null
          quantita?: number
          stato?: string | null
          unit_id: string
          updated_at?: string
        }
        Update: {
          cadastral_unit_id?: string | null
          created_at?: string
          data_inserimento?: string
          descrizione?: string | null
          id?: string
          nome_bene?: string
          note?: string | null
          quantita?: number
          stato?: string | null
          unit_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "unit_inventories_cadastral_unit_id_fkey"
            columns: ["cadastral_unit_id"]
            isOneToOne: false
            referencedRelation: "cadastral_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unit_inventories_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      units: {
        Row: {
          attiva: boolean | null
          created_at: string
          destinazione_uso: string | null
          id: string
          interno: string | null
          metratura_mq: number | null
          nome_interno: string
          note: string | null
          piano: string | null
          property_id: string
          scala: string | null
          tipo_unita: Database["public"]["Enums"]["tipo_unita"]
          updated_at: string
          valore_immobile_stimato: number | null
        }
        Insert: {
          attiva?: boolean | null
          created_at?: string
          destinazione_uso?: string | null
          id?: string
          interno?: string | null
          metratura_mq?: number | null
          nome_interno: string
          note?: string | null
          piano?: string | null
          property_id: string
          scala?: string | null
          tipo_unita?: Database["public"]["Enums"]["tipo_unita"]
          updated_at?: string
          valore_immobile_stimato?: number | null
        }
        Update: {
          attiva?: boolean | null
          created_at?: string
          destinazione_uso?: string | null
          id?: string
          interno?: string | null
          metratura_mq?: number | null
          nome_interno?: string
          note?: string | null
          piano?: string | null
          property_id?: string
          scala?: string | null
          tipo_unita?: Database["public"]["Enums"]["tipo_unita"]
          updated_at?: string
          valore_immobile_stimato?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "units_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      canale_messaggio: "EMAIL" | "SMS"
      categoria_spesa:
        | "MANUTENZIONE"
        | "STRAORDINARIA"
        | "CONDOMINIALE"
        | "FISCALE_ALTRO"
        | "ASSICURATIVA"
        | "ALTRO"
      esito_messaggio: "INVIATO" | "ERRORE"
      regime_locativo: "cedolare_21" | "cedolare_10" | "ordinario_irpef"
      ruolo_contrattuale: "intestatario" | "co_intestatario" | "garante"
      stato_contratto:
        | "in_preparazione"
        | "attivo"
        | "cessato"
        | "rinnovato"
        | "contenzioso"
      stato_deposito:
        | "non_versato"
        | "versato"
        | "parzialmente_restituito"
        | "restituito"
      stato_pagamento: "ATTESO" | "PARZIALE" | "PAGATO" | "IN_RITARDO"
      stato_rata: "DA_PAGARE" | "PAGATA" | "SCADUTA" | "FUTURA"
      tipo_catastale: "principale" | "pertinenza"
      tipo_contratto:
        | "4+4_abitativo"
        | "3+2_agevolato"
        | "transitorio"
        | "commerciale_6+6"
        | "uso_foresteria"
        | "altro"
      tipo_imposta: "IMU" | "CEDOLARE_SECCA" | "TARI" | "ALTRO"
      tipo_polizza:
        | "fabbricato"
        | "rc_proprietario"
        | "incendio"
        | "furto"
        | "all_risks"
        | "altro"
      tipo_reminder:
        | "MANUTENZIONE"
        | "FISCALE"
        | "CONTRATTUALE"
        | "ASSICURATIVO"
        | "ALTRO"
      tipo_soggetto: "persona_fisica" | "persona_giuridica"
      tipo_unita:
        | "appartamento"
        | "locale_commerciale"
        | "box"
        | "cantina"
        | "posto_auto"
        | "altro"
      uso_conto: "rate_condominiali" | "affitti" | "altro"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      canale_messaggio: ["EMAIL", "SMS"],
      categoria_spesa: [
        "MANUTENZIONE",
        "STRAORDINARIA",
        "CONDOMINIALE",
        "FISCALE_ALTRO",
        "ASSICURATIVA",
        "ALTRO",
      ],
      esito_messaggio: ["INVIATO", "ERRORE"],
      regime_locativo: ["cedolare_21", "cedolare_10", "ordinario_irpef"],
      ruolo_contrattuale: ["intestatario", "co_intestatario", "garante"],
      stato_contratto: [
        "in_preparazione",
        "attivo",
        "cessato",
        "rinnovato",
        "contenzioso",
      ],
      stato_deposito: [
        "non_versato",
        "versato",
        "parzialmente_restituito",
        "restituito",
      ],
      stato_pagamento: ["ATTESO", "PARZIALE", "PAGATO", "IN_RITARDO"],
      stato_rata: ["DA_PAGARE", "PAGATA", "SCADUTA", "FUTURA"],
      tipo_catastale: ["principale", "pertinenza"],
      tipo_contratto: [
        "4+4_abitativo",
        "3+2_agevolato",
        "transitorio",
        "commerciale_6+6",
        "uso_foresteria",
        "altro",
      ],
      tipo_imposta: ["IMU", "CEDOLARE_SECCA", "TARI", "ALTRO"],
      tipo_polizza: [
        "fabbricato",
        "rc_proprietario",
        "incendio",
        "furto",
        "all_risks",
        "altro",
      ],
      tipo_reminder: [
        "MANUTENZIONE",
        "FISCALE",
        "CONTRATTUALE",
        "ASSICURATIVO",
        "ALTRO",
      ],
      tipo_soggetto: ["persona_fisica", "persona_giuridica"],
      tipo_unita: [
        "appartamento",
        "locale_commerciale",
        "box",
        "cantina",
        "posto_auto",
        "altro",
      ],
      uso_conto: ["rate_condominiali", "affitti", "altro"],
    },
  },
} as const
