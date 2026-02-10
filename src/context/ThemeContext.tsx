import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Appearance } from 'react-native';
import { DARK_THEME, LIGHT_THEME, ThemeColors } from '../theme/themes';
import { useSettingsStore } from '../store/useSettingsStore';
import { ThemeManager } from '../services/theme/ThemeManager';

interface ThemeContextValue {
  theme: 'light' | 'dark';
  colors: ThemeColors;
  toggleTheme: () => void;
  setThemeMode: (mode: 'light' | 'dark' | 'auto-system' | 'auto-ambient' | 'auto-time') => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'dark',
  colors: DARK_THEME,
  toggleTheme: () => {},
  setThemeMode: () => {},
});

const themeManagerInstance = new ThemeManager();

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { themeMode, ambientLuxThreshold, nightStartHour, nightEndHour, setThemeMode: storeSetThemeMode } = useSettingsStore();
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  useEffect(() => {
    const resolved = themeManagerInstance.resolveTheme({
      mode: themeMode,
      ambientLuxThreshold,
      nightStartHour,
      nightEndHour,
    });
    setTheme(resolved);
  }, [themeMode, ambientLuxThreshold, nightStartHour, nightEndHour]);

  useEffect(() => {
    if (themeMode === 'auto-system') {
      const listener = Appearance.addChangeListener(({ colorScheme }) => {
        setTheme(colorScheme === 'dark' ? 'dark' : 'light');
      });
      return () => listener.remove();
    }

    if (themeMode === 'auto-time') {
      const interval = setInterval(() => {
        const resolved = themeManagerInstance.getTimeBasedTheme(nightStartHour, nightEndHour);
        setTheme(resolved);
      }, 60000);
      return () => clearInterval(interval);
    }
  }, [themeMode, nightStartHour, nightEndHour]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const colors = theme === 'dark' ? DARK_THEME : LIGHT_THEME;

  return (
    <ThemeContext.Provider
      value={{
        theme,
        colors,
        toggleTheme,
        setThemeMode: storeSetThemeMode,
      }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useThemeContext = () => useContext(ThemeContext);
