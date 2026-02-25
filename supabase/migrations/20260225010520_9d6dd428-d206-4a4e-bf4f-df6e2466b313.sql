
ALTER TABLE public.transactions
ADD COLUMN rate_units text DEFAULT NULL,
ADD COLUMN unit_cost numeric DEFAULT NULL;
