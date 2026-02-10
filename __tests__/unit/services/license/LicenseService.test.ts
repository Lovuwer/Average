import EncryptedStorage from 'react-native-encrypted-storage';
import { LicenseService } from '../../../../src/services/license/LicenseService';

jest.mock('../../../../src/services/api/ApiClient', () => ({
  apiClient: {
    post: jest.fn().mockResolvedValue({
      valid: true,
      expiresAt: '2025-12-31',
      remainingDevices: 2,
      tier: 'pro',
    }),
  },
}));

describe('LicenseService', () => {
  let service: LicenseService;

  beforeEach(() => {
    service = new LicenseService();
    jest.clearAllMocks();
    (EncryptedStorage.getItem as jest.Mock).mockResolvedValue(null);
  });

  it('validateLicense sends correct payload', async () => {
    const { apiClient } = require('../../../../src/services/api/ApiClient');
    await service.validateLicense('TEST-KEY-1234-5678');
    expect(apiClient.post).toHaveBeenCalledWith('/license/validate', expect.objectContaining({
      key: 'TEST-KEY-1234-5678',
    }));
  });

  it('validateLicense includes device fingerprint data', async () => {
    const { apiClient } = require('../../../../src/services/api/ApiClient');
    await service.validateLicense('TEST-KEY');
    expect(apiClient.post).toHaveBeenCalledWith('/license/validate', expect.objectContaining({
      deviceId: expect.any(String),
      model: expect.any(String),
    }));
  });

  it('validateLicense caches result on success', async () => {
    await service.validateLicense('TEST-KEY');
    expect(EncryptedStorage.setItem).toHaveBeenCalled();
  });

  it('validateLicense throws on error', async () => {
    const { apiClient } = require('../../../../src/services/api/ApiClient');
    apiClient.post.mockRejectedValueOnce(new Error('Invalid key'));
    await expect(service.validateLicense('BAD-KEY')).rejects.toThrow('Invalid key');
  });

  it('checkCachedLicense returns cached status within interval', async () => {
    (EncryptedStorage.getItem as jest.Mock).mockResolvedValue(
      JSON.stringify({ status: { valid: true, tier: 'pro' }, cachedAt: Date.now() })
    );
    const result = await service.checkCachedLicense();
    expect(result?.valid).toBe(true);
  });

  it('checkCachedLicense returns null when cache expired', async () => {
    (EncryptedStorage.getItem as jest.Mock).mockResolvedValue(
      JSON.stringify({ status: { valid: true }, cachedAt: Date.now() - 25 * 60 * 60 * 1000 })
    );
    const result = await service.checkCachedLicense();
    expect(result).toBeNull();
  });

  it('checkCachedLicense returns null when no cache exists', async () => {
    const result = await service.checkCachedLicense();
    expect(result).toBeNull();
  });

  it('activateLicense stores license key', async () => {
    await service.activateLicense('KEY-1234');
    expect(EncryptedStorage.setItem).toHaveBeenCalledWith('average_license_key', 'KEY-1234');
  });

  it('deactivateDevice removes stored data', async () => {
    const { apiClient } = require('../../../../src/services/api/ApiClient');
    apiClient.post.mockResolvedValue({});
    await service.deactivateDevice();
    expect(EncryptedStorage.removeItem).toHaveBeenCalledWith('average_license_cache');
    expect(EncryptedStorage.removeItem).toHaveBeenCalledWith('average_license_key');
  });

  it('getStoredLicenseKey returns stored key', async () => {
    (EncryptedStorage.getItem as jest.Mock).mockResolvedValue('STORED-KEY');
    const key = await service.getStoredLicenseKey();
    expect(key).toBe('STORED-KEY');
  });

  it('getStoredLicenseKey returns null when no key stored', async () => {
    const key = await service.getStoredLicenseKey();
    expect(key).toBeNull();
  });

  it('license key is stored in EncryptedStorage', async () => {
    await service.activateLicense('SECURE-KEY');
    expect(EncryptedStorage.setItem).toHaveBeenCalledWith('average_license_key', 'SECURE-KEY');
  });
});
