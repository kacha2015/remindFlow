-- Rango de fechas para reminders recurrentes.
-- reminder_date = inicio del rango, end_date = último día en el que puede dispararse.
-- end_date NULL => recurrencia indefinida (comportamiento previo).
ALTER TABLE public.reminders
  ADD COLUMN IF NOT EXISTS end_date DATE;

-- El rango no puede terminar antes de empezar.
ALTER TABLE public.reminders
  DROP CONSTRAINT IF EXISTS reminders_end_date_after_start;

ALTER TABLE public.reminders
  ADD CONSTRAINT reminders_end_date_after_start
  CHECK (end_date IS NULL OR end_date >= reminder_date);

CREATE INDEX IF NOT EXISTS idx_reminders_end_date ON public.reminders(end_date);
