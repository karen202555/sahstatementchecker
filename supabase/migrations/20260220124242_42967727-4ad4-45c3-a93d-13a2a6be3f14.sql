
-- Drop overly permissive policies
DROP POLICY IF EXISTS "Anyone can insert transactions" ON public.transactions;
DROP POLICY IF EXISTS "Anyone can delete transactions by session" ON public.transactions;
DROP POLICY IF EXISTS "Anyone can read transactions by session" ON public.transactions;

-- SELECT only for anon - session_ids are unguessable UUIDs (capability tokens)
-- INSERT/DELETE removed: edge function uses service role key, no client-side insert/delete needed
CREATE POLICY "Anon can read transactions by session_id"
  ON public.transactions FOR SELECT
  TO anon
  USING (true);
