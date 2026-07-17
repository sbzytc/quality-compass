// Cryptographically strong temporary password generator.
// Uses crypto.getRandomValues over a curated charset guaranteeing at least
// one lowercase, uppercase, digit, and symbol. Default length 20 => ~120 bits
// of entropy (well above the previous ~48-bit UUID-slice implementation).

const LOWER = "abcdefghijkmnpqrstuvwxyz"; // no l, o
const UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // no I, O
const DIGITS = "23456789"; // no 0, 1
const SYMBOLS = "!@#$%^&*-_=+?";
const ALL = LOWER + UPPER + DIGITS + SYMBOLS;

function pickRandom(charset: string): string {
  // Rejection sampling to avoid modulo bias.
  const max = 256 - (256 % charset.length);
  const buf = new Uint8Array(1);
  while (true) {
    crypto.getRandomValues(buf);
    if (buf[0] < max) return charset[buf[0] % charset.length];
  }
}

function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = pickRandom("0123456789").charCodeAt(0); // seed via helper
    const buf = new Uint32Array(1);
    crypto.getRandomValues(buf);
    const k = buf[0] % (i + 1);
    [arr[i], arr[k]] = [arr[k], arr[i]];
    void j;
  }
  return arr;
}

export function generateTempPassword(length = 20): string {
  const min = 16;
  const n = Math.max(min, length);
  const chars: string[] = [
    pickRandom(LOWER),
    pickRandom(UPPER),
    pickRandom(DIGITS),
    pickRandom(SYMBOLS),
  ];
  for (let i = chars.length; i < n; i++) chars.push(pickRandom(ALL));
  return shuffle(chars).join("");
}