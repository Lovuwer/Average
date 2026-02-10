import { Appearance } from 'react-native';
import { ThemeManager } from '../../../../src/services/theme/ThemeManager';

describe('ThemeManager', () => {
  let manager: ThemeManager;

  beforeEach(() => {
    manager = new ThemeManager();
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('resolveTheme light returns light', () => {
    expect(manager.resolveTheme({ mode: 'light', ambientLuxThreshold: 20, nightStartHour: 19, nightEndHour: 6 })).toBe('light');
  });

  it('resolveTheme dark returns dark', () => {
    expect(manager.resolveTheme({ mode: 'dark', ambientLuxThreshold: 20, nightStartHour: 19, nightEndHour: 6 })).toBe('dark');
  });

  it('resolveTheme auto-system returns system preference', () => {
    jest.spyOn(Appearance, 'getColorScheme').mockReturnValue('dark');
    expect(manager.resolveTheme({ mode: 'auto-system', ambientLuxThreshold: 20, nightStartHour: 19, nightEndHour: 6 })).toBe('dark');
  });

  it('resolveTheme auto-system returns light when system is light', () => {
    jest.spyOn(Appearance, 'getColorScheme').mockReturnValue('light');
    expect(manager.resolveTheme({ mode: 'auto-system', ambientLuxThreshold: 20, nightStartHour: 19, nightEndHour: 6 })).toBe('light');
  });

  it('resolveTheme auto-ambient returns dark when lux < threshold', () => {
    manager.addLuxReading(10);
    expect(manager.getAmbientTheme(20)).toBe('dark');
  });

  it('resolveTheme auto-ambient returns light when lux >= threshold', () => {
    manager.addLuxReading(30);
    expect(manager.getAmbientTheme(20)).toBe('light');
  });

  it('resolveTheme auto-ambient falls back to system when no readings', () => {
    jest.spyOn(Appearance, 'getColorScheme').mockReturnValue('light');
    expect(manager.getAmbientTheme(20)).toBe('light');
  });

  it('resolveTheme auto-time dark at 21:00', () => {
    jest.spyOn(Date.prototype, 'getHours').mockReturnValue(21);
    expect(manager.getTimeBasedTheme(19, 6)).toBe('dark');
  });

  it('resolveTheme auto-time light at 12:00', () => {
    jest.spyOn(Date.prototype, 'getHours').mockReturnValue(12);
    expect(manager.getTimeBasedTheme(19, 6)).toBe('light');
  });

  it('resolveTheme auto-time dark at 03:00 (overnight)', () => {
    jest.spyOn(Date.prototype, 'getHours').mockReturnValue(3);
    expect(manager.getTimeBasedTheme(19, 6)).toBe('dark');
  });

  it('resolveTheme auto-time light at 06:00 boundary', () => {
    jest.spyOn(Date.prototype, 'getHours').mockReturnValue(6);
    expect(manager.getTimeBasedTheme(19, 6)).toBe('light');
  });

  it('resolveTheme auto-time dark at 19:00 boundary', () => {
    jest.spyOn(Date.prototype, 'getHours').mockReturnValue(19);
    expect(manager.getTimeBasedTheme(19, 6)).toBe('dark');
  });

  it('canSwitchTheme prevents switching within 3 seconds', () => {
    expect(manager.canSwitchTheme()).toBe(true);
    expect(manager.canSwitchTheme()).toBe(false); // within 3 seconds
  });

  it('rolling average of 5 lux readings smooths flickering', () => {
    manager.addLuxReading(5);
    manager.addLuxReading(5);
    manager.addLuxReading(5);
    manager.addLuxReading(5);
    manager.addLuxReading(100); // spike
    // avg = (5+5+5+5+100)/5 = 24, above threshold 20 → light
    expect(manager.getAmbientTheme(20)).toBe('light');
  });

  it('lux readings buffer keeps only last 5', () => {
    for (let i = 0; i < 10; i++) {
      manager.addLuxReading(50);
    }
    // should only have 5 readings, all 50
    manager.addLuxReading(5);
    // readings: [50, 50, 50, 50, 5], avg = 41
    expect(manager.getAmbientTheme(20)).toBe('light');
  });

  it('reset clears lux readings', () => {
    manager.addLuxReading(50);
    manager.reset();
    jest.spyOn(Appearance, 'getColorScheme').mockReturnValue('dark');
    expect(manager.getAmbientTheme(20)).toBe('dark'); // falls back to system
  });
});
