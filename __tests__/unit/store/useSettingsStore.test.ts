import { useSettingsStore } from '../../../src/store/useSettingsStore';

describe('useSettingsStore', () => {
  beforeEach(() => {
    useSettingsStore.setState({
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
    });
  });

  it('has correct initial state', () => {
    const state = useSettingsStore.getState();
    expect(state.speedUnit).toBe('kmh');
    expect(state.themeMode).toBe('dark');
    expect(state.speedAlert.enabled).toBe(false);
  });

  it('setSpeedUnit updates both speed and distance units', () => {
    useSettingsStore.getState().setSpeedUnit('mph');
    expect(useSettingsStore.getState().speedUnit).toBe('mph');
    expect(useSettingsStore.getState().distanceUnit).toBe('mi');
  });

  it('toggleSpeedUnit switches between kmh and mph', () => {
    useSettingsStore.getState().toggleSpeedUnit();
    expect(useSettingsStore.getState().speedUnit).toBe('mph');
    useSettingsStore.getState().toggleSpeedUnit();
    expect(useSettingsStore.getState().speedUnit).toBe('kmh');
  });

  it('setAutoDetectUnit updates flag', () => {
    useSettingsStore.getState().setAutoDetectUnit(true);
    expect(useSettingsStore.getState().autoDetectUnit).toBe(true);
  });

  it('setShowBothUnits updates flag', () => {
    useSettingsStore.getState().setShowBothUnits(true);
    expect(useSettingsStore.getState().showBothUnits).toBe(true);
  });

  it('setSpeedDisplayPrecision updates value', () => {
    useSettingsStore.getState().setSpeedDisplayPrecision(1);
    expect(useSettingsStore.getState().speedDisplayPrecision).toBe(1);
  });

  it('setAutoHudOnDrive updates flag', () => {
    useSettingsStore.getState().setAutoHudOnDrive(true);
    expect(useSettingsStore.getState().autoHudOnDrive).toBe(true);
  });

  it('setHudBrightness updates value', () => {
    useSettingsStore.getState().setHudBrightness(0.5);
    expect(useSettingsStore.getState().hudBrightness).toBe(0.5);
  });

  it('setHudColor updates value', () => {
    useSettingsStore.getState().setHudColor('#FF0000');
    expect(useSettingsStore.getState().hudColor).toBe('#FF0000');
  });

  it('setSpeedAlert updates partial config', () => {
    useSettingsStore.getState().setSpeedAlert({ enabled: true, speedLimit: 80 });
    const alert = useSettingsStore.getState().speedAlert;
    expect(alert.enabled).toBe(true);
    expect(alert.speedLimit).toBe(80);
    expect(alert.warningThreshold).toBe(0.9); // unchanged
  });

  it('setBiometricEnabled updates flag', () => {
    useSettingsStore.getState().setBiometricEnabled(true);
    expect(useSettingsStore.getState().biometricEnabled).toBe(true);
  });

  it('setThemeMode updates mode', () => {
    useSettingsStore.getState().setThemeMode('auto-system');
    expect(useSettingsStore.getState().themeMode).toBe('auto-system');
  });

  it('setAmbientLuxThreshold updates value', () => {
    useSettingsStore.getState().setAmbientLuxThreshold(30);
    expect(useSettingsStore.getState().ambientLuxThreshold).toBe(30);
  });

  it('setNightHours updates start and end', () => {
    useSettingsStore.getState().setNightHours(20, 7);
    expect(useSettingsStore.getState().nightStartHour).toBe(20);
    expect(useSettingsStore.getState().nightEndHour).toBe(7);
  });
});
