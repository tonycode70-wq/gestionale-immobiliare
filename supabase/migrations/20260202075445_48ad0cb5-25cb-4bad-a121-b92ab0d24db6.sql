-- Create enum types
CREATE TYPE public.tipo_soggetto AS ENUM ('persona_fisica', 'persona_giuridica');
CREATE TYPE public.tipo_unita AS ENUM ('appartamento', 'locale_commerciale', 'box', 'cantina', 'posto_auto', 'altro');
CREATE TYPE public.tipo_contratto AS ENUM ('4+4_abitativo', '3+2_agevolato', 'transitorio', 'commerciale_6+6', 'uso_foresteria', 'altro');
CREATE TYPE public.regime_locativo AS ENUM ('cedolare_21', 'cedolare_10', 'ordinario_irpef');
CREATE TYPE public.stato_deposito AS ENUM ('non_versato', 'versato', 'parzialmente_restituito', 'restituito');
CREATE TYPE public.stato_contratto AS ENUM ('in_preparazione', 'attivo', 'cessato', 'rinnovato', 'contenzioso');
CREATE TYPE public.stato_pagamento AS ENUM ('ATTESO', 'PARZIALE', 'PAGATO', 'IN_RITARDO');
CREATE TYPE public.ruolo_contrattuale AS ENUM ('intestatario', 'co_intestatario', 'garante');
CREATE TYPE public.tipo_reminder AS ENUM ('MANUTENZIONE', 'FISCALE', 'CONTRATTUALE', 'ASSICURATIVO', 'ALTRO');
CREATE TYPE public.tipo_imposta AS ENUM ('IMU', 'CEDOLARE_SECCA', 'TARI', 'ALTRO');
CREATE TYPE public.stato_rata AS ENUM ('DA_PAGARE', 'PAGATA', 'SCADUTA', 'FUTURA');
CREATE TYPE public.categoria_spesa AS ENUM ('MANUTENZIONE', 'STRAORDINARIA', 'CONDOMINIALE', 'FISCALE_ALTRO', 'ASSICURATIVA', 'ALTRO');
CREATE TYPE public.canale_messaggio AS ENUM ('EMAIL', 'SMS');
CREATE TYPE public.esito_messaggio AS ENUM ('INVIATO', 'ERRORE');
CREATE TYPE public.tipo_polizza AS ENUM ('fabbricato', 'rc_proprietario', 'incendio', 'furto', 'all_risks', 'altro');
CREATE TYPE public.uso_conto AS ENUM ('rate_condominiali', 'affitti', 'altro');
CREATE TYPE public.tipo_catastale AS ENUM ('principale', 'pertinenza');

-- Profiles table for user data
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  nome TEXT,
  cognome TEXT,
  telefono TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Properties (immobili/condomini)
CREATE TABLE public.properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  nome_complesso TEXT NOT NULL,
  indirizzo_via TEXT,
  indirizzo_civico TEXT,
  cap TEXT,
  citta TEXT,
  provincia TEXT,
  codice_fiscale_ente TEXT,
  note_generali TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Units (unità immobiliari)
CREATE TABLE public.units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE NOT NULL,
  tipo_unita public.tipo_unita NOT NULL DEFAULT 'appartamento',
  nome_interno TEXT NOT NULL,
  piano TEXT,
  interno TEXT,
  scala TEXT,
  metratura_mq DECIMAL(10,2),
  destinazione_uso TEXT,
  attiva BOOLEAN DEFAULT true,
  valore_immobile_stimato DECIMAL(12,2),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tenants (conduttori)
CREATE TABLE public.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  tipo_soggetto public.tipo_soggetto NOT NULL DEFAULT 'persona_fisica',
  nome TEXT,
  cognome TEXT,
  ragione_sociale TEXT,
  codice_fiscale TEXT,
  partita_iva TEXT,
  indirizzo_residenza TEXT,
  cap_residenza TEXT,
  citta_residenza TEXT,
  provincia_residenza TEXT,
  email TEXT,
  telefono TEXT,
  iban TEXT,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Leases (contratti)
