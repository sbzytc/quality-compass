ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
CREATE INDEX IF NOT EXISTS idx_companies_deleted_at ON public.companies(deleted_at);