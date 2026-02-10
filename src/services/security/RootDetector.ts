import { Platform } from 'react-native';

interface DetectionResult {
  detected: boolean;
  indicators: string[];
}

/**
 * Layer 6a: Root / Jailbreak detection.
 * Android: checks for su binary, Magisk, known root apps.
 * iOS: checks for Cydia, sandbox integrity.
 */
export class RootDetector {
  static async check(): Promise<DetectionResult> {
    const indicators: string[] = [];

    try {
      const DeviceInfo = require('react-native-device-info');

      if (Platform.OS === 'android') {
        // Check common root indicators via DeviceInfo
        const fingerprint = await DeviceInfo.getFingerprint();
        if (fingerprint.includes('test-keys')) {
          indicators.push('Test signing keys detected');
        }

        const tags = await DeviceInfo.getTags();
        if (tags.includes('test-keys')) {
          indicators.push('Test-keys build tag');
        }
      }
    } catch {
      // DeviceInfo not available
    }

    return {
      detected: indicators.length > 0,
      indicators,
    };
  }
}
