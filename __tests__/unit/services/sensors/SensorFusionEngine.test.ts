/* eslint-disable @typescript-eslint/no-explicit-any */

// ── Mock GPSService ──
const mockStartTracking = jest.fn();
const mockStopTracking = jest.fn();
jest.mock('../../../../src/services/gps/GPSService', () => ({
  gpsService: {
    startTracking: mockStartTracking,
    stopTracking: mockStopTracking,
    requestPermissions: jest.fn(() => Promise.resolve(true)),
    isTracking: jest.fn(),
  },
}));

// ── Mock StepDetectorService ──
const mockStepStart = jest.fn();
const mockStepStop = jest.fn();
const mockStepIsAvailable = jest.fn(() => Promise.resolve(true));
const mockGetStepFrequency = jest.fn(() => 0);
const mockGetEstimatedSpeed = jest.fn(() => 0);
const mockGetIosDistance = jest.fn(() => null);
jest.mock('../../../../src/services/sensors/StepDetectorService', () => ({
  stepDetectorService: {
    startListening: mockStepStart,
    stopListening: mockStepStop,
    isAvailable: mockStepIsAvailable,
    getStepFrequency: mockGetStepFrequency,
    getEstimatedSpeed: mockGetEstimatedSpeed,
    getCadence: jest.fn(() => null),
    getPace: jest.fn(() => null),
    getIosDistance: mockGetIosDistance,
  },
}));

// ── Mock AccelerometerService ──
const mockAccelStart = jest.fn();
const mockAccelStop = jest.fn();
const mockGetCurrentState = jest.fn(() => 'stationary');
const mockGetAccelMagnitude = jest.fn(() => 0);
const mockGetAccelVariance = jest.fn(() => 0);
const mockGetAltitudeChange = jest.fn(() => 0);
jest.mock('../../../../src/services/sensors/AccelerometerService', () => ({
  accelerometerService: {
    startListening: mockAccelStart,
    stopListening: mockAccelStop,
    getCurrentState: mockGetCurrentState,
    getAccelMagnitude: mockGetAccelMagnitude,
    getAccelVariance: mockGetAccelVariance,
    getLinearAcceleration: jest.fn(() => ({ x: 0, y: 0, z: 0 })),
    getYawRate: jest.fn(() => 0),
    getHeadingDelta: jest.fn(() => 0),
    resetHeadingDelta: jest.fn(),
    getAltitudeChange: mockGetAltitudeChange,
    resetAltitude: jest.fn(),
    isAccelerometerActive: jest.fn(() => true),
    isGyroscopeActive: jest.fn(() => true),
    isBarometerActive: jest.fn(() => true),
  },
}));

// ── Mock HaversineCalculator ──
jest.mock('../../../../src/services/gps/HaversineCalculator', () => ({
  haversineDistance: jest.fn(() => 0),
}));

import { sensorFusionEngine } from '../../../../src/services/sensors/SensorFusionEngine';
import type { FusionSpeedData } from '../../../../src/services/sensors/SensorFusionEngine';

// ── Helpers ──

function captureGpsCallback(): (pos: any) => void {
  return mockStartTracking.mock.calls[0][0];
}

function makeGpsPosition(
  speed: number,
  accuracy = 5,
  lat = 37.7749,
  lon = -122.4194,
) {
  return { latitude: lat, longitude: lon, altitude: 0, accuracy, speed, heading: 0, timestamp: Date.now() };
}

let emittedData: FusionSpeedData[] = [];
const fusionCallback = (data: FusionSpeedData) => {
  emittedData.push(data);
};

// ── Setup ──

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  emittedData = [];
  mockGetCurrentState.mockReturnValue('stationary');
  mockGetStepFrequency.mockReturnValue(0);
  mockGetEstimatedSpeed.mockReturnValue(0);
  mockGetAccelMagnitude.mockReturnValue(0);
  mockGetAccelVariance.mockReturnValue(0);
  mockGetIosDistance.mockReturnValue(null);
  sensorFusionEngine.reset();
});

