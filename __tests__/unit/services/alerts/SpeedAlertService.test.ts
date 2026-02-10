import { SpeedAlertService, SpeedAlertConfig } from '../../../../src/services/alerts/SpeedAlertService';
import { Vibration } from 'react-native';

describe('SpeedAlertService', () => {
  let service: SpeedAlertService;
  const defaultConfig: SpeedAlertConfig = {
    enabled: true,
    speedLimit: 100,
    warningThreshold: 0.9,
    alertType: 'both',
    cooldownSeconds: 10,
  };

  beforeEach(() => {
    service = new SpeedAlertService();
    jest.clearAllMocks();
  });

  it('returns none when speed is below warning threshold', () => {
    const result = service.checkSpeed(80, defaultConfig);
    expect(result.level).toBe('none');
    expect(result.shouldAlert).toBe(false);
  });

  it('returns warning when speed >= warningThreshold% of limit', () => {
    const result = service.checkSpeed(90, defaultConfig);
    expect(result.level).toBe('warning');
    expect(result.shouldAlert).toBe(true);
  });

  it('returns exceeded when speed >= limit', () => {
    const result = service.checkSpeed(100, defaultConfig);
    expect(result.level).toBe('exceeded');
    expect(result.shouldAlert).toBe(true);
  });

  it('respects cooldown period', () => {
    service.checkSpeed(100, defaultConfig); // triggers alert
    const result = service.checkSpeed(100, defaultConfig); // within cooldown
    expect(result.shouldAlert).toBe(false);
    expect(result.level).toBe('exceeded');
  });

  it('returns none when alerts are disabled', () => {
    const result = service.checkSpeed(150, { ...defaultConfig, enabled: false });
    expect(result.level).toBe('none');
    expect(result.shouldAlert).toBe(false);
  });

  it('handles speed exactly at limit as exceeded', () => {
    const result = service.checkSpeed(100, defaultConfig);
    expect(result.level).toBe('exceeded');
  });

  it('handles speed exactly at warning threshold as warning', () => {
    const result = service.checkSpeed(90, defaultConfig);
    expect(result.level).toBe('warning');
  });

  it('handles speed = 0 as none', () => {
    const result = service.checkSpeed(0, defaultConfig);
    expect(result.level).toBe('none');
  });

  it('handles speed limit = 0 as exceeded', () => {
    const result = service.checkSpeed(10, { ...defaultConfig, speedLimit: 0 });
    expect(result.level).toBe('exceeded');
  });

  it('triggerAlert warning vibration calls Vibration.vibrate', () => {
    service.triggerAlert('warning', 'vibration');
    expect(Vibration.vibrate).toHaveBeenCalled();
  });

  it('triggerAlert exceeded vibration calls Vibration.vibrate with long pattern', () => {
    service.triggerAlert('exceeded', 'vibration');
    expect(Vibration.vibrate).toHaveBeenCalledWith([0, 500, 200, 500, 200, 500]);
  });

  it('triggerAlert both calls vibration', () => {
    service.triggerAlert('exceeded', 'both');
    expect(Vibration.vibrate).toHaveBeenCalled();
  });

  it('multiple rapid speed changes respect cooldown', () => {
    const results = [];
    for (let i = 0; i < 5; i++) {
      results.push(service.checkSpeed(110, defaultConfig));
    }
    // Only first should alert
    expect(results[0].shouldAlert).toBe(true);
    expect(results.slice(1).every(r => !r.shouldAlert)).toBe(true);
  });

  it('handles km/h speeds correctly', () => {
    const result = service.checkSpeed(95, { ...defaultConfig, speedLimit: 100 });
    expect(result.level).toBe('warning');
  });

  it('handles mph speeds correctly', () => {
    const result = service.checkSpeed(65, { ...defaultConfig, speedLimit: 65 });
    expect(result.level).toBe('exceeded');
  });

  it('reset clears last alert time', () => {
    service.checkSpeed(110, defaultConfig);
    service.reset();
    const result = service.checkSpeed(110, defaultConfig);
    expect(result.shouldAlert).toBe(true);
  });
});
