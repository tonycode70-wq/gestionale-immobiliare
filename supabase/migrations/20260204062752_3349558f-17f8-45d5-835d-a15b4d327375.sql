-- ================================================
-- PropertyManager Complete Schema Extension
-- Adding: Expenses, Cadastral Units, Notifications
-- ================================================

-- 1. EXTRA EXPENSES TABLE
CREATE TABLE IF NOT EXISTS public.extra_expenses (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    property_id uuid REFERENCES public.properties(id) ON DELETE CASCADE,
    unit_id uuid REFERENCES public.units(id) ON DELETE CASCADE,
    lease_id uuid REFERENCES public.leases(id) ON DELETE SET NULL,
    categoria TEXT NOT NULL DEFAULT 'ALTRO',
    descrizione TEXT NOT NULL,
    importo_previsto NUMERIC NOT NULL DEFAULT 0,
    importo_effettivo NUMERIC NOT NULL DEFAULT 0,
    data_competenza DATE NOT NULL,
    data_pagamento DATE,
    fornitore TEXT,
    deducibile_fiscalmente BOOLEAN DEFAULT false,
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS for extra_expenses
ALTER TABLE public.extra_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own expenses"
    ON public.extra_expenses FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own expenses"
    ON public.extra_expenses FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own expenses"
    ON public.extra_expenses FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own expenses"
    ON public.extra_expenses FOR DELETE
    USING (auth.uid() = user_id);

-- 2. CADASTRAL UNITS TABLE
CREATE TABLE IF NOT EXISTS public.cadastral_units (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    unit_id uuid NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
    tipo_unita TEXT NOT NULL DEFAULT 'principale',
    categoria_catastale TEXT NOT NULL,
    rendita_euro NUMERIC NOT NULL DEFAULT 0,
    metratura_mq NUMERIC,
    sezione_urbana TEXT,
    foglio TEXT NOT NULL,
    particella TEXT NOT NULL,
    subalterno TEXT NOT NULL,
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS for cadastral_units (via units -> properties)
ALTER TABLE public.cadastral_units ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view cadastral_units of own units"
    ON public.cadastral_units FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.units u
        JOIN public.properties p ON p.id = u.property_id
        WHERE u.id = cadastral_units.unit_id AND p.user_id = auth.uid()
    ));

CREATE POLICY "Users can insert cadastral_units on own units"
    ON public.cadastral_units FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.units u
        JOIN public.properties p ON p.id = u.property_id
        WHERE u.id = cadastral_units.unit_id AND p.user_id = auth.uid()
    ));

CREATE POLICY "Users can update cadastral_units on own units"
    ON public.cadastral_units FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM public.units u
        JOIN public.properties p ON p.id = u.property_id
        WHERE u.id = cadastral_units.unit_id AND p.user_id = auth.uid()
    ));

CREATE POLICY "Users can delete cadastral_units on own units"
    ON public.cadastral_units FOR DELETE
    USING (EXISTS (
        SELECT 1 FROM public.units u
        JOIN public.properties p ON p.id = u.property_id
        WHERE u.id = cadastral_units.unit_id AND p.user_id = auth.uid()
    ));

-- 3. NOTIFICATIONS TABLE (for in-app notifications)
CREATE TABLE IF NOT EXISTS public.notifications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    tipo TEXT NOT NULL DEFAULT 'INFO',
    titolo TEXT NOT NULL,
    messaggio TEXT,
    letta BOOLEAN NOT NULL DEFAULT false,
    data_lettura TIMESTAMP WITH TIME ZONE,
    riferimento_tipo TEXT,
    riferimento_id uuid,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS for notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
    ON public.notifications FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notifications"
    ON public.notifications FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
    ON public.notifications FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own notifications"
    ON public.notifications FOR DELETE
    USING (auth.uid() = user_id);

-- 4. TAX PARAMETERS TABLE
CREATE TABLE IF NOT EXISTS public.tax_parameters (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    unit_id uuid REFERENCES public.units(id) ON DELETE CASCADE,
    anno_riferimento INTEGER NOT NULL,
    comune TEXT NOT NULL,
    tipo_imposta TEXT NOT NULL DEFAULT 'IMU',
    aliquota_per_mille NUMERIC NOT NULL DEFAULT 10.6,
    percentuale_possesso NUMERIC NOT NULL DEFAULT 100,
    detrazioni_euro NUMERIC DEFAULT 0,
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(unit_id, anno_riferimento, tipo_imposta)
);

-- RLS for tax_parameters
ALTER TABLE public.tax_parameters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tax_parameters"
    ON public.tax_parameters FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tax_parameters"
    ON public.tax_parameters FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tax_parameters"
    ON public.tax_parameters FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own tax_parameters"
    ON public.tax_parameters FOR DELETE
    USING (auth.uid() = user_id);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_extra_expenses_user ON public.extra_expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_extra_expenses_unit ON public.extra_expenses(unit_id);
CREATE INDEX IF NOT EXISTS idx_extra_expenses_date ON public.extra_expenses(data_competenza);
CREATE INDEX IF NOT EXISTS idx_cadastral_units_unit ON public.cadastral_units(unit_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.notifications(user_id, letta);
CREATE INDEX IF NOT EXISTS idx_tax_parameters_user ON public.tax_parameters(user_id);
CREATE INDEX IF NOT EXISTS idx_tax_parameters_unit_year ON public.tax_parameters(unit_id, anno_riferimento);