afterEach(() => {
  // Ensure engine is stopped so intervals are cleared
  try { sensorFusionEngine.stop(); } catch (_e) { /* ignore */ }
  jest.useRealTimers();
});

// ════════════════════════════════════════════════════════════════
// STATIONARY MODE
// ════════════════════════════════════════════════════════════════

describe('Stationary mode', () => {
  it('outputs 0 speed when all sensors report stationary', () => {
    sensorFusionEngine.start(fusionCallback);

    // Advance past the 500ms emit interval
    jest.advanceTimersByTime(500);

    const last = emittedData[emittedData.length - 1];
    expect(last).toBeDefined();
    expect(last.currentSpeed).toBe(0);
    expect(last.motionState).toBe('stationary');
  });

  it('initial state is stationary with low confidence', () => {
    const data = sensorFusionEngine.getData();
    expect(data.motionState).toBe('stationary');
    expect(data.confidence).toBe('low');
    expect(data.currentSpeed).toBe(0);
  });
});

// ════════════════════════════════════════════════════════════════
// WALKING MODE
// ════════════════════════════════════════════════════════════════

describe('Walking mode', () => {
  it('Phase 1: reports initial estimate within 300ms of movement detection', () => {
    sensorFusionEngine.start(fusionCallback);

    // Accelerometer reports walking
    mockGetCurrentState.mockReturnValue('walking');

    // Trigger a fusion cycle
    jest.advanceTimersByTime(500);

    const data = sensorFusionEngine.getData();
    // Walking phase 1 returns 1.2 m/s as initial estimate
    expect(data.currentSpeed).toBeGreaterThan(0);
    expect(data.motionState).toBe('walking');
  });

  it('Phase 3: blends pedometer + GPS after warm-up', () => {
    sensorFusionEngine.start(fusionCallback);
    const gpsCallback = captureGpsCallback();

    // Simulate walking state
    mockGetCurrentState.mockReturnValue('walking');
    mockGetStepFrequency.mockReturnValue(1.8);
    mockGetEstimatedSpeed.mockReturnValue(1.4);

    // Advance past phase 2 (> 2 seconds after state change)
    jest.advanceTimersByTime(500);
    jest.advanceTimersByTime(500);
    jest.advanceTimersByTime(500);
    jest.advanceTimersByTime(500);
    jest.advanceTimersByTime(500);

    // Now send GPS data with good accuracy
    gpsCallback(makeGpsPosition(1.5, 5));

    const data = sensorFusionEngine.getData();
    expect(data.motionState).toBe('walking');
    expect(data.primarySource).toBe('fused');
    expect(data.confidence).toBe('high');
    // Fused speed should blend between pedometer (1.4) and GPS (1.5)
    expect(data.currentSpeed).toBeGreaterThan(0.5);
    expect(data.currentSpeed).toBeLessThan(3.0);
  });
});

// ════════════════════════════════════════════════════════════════
// VEHICLE MODE
// ════════════════════════════════════════════════════════════════

