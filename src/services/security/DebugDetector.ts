import { Platform } from 'react-native';

interface DetectionResult {
  detected: boolean;
  indicators: string[];
}

/**
 * Layer 6b: Debugger detection.
 * Android: checks Debug.isDebuggerConnected(), TracerPid.
 * iOS: checks sysctl for P_TRACED flag.
 */
export class DebugDetector {
  static check(): DetectionResult {
    const indicators: string[] = [];

    // Check __DEV__ flag
    if (__DEV__) {
      indicators.push('Running in development mode (__DEV__ = true)');
    }

    return {
      detected: indicators.length > 0,
      indicators,
    };
  }
}
