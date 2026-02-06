-- Create inventory_rooms table for grouping inventory by room
CREATE TABLE IF NOT EXISTS public.inventory_rooms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  nome_ambiente TEXT NOT NULL,
  ordine_visualizzazione INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.inventory_rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Users can view rooms of own units"
ON public.inventory_rooms FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.units u
  JOIN public.properties p ON p.id = u.property_id
  WHERE u.id = inventory_rooms.unit_id AND p.user_id = auth.uid()
));

CREATE POLICY IF NOT EXISTS "Users can insert rooms on own units"
ON public.inventory_rooms FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.units u
  JOIN public.properties p ON p.id = u.property_id
  WHERE u.id = inventory_rooms.unit_id AND p.user_id = auth.uid()
));

CREATE POLICY IF NOT EXISTS "Users can update rooms on own units"
ON public.inventory_rooms FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM public.units u
  JOIN public.properties p ON p.id = u.property_id
  WHERE u.id = inventory_rooms.unit_id AND p.user_id = auth.uid()
));

CREATE POLICY IF NOT EXISTS "Users can delete rooms on own units"
ON public.inventory_rooms FOR DELETE
USING (EXISTS (
  SELECT 1 FROM public.units u
  JOIN public.properties p ON p.id = u.property_id
  WHERE u.id = inventory_rooms.unit_id AND p.user_id = auth.uid()
));

-- Add inventory_room_id to unit_inventories for per-room assignment
ALTER TABLE public.unit_inventories
ADD COLUMN IF NOT EXISTS inventory_room_id UUID REFERENCES public.inventory_rooms(id) ON DELETE SET NULL;
