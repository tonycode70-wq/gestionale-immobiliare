-- Add banking fields to property_admins
ALTER TABLE public.property_admins
ADD COLUMN IF NOT EXISTS iban_pagamento text,
ADD COLUMN IF NOT EXISTS bic_swift text,
ADD COLUMN IF NOT EXISTS nome_banca text,
ADD COLUMN IF NOT EXISTS intestatario_conto text;

-- Create unit_inventories table for tracking items per unit/pertinenza
CREATE TABLE public.unit_inventories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  cadastral_unit_id UUID REFERENCES public.cadastral_units(id) ON DELETE SET NULL,
  nome_bene TEXT NOT NULL,
  descrizione TEXT,
  quantita INTEGER NOT NULL DEFAULT 1,
  stato TEXT DEFAULT 'buono',
  data_inserimento DATE NOT NULL DEFAULT CURRENT_DATE,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on unit_inventories
ALTER TABLE public.unit_inventories ENABLE ROW LEVEL SECURITY;

-- RLS policies for unit_inventories
CREATE POLICY "Users can view inventory of own units" 
ON public.unit_inventories 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM units u
  JOIN properties p ON p.id = u.property_id
  WHERE u.id = unit_inventories.unit_id AND p.user_id = auth.uid()
));

CREATE POLICY "Users can insert inventory on own units" 
ON public.unit_inventories 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM units u
  JOIN properties p ON p.id = u.property_id
  WHERE u.id = unit_inventories.unit_id AND p.user_id = auth.uid()
));

CREATE POLICY "Users can update inventory on own units" 
ON public.unit_inventories 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM units u
  JOIN properties p ON p.id = u.property_id
  WHERE u.id = unit_inventories.unit_id AND p.user_id = auth.uid()
));

CREATE POLICY "Users can delete inventory on own units" 
ON public.unit_inventories 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM units u
  JOIN properties p ON p.id = u.property_id
  WHERE u.id = unit_inventories.unit_id AND p.user_id = auth.uid()
));