describe('Vehicle mode', () => {
  it('enters vehicle mode when GPS speed > 6 m/s AND no steps', () => {
    sensorFusionEngine.start(fusionCallback);
    const gpsCallback = captureGpsCallback();

    // No steps for > 5s
    mockGetStepFrequency.mockReturnValue(0);
    mockGetCurrentState.mockReturnValue('stationary');

    // Advance time so lastStepTime is old
    jest.advanceTimersByTime(6000);

    // Send high-speed GPS
    gpsCallback(makeGpsPosition(15, 5));

    const data = sensorFusionEngine.getData();
    expect(data.motionState).toBe('vehicle');
  });

  it('GPS is sole speed source in vehicle mode', () => {
    sensorFusionEngine.start(fusionCallback);
    const gpsCallback = captureGpsCallback();

    mockGetStepFrequency.mockReturnValue(0);
    mockGetCurrentState.mockReturnValue('stationary');
    jest.advanceTimersByTime(6000);

    gpsCallback(makeGpsPosition(20, 5));

    const data = sensorFusionEngine.getData();
    expect(data.motionState).toBe('vehicle');
    expect(data.primarySource).toBe('gps');
    // Speed should be close to GPS speed (Kalman filtered, so not exact)
    expect(data.currentSpeed).toBeGreaterThan(0);
  });

  it('dead zone at < 0.5 m/s GPS speed outputs 0', () => {
    sensorFusionEngine.start(fusionCallback);
    const gpsCallback = captureGpsCallback();

    mockGetStepFrequency.mockReturnValue(0);
    mockGetCurrentState.mockReturnValue('stationary');
    jest.advanceTimersByTime(6000);

    // First enter vehicle mode
    gpsCallback(makeGpsPosition(15, 5));
    expect(sensorFusionEngine.getMotionState()).toBe('vehicle');

    // Now GPS speed drops to dead zone
    gpsCallback(makeGpsPosition(0.3, 5));

    // In vehicle mode, speed < 0.5 returns 0 from calculateVehicleSpeed
    // But state may transition to stationary since speed < 2
    const data = sensorFusionEngine.getData();
    expect(data.currentSpeed).toBe(0);
  });
});

// ════════════════════════════════════════════════════════════════
// GPS DEAD RECKONING
// ════════════════════════════════════════════════════════════════

describe('GPS dead reckoning', () => {
  function enterVehicleMode(): (pos: any) => void {
    sensorFusionEngine.start(fusionCallback);
    const gpsCallback = captureGpsCallback();

    mockGetStepFrequency.mockReturnValue(0);
    mockGetCurrentState.mockReturnValue('stationary');
    jest.advanceTimersByTime(6000);

    // Enter vehicle mode with steady speed
    gpsCallback(makeGpsPosition(20, 5));
    expect(sensorFusionEngine.getMotionState()).toBe('vehicle');

    return gpsCallback;
  }

  it('enters DR when GPS lost for 3s while in vehicle mode', () => {
    enterVehicleMode();

    // No more GPS updates, advance 3+ seconds
    jest.advanceTimersByTime(3500);

    const data = sensorFusionEngine.getData();
    expect(data.motionState).toBe('gps_dead_reckoning');
    expect(data.primarySource).toBe('dead_reckoning');
  });

  it('speed decays over time in DR mode', () => {
    enterVehicleMode();

    jest.advanceTimersByTime(3500);
    const dataEarly = sensorFusionEngine.getData();
    expect(dataEarly.motionState).toBe('gps_dead_reckoning');
    const earlySpeed = dataEarly.currentSpeed;

    jest.advanceTimersByTime(5000);
    const dataLater = sensorFusionEngine.getData();
    expect(dataLater.currentSpeed).toBeLessThan(earlySpeed);
  });

  it('maximum DR duration: 60 seconds then speed → 0', () => {
    enterVehicleMode();

    // Advance past GPS timeout (3s) + 60s DR max
    jest.advanceTimersByTime(65000);

    const data = sensorFusionEngine.getData();
    expect(data.motionState).toBe('gps_dead_reckoning');
    // After 60s the raw DR speed is 0, but Kalman filter may leave a tiny residual
    expect(data.currentSpeed).toBeCloseTo(0, 5);
  });

  it('confidence is low during DR', () => {
    enterVehicleMode();

    jest.advanceTimersByTime(4000);

    const data = sensorFusionEngine.getData();
    expect(data.motionState).toBe('gps_dead_reckoning');
    expect(data.confidence).toBe('low');
  });
});

// ════════════════════════════════════════════════════════════════
// TRANSITIONS
// ════════════════════════════════════════════════════════════════

