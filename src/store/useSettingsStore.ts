import { create } from 'zustand';

interface SpeedAlertConfig {
  enabled: boolean;
  speedLimit: number;
  warningThreshold: number;
  alertType: 'vibration' | 'sound' | 'both';
  cooldownSeconds: number;
}

type ThemeMode = 'light' | 'dark' | 'auto-system' | 'auto-ambient' | 'auto-time';

interface SettingsState {
  // Speed unit
  speedUnit: 'kmh' | 'mph';
  distanceUnit: 'km' | 'mi';
  autoDetectUnit: boolean;
  showBothUnits: boolean;
  speedDisplayPrecision: 0 | 1;

  // HUD
  autoHudOnDrive: boolean;
  hudBrightness: number;
  hudColor: string;

  // Speed alerts
  speedAlert: SpeedAlertConfig;

  // Biometric
  biometricEnabled: boolean;

  // Theme
  themeMode: ThemeMode;
  ambientLuxThreshold: number;
  nightStartHour: number;
  nightEndHour: number;

  // Actions
  setSpeedUnit: (unit: 'kmh' | 'mph') => void;
  toggleSpeedUnit: () => void;
  setAutoDetectUnit: (enabled: boolean) => void;
  setShowBothUnits: (show: boolean) => void;
  setSpeedDisplayPrecision: (precision: 0 | 1) => void;
  setAutoHudOnDrive: (enabled: boolean) => void;
  setHudBrightness: (brightness: number) => void;
  setHudColor: (color: string) => void;
  setSpeedAlert: (config: Partial<SpeedAlertConfig>) => void;
  setBiometricEnabled: (enabled: boolean) => void;
  setThemeMode: (mode: ThemeMode) => void;
  setAmbientLuxThreshold: (lux: number) => void;
  setNightHours: (start: number, end: number) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  speedUnit: 'kmh',
  distanceUnit: 'km',
  autoDetectUnit: false,
  showBothUnits: false,
  speedDisplayPrecision: 0,
  autoHudOnDrive: false,
  hudBrightness: 1.0,
  hudColor: '#00FF41',
  speedAlert: {
    enabled: false,
    speedLimit: 120,
    warningThreshold: 0.9,
    alertType: 'both',
    cooldownSeconds: 10,
  },
  biometricEnabled: false,
  themeMode: 'dark',
  ambientLuxThreshold: 20,
  nightStartHour: 19,
  nightEndHour: 6,

  setSpeedUnit: (unit) =>
    set({ speedUnit: unit, distanceUnit: unit === 'kmh' ? 'km' : 'mi' }),
  toggleSpeedUnit: () =>
    set((state) => ({
      speedUnit: state.speedUnit === 'kmh' ? 'mph' : 'kmh',
      distanceUnit: state.speedUnit === 'kmh' ? 'mi' : 'km',
    })),
  setAutoDetectUnit: (enabled) => set({ autoDetectUnit: enabled }),
  setShowBothUnits: (show) => set({ showBothUnits: show }),
  setSpeedDisplayPrecision: (precision) => set({ speedDisplayPrecision: precision }),
  setAutoHudOnDrive: (enabled) => set({ autoHudOnDrive: enabled }),
  setHudBrightness: (brightness) => set({ hudBrightness: brightness }),
  setHudColor: (color) => set({ hudColor: color }),
  setSpeedAlert: (config) =>
    set((state) => ({
      speedAlert: { ...state.speedAlert, ...config },
    })),
  setBiometricEnabled: (enabled) => set({ biometricEnabled: enabled }),
  setThemeMode: (mode) => set({ themeMode: mode }),
  setAmbientLuxThreshold: (lux) => set({ ambientLuxThreshold: lux }),
  setNightHours: (start, end) => set({ nightStartHour: start, nightEndHour: end }),
}));
