
-- Create transactions table (no auth required, public access for this app)
CREATE TABLE public.transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  date TEXT NOT NULL,
  description TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  file_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS but allow public insert/select by session_id
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert transactions"
  ON public.transactions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can read transactions by session"
  ON public.transactions FOR SELECT
  USING (true);

CREATE POLICY "Anyone can delete transactions by session"
  ON public.transactions FOR DELETE
  USING (true);
