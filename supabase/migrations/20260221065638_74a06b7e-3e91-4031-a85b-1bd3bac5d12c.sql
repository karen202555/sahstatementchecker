
-- Create beta feedback table
CREATE TABLE public.beta_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  rating TEXT NOT NULL CHECK (rating IN ('accurate', 'missed', 'incorrect')),
  comment TEXT,
  user_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.beta_feedback ENABLE ROW LEVEL SECURITY;

-- Anyone can submit feedback (even unauthenticated shared-link users)
CREATE POLICY "Anyone can insert feedback"
  ON public.beta_feedback
  FOR INSERT
  WITH CHECK (true);

-- Only authenticated users can view their own feedback
CREATE POLICY "Users can view own feedback"
  ON public.beta_feedback
  FOR SELECT
  USING (auth.uid() = user_id);
