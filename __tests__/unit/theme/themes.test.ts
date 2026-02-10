import { DARK_THEME, LIGHT_THEME } from '../../../src/theme/themes';

describe('Themes', () => {
  it('DARK_THEME has all required color keys', () => {
    const requiredKeys = ['background', 'surface', 'primary', 'secondary', 'text', 'textSecondary', 'border', 'danger', 'success', 'speedGreen', 'speedYellow', 'speedRed'];
    requiredKeys.forEach(key => {
      expect(DARK_THEME).toHaveProperty(key);
    });
  });

  it('LIGHT_THEME has all required color keys', () => {
    const requiredKeys = ['background', 'surface', 'primary', 'secondary', 'text', 'textSecondary', 'border', 'danger', 'success', 'speedGreen', 'speedYellow', 'speedRed'];
    requiredKeys.forEach(key => {
      expect(LIGHT_THEME).toHaveProperty(key);
    });
  });

  it('DARK_THEME and LIGHT_THEME have identical key sets', () => {
    const darkKeys = Object.keys(DARK_THEME).sort();
    const lightKeys = Object.keys(LIGHT_THEME).sort();
    expect(darkKeys).toEqual(lightKeys);
  });

  it('all color values are strings', () => {
    Object.values(DARK_THEME).forEach(value => {
      expect(typeof value).toBe('string');
    });
    Object.values(LIGHT_THEME).forEach(value => {
      expect(typeof value).toBe('string');
    });
  });

  it('speed color values are distinguishable from each other', () => {
    expect(DARK_THEME.speedGreen).not.toBe(DARK_THEME.speedYellow);
    expect(DARK_THEME.speedYellow).not.toBe(DARK_THEME.speedRed);
    expect(DARK_THEME.speedGreen).not.toBe(DARK_THEME.speedRed);
  });

  it('dark theme has dark background', () => {
    expect(DARK_THEME.background).toBe('#0A0A0A');
  });

  it('light theme has light background', () => {
    expect(LIGHT_THEME.background).toBe('#F5F5F7');
  });
});
