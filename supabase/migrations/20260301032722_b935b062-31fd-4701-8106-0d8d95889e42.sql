
-- Create feedback_entries table
CREATE TABLE public.feedback_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  user_email TEXT,
  display_name TEXT,
  route TEXT,
  screen_title TEXT,
  app_key TEXT NOT NULL DEFAULT 'statement-checker',
  app_version TEXT,
  user_agent TEXT,
  category TEXT,
  priority TEXT,
  message TEXT NOT NULL,
  screenshot_path TEXT,
  status TEXT NOT NULL DEFAULT 'New',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.feedback_entries ENABLE ROW LEVEL SECURITY;

-- Users can insert their own feedback
CREATE POLICY "Users can insert own feedback_entries"
  ON public.feedback_entries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can view their own feedback
CREATE POLICY "Users can view own feedback_entries"
  ON public.feedback_entries FOR SELECT
  USING (auth.uid() = user_id OR is_admin(auth.uid()));

-- Admins can update feedback_entries
CREATE POLICY "Admins can update feedback_entries"
  ON public.feedback_entries FOR UPDATE
  USING (is_admin(auth.uid()));

-- Admins can delete feedback_entries
CREATE POLICY "Admins can delete feedback_entries"
  ON public.feedback_entries FOR DELETE
  USING (is_admin(auth.uid()));
