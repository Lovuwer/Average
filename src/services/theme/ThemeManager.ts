import { Appearance } from 'react-native';

export type ThemeMode = 'light' | 'dark' | 'auto-system' | 'auto-ambient' | 'auto-time';

export interface ThemeConfig {
  mode: ThemeMode;
  ambientLuxThreshold: number;
  nightStartHour: number;
  nightEndHour: number;
}

export class ThemeManager {
  private luxReadings: number[] = [];
  private lastSwitchTime: number = 0;
  private readonly DEBOUNCE_MS = 3000;

  resolveTheme(config: ThemeConfig): 'light' | 'dark' {
    switch (config.mode) {
      case 'light':
        return 'light';
      case 'dark':
        return 'dark';
      case 'auto-system':
        return this.getSystemTheme();
      case 'auto-ambient':
        return this.getAmbientTheme(config.ambientLuxThreshold);
      case 'auto-time':
        return this.getTimeBasedTheme(config.nightStartHour, config.nightEndHour);
      default:
        return 'dark';
    }
  }

  getSystemTheme(): 'light' | 'dark' {
    const scheme = Appearance.getColorScheme();
    return scheme === 'dark' ? 'dark' : 'light';
  }

  getAmbientTheme(threshold: number): 'light' | 'dark' {
    if (this.luxReadings.length === 0) {
      return this.getSystemTheme();
    }
    const avgLux = this.luxReadings.reduce((a, b) => a + b, 0) / this.luxReadings.length;
    return avgLux < threshold ? 'dark' : 'light';
  }

  getTimeBasedTheme(nightStart: number, nightEnd: number): 'light' | 'dark' {
    const hour = new Date().getHours();
    if (nightStart > nightEnd) {
      return (hour >= nightStart || hour < nightEnd) ? 'dark' : 'light';
    }
    return (hour >= nightStart && hour < nightEnd) ? 'dark' : 'light';
  }

  addLuxReading(lux: number): void {
    this.luxReadings.push(lux);
    if (this.luxReadings.length > 5) {
      this.luxReadings.shift();
    }
  }

  canSwitchTheme(): boolean {
    const now = Date.now();
    if (now - this.lastSwitchTime < this.DEBOUNCE_MS) {
      return false;
    }
    this.lastSwitchTime = now;
    return true;
  }

  reset(): void {
    this.luxReadings = [];
    this.lastSwitchTime = 0;
  }
}

export const themeManager = new ThemeManager();
