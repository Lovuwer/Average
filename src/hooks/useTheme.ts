import { useSettingsStore } from '../store/useSettingsStore';
import { themeManager } from '../services/theme/ThemeManager';
import { DARK_THEME, LIGHT_THEME, ThemeColors } from '../theme/themes';

export function useTheme(): { theme: 'light' | 'dark'; colors: ThemeColors } {
  const { themeMode, ambientLuxThreshold, nightStartHour, nightEndHour } = useSettingsStore();

  const theme = themeManager.resolveTheme({
    mode: themeMode,
    ambientLuxThreshold,
    nightStartHour,
    nightEndHour,
  });

  return {
    theme,
    colors: theme === 'dark' ? DARK_THEME : LIGHT_THEME,
  };
}
