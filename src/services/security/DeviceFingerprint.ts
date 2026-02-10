import DeviceInfo from 'react-native-device-info';
import { Platform, Dimensions } from 'react-native';

export interface Fingerprint {
  deviceId: string;
  model: string;
  brand: string;
  systemName: string;
  systemVersion: string;
  appVersion: string;
  buildNumber: string;
  bundleId: string;
  isTablet: boolean;
  screenWidth: number;
  screenHeight: number;
  fingerprintHash: string;
}

export class DeviceFingerprintService {
  async collect(): Promise<Fingerprint> {
    const deviceId = await DeviceInfo.getUniqueId();
    const model = DeviceInfo.getModel();
    const systemVersion = DeviceInfo.getSystemVersion();
    const appVersion = DeviceInfo.getVersion();
    const bundleId = DeviceInfo.getBundleId();
    const { width, height } = Dimensions.get('screen');

    const raw = `${deviceId}|${model}|${Platform.OS}|${systemVersion}|${appVersion}|${bundleId}|${width}|${height}`;
    const hash = await this.hashString(raw);

    return {
      deviceId,
      model,
      brand: Platform.OS === 'ios' ? 'Apple' : model.split(' ')[0] || 'Unknown',
      systemName: Platform.OS,
      systemVersion: typeof systemVersion === 'string' ? systemVersion : String(systemVersion),
      appVersion,
      buildNumber: '1',
      bundleId,
      isTablet: width > 600,
      screenWidth: width,
      screenHeight: height,
      fingerprintHash: hash,
    };
  }

  async verify(storedHash: string): Promise<boolean> {
    const current = await this.collect();
    return current.fingerprintHash === storedHash;
  }

  async getAnonymizedFingerprint(): Promise<string> {
    const fp = await this.collect();
    const anonymized = `${fp.systemName}|${fp.model}|${fp.screenWidth}x${fp.screenHeight}`;
    return await this.hashString(anonymized);
  }

  private async hashString(input: string): Promise<string> {
    // Simple deterministic hash for React Native (no native crypto module in JS runtime)
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16).padStart(8, '0');
  }
}

export const deviceFingerprintService = new DeviceFingerprintService();