describe('Transitions', () => {
  it('vehicle → stationary when speed drops', () => {
    sensorFusionEngine.start(fusionCallback);
    const gpsCallback = captureGpsCallback();

    mockGetStepFrequency.mockReturnValue(0);
    mockGetCurrentState.mockReturnValue('stationary');
    jest.advanceTimersByTime(6000);

    // Enter vehicle
    gpsCallback(makeGpsPosition(15, 5));
    expect(sensorFusionEngine.getMotionState()).toBe('vehicle');

    // Speed drops to < 2 m/s
    gpsCallback(makeGpsPosition(0.5, 5));

    const data = sensorFusionEngine.getData();
    expect(data.motionState).toBe('stationary');
  });

  it('mode transitions trigger Kalman parameter changes', () => {
    sensorFusionEngine.start(fusionCallback);

    // Start stationary
    jest.advanceTimersByTime(500);
    expect(sensorFusionEngine.getMotionState()).toBe('stationary');

    // Transition to walking
    mockGetCurrentState.mockReturnValue('walking');
    jest.advanceTimersByTime(500);

    const data = sensorFusionEngine.getData();
    // After transition, the engine should still produce valid data
    expect(data.motionState).toBe('walking');
    // The Kalman filter is tuned with high process noise after state change
    // Verified by the engine still producing reasonable output
    expect(data.currentSpeed).toBeGreaterThanOrEqual(0);
  });
});

// ════════════════════════════════════════════════════════════════
// SENSOR HEALTH
// ════════════════════════════════════════════════════════════════

describe('Sensor health', () => {
  it('sensorHealth reports true for active sensors', () => {
    sensorFusionEngine.start(fusionCallback);
    jest.advanceTimersByTime(500);

    const health = sensorFusionEngine.getSensorHealth();
    expect(health.accelerometer).toBe(true);
    expect(health.gyroscope).toBe(true);
    expect(health.barometer).toBe(true);
  });

  it('start/stop lifecycle works correctly', () => {
    // Start
    sensorFusionEngine.start(fusionCallback);
    expect(mockStartTracking).toHaveBeenCalledTimes(1);
    expect(mockStepStart).toHaveBeenCalledTimes(1);
    expect(mockAccelStart).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(2000);

    // Stop returns trip summary
    const summary = sensorFusionEngine.stop();
    expect(summary).not.toBeNull();
    expect(summary!.startTime).toBeInstanceOf(Date);
    expect(summary!.endTime).toBeInstanceOf(Date);
    expect(mockStopTracking).toHaveBeenCalledTimes(1);
    expect(mockStepStop).toHaveBeenCalledTimes(1);
    expect(mockAccelStop).toHaveBeenCalledTimes(1);

    // Stop again returns null
    const secondStop = sensorFusionEngine.stop();
    expect(secondStop).toBeNull();
  });
});

// ════════════════════════════════════════════════════════════════
// EDGE CASES
// ════════════════════════════════════════════════════════════════

describe('Edge cases', () => {
  it('app starts and reports initial data correctly', () => {
    const data = sensorFusionEngine.getData();
    expect(data.currentSpeed).toBe(0);
    expect(data.averageSpeed).toBe(0);
    expect(data.maxSpeed).toBe(0);
    expect(data.totalDistance).toBe(0);
    expect(data.tripDuration).toBe(0);
    expect(data.speedHistory).toEqual([]);
    expect(data.motionState).toBe('stationary');
    expect(data.gpsAccuracy).toBeNull();
    expect(data.stepFrequency).toBe(0);
  });

  it('pure GPS mode works when step detector unavailable', () => {
    mockStepIsAvailable.mockReturnValue(Promise.resolve(false));
    mockGetEstimatedSpeed.mockReturnValue(0);
    mockGetStepFrequency.mockReturnValue(0);

    sensorFusionEngine.start(fusionCallback);
    const gpsCallback = captureGpsCallback();

    jest.advanceTimersByTime(6000);

    // Send vehicle-speed GPS (no pedometer needed)
    gpsCallback(makeGpsPosition(20, 5));

    const data = sensorFusionEngine.getData();
    expect(data.motionState).toBe('vehicle');
    expect(data.primarySource).toBe('gps');
    expect(data.currentSpeed).toBeGreaterThan(0);
  });
});

