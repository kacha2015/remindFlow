-- Add minute-based recurrence intervals (5/10/15/30 min).
-- El CHECK original (001_initial_schema.sql) sólo permitía
-- ('none','daily','weekly','monthly'), ni siquiera 'hourly'.
-- Acá se reemplaza por la lista completa.

-- Elimina cualquier CHECK previo sobre `recurrence`, sin importar su nombre
-- (por si en producción se recreó a mano para admitir 'hourly').
DO $$
DECLARE c RECORD;
BEGIN
  FOR c IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace ns ON ns.oid = rel.relnamespace
    WHERE ns.nspname = 'public'
      AND rel.relname = 'reminders'
      AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) ILIKE '%recurrence%'
  LOOP
    EXECUTE format('ALTER TABLE public.reminders DROP CONSTRAINT %I', c.conname);
  END LOOP;
END $$;

ALTER TABLE public.reminders ADD CONSTRAINT reminders_recurrence_check
  CHECK (recurrence IN (
    'none',
    'every_5_min',
    'every_10_min',
    'every_15_min',
    'every_30_min',
    'hourly',
    'daily',
    'weekly',
    'monthly'
  ));
