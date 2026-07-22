export type PasswordPolicyLanguage = 'ar' | 'en';

// Toggle to re-enable strict complexity / weak-pattern checks in the future.
// Keep as `false` to only enforce the backend's minimal 6-character length.
export const STRICT_PASSWORD_POLICY = false;
export const MIN_PASSWORD_LENGTH = 6;

const LOWER = 'abcdefghijkmnpqrstuvwxyz';
const UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const DIGITS = '23456789';
const SYMBOLS = '!@#$%^&*-_=+?';
const ALL = LOWER + UPPER + DIGITS + SYMBOLS;

const WEAK_FRAGMENTS = [
  'password',
  'passw0rd',
  'qwerty',
  'admin',
  'rasdah',
  'sqcs',
  'welcome',
  'letmein',
  'abcdef',
  'abc123',
  '1234',
  '12345',
  '123456',
  '654321',
  '1111',
  '0000',
];

function pickRandom(charset: string): string {
  const values = new Uint8Array(1);
  const max = 256 - (256 % charset.length);
  do {
    crypto.getRandomValues(values);
  } while (values[0] >= max);
  return charset[values[0] % charset.length];
}

function shuffle(chars: string[]): string[] {
  for (let i = chars.length - 1; i > 0; i--) {
    const values = new Uint32Array(1);
    crypto.getRandomValues(values);
    const j = values[0] % (i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars;
}

export function generateStrongPassword(length = 18): string {
  const size = Math.max(16, length);
  const chars = [
    pickRandom(LOWER),
    pickRandom(UPPER),
    pickRandom(DIGITS),
    pickRandom(SYMBOLS),
  ];
  for (let i = chars.length; i < size; i += 1) chars.push(pickRandom(ALL));
  return shuffle(chars).join('');
}

export function getPasswordPolicyError(password: string, language: PasswordPolicyLanguage): string | null {
  const isRTL = language === 'ar';
  const value = password.trim();
  if (value.length < MIN_PASSWORD_LENGTH) {
    return isRTL
      ? `كلمة المرور يجب أن تكون ${MIN_PASSWORD_LENGTH} خانات على الأقل`
      : `Password must be at least ${MIN_PASSWORD_LENGTH} characters`;
  }
  if (!STRICT_PASSWORD_POLICY) {
    return null;
  }
  if (!/[a-z]/.test(value) || !/[A-Z]/.test(value) || !/[0-9]/.test(value) || !/[^A-Za-z0-9]/.test(value)) {
    return isRTL
      ? 'استخدم حروف كبيرة وصغيرة وأرقام ورموز'
      : 'Use uppercase, lowercase, numbers, and symbols';
  }
  const normalized = value.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (WEAK_FRAGMENTS.some(fragment => normalized.includes(fragment)) || /(.)\1{3,}/.test(normalized)) {
    return isRTL
      ? 'كلمة المرور تحتوي على نمط شائع أو سهل التخمين'
      : 'Password contains a common or easy-to-guess pattern';
  }
  return null;
}

export function getWeakPasswordServerMessage(language: PasswordPolicyLanguage): string {
  return language === 'ar'
    ? 'تم رفض كلمة المرور من إعدادات المصادقة. استخدم كلمة مرور من 6 خانات أو أكثر.'
    : 'The password was rejected by auth settings. Use a password with 6 or more characters.';
}