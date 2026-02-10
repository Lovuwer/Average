import { NativeModules } from 'react-native';

describe('unitDetector', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it('returns mph for en_US locale', () => {
    NativeModules.SettingsManager = { settings: { AppleLocale: 'en_US' } };
    NativeModules.I18nManager = { localeIdentifier: 'en_US' };
    const { detectPreferredUnit } = require('../../../src/utils/unitDetector');
    expect(detectPreferredUnit()).toBe('mph');
  });

  it('returns mph for en_GB locale', () => {
    NativeModules.SettingsManager = { settings: { AppleLocale: 'en_GB' } };
    NativeModules.I18nManager = { localeIdentifier: 'en_GB' };
    const { detectPreferredUnit } = require('../../../src/utils/unitDetector');
    expect(detectPreferredUnit()).toBe('mph');
  });

  it('returns kmh for de_DE locale', () => {
    NativeModules.SettingsManager = { settings: { AppleLocale: 'de_DE' } };
    NativeModules.I18nManager = { localeIdentifier: 'de_DE' };
    const { detectPreferredUnit } = require('../../../src/utils/unitDetector');
    expect(detectPreferredUnit()).toBe('kmh');
  });

  it('returns kmh for ja_JP locale', () => {
    NativeModules.SettingsManager = { settings: { AppleLocale: 'ja_JP' } };
    NativeModules.I18nManager = { localeIdentifier: 'ja_JP' };
    const { detectPreferredUnit } = require('../../../src/utils/unitDetector');
    expect(detectPreferredUnit()).toBe('kmh');
  });

  it('returns kmh for fr_FR locale', () => {
    NativeModules.SettingsManager = { settings: { AppleLocale: 'fr_FR' } };
    NativeModules.I18nManager = { localeIdentifier: 'fr_FR' };
    const { detectPreferredUnit } = require('../../../src/utils/unitDetector');
    expect(detectPreferredUnit()).toBe('kmh');
  });

  it('returns kmh for unknown locale (safe default)', () => {
    NativeModules.SettingsManager = { settings: { AppleLocale: 'xx_XX' } };
    NativeModules.I18nManager = { localeIdentifier: 'xx_XX' };
    const { detectPreferredUnit } = require('../../../src/utils/unitDetector');
    expect(detectPreferredUnit()).toBe('kmh');
  });

  it('handles null locale gracefully', () => {
    NativeModules.SettingsManager = { settings: {} };
    NativeModules.I18nManager = {};
    const { detectPreferredUnit } = require('../../../src/utils/unitDetector');
    expect(detectPreferredUnit()).toBe('kmh');
  });
});
