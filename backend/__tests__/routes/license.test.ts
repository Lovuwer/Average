import { licenseValidateSchema } from '../../src/schemas/validation';

describe('License Route Validation', () => {
  const validLicenseData = {
    key: 'ABCD-1234-EFGH-5678',
    deviceId: 'device-abc-123',
    platform: 'android',
    model: 'Pixel 7',
    osVersion: '14.0',
    appVersion: '1.0.0',
  };

  describe('licenseValidateSchema', () => {
    it('accepts valid license validation data', () => {
      const result = licenseValidateSchema.safeParse(validLicenseData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.key).toBe('ABCD-1234-EFGH-5678');
        expect(result.data.deviceId).toBe('device-abc-123');
        expect(result.data.platform).toBe('android');
      }
    });

    it('rejects empty key', () => {
      const result = licenseValidateSchema.safeParse({
        ...validLicenseData,
        key: '',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe(
          'License key is required',
        );
      }
    });

    it('rejects empty deviceId', () => {
      const result = licenseValidateSchema.safeParse({
        ...validLicenseData,
        deviceId: '',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Device ID is required');
      }
    });

    it('rejects missing platform', () => {
      const { platform, ...withoutPlatform } = validLicenseData;
      const result = licenseValidateSchema.safeParse(withoutPlatform);
      expect(result.success).toBe(false);
    });

    it('rejects missing model', () => {
      const { model, ...withoutModel } = validLicenseData;
      const result = licenseValidateSchema.safeParse(withoutModel);
      expect(result.success).toBe(false);
    });
  });
});
