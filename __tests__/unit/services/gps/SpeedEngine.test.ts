jest.mock('../../../../src/services/gps/GPSService', () => ({
  gpsService: {
    startTracking: jest.fn(),
    stopTracking: jest.fn(),
    requestPermissions: jest.fn(),
    isTracking: jest.fn(),
  },
}));

import {
  msToKmh,
  msToMph,
  metersToKm,
  metersToMiles,
  speedEngine,
  SpeedData,
} from '../../../../src/services/gps/SpeedEngine';
import { gpsService } from '../../../../src/services/gps/GPSService';

describe('SpeedEngine', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    speedEngine.reset();
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Ensure engine is stopped after each test
    if (speedEngine.running) {
      speedEngine.stop();
    }
    jest.useRealTimers();
  });

  describe('unit conversion functions', () => {
    it('msToKmh converts correctly (multiply by 3.6)', () => {
      expect(msToKmh(1)).toBeCloseTo(3.6);
      expect(msToKmh(10)).toBeCloseTo(36);
      expect(msToKmh(0)).toBe(0);
    });

    it('msToMph converts correctly (multiply by 2.23694)', () => {
      expect(msToMph(1)).toBeCloseTo(2.23694);
      expect(msToMph(10)).toBeCloseTo(22.3694);
      expect(msToMph(0)).toBe(0);
    });

    it('metersToKm converts correctly', () => {
      expect(metersToKm(1000)).toBe(1);
      expect(metersToKm(500)).toBe(0.5);
      expect(metersToKm(0)).toBe(0);
    });

    it('metersToMiles converts correctly', () => {
      expect(metersToMiles(1609.344)).toBeCloseTo(1);
      expect(metersToMiles(0)).toBe(0);
    });
  });

  describe('speedEngine instance', () => {
    it('starts not running, not paused', () => {
      expect(speedEngine.running).toBe(false);
      expect(speedEngine.paused).toBe(false);
    });

    it('start() sets running state and calls gpsService.startTracking', () => {
      const callback = jest.fn();
      speedEngine.start(callback);

      expect(speedEngine.running).toBe(true);
      expect(gpsService.startTracking).toHaveBeenCalled();
    });

    it('stop() returns null if not running', () => {
      const result = speedEngine.stop();
      expect(result).toBeNull();
    });

    it('stop() returns TripSummary when running', () => {
      const callback = jest.fn();
      speedEngine.start(callback);

      const summary = speedEngine.stop();
      expect(summary).not.toBeNull();
      expect(summary).toHaveProperty('startTime');
      expect(summary).toHaveProperty('endTime');
      expect(summary).toHaveProperty('currentSpeed');
      expect(summary).toHaveProperty('averageSpeed');
      expect(summary).toHaveProperty('maxSpeed');
      expect(summary).toHaveProperty('totalDistance');
      expect(summary).toHaveProperty('tripDuration');
      expect(summary).toHaveProperty('speedHistory');
    });

    it('pause() sets paused state', () => {
      const callback = jest.fn();
      speedEngine.start(callback);
      speedEngine.pause();

      expect(speedEngine.paused).toBe(true);
    });

    it('resume() clears paused state', () => {
      const callback = jest.fn();
      speedEngine.start(callback);
      speedEngine.pause();
      expect(speedEngine.paused).toBe(true);

      speedEngine.resume();
      expect(speedEngine.paused).toBe(false);
    });

    it('reset() clears all data', () => {
      const callback = jest.fn();
      speedEngine.start(callback);

      speedEngine.stop();
      speedEngine.reset();

      expect(speedEngine.running).toBe(false);
      expect(speedEngine.paused).toBe(false);

      const data = speedEngine.getCurrentData();
      expect(data.currentSpeed).toBe(0);
      expect(data.averageSpeed).toBe(0);
      expect(data.maxSpeed).toBe(0);
      expect(data.totalDistance).toBe(0);
      expect(data.speedHistory).toEqual([]);
    });

    it('getCurrentData() returns SpeedData with zero values initially', () => {
      const data: SpeedData = speedEngine.getCurrentData();
      expect(data.currentSpeed).toBe(0);
      expect(data.averageSpeed).toBe(0);
      expect(data.maxSpeed).toBe(0);
      expect(data.totalDistance).toBe(0);
      expect(data.tripDuration).toBe(0);
      expect(data.speedHistory).toEqual([]);
    });
  });
});
