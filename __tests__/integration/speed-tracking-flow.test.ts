const mockStartTracking = jest.fn();
const mockStopTracking = jest.fn();
jest.mock('../../src/services/gps/GPSService', () => ({
  gpsService: {
    startTracking: mockStartTracking,
    stopTracking: mockStopTracking,
    requestPermissions: jest.fn(() => Promise.resolve(true)),
    isTracking: jest.fn(),
  },
}));

jest.mock('../../src/services/sensors/StepDetectorService', () => ({
  stepDetectorService: {
    startListening: jest.fn(),
    stopListening: jest.fn(),
    isAvailable: jest.fn(() => Promise.resolve(false)),
    getStepFrequency: jest.fn(() => 0),
    getEstimatedSpeed: jest.fn(() => 0),
    getCadence: jest.fn(() => null),
    getPace: jest.fn(() => null),
    getIosDistance: jest.fn(() => null),
  },
}));

jest.mock('../../src/services/sensors/AccelerometerService', () => ({
  accelerometerService: {
    startListening: jest.fn(),
    stopListening: jest.fn(),
    getCurrentState: jest.fn(() => 'stationary'),
    getAccelMagnitude: jest.fn(() => 0),
    getAccelVariance: jest.fn(() => 0),
    getLinearAcceleration: jest.fn(() => ({ x: 0, y: 0, z: 0 })),
    getYawRate: jest.fn(() => 0),
    getHeadingDelta: jest.fn(() => 0),
    resetHeadingDelta: jest.fn(),
    getAltitudeChange: jest.fn(() => 0),
    resetAltitude: jest.fn(),
    isAccelerometerActive: jest.fn(() => false),
    isGyroscopeActive: jest.fn(() => false),
    isBarometerActive: jest.fn(() => false),
  },
}));

import { speedEngine, msToKmh } from '../../src/services/gps/SpeedEngine';

describe('Speed Tracking Flow Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    speedEngine.stop();
    speedEngine.reset();
  });

  afterEach(() => {
    speedEngine.stop();
    jest.useRealTimers();
  });

  function captureGpsCallback(): (position: any) => void {
    const call = mockStartTracking.mock.calls[0];
    return call[0];
  }

  function makePosition(
    lat: number,
    lon: number,
    speed: number,
    timestamp: number,
  ) {
    return {
      latitude: lat,
      longitude: lon,
      speed,
      altitude: 100,
      accuracy: 5,
      timestamp,
      bearing: -1,
      altitudeAccuracy: -1,
    };
  }

  it('full trip lifecycle: start → GPS data → speed data → stop → summary', () => {
    const updateCallback = jest.fn();
    speedEngine.start(updateCallback);

    expect(mockStartTracking).toHaveBeenCalled();

    const gpsCallback = captureGpsCallback();

    // Simulate GPS readings
    gpsCallback(makePosition(0, 0, 10, Date.now()));
    gpsCallback(makePosition(0.0001, 0, 12, Date.now() + 1000));

    const data = speedEngine.getCurrentData();
    expect(data.currentSpeed).toBeGreaterThanOrEqual(0);
    expect(data.speedHistory.length).toBe(2);

    const summary = speedEngine.stop();

    expect(mockStopTracking).toHaveBeenCalled();
    expect(summary).not.toBeNull();
    expect(summary!.startTime).toBeInstanceOf(Date);
    expect(summary!.endTime).toBeInstanceOf(Date);
  });

  it('engine starts GPS tracking when start() is called', () => {
    const updateCallback = jest.fn();
    speedEngine.start(updateCallback);

    expect(mockStartTracking).toHaveBeenCalledTimes(1);
    expect(mockStartTracking).toHaveBeenCalledWith(expect.any(Function));
  });

  it('speed data updates through GPS callback', () => {
    const updateCallback = jest.fn();
    speedEngine.start(updateCallback);

    const gpsCallback = captureGpsCallback();

    gpsCallback(makePosition(51.5, -0.1, 15, Date.now()));

    expect(updateCallback).toHaveBeenCalled();
    const lastCall = updateCallback.mock.calls[updateCallback.mock.calls.length - 1][0];
    expect(lastCall.currentSpeed).toBeGreaterThanOrEqual(0);
    expect(lastCall.speedHistory.length).toBe(1);
  });

  it('average speed calculation across multiple readings', () => {
    const updateCallback = jest.fn();
    speedEngine.start(updateCallback);

    const gpsCallback = captureGpsCallback();

    // Feed multiple speed readings
    gpsCallback(makePosition(0, 0, 10, Date.now()));
    gpsCallback(makePosition(0.0001, 0, 20, Date.now() + 1000));
    gpsCallback(makePosition(0.0002, 0, 30, Date.now() + 2000));

    const data = speedEngine.getCurrentData();

    expect(data.averageSpeed).toBeGreaterThan(0);
    expect(data.maxSpeed).toBeGreaterThan(0);
    expect(data.speedHistory.length).toBe(3);
  });

  it('pause/resume does not reset data', () => {
    const updateCallback = jest.fn();
    speedEngine.start(updateCallback);

    const gpsCallback = captureGpsCallback();
    gpsCallback(makePosition(0, 0, 10, Date.now()));

    const dataBeforePause = speedEngine.getCurrentData();

    speedEngine.pause();

    // GPS data during pause should be ignored
    gpsCallback(makePosition(0.0001, 0, 50, Date.now() + 1000));

    speedEngine.resume();

    const dataAfterResume = speedEngine.getCurrentData();

    // Data should be preserved from before pause (not reset)
    expect(dataAfterResume.speedHistory.length).toBe(dataBeforePause.speedHistory.length);
    expect(dataAfterResume.maxSpeed).toBe(dataBeforePause.maxSpeed);
  });

  it('stop returns trip summary with correct data', () => {
    const updateCallback = jest.fn();
    speedEngine.start(updateCallback);

    const gpsCallback = captureGpsCallback();
    gpsCallback(makePosition(0, 0, 10, Date.now()));
    gpsCallback(makePosition(0.0001, 0, 20, Date.now() + 1000));

    const summary = speedEngine.stop();

    expect(summary).not.toBeNull();
    expect(summary!.startTime).toBeInstanceOf(Date);
    expect(summary!.endTime).toBeInstanceOf(Date);
    expect(summary!.endTime.getTime()).toBeGreaterThanOrEqual(
      summary!.startTime.getTime(),
    );
    expect(summary!.speedHistory.length).toBe(2);
    expect(summary!.averageSpeed).toBeGreaterThan(0);
    expect(summary!.maxSpeed).toBeGreaterThan(0);
    expect(summary!.totalDistance).toBeGreaterThanOrEqual(0);
  });

  it('msToKmh converts m/s to km/h correctly', () => {
    expect(msToKmh(1)).toBeCloseTo(3.6);
    expect(msToKmh(10)).toBeCloseTo(36);
    expect(msToKmh(0)).toBe(0);
  });
});
