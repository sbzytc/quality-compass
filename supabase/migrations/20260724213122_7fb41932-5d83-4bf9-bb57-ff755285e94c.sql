UPDATE public.companies
SET theme = jsonb_build_object(
  'colors', jsonb_build_object(
    'primary', '174 20% 48%',
    'primaryForeground', '45 40% 98%',
    'accent', '174 22% 88%',
    'accentForeground', '180 25% 18%',
    'background', '45 35% 97%',
    'foreground', '180 20% 15%',
    'ring', '174 20% 48%'
  ),
  'radius', '0.875rem',
  'glass', COALESCE((theme->>'glass')::boolean, true)
)
WHERE id IN ('07aab43d-83b6-4577-9f34-6912a924889c','2ac0e998-4f38-4c76-84c9-e24fbd1f567d');