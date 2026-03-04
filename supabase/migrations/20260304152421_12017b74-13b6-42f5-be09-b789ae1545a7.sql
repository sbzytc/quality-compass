
-- Add period_type to evaluation_templates
ALTER TABLE public.evaluation_templates ADD COLUMN IF NOT EXISTS period_type text NOT NULL DEFAULT 'yearly';

-- Add period_type to evaluations for quick filtering
ALTER TABLE public.evaluations ADD COLUMN IF NOT EXISTS period_type text NOT NULL DEFAULT 'yearly';

-- Update existing templates to be yearly
UPDATE public.evaluation_templates SET period_type = 'yearly' WHERE period_type IS NULL OR period_type = 'yearly';
