
-- Store per-transaction decisions (approve/dispute/not-sure)
CREATE TABLE public.transaction_decisions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_id UUID NOT NULL,
  user_id UUID NOT NULL,
  decision TEXT NOT NULL CHECK (decision IN ('approve', 'dispute', 'not-sure')),
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (transaction_id, user_id)
);

ALTER TABLE public.transaction_decisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own decisions"
  ON public.transaction_decisions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own decisions"
  ON public.transaction_decisions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own decisions"
  ON public.transaction_decisions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own decisions"
  ON public.transaction_decisions FOR DELETE
  USING (auth.uid() = user_id);

-- Memory system: remembers user preferences per category
CREATE TABLE public.decision_memory (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  category TEXT NOT NULL,
  preferred_decision TEXT NOT NULL CHECK (preferred_decision IN ('approve', 'dispute', 'not-sure')),
  occurrence_count INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, category)
);

ALTER TABLE public.decision_memory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own memory"
  ON public.decision_memory FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own memory"
  ON public.decision_memory FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own memory"
  ON public.decision_memory FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own memory"
  ON public.decision_memory FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_transaction_decisions_updated_at
  BEFORE UPDATE ON public.transaction_decisions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_decision_memory_updated_at
  BEFORE UPDATE ON public.decision_memory
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
