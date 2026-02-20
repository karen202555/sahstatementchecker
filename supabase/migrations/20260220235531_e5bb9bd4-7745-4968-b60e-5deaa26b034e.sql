
-- Drop all existing restrictive policies (they don't work properly without permissive ones)
DROP POLICY IF EXISTS "Anon can read by session_id" ON public.transactions;
DROP POLICY IF EXISTS "Users can read own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can delete own transactions" ON public.transactions;

-- Create proper PERMISSIVE policies
CREATE POLICY "Users can read own transactions"
  ON public.transactions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own transactions"
  ON public.transactions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
