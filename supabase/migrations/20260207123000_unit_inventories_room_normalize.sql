BEGIN;

UPDATE public.unit_inventories
SET room = NULL
WHERE room IS NOT NULL AND btrim(room) = '';

UPDATE public.unit_inventories
SET room = initcap(lower(regexp_replace(btrim(room), '\s+', ' ', 'g')))
WHERE room IS NOT NULL AND btrim(room) <> '';

COMMIT;
