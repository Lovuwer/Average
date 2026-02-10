import {
  haversineDistance,
  calculateSpeed,
} from '../../../../src/services/gps/HaversineCalculator';

describe('HaversineCalculator', () => {
  describe('haversineDistance', () => {
    it('calculates distance between NYC and LA correctly', () => {
      // NYC: 40.7128, -74.0060  LA: 34.0522, -118.2437
      const distance = haversineDistance(40.7128, -74.006, 34.0522, -118.2437);
      const distanceKm = distance / 1000;
      // Expected ~3,944 km, within 50 km tolerance
      expect(distanceKm).toBeGreaterThan(3894);
      expect(distanceKm).toBeLessThan(3994);
    });

    it('distance between same point is 0', () => {
      const distance = haversineDistance(40.7128, -74.006, 40.7128, -74.006);
      expect(distance).toBe(0);
    });

    it('short distance accuracy', () => {
      // Two points roughly 1 km apart in Manhattan
      const distance = haversineDistance(40.7128, -74.006, 40.7218, -74.006);
      const distanceKm = distance / 1000;
      // ~1 km, within reasonable tolerance
      expect(distanceKm).toBeGreaterThan(0.5);
      expect(distanceKm).toBeLessThan(2.0);
    });

    it('handles equator crossing', () => {
      const distance = haversineDistance(1, 0, -1, 0);
      const distanceKm = distance / 1000;
      // ~222 km (2 degrees of latitude)
      expect(distanceKm).toBeGreaterThan(200);
      expect(distanceKm).toBeLessThan(250);
    });

    it('handles negative coordinates', () => {
      // Sydney: -33.8688, 151.2093  Buenos Aires: -34.6037, -58.3816
      const distance = haversineDistance(
        -33.8688,
        151.2093,
        -34.6037,
        -58.3816,
      );
      const distanceKm = distance / 1000;
      // Expected ~11,800 km, within reasonable tolerance
      expect(distanceKm).toBeGreaterThan(11000);
      expect(distanceKm).toBeLessThan(12500);
    });
  });

  describe('calculateSpeed', () => {
    it('calculates speed from two points with time delta', () => {
      // Two points ~111 km apart, 1 hour apart => ~30.8 m/s
      const speed = calculateSpeed(
        40.0,
        -74.0,
        0,
        41.0,
        -74.0,
        3600000, // 1 hour in ms
      );
      // ~111 km / 3600 s ≈ 30.8 m/s
      expect(speed).toBeGreaterThan(25);
      expect(speed).toBeLessThan(35);
    });

    it('returns 0 speed if time delta is 0', () => {
      const speed = calculateSpeed(40.0, -74.0, 1000, 41.0, -74.0, 1000);
      expect(speed).toBe(0);
    });

    it('returns 0 speed if time delta is negative', () => {
      const speed = calculateSpeed(40.0, -74.0, 2000, 41.0, -74.0, 1000);
      expect(speed).toBe(0);
    });
  });
});
