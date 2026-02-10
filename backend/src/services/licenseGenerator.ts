import crypto from 'crypto';

const ALLOWED_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // No 0/O/1/I/L

export function generateLicenseKey(): string {
  const groups: string[] = [];
  for (let g = 0; g < 4; g++) {
    let group = '';
    for (let c = 0; c < 4; c++) {
      const bytes = crypto.randomBytes(1);
      const index = bytes[0] % ALLOWED_CHARS.length;
      group += ALLOWED_CHARS[index];
    }
    groups.push(group);
  }

  // Replace last char of last group with check digit
  const keyWithoutCheck = groups.join('-').slice(0, -1);
  const checkDigit = computeCheckDigit(keyWithoutCheck);
  groups[3] = groups[3].slice(0, 3) + checkDigit;

  return groups.join('-');
}

export function validateKeyFormat(key: string): boolean {
  if (!key || typeof key !== 'string') return false;

  const pattern = /^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/;
  if (!pattern.test(key)) return false;

  // Verify check digit
  const keyWithoutCheck = key.slice(0, -1);
  const expectedCheckDigit = computeCheckDigit(keyWithoutCheck);
  return key[key.length - 1] === expectedCheckDigit;
}

export function generateBatch(
  count: number,
  tier: string,
  maxDevices: number,
): Array<{ key: string; tier: string; maxDevices: number }> {
  const keys: Array<{ key: string; tier: string; maxDevices: number }> = [];
  const keySet = new Set<string>();

  while (keys.length < count) {
    const key = generateLicenseKey();
    if (!keySet.has(key)) {
      keySet.add(key);
      keys.push({ key, tier, maxDevices });
    }
  }

  return keys;
}

function computeCheckDigit(keyWithoutCheck: string): string {
  let sum = 0;
  for (let i = 0; i < keyWithoutCheck.length; i++) {
    sum += keyWithoutCheck.charCodeAt(i) * (i + 1);
  }
  return ALLOWED_CHARS[sum % ALLOWED_CHARS.length];
}
