import { useEffect, useState } from 'react';
import { getSignedAttachmentUrl } from '@/lib/attachmentUrl';

type Bucket = 'evaluation-attachments' | 'support-attachments';

interface SignedImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src: string;
  bucket: Bucket;
  wrapWithLink?: boolean;
  linkClassName?: string;
}

/**
 * <img> that resolves the storage path/legacy URL into a short-lived signed URL.
 * Optionally wraps the image in an <a> that opens the same signed URL in a new tab.
 */
export function SignedImage({ src, bucket, wrapWithLink, linkClassName, ...imgProps }: SignedImageProps) {
  const [url, setUrl] = useState<string>('');

  useEffect(() => {
    let cancelled = false;
    getSignedAttachmentUrl(src, bucket).then(u => {
      if (!cancelled) setUrl(u);
    });
    return () => { cancelled = true; };
  }, [src, bucket]);

  const img = <img {...imgProps} src={url || undefined} />;
  if (!wrapWithLink) return img;
  return (
    <a href={url || '#'} target="_blank" rel="noopener noreferrer" className={linkClassName}>
      {img}
    </a>
  );
}