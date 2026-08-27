-- Hora de corte del rango. El rango termina en end_date + end_time (inclusive).
-- end_time NULL => vale todo el día de end_date.
-- Sólo tiene sentido junto a end_date.
ALTER TABLE public.reminders
  ADD COLUMN IF NOT EXISTS end_time TIME;

ALTER TABLE public.reminders
  DROP CONSTRAINT IF EXISTS reminders_end_time_needs_end_date;

ALTER TABLE public.reminders
  ADD CONSTRAINT reminders_end_time_needs_end_date
  CHECK (end_time IS NULL OR end_date IS NOT NULL);

-- Si el rango empieza y termina el mismo día, la hora de fin no puede ser anterior a la de inicio.
ALTER TABLE public.reminders
  DROP CONSTRAINT IF EXISTS reminders_end_time_after_start;

ALTER TABLE public.reminders
  ADD CONSTRAINT reminders_end_time_after_start
  CHECK (
    end_time IS NULL
    OR end_date <> reminder_date
    OR end_time >= reminder_time
  );
