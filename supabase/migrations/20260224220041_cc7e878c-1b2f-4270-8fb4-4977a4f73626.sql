
-- Add govt_contribution, client_contribution, and status columns to transactions
ALTER TABLE public.transactions 
  ADD COLUMN IF NOT EXISTS govt_contribution numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS client_contribution numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'new';

-- Allow users to update their own transactions (for status changes)
CREATE POLICY "Users can update own transactions"
  ON public.transactions
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
