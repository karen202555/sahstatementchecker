
-- Features registry table
CREATE TABLE public.features (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  feature_name text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'Live',
  sort_order integer NOT NULL DEFAULT 100
);

ALTER TABLE public.features ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read features
CREATE POLICY "Authenticated users can view features"
  ON public.features FOR SELECT TO authenticated
  USING (true);

-- Only admins can manage features
CREATE POLICY "Admins can insert features"
  ON public.features FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update features"
  ON public.features FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete features"
  ON public.features FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));

-- App meta key-value table
CREATE TABLE public.app_meta (
  key text PRIMARY KEY,
  value text NOT NULL
);

ALTER TABLE public.app_meta ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read app_meta
CREATE POLICY "Authenticated users can view app_meta"
  ON public.app_meta FOR SELECT TO authenticated
  USING (true);

-- Only admins can manage app_meta
CREATE POLICY "Admins can insert app_meta"
  ON public.app_meta FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update app_meta"
  ON public.app_meta FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete app_meta"
  ON public.app_meta FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));

-- Recent changes table
CREATE TABLE public.recent_changes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  description text NOT NULL,
  sort_order integer NOT NULL DEFAULT 100
);

ALTER TABLE public.recent_changes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view recent_changes"
  ON public.recent_changes FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can insert recent_changes"
  ON public.recent_changes FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update recent_changes"
  ON public.recent_changes FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete recent_changes"
  ON public.recent_changes FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));

-- Seed features
INSERT INTO public.features (feature_name, description, status, sort_order) VALUES
  ('Upload Statement', 'Upload bank statements in PDF, CSV, or TXT format for analysis.', 'Live', 10),
  ('Extract Transactions', 'Automatically extract and parse individual transactions from uploaded statements.', 'Live', 20),
  ('Detect Duplicates', 'Identify duplicate or near-duplicate transactions across statements.', 'Live', 30),
  ('Detect Overcharges & Anomalies', 'Flag transactions that appear to be overcharges or statistical anomalies.', 'Live', 40),
  ('Generate Dispute Report', 'Create a downloadable PDF dispute report for flagged transactions.', 'Live', 50);

-- Seed app version
INSERT INTO public.app_meta (key, value) VALUES
  ('app_version', 'v0.1 Beta');

-- Seed recent changes
INSERT INTO public.recent_changes (description, sort_order) VALUES
  ('Initial beta build released', 10),
  ('Added feedback collection system', 20),
  ('Statement parsing improvements', 30);
