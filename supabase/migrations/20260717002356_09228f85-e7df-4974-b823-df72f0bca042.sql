-- Server-side enforcement of per-bucket file size and MIME type limits.
-- Runs on every insert into storage.objects. Uploads that violate the limits
-- are rejected before the row is written.

CREATE OR REPLACE FUNCTION public.enforce_storage_bucket_limits()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage
AS $$
DECLARE
  size_bytes bigint;
  mime text;
  max_bytes bigint;
  allowed text[];
BEGIN
  size_bytes := COALESCE((NEW.metadata->>'size')::bigint, 0);
  mime := lower(COALESCE(NEW.metadata->>'mimetype', ''));

  IF NEW.bucket_id = 'evaluation-attachments' THEN
    max_bytes := 10485760; -- 10 MB
    allowed := ARRAY['image/jpeg','image/png','image/webp','image/gif','image/heic','image/heif','application/pdf'];
  ELSIF NEW.bucket_id = 'support-attachments' THEN
    max_bytes := 10485760; -- 10 MB
    allowed := ARRAY['image/jpeg','image/png','image/webp','image/gif','image/heic','image/heif','application/pdf'];
  ELSIF NEW.bucket_id = 'company-documents' THEN
    max_bytes := 26214400; -- 25 MB
    allowed := ARRAY[
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'image/jpeg','image/png','image/webp'
    ];
  ELSE
    RETURN NEW; -- other buckets unaffected
  END IF;

  IF size_bytes > max_bytes THEN
    RAISE EXCEPTION 'File exceeds maximum size of % bytes for bucket %', max_bytes, NEW.bucket_id
      USING ERRCODE = 'check_violation';
  END IF;

  IF mime <> '' AND NOT (mime = ANY(allowed)) THEN
    RAISE EXCEPTION 'MIME type % is not allowed for bucket %', mime, NEW.bucket_id
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_bucket_limits_before_insert ON storage.objects;
CREATE TRIGGER enforce_bucket_limits_before_insert
BEFORE INSERT OR UPDATE ON storage.objects
FOR EACH ROW EXECUTE FUNCTION public.enforce_storage_bucket_limits();