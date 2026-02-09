import { Platform } from 'react-native';
import { RootDetector } from './RootDetector';
import { DebugDetector } from './DebugDetector';
import { EmulatorDetector } from './EmulatorDetector';
import { IntegrityChecker } from './IntegrityChecker';

interface SecurityResult {
  safe: boolean;
  reasons: string[];
}

/**
 * SecurityGate orchestrates ALL security checks on app launch.
 * In production, if any check fails: show error and exit app.
 */
export class SecurityGate {
  static check(): SecurityResult {
    const reasons: string[] = [];

    // Check for debug mode
    const debugResult = DebugDetector.check();
    if (debugResult.detected) {
      reasons.push(...debugResult.indicators);
    }

    // In production, only fail if there are non-dev reasons
    const productionReasons = reasons.filter(
      (r) => !r.includes('development mode'),
    );

    return {
      safe: productionReasons.length === 0,
      reasons,
    };
  }

  static async checkAsync(): Promise<SecurityResult> {
    const reasons: string[] = [];

    // Layer 1: Root/Jailbreak detection
    const rootResult = await RootDetector.check();
    if (rootResult.detected) {
      reasons.push(...rootResult.indicators);
    }

    // Layer 2: Emulator detection
    const emulatorResult = await EmulatorDetector.check();
    if (emulatorResult.detected) {
      reasons.push(...emulatorResult.indicators);
    }

    // Layer 3: Runtime integrity
    const integrityResult = await IntegrityChecker.check();
    if (!integrityResult.valid) {
      reasons.push(...integrityResult.reasons);
    }

    // Layer 4: Debug detection (sync)
    const debugResult = DebugDetector.check();
    if (debugResult.detected) {
      reasons.push(...debugResult.indicators);
    }

    const syncResult = this.check();

    return {
      safe: syncResult.safe && reasons.length === 0,
      reasons: [...syncResult.reasons, ...reasons],
    };
  }
}
