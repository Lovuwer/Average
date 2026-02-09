import { Platform } from 'react-native';

interface DetectionResult {
  detected: boolean;
  indicators: string[];
}

/**
 * Layer 6c: Emulator / Simulator detection.
 * Android: checks Build.FINGERPRINT, Build.MODEL, sensors.
 * iOS: checks TARGET_OS_SIMULATOR.
 */
export class EmulatorDetector {
  static async check(): Promise<DetectionResult> {
    const indicators: string[] = [];

    try {
      const DeviceInfo = require('react-native-device-info');
      const isEmulator = await DeviceInfo.isEmulator();

      if (isEmulator) {
        indicators.push('Running on emulator/simulator');
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
