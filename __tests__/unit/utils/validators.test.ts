import { isValidEmail, isValidPassword, isValidLicenseKey } from '../../../src/utils/validators';

describe('isValidEmail', () => {
  it('returns true for valid email', () => {
    expect(isValidEmail('user@example.com')).toBe(true);
  });

  it('returns false for invalid email', () => {
    expect(isValidEmail('invalid')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isValidEmail('')).toBe(false);
  });
});

describe('isValidPassword', () => {
  it('returns true for strong password', () => {
    expect(isValidPassword('Str0ng!Pass')).toBe(true);
  });

  it('returns false for weak password', () => {
    expect(isValidPassword('weak')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isValidPassword('')).toBe(false);
  });
});

describe('isValidLicenseKey', () => {
  it('returns true for valid license key', () => {
    expect(isValidLicenseKey('XXXX-XXXX-XXXX-XXXX')).toBe(true);
  });

  it('returns false for invalid license key', () => {
    expect(isValidLicenseKey('invalid')).toBe(false);
  });
});
