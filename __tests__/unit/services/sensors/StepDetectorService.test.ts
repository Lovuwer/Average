import { NativeModules, NativeEventEmitter } from 'react-native';
import { stepDetectorService } from '../../../../src/services/sensors/StepDetectorService';

let onStepDetectedCallback: ((data: any) => void) | null = null;

// Save reference to the mock module set up by jest.setup.ts
const savedStepDetectorModule = NativeModules.StepDetectorModule;

function simulateStepsAtFrequency(freq: number, numSteps: number = 5) {
  const baseTime = Date.now();
  const totalTimeMs = ((numSteps - 1) / freq) * 1000;
  for (let i = 0; i < numSteps; i++) {
    const t = baseTime + (i / (numSteps - 1)) * totalTimeMs;
    onStepDetectedCallback!({ timestamp: t });
  }
  jest.setSystemTime(new Date(baseTime + totalTimeMs));
}

describe('StepDetectorService', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-01T00:00:00Z'));
    jest.clearAllMocks();
    onStepDetectedCallback = null;

    // Restore the native module (isolateModules tests may have set it to undefined)
    NativeModules.StepDetectorModule = savedStepDetectorModule;
    NativeModules.StepDetectorModule.addListener = jest.fn();
    NativeModules.StepDetectorModule.removeListeners = jest.fn();

    // Override addListener on the prototype so we can capture event callbacks
    NativeEventEmitter.prototype.addListener = jest.fn(
      (eventName: string, callback: (...args: any[]) => any) => {
        if (eventName === 'onStepDetected') {
          onStepDetectedCallback = callback;
        }
        return { remove: jest.fn() };
      },
    ) as any;
  });

  afterEach(() => {
    stepDetectorService.stopListening();
    jest.useRealTimers();
  });

  describe('isAvailable', () => {
    it('returns true when native module exists', async () => {
      const result = await stepDetectorService.isAvailable();
      expect(result).toBe(true);
    });

    it('returns false when native module is undefined (simulator)', async () => {
      let freshService: any;
      jest.isolateModules(() => {
        const rn = require('react-native');
        rn.NativeModules.StepDetectorModule = undefined;
        freshService =
          require('../../../../src/services/sensors/StepDetectorService').stepDetectorService;
      });
      const result = await freshService.isAvailable();
      expect(result).toBe(false);
    });
  });

  describe('startListening', () => {
    it('calls native module start', () => {
      stepDetectorService.startListening();
      expect(NativeModules.StepDetectorModule.start).toHaveBeenCalled();
    });
  });

  describe('stopListening', () => {
    it('calls native module stop', () => {
      stepDetectorService.startListening();
      stepDetectorService.stopListening();
      expect(NativeModules.StepDetectorModule.stop).toHaveBeenCalled();
    });
  });

  describe('getStepFrequency', () => {
    it('returns 0 with less than 3 steps', () => {
      stepDetectorService.startListening();
      const now = Date.now();
      onStepDetectedCallback!({ timestamp: now });
      onStepDetectedCallback!({ timestamp: now + 500 });
      jest.setSystemTime(new Date(now + 500));
      expect(stepDetectorService.getStepFrequency()).toBe(0);
    });

    it('calculates correctly from step timestamps', () => {
      stepDetectorService.startListening();
      const now = Date.now();
      // 5 steps over 2 seconds → (5-1) / 2.0 = 2.0 steps/sec
      for (let i = 0; i < 5; i++) {
        onStepDetectedCallback!({ timestamp: now + i * 500 });
      }
      jest.setSystemTime(new Date(now + 2000));
      expect(stepDetectorService.getStepFrequency()).toBe(2.0);
    });

    it('returns 0 when last step was >2 seconds ago', () => {
      stepDetectorService.startListening();
      const now = Date.now();
      for (let i = 0; i < 5; i++) {
        onStepDetectedCallback!({ timestamp: now + i * 500 });
      }
      // Last step at now+2000, set time 2001ms later
      jest.setSystemTime(new Date(now + 2000 + 2001));
      expect(stepDetectorService.getStepFrequency()).toBe(0);
    });
  });

  describe('getEstimatedSpeed', () => {
    it('for slow walk (1.5 steps/sec) ≈ 0.90 m/s', () => {
      stepDetectorService.startListening();
      simulateStepsAtFrequency(1.5);
      // stride = 0.60, speed = 1.5 × 0.60 = 0.90
      expect(stepDetectorService.getEstimatedSpeed()).toBeCloseTo(0.9, 2);
    });

    it('for normal walk (1.8 steps/sec) ≈ 1.20 m/s', () => {
      stepDetectorService.startListening();
      simulateStepsAtFrequency(1.8);
      // stride = 0.60 + (0.3/0.7)*0.15 ≈ 0.6643, speed = 1.8 × 0.6643 ≈ 1.196
      expect(stepDetectorService.getEstimatedSpeed()).toBeCloseTo(1.196, 1);
    });

    it('for running (3.0 steps/sec) ≈ 3.15 m/s', () => {
      stepDetectorService.startListening();
      simulateStepsAtFrequency(3.0);
      // stride = 0.95 + (0.2/0.7)*0.35 = 1.05, speed = 3.0 × 1.05 = 3.15
      expect(stepDetectorService.getEstimatedSpeed()).toBeCloseTo(3.15, 2);
    });
  });

  describe('iOS integration', () => {
    it('prefers iOS cadence when available over manual calculation', () => {
      stepDetectorService.startListening();
      // Send a single step with iOS cadence — normally <3 steps returns 0
      onStepDetectedCallback!({ timestamp: Date.now(), cadence: 2.0 });
      expect(stepDetectorService.getStepFrequency()).toBe(2.0);
      expect(stepDetectorService.getCadence()).toBe(2.0);
    });

    it('prefers iOS pace for speed when available over stride model', () => {
      stepDetectorService.startListening();
      // pace = 0.5 sec/m → speed = 1/0.5 = 2.0 m/s
      onStepDetectedCallback!({ timestamp: Date.now(), pace: 0.5 });
      expect(stepDetectorService.getEstimatedSpeed()).toBe(2.0);
      expect(stepDetectorService.getPace()).toBe(0.5);
    });
  });

  describe('graceful degradation', () => {
    it('methods return 0/false when native module unavailable', async () => {
      let freshService: any;
      jest.isolateModules(() => {
        const rn = require('react-native');
        rn.NativeModules.StepDetectorModule = undefined;
        freshService =
          require('../../../../src/services/sensors/StepDetectorService').stepDetectorService;
      });

      expect(await freshService.isAvailable()).toBe(false);
      expect(freshService.getStepFrequency()).toBe(0);
      expect(freshService.getEstimatedSpeed()).toBe(0);
      expect(freshService.getCadence()).toBeNull();
      expect(freshService.getPace()).toBeNull();
      expect(freshService.getIosDistance()).toBeNull();
      // Should not throw
      freshService.startListening();
      freshService.stopListening();
    });
  });
});