CREATE TABLE public.leases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID REFERENCES public.units(id) ON DELETE CASCADE NOT NULL,
  codice_contratto_interno TEXT,
  tipo_contratto public.tipo_contratto NOT NULL DEFAULT '4+4_abitativo',
  regime_locativo public.regime_locativo NOT NULL DEFAULT 'cedolare_21',
  data_inizio DATE NOT NULL,
  data_fine DATE NOT NULL,
  durata_mesi INTEGER,
  canone_mensile DECIMAL(12,2) NOT NULL,
  spese_condominiali_mensili_previste DECIMAL(12,2) DEFAULT 0,
  altre_spese_mensili_previste DECIMAL(12,2) DEFAULT 0,
  deposito_cauzionale_importo DECIMAL(12,2) DEFAULT 0,
  deposito_cauzionale_mesi INTEGER DEFAULT 0,
  deposito_stato public.stato_deposito DEFAULT 'non_versato',
  data_versamento_deposito DATE,
  data_restituzione_deposito DATE,
  modalita_pagamento TEXT DEFAULT 'bonifico',
  iban_pagamento TEXT,
  stato_contratto public.stato_contratto DEFAULT 'in_preparazione',
  primo_anno_locazione BOOLEAN DEFAULT true,
  estremi_registrazione TEXT,
  modello_rli_protocollo TEXT,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Lease parties (parti contrattuali)
CREATE TABLE public.lease_parties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lease_id UUID REFERENCES public.leases(id) ON DELETE CASCADE NOT NULL,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  ruolo public.ruolo_contrattuale NOT NULL DEFAULT 'intestatario',
  quota_canone_percentuale DECIMAL(5,2),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Payments (pagamenti canoni)
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lease_id UUID REFERENCES public.leases(id) ON DELETE CASCADE NOT NULL,
  competenza_anno INTEGER NOT NULL,
  competenza_mese INTEGER NOT NULL CHECK (competenza_mese >= 1 AND competenza_mese <= 12),
  importo_canone_previsto DECIMAL(12,2) NOT NULL,
  importo_spese_previste DECIMAL(12,2) DEFAULT 0,
  importo_totale_previsto DECIMAL(12,2) NOT NULL,
  data_scadenza DATE NOT NULL,
  data_pagamento DATE,
  importo_canone_pagato DECIMAL(12,2) DEFAULT 0,
  importo_spese_pagato DECIMAL(12,2) DEFAULT 0,
  importo_residuo_calcolato DECIMAL(12,2),
  stato_pagamento public.stato_pagamento DEFAULT 'ATTESO',
  metodo_pagamento_effettivo TEXT,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Property admins (amministratori)
CREATE TABLE public.property_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE NOT NULL,
  ragione_sociale TEXT,
  nome_referente TEXT,
  telefono_studio TEXT,
  cellulare_urgenze TEXT,
  email TEXT,
  email_pec TEXT,
  codice_fiscale TEXT,
  partita_iva TEXT,
  numero_rea TEXT,
  sede_legale_indirizzo TEXT,
  sede_legale_citta TEXT,
  sede_legale_cap TEXT,
  sede_legale_provincia TEXT,
  sede_operativa_indirizzo TEXT,
  sede_operativa_citta TEXT,
  sede_operativa_cap TEXT,
  sede_operativa_provincia TEXT,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Reminders (scadenze)
CREATE TABLE public.reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  unit_id UUID REFERENCES public.units(id) ON DELETE SET NULL,
  lease_id UUID REFERENCES public.leases(id) ON DELETE SET NULL,
  tipo public.tipo_reminder NOT NULL DEFAULT 'ALTRO',
  titolo TEXT NOT NULL,
  descrizione TEXT,
  data_scadenza DATE NOT NULL,
  completata BOOLEAN DEFAULT false,
  data_completamento DATE,
  ricorrente BOOLEAN DEFAULT false,
  frequenza_mesi INTEGER,
  giorni_anticipo_promemoria INTEGER DEFAULT 7,
  reminder_padre_id UUID REFERENCES public.reminders(id) ON DELETE SET NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Message templates
CREATE TABLE public.message_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  nome_template TEXT NOT NULL,
  canale public.canale_messaggio NOT NULL DEFAULT 'EMAIL',
  oggetto_email TEXT,
  corpo_testo TEXT NOT NULL,
  attivo BOOLEAN DEFAULT true,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Messages sent log
