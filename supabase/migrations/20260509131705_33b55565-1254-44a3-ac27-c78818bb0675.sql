UPDATE public.modules
SET available_for_sectors = ARRAY['fnb','clinic','retail','factory','other']::sector_type[]
WHERE code IN ('medical','food');