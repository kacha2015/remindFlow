-- Agrega columna timezone a la tabla reminders
ALTER TABLE public.reminders
  ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'UTC';

-- Actualiza reminders existentes a UTC (seguro como default)
UPDATE public.reminders SET timezone = 'UTC' WHERE timezone IS NULL;