CREATE TABLE public.messages_sent (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  lease_id UUID REFERENCES public.leases(id) ON DELETE SET NULL,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
  reminder_id UUID REFERENCES public.reminders(id) ON DELETE SET NULL,
  canale public.canale_messaggio NOT NULL,
  destinatario TEXT NOT NULL,
  oggetto TEXT,
  corpo_inviato TEXT NOT NULL,
  inviato_il TIMESTAMPTZ NOT NULL DEFAULT now(),
  esito public.esito_messaggio NOT NULL DEFAULT 'INVIATO',
  dettaglio_esito TEXT,
  note TEXT
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lease_parties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages_sent ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for properties
CREATE POLICY "Users can view own properties" ON public.properties FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own properties" ON public.properties FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own properties" ON public.properties FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own properties" ON public.properties FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for units (via property owner)
CREATE POLICY "Users can view units of own properties" ON public.units FOR SELECT 
  USING (EXISTS (SELECT 1 FROM public.properties WHERE properties.id = units.property_id AND properties.user_id = auth.uid()));
CREATE POLICY "Users can insert units on own properties" ON public.units FOR INSERT 
  WITH CHECK (EXISTS (SELECT 1 FROM public.properties WHERE properties.id = units.property_id AND properties.user_id = auth.uid()));
CREATE POLICY "Users can update units on own properties" ON public.units FOR UPDATE 
  USING (EXISTS (SELECT 1 FROM public.properties WHERE properties.id = units.property_id AND properties.user_id = auth.uid()));
CREATE POLICY "Users can delete units on own properties" ON public.units FOR DELETE 
  USING (EXISTS (SELECT 1 FROM public.properties WHERE properties.id = units.property_id AND properties.user_id = auth.uid()));

-- RLS Policies for tenants
CREATE POLICY "Users can view own tenants" ON public.tenants FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own tenants" ON public.tenants FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own tenants" ON public.tenants FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own tenants" ON public.tenants FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for leases (via unit->property owner)
CREATE POLICY "Users can view leases of own units" ON public.leases FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM public.units u 
    JOIN public.properties p ON p.id = u.property_id 
    WHERE u.id = leases.unit_id AND p.user_id = auth.uid()
  ));
CREATE POLICY "Users can insert leases on own units" ON public.leases FOR INSERT 
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.units u 
    JOIN public.properties p ON p.id = u.property_id 
    WHERE u.id = leases.unit_id AND p.user_id = auth.uid()
  ));
CREATE POLICY "Users can update leases on own units" ON public.leases FOR UPDATE 
  USING (EXISTS (
    SELECT 1 FROM public.units u 
    JOIN public.properties p ON p.id = u.property_id 
    WHERE u.id = leases.unit_id AND p.user_id = auth.uid()
  ));
CREATE POLICY "Users can delete leases on own units" ON public.leases FOR DELETE 
  USING (EXISTS (
    SELECT 1 FROM public.units u 
    JOIN public.properties p ON p.id = u.property_id 
    WHERE u.id = leases.unit_id AND p.user_id = auth.uid()
  ));

-- RLS Policies for lease_parties
CREATE POLICY "Users can view lease_parties of own leases" ON public.lease_parties FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM public.leases l
    JOIN public.units u ON u.id = l.unit_id
    JOIN public.properties p ON p.id = u.property_id
    WHERE l.id = lease_parties.lease_id AND p.user_id = auth.uid()
  ));
CREATE POLICY "Users can insert lease_parties on own leases" ON public.lease_parties FOR INSERT 
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.leases l
    JOIN public.units u ON u.id = l.unit_id
    JOIN public.properties p ON p.id = u.property_id
    WHERE l.id = lease_parties.lease_id AND p.user_id = auth.uid()
  ));
CREATE POLICY "Users can update lease_parties on own leases" ON public.lease_parties FOR UPDATE 
  USING (EXISTS (
    SELECT 1 FROM public.leases l
    JOIN public.units u ON u.id = l.unit_id
    JOIN public.properties p ON p.id = u.property_id
    WHERE l.id = lease_parties.lease_id AND p.user_id = auth.uid()
  ));
