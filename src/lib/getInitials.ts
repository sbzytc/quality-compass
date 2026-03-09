// Shared utility to keep initials rendering consistent across the app

export function getInitials(name?: string | null, max: number = 2): string {
  const safe = (name ?? '').trim();
  if (!safe) return '';

  return safe
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0]!.toUpperCase())
    .join('')
    .slice(0, max);
}

