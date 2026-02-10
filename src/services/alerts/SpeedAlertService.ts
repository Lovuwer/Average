import { Vibration } from 'react-native';

export interface SpeedAlertConfig {
  enabled: boolean;
  speedLimit: number;
  warningThreshold: number;
  alertType: 'vibration' | 'sound' | 'both';
  cooldownSeconds: number;
}

export interface AlertResult {
  shouldAlert: boolean;
  level: 'warning' | 'exceeded' | 'none';
}

export class SpeedAlertService {
  private lastAlertTime: number = 0;

  checkSpeed(currentSpeed: number, config: SpeedAlertConfig): AlertResult {
    if (!config.enabled) {
      return { shouldAlert: false, level: 'none' };
    }

    if (config.speedLimit <= 0) {
      return { shouldAlert: true, level: 'exceeded' };
    }

    if (currentSpeed <= 0) {
      return { shouldAlert: false, level: 'none' };
    }

    const now = Date.now();
    const cooldownMs = config.cooldownSeconds * 1000;
    const withinCooldown = (now - this.lastAlertTime) < cooldownMs;

    if (currentSpeed >= config.speedLimit) {
      if (withinCooldown) {
        return { shouldAlert: false, level: 'exceeded' };
      }
      this.lastAlertTime = now;
      return { shouldAlert: true, level: 'exceeded' };
    }

    const warningSpeed = config.speedLimit * config.warningThreshold;
    if (currentSpeed >= warningSpeed) {
      if (withinCooldown) {
        return { shouldAlert: false, level: 'warning' };
      }
      this.lastAlertTime = now;
      return { shouldAlert: true, level: 'warning' };
    }

    return { shouldAlert: false, level: 'none' };
  }

  triggerAlert(level: 'warning' | 'exceeded', type: SpeedAlertConfig['alertType']): void {
    if (type === 'vibration' || type === 'both') {
      if (level === 'warning') {
        Vibration.vibrate([0, 200, 100, 200]);
      } else {
        Vibration.vibrate([0, 500, 200, 500, 200, 500]);
      }
    }
    // Sound handled separately by SoundManager
  }

  reset(): void {
    this.lastAlertTime = 0;
  }
}

export const speedAlertService = new SpeedAlertService();