CREATE POLICY "Users can delete lease_parties on own leases" ON public.lease_parties FOR DELETE 
  USING (EXISTS (
    SELECT 1 FROM public.leases l
    JOIN public.units u ON u.id = l.unit_id
    JOIN public.properties p ON p.id = u.property_id
    WHERE l.id = lease_parties.lease_id AND p.user_id = auth.uid()
  ));

-- RLS Policies for payments
CREATE POLICY "Users can view payments of own leases" ON public.payments FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM public.leases l
    JOIN public.units u ON u.id = l.unit_id
    JOIN public.properties p ON p.id = u.property_id
    WHERE l.id = payments.lease_id AND p.user_id = auth.uid()
  ));
CREATE POLICY "Users can insert payments on own leases" ON public.payments FOR INSERT 
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.leases l
    JOIN public.units u ON u.id = l.unit_id
    JOIN public.properties p ON p.id = u.property_id
    WHERE l.id = payments.lease_id AND p.user_id = auth.uid()
  ));
CREATE POLICY "Users can update payments on own leases" ON public.payments FOR UPDATE 
  USING (EXISTS (
    SELECT 1 FROM public.leases l
    JOIN public.units u ON u.id = l.unit_id
    JOIN public.properties p ON p.id = u.property_id
    WHERE l.id = payments.lease_id AND p.user_id = auth.uid()
  ));
CREATE POLICY "Users can delete payments on own leases" ON public.payments FOR DELETE 
  USING (EXISTS (
    SELECT 1 FROM public.leases l
    JOIN public.units u ON u.id = l.unit_id
    JOIN public.properties p ON p.id = u.property_id
    WHERE l.id = payments.lease_id AND p.user_id = auth.uid()
  ));

-- RLS Policies for property_admins
CREATE POLICY "Users can view admins of own properties" ON public.property_admins FOR SELECT 
  USING (EXISTS (SELECT 1 FROM public.properties WHERE properties.id = property_admins.property_id AND properties.user_id = auth.uid()));
CREATE POLICY "Users can insert admins on own properties" ON public.property_admins FOR INSERT 
  WITH CHECK (EXISTS (SELECT 1 FROM public.properties WHERE properties.id = property_admins.property_id AND properties.user_id = auth.uid()));
CREATE POLICY "Users can update admins on own properties" ON public.property_admins FOR UPDATE 
  USING (EXISTS (SELECT 1 FROM public.properties WHERE properties.id = property_admins.property_id AND properties.user_id = auth.uid()));
CREATE POLICY "Users can delete admins on own properties" ON public.property_admins FOR DELETE 
  USING (EXISTS (SELECT 1 FROM public.properties WHERE properties.id = property_admins.property_id AND properties.user_id = auth.uid()));

-- RLS Policies for reminders
CREATE POLICY "Users can view own reminders" ON public.reminders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own reminders" ON public.reminders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own reminders" ON public.reminders FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own reminders" ON public.reminders FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for message_templates
CREATE POLICY "Users can view own templates" ON public.message_templates FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own templates" ON public.message_templates FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own templates" ON public.message_templates FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own templates" ON public.message_templates FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for messages_sent
CREATE POLICY "Users can view own sent messages" ON public.messages_sent FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own sent messages" ON public.messages_sent FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create function to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for auto profile creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create indexes for performance
CREATE INDEX idx_properties_user_id ON public.properties(user_id);
CREATE INDEX idx_units_property_id ON public.units(property_id);
CREATE INDEX idx_tenants_user_id ON public.tenants(user_id);
CREATE INDEX idx_leases_unit_id ON public.leases(unit_id);
CREATE INDEX idx_lease_parties_lease_id ON public.lease_parties(lease_id);
CREATE INDEX idx_payments_lease_id ON public.payments(lease_id);
CREATE INDEX idx_payments_competenza ON public.payments(competenza_anno, competenza_mese);
CREATE INDEX idx_reminders_user_id ON public.reminders(user_id);
CREATE INDEX idx_reminders_data_scadenza ON public.reminders(data_scadenza);
CREATE INDEX idx_messages_sent_user_id ON public.messages_sent(user_id);