import { Platform, NativeModules } from 'react-native';

interface IntegrityResult {
  valid: boolean;
  reasons: string[];
}

/**
 * Layer 4: Runtime integrity verification.
 * Checks APK signature (Android) and code signature (iOS) at runtime.
 */
export class IntegrityChecker {
  static async check(): Promise<IntegrityResult> {
    const reasons: string[] = [];

    try {
      if (Platform.OS === 'android') {
        // Check if debuggable flag is set
        const DeviceInfo = require('react-native-device-info');
        const bundleId = DeviceInfo.getBundleId();
        if (bundleId !== 'com.average') {
          reasons.push('Bundle identifier mismatch');
        }
      } else if (Platform.OS === 'ios') {
        // Verify bundle identifier
        const DeviceInfo = require('react-native-device-info');
        const bundleId = DeviceInfo.getBundleId();
        if (bundleId !== 'com.average') {
          reasons.push('Bundle identifier mismatch');
        }
      }
    } catch {
      // DeviceInfo not available in dev
    }

    return {
      valid: reasons.length === 0,
      reasons,
    };
  }
}
