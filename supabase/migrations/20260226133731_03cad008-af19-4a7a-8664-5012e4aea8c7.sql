
-- Admin users table (role-based access)
CREATE TABLE public.admin_users (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE
);

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Only admins can read admin_users (using security definer to avoid recursion)
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users WHERE user_id = _user_id
  )
$$;

CREATE POLICY "Admins can view admin_users"
ON public.admin_users FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

-- Feedback table
CREATE TABLE public.feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  reporter_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reporter_email text,
  page_url text,
  feedback_type text NOT NULL,
  message text NOT NULL,
  priority text,
  attachments text[],
  status text NOT NULL DEFAULT 'New',
  wants_reply boolean DEFAULT false,
  v1_go_live boolean NOT NULL DEFAULT false,
  internal_notes text
);

ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- INSERT: authenticated users, enforce reporter_user_id = auth.uid()
CREATE POLICY "Users can insert own feedback"
ON public.feedback FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = reporter_user_id);

-- SELECT: users see own rows, admins see all
CREATE POLICY "Users can view own feedback"
ON public.feedback FOR SELECT
TO authenticated
USING (auth.uid() = reporter_user_id OR public.is_admin(auth.uid()));

-- UPDATE: admin only
CREATE POLICY "Admins can update feedback"
ON public.feedback FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()));

-- DELETE: admin only
CREATE POLICY "Admins can delete feedback"
ON public.feedback FOR DELETE
TO authenticated
USING (public.is_admin(auth.uid()));

-- Storage bucket for feedback uploads
INSERT INTO storage.buckets (id, name, public) VALUES ('feedback-uploads', 'feedback-uploads', false);

-- Storage policies
CREATE POLICY "Authenticated users can upload feedback files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'feedback-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view own feedback files"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'feedback-uploads' AND (auth.uid()::text = (storage.foldername(name))[1] OR public.is_admin(auth.uid())));

CREATE POLICY "Admins can delete feedback files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'feedback-uploads' AND public.is_admin(auth.uid()));
