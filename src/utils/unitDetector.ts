import { NativeModules, Platform } from 'react-native';

export function detectPreferredUnit(): 'kmh' | 'mph' {
  try {
    let locale: string | undefined;

    if (Platform.OS === 'ios') {
      locale = NativeModules.SettingsManager?.settings?.AppleLocale;
    } else {
      locale = NativeModules.I18nManager?.localeIdentifier;
    }

    if (!locale) {
      return 'kmh';
    }

    const imperialLocales = ['en_US', 'en_GB', 'my_MM', 'en_LR'];
    return imperialLocales.some(l => locale!.startsWith(l)) ? 'mph' : 'kmh';
  } catch {
    return 'kmh';
  }
}
