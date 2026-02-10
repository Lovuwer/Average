import { formatSpeed, formatDistance, formatDuration, formatDate } from '../../../src/utils/formatters';

describe('formatSpeed', () => {
  it('converts m/s to km/h correctly', () => {
    expect(formatSpeed(27.78, 'kmh')).toBe('100');
  });

  it('converts m/s to mph correctly', () => {
    expect(formatSpeed(27.78, 'mph')).toBe('62');
  });

  it('returns 0 for 0 speed', () => {
    expect(formatSpeed(0, 'kmh')).toBe('0');
  });

  it('returns 0 for negative speed', () => {
    expect(formatSpeed(-1, 'kmh')).toBe('0');
  });
});

describe('formatDistance', () => {
  it('formats distance >= 1000 as km', () => {
    expect(formatDistance(1500)).toBe('1.5 km');
  });

  it('formats distance < 1000 as m', () => {
    expect(formatDistance(500)).toBe('500 m');
  });
});

describe('formatDuration', () => {
  it('formats hours, minutes, and seconds', () => {
    expect(formatDuration(3661)).toBe('01:01:01');
  });

  it('formats zero duration', () => {
    expect(formatDuration(0)).toBe('00:00:00');
  });

  it('formats seconds only', () => {
    expect(formatDuration(59)).toBe('00:00:59');
  });
});

describe('formatDate', () => {
  it('formats a timestamp as a readable date', () => {
    // Jan 15, 2024 00:00:00 UTC
    const timestamp = Date.UTC(2024, 0, 15);
    const result = formatDate(timestamp);
    expect(result).toContain('Jan');
    expect(result).toContain('15');
    expect(result).toContain('2024');
  });
});
