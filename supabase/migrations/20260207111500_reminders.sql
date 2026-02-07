CREATE EXTENSION IF NOT EXISTS pgcrypto;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'tipo_reminder' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.tipo_reminder AS ENUM (
      'MANUTENZIONE',
      'FISCALE',
      'CONTRATTUALE',
      'ASSICURATIVO',
      'ALTRO'
    );
  END IF;
END $$;
CREATE TABLE IF NOT EXISTS public.reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  unit_id UUID REFERENCES public.units(id) ON DELETE SET NULL,
  lease_id UUID REFERENCES public.leases(id) ON DELETE SET NULL,
  tipo public.tipo_reminder NOT NULL,
  titolo TEXT NOT NULL,
  descrizione TEXT,
  data_scadenza DATE NOT NULL,
  completata BOOLEAN DEFAULT false,
  data_completamento DATE,
  ricorrente BOOLEAN DEFAULT false,
  frequenza_mesi INTEGER,
  giorni_anticipo_promemoria INTEGER,
  reminder_padre_id UUID REFERENCES public.reminders(id) ON DELETE SET NULL,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own reminders"
ON public.reminders FOR SELECT
USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own reminders"
ON public.reminders FOR INSERT
WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_reminders_user ON public.reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_reminders_date ON public.reminders(data_scadenza);
