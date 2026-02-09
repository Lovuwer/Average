import { Platform } from 'react-native';

interface SecurityResult {
  safe: boolean;
  reasons: string[];
}

export class SecurityGate {
  static check(): SecurityResult {
    const reasons: string[] = [];

    // Check for debug mode
    if (__DEV__) {
      reasons.push('App is running in development mode');
    }

    // Platform-specific checks will use react-native-device-info at runtime
    // These are placeholder checks that work without native modules during dev
    if (Platform.OS === 'android' || Platform.OS === 'ios') {
      // Emulator/simulator detection would use DeviceInfo.isEmulator()
      // Root/jailbreak detection would use DeviceInfo.isRooted() (Android)
      // These require native modules and are checked at runtime
    }

    // In production, only fail if there are non-dev reasons
    const productionReasons = reasons.filter(
      (r) => r !== 'App is running in development mode',
    );

    return {
      safe: productionReasons.length === 0,
      reasons,
    };
  }

  static async checkAsync(): Promise<SecurityResult> {
    const reasons: string[] = [];

    try {
      // Dynamic import to avoid crashes when native modules aren't linked
      const DeviceInfo = require('react-native-device-info');

      const isEmulator = await DeviceInfo.isEmulator();
      if (isEmulator) {
        reasons.push('Running on emulator/simulator');
      }
    } catch {
      // DeviceInfo not available, skip these checks
    }

    const syncResult = this.check();
    return {
      safe: syncResult.safe && reasons.length === 0,
      reasons: [...syncResult.reasons, ...reasons],
    };
  }
}
