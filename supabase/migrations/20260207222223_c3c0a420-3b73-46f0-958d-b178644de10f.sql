-- Create storage bucket for evaluation attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('evaluation-attachments', 'evaluation-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Create policy to allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload evaluation attachments"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'evaluation-attachments');

-- Create policy to allow authenticated users to view attachments
CREATE POLICY "Authenticated users can view evaluation attachments"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'evaluation-attachments');

-- Create policy to allow users to update their own attachments
CREATE POLICY "Users can update their own attachments"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'evaluation-attachments');

-- Create policy to allow users to delete their own attachments  
CREATE POLICY "Users can delete their own attachments"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'evaluation-attachments');