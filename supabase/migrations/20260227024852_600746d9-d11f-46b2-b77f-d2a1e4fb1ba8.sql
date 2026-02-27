-- Allow all authenticated users to view profiles (for displaying names)
CREATE POLICY "All authenticated users can view profiles"
ON public.profiles
FOR SELECT
USING (auth.uid() IS NOT NULL);