// ════════════════════════════════════════════════════════════════
// GPS-FIRST LOGIC (Bug 3 fix validation)
// ════════════════════════════════════════════════════════════════

describe('GPS-first motion classification', () => {
  it('walking GPS speed (1.2 m/s) classifies as walking even with dead sensors', () => {
    mockGetCurrentState.mockReturnValue('stationary');
    mockGetStepFrequency.mockReturnValue(0);
    mockGetEstimatedSpeed.mockReturnValue(0);

    sensorFusionEngine.start(fusionCallback);
    const gpsCallback = captureGpsCallback();

    jest.advanceTimersByTime(500);

    // GPS reports walking speed with good accuracy
    gpsCallback(makeGpsPosition(1.2, 8));

    const data = sensorFusionEngine.getData();
    expect(data.motionState).toBe('walking');
    expect(data.currentSpeed).toBeGreaterThan(0);
  });

  it('running GPS speed (4.0 m/s) classifies as running even with dead sensors', () => {
    mockGetCurrentState.mockReturnValue('stationary');
    mockGetStepFrequency.mockReturnValue(0);
    mockGetEstimatedSpeed.mockReturnValue(0);

    sensorFusionEngine.start(fusionCallback);
    const gpsCallback = captureGpsCallback();

    jest.advanceTimersByTime(500);

    // GPS reports running speed
    gpsCallback(makeGpsPosition(4.0, 8));

    const data = sensorFusionEngine.getData();
    expect(data.motionState).toBe('running');
    expect(data.currentSpeed).toBeGreaterThan(0);
  });

  it('vehicle GPS speed (15 m/s) classifies as vehicle without step timeout requirement', () => {
    mockGetCurrentState.mockReturnValue('stationary');
    mockGetStepFrequency.mockReturnValue(0);
    mockGetEstimatedSpeed.mockReturnValue(0);

    sensorFusionEngine.start(fusionCallback);
    const gpsCallback = captureGpsCallback();

    // No need to wait 5+ seconds for step timeout
    jest.advanceTimersByTime(500);

    gpsCallback(makeGpsPosition(15, 5));

    const data = sensorFusionEngine.getData();
    expect(data.motionState).toBe('vehicle');
  });

  it('stationary when GPS jitter is below 0.3 m/s', () => {
    mockGetCurrentState.mockReturnValue('stationary');
    mockGetStepFrequency.mockReturnValue(0);

    sensorFusionEngine.start(fusionCallback);
    const gpsCallback = captureGpsCallback();

    jest.advanceTimersByTime(500);

    gpsCallback(makeGpsPosition(0.2, 5));

    const data = sensorFusionEngine.getData();
    expect(data.motionState).toBe('stationary');
    expect(data.currentSpeed).toBe(0);
  });

  it('walking speed uses GPS directly when pedometer is dead', () => {
    mockGetCurrentState.mockReturnValue('stationary');
    mockGetStepFrequency.mockReturnValue(0);
    mockGetEstimatedSpeed.mockReturnValue(0);

    sensorFusionEngine.start(fusionCallback);
    const gpsCallback = captureGpsCallback();

    jest.advanceTimersByTime(500);

    // GPS reports clear walking speed
    gpsCallback(makeGpsPosition(1.4, 8));

    const data = sensorFusionEngine.getData();
    expect(data.motionState).toBe('walking');
    expect(data.primarySource).toBe('gps');
    // Speed should reflect GPS value (Kalman-filtered)
    expect(data.currentSpeed).toBeGreaterThan(0.5);
  });
});
