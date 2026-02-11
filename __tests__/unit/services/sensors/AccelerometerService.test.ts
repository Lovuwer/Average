import { accelerometer, gyroscope, barometer } from 'react-native-sensors';
import { accelerometerService } from '@/services/sensors/AccelerometerService';

let accelCallback: any = null;
let gyroCallback: any = null;
let baroCallback: any = null;
let mockNow: number;
const originalDateNow = Date.now;

beforeEach(() => {
  jest.clearAllMocks();
  accelCallback = null;
  gyroCallback = null;
  baroCallback = null;
  mockNow = 1000000;
  Date.now = jest.fn(() => mockNow);

  (accelerometer.subscribe as jest.Mock).mockImplementation((observer: any) => {
    accelCallback = observer.next;
    return { unsubscribe: jest.fn() };
  });

  (gyroscope.subscribe as jest.Mock).mockImplementation((observer: any) => {
    gyroCallback = observer.next;
    return { unsubscribe: jest.fn() };
  });

  (barometer.subscribe as jest.Mock).mockImplementation((observer: any) => {
    baroCallback = observer.next;
    return { unsubscribe: jest.fn() };
  });
});

afterEach(() => {
  accelerometerService.stopListening();
  Date.now = originalDateNow;
});

describe('AccelerometerService', () => {
  describe('initial state', () => {
    it('should have stationary as initial state', () => {
      expect(accelerometerService.getCurrentState()).toBe('stationary');
    });
  });

  describe('startListening / stopListening', () => {
    it('should subscribe to accelerometer and gyroscope on startListening', () => {
      accelerometerService.startListening();

      expect(accelerometer.subscribe).toHaveBeenCalled();
      expect(gyroscope.subscribe).toHaveBeenCalled();
    });

    it('should unsubscribe from all sensors on stopListening', () => {
      accelerometerService.startListening();

      const accelUnsub = (accelerometer.subscribe as jest.Mock).mock.results[0].value.unsubscribe;
      const gyroUnsub = (gyroscope.subscribe as jest.Mock).mock.results[0].value.unsubscribe;
      const baroUnsub = (barometer.subscribe as jest.Mock).mock.results[0].value.unsubscribe;

      accelerometerService.stopListening();

      expect(accelUnsub).toHaveBeenCalled();
      expect(gyroUnsub).toHaveBeenCalled();
      expect(baroUnsub).toHaveBeenCalled();
    });
  });

  describe('gravity removal', () => {
    it('should produce near-zero linear acceleration from constant 9.81 input after stabilization', () => {
      accelerometerService.startListening();

      // Feed many constant gravity readings so the low-pass filter converges
      for (let i = 0; i < 200; i++) {
        mockNow += 20;
        accelCallback({ x: 0, y: 0, z: 9.81, timestamp: mockNow });
      }

      // After convergence, magnitude should be near zero
      const magnitude = accelerometerService.getAccelMagnitude();
      expect(magnitude).toBeLessThan(0.1);
    });
  });

  describe('motion classification', () => {
    it('should classify low variance (<0.08) as stationary', () => {
      accelerometerService.startListening();

      // Feed constant data → variance ≈ 0
      for (let i = 0; i < 200; i++) {
        mockNow += 20;
        accelCallback({ x: 0, y: 0, z: 9.81, timestamp: mockNow });
      }

      expect(accelerometerService.getCurrentState()).toBe('stationary');
      expect(accelerometerService.getAccelVariance()).toBeLessThan(0.08);
    });

    it('should classify high periodic variance (0.6–5.0) as running', () => {
      accelerometerService.startListening();

      // First stabilize gravity filter
      for (let i = 0; i < 50; i++) {
        mockNow += 20;
        accelCallback({ x: 0, y: 0, z: 9.81, timestamp: mockNow });
      }

      // Simulate running: high-amplitude oscillation at ~3 Hz (period ~17 samples at 50Hz)
      // Need enough consecutive classifications to pass debounce (5)
      for (let i = 0; i < 200; i++) {
        mockNow += 20;
        const amplitude = 4.0;
        const freq = 3.0; // Hz within running range 2.0–4.0
        const t = i / 50; // seconds
        const z = 9.81 + amplitude * Math.sin(2 * Math.PI * freq * t);
        accelCallback({ x: 0, y: 0, z, timestamp: mockNow });
      }

      expect(accelerometerService.getCurrentState()).toBe('running');
    });

    it('should classify smooth low-variance with no periodicity as vehicle', () => {
      accelerometerService.startListening();

      // First stabilize gravity filter
      for (let i = 0; i < 50; i++) {
        mockNow += 20;
        accelCallback({ x: 0, y: 0, z: 9.81, timestamp: mockNow });
      }

      // Vehicle: sawtooth ramp creates sustained low-frequency magnitude variation
      // variance in [0.08, 1.5] and dominant frequency < 1.0 Hz
      for (let i = 0; i < 200; i++) {
        mockNow += 20;
        const z = 9.81 + 3.0 * ((i % 100) / 100);
        accelCallback({ x: 0, y: 0, z, timestamp: mockNow });
      }

      expect(accelerometerService.getCurrentState()).toBe('vehicle');
    });
  });

  describe('debounce', () => {
    it('should not change state from a single anomalous reading', () => {
      accelerometerService.startListening();

      // Establish stationary state
      for (let i = 0; i < 100; i++) {
        mockNow += 20;
        accelCallback({ x: 0, y: 0, z: 9.81, timestamp: mockNow });
      }
      expect(accelerometerService.getCurrentState()).toBe('stationary');

      // One large spike should not change state (debounce requires 5)
      mockNow += 20;
      accelCallback({ x: 10, y: 10, z: 10, timestamp: mockNow });

      expect(accelerometerService.getCurrentState()).toBe('stationary');
    });

    it('should change state after 5 consecutive same classifications', () => {
      accelerometerService.startListening();

      // Establish stationary
      for (let i = 0; i < 50; i++) {
        mockNow += 20;
        accelCallback({ x: 0, y: 0, z: 9.81, timestamp: mockNow });
      }
      expect(accelerometerService.getCurrentState()).toBe('stationary');

      // Sustained oscillation to trigger running classification repeatedly
      for (let i = 0; i < 200; i++) {
        mockNow += 20;
        const amplitude = 4.0;
        const freq = 3.0;
        const t = i / 50;
        const z = 9.81 + amplitude * Math.sin(2 * Math.PI * freq * t);
        accelCallback({ x: 0, y: 0, z, timestamp: mockNow });
      }

      // After enough consecutive running classifications, debounce should trigger
      expect(accelerometerService.getCurrentState()).not.toBe('stationary');
    });
  });

  describe('gyroscope', () => {
    it('should return gyroscope z-axis rotation rate from getYawRate', () => {
      accelerometerService.startListening();

      gyroCallback({ x: 0.1, y: 0.2, z: 0.5, timestamp: mockNow });

      expect(accelerometerService.getYawRate()).toBe(0.5);
    });
  });

  describe('barometer', () => {
    it('should calculate altitude change from barometric pressure', () => {
      accelerometerService.startListening();

      // Sea level pressure ~1013.25 hPa → altitude ≈ 0
      baroCallback({ pressure: 1013.25 });

      // Lower pressure means higher altitude
      baroCallback({ pressure: 1001.0 });

      const altitudeChange = accelerometerService.getAltitudeChange();
      expect(altitudeChange).toBeGreaterThan(0);
    });
  });

  describe('graceful degradation', () => {
    it('should not crash on sensor failure and return safe defaults', () => {
      // Override subscribe to simulate errors
      (accelerometer.subscribe as jest.Mock).mockImplementation((observer: any) => {
        if (observer.error) observer.error(new Error('Sensor unavailable'));
        return { unsubscribe: jest.fn() };
      });

      (gyroscope.subscribe as jest.Mock).mockImplementation((observer: any) => {
        if (observer.error) observer.error(new Error('Sensor unavailable'));
        return { unsubscribe: jest.fn() };
      });

      (barometer.subscribe as jest.Mock).mockImplementation((observer: any) => {
        if (observer.error) observer.error(new Error('Sensor unavailable'));
        return { unsubscribe: jest.fn() };
      });

      expect(() => accelerometerService.startListening()).not.toThrow();
      expect(accelerometerService.getCurrentState()).toBe('stationary');
      expect(accelerometerService.getAccelMagnitude()).toBe(0);
      expect(accelerometerService.getAccelVariance()).toBe(0);
      expect(accelerometerService.getYawRate()).toBe(0);
      expect(accelerometerService.getAltitudeChange()).toBe(0);
    });
  });
});
