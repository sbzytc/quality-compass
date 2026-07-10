import { supabase } from '@/integrations/supabase/client';

/**
 * Best-effort extraction of a storage object path from either a raw path
 * or a Supabase public/signed URL for the given bucket.
 */
export function extractStoragePath(input: string, bucket: string): string {
  if (!input) return input;
  if (!/^https?:\/\//i.test(input)) return input;
  const publicMarker = `/object/public/${bucket}/`;
  const signMarker = `/object/sign/${bucket}/`;
  let idx = input.indexOf(publicMarker);
  if (idx >= 0) return decodeURIComponent(input.slice(idx + publicMarker.length).split('?')[0]);
  idx = input.indexOf(signMarker);
  if (idx >= 0) return decodeURIComponent(input.slice(idx + signMarker.length).split('?')[0]);
  return input;
}

/**
 * Create a short-lived signed URL for a stored attachment.
 * Accepts either a raw storage path or a legacy Supabase public URL.
 */
export async function getSignedAttachmentUrl(
  pathOrUrl: string,
  bucket: string,
  expiresIn = 3600
): Promise<string> {
  if (!pathOrUrl) return pathOrUrl;
  const path = extractStoragePath(pathOrUrl, bucket);
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn);
  if (error || !data?.signedUrl) return pathOrUrl;
  return data.signedUrl;
}