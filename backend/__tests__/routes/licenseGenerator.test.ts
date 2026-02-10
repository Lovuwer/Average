import { generateLicenseKey, validateKeyFormat, generateBatch } from '../../src/services/licenseGenerator';

describe('licenseGenerator', () => {
  it('generateLicenseKey returns key in XXXX-XXXX-XXXX-XXXX format', () => {
    const key = generateLicenseKey();
    expect(key).toMatch(/^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/);
  });

  it('generateLicenseKey uses only allowed characters', () => {
    const key = generateLicenseKey();
    const forbidden = /[0OIL1]/;
    expect(forbidden.test(key.replace(/-/g, ''))).toBe(false);
  });

  it('generateLicenseKey produces unique keys', () => {
    const keys = new Set<string>();
    for (let i = 0; i < 100; i++) {
      keys.add(generateLicenseKey());
    }
    expect(keys.size).toBe(100);
  });

  it('validateKeyFormat returns true for valid format', () => {
    const key = generateLicenseKey();
    expect(validateKeyFormat(key)).toBe(true);
  });

  it('validateKeyFormat returns false for invalid format', () => {
    expect(validateKeyFormat('INVALID-KEY')).toBe(false);
  });

  it('validateKeyFormat returns false for empty string', () => {
    expect(validateKeyFormat('')).toBe(false);
  });

  it('validateKeyFormat checks check digit validity', () => {
    const key = generateLicenseKey();
    // Modify last char to invalidate check digit
    const lastChar = key[key.length - 1];
    const replacement = lastChar === 'A' ? 'B' : 'A';
    const invalidKey = key.slice(0, -1) + replacement;
    expect(validateKeyFormat(invalidKey)).toBe(false);
  });

  it('generateBatch returns exact count', () => {
    const batch = generateBatch(10, 'pro', 3);
    expect(batch.length).toBe(10);
  });

  it('generateBatch assigns correct tier and maxDevices', () => {
    const batch = generateBatch(5, 'lifetime', 5);
    batch.forEach(item => {
      expect(item.tier).toBe('lifetime');
      expect(item.maxDevices).toBe(5);
    });
  });
});
