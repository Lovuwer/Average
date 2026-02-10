import { DeviceFingerprintService } from '../../../../src/services/security/DeviceFingerprint';

describe('DeviceFingerprintService', () => {
  let service: DeviceFingerprintService;

  beforeEach(() => {
    service = new DeviceFingerprintService();
  });

  it('collect returns all required fields', async () => {
    const fp = await service.collect();
    expect(fp).toHaveProperty('deviceId');
    expect(fp).toHaveProperty('model');
    expect(fp).toHaveProperty('systemName');
    expect(fp).toHaveProperty('systemVersion');
    expect(fp).toHaveProperty('appVersion');
    expect(fp).toHaveProperty('bundleId');
    expect(fp).toHaveProperty('fingerprintHash');
  });

  it('collect generates a fingerprintHash', async () => {
    const fp = await service.collect();
    expect(typeof fp.fingerprintHash).toBe('string');
    expect(fp.fingerprintHash.length).toBeGreaterThan(0);
  });

  it('collect returns consistent hash for same device', async () => {
    const fp1 = await service.collect();
    const fp2 = await service.collect();
    expect(fp1.fingerprintHash).toBe(fp2.fingerprintHash);
  });

  it('verify returns true for matching fingerprint', async () => {
    const fp = await service.collect();
    const result = await service.verify(fp.fingerprintHash);
    expect(result).toBe(true);
  });

  it('verify returns false for different hash', async () => {
    const result = await service.verify('different-hash');
    expect(result).toBe(false);
  });

  it('getAnonymizedFingerprint returns a hash string', async () => {
    const hash = await service.getAnonymizedFingerprint();
    expect(typeof hash).toBe('string');
    expect(hash.length).toBeGreaterThan(0);
  });

  it('getAnonymizedFingerprint does not contain raw device ID', async () => {
    const hash = await service.getAnonymizedFingerprint();
    // Hash should not contain the raw identifiers
    expect(hash).not.toContain('test-device-id');
  });

  it('fingerprint includes screen dimensions', async () => {
    const fp = await service.collect();
    expect(fp.screenWidth).toBeGreaterThan(0);
    expect(fp.screenHeight).toBeGreaterThan(0);
  });

  it('fingerprint includes brand', async () => {
    const fp = await service.collect();
    expect(typeof fp.brand).toBe('string');
  });

  it('handles device info values correctly', async () => {
    const fp = await service.collect();
    expect(fp.deviceId).toBe('test-device-id-123');
    expect(fp.model).toBe('Test Model');
  });
});
