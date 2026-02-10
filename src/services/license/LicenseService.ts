import { Platform } from 'react-native';
import EncryptedStorage from 'react-native-encrypted-storage';
import DeviceInfo from 'react-native-device-info';
import { apiClient } from '../api/ApiClient';

export interface LicenseStatus {
  valid: boolean;
  expiresAt: string | null;
  remainingDevices: number;
  tier: 'free' | 'pro' | 'lifetime';
}

export class LicenseService {
  private readonly STORAGE_KEY = 'average_license_cache';
  private readonly LICENSE_KEY_STORAGE = 'average_license_key';
  private readonly VALIDATION_INTERVAL = 24 * 60 * 60 * 1000;

  async validateLicense(licenseKey: string): Promise<LicenseStatus> {
    const deviceId = await DeviceInfo.getUniqueId();
    const deviceModel = DeviceInfo.getModel();
    const osVersion = DeviceInfo.getSystemVersion();
    const appVersion = DeviceInfo.getVersion();

    const response = await apiClient.post<LicenseStatus>('/license/validate', {
      key: licenseKey,
      deviceId,
      platform: Platform.OS,
      model: deviceModel,
      osVersion,
      appVersion,
    });

    await this.cacheLicenseStatus(response);
    return response;
  }

  async checkCachedLicense(): Promise<LicenseStatus | null> {
    try {
      const cached = await EncryptedStorage.getItem(this.STORAGE_KEY);
      if (!cached) return null;

      const parsed = JSON.parse(cached);
      const cacheAge = Date.now() - parsed.cachedAt;

      if (cacheAge > this.VALIDATION_INTERVAL) return null;
      return parsed.status;
    } catch {
      return null;
    }
  }

  async activateLicense(licenseKey: string): Promise<LicenseStatus> {
    const status = await this.validateLicense(licenseKey);
    await EncryptedStorage.setItem(this.LICENSE_KEY_STORAGE, licenseKey);
    return status;
  }

  async deactivateDevice(): Promise<void> {
    await apiClient.post('/license/deactivate');
    await EncryptedStorage.removeItem(this.STORAGE_KEY);
    await EncryptedStorage.removeItem(this.LICENSE_KEY_STORAGE);
  }

  async getStoredLicenseKey(): Promise<string | null> {
    try {
      return await EncryptedStorage.getItem(this.LICENSE_KEY_STORAGE);
    } catch {
      return null;
    }
  }

  private async cacheLicenseStatus(status: LicenseStatus): Promise<void> {
    await EncryptedStorage.setItem(
      this.STORAGE_KEY,
      JSON.stringify({ status, cachedAt: Date.now() }),
    );
  }
}

export const licenseService = new LicenseService();
