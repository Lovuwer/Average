const mockWatchPosition = jest.fn();
const mockClearWatch = jest.fn();
jest.mock('react-native-geolocation-service', () => ({
  watchPosition: mockWatchPosition,
  clearWatch: mockClearWatch,
}));

const mockRequest = jest.fn();
jest.mock('react-native-permissions', () => ({
  PERMISSIONS: {
    ANDROID: {
      ACCESS_FINE_LOCATION: 'android.permission.ACCESS_FINE_LOCATION',
    },
    IOS: { LOCATION_WHEN_IN_USE: 'ios.permission.LOCATION_WHEN_IN_USE' },
  },
  RESULTS: { GRANTED: 'granted', DENIED: 'denied' },
  request: mockRequest,
}));

import { gpsService } from '../../../../src/services/gps/GPSService';

describe('GPSService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    gpsService.stopTracking();
    mockWatchPosition.mockReset();
    mockClearWatch.mockReset();
    mockRequest.mockReset();
  });

  describe('requestPermissions', () => {
    it('resolves to true when granted', async () => {
      mockRequest.mockResolvedValue('granted');
      const result = await gpsService.requestPermissions();
      expect(result).toBe(true);
    });

    it('resolves to false when denied', async () => {
      mockRequest.mockResolvedValue('denied');
      const result = await gpsService.requestPermissions();
      expect(result).toBe(false);
    });
  });

  describe('startTracking', () => {
    it('calls watchPosition', () => {
      mockWatchPosition.mockReturnValue(1);
      const callback = jest.fn();
      gpsService.startTracking(callback);
      expect(mockWatchPosition).toHaveBeenCalledTimes(1);
    });
  });

  describe('stopTracking', () => {
    it('calls clearWatch', () => {
      mockWatchPosition.mockReturnValue(1);
      gpsService.startTracking(jest.fn());
      gpsService.stopTracking();
      expect(mockClearWatch).toHaveBeenCalledWith(1);
    });

    it('is idempotent (calling twice does not throw)', () => {
      gpsService.stopTracking();
      expect(() => gpsService.stopTracking()).not.toThrow();
    });
  });

  describe('isTracking', () => {
    it('returns false initially', () => {
      expect(gpsService.isTracking()).toBe(false);
    });

    it('returns true after startTracking', () => {
      mockWatchPosition.mockReturnValue(1);
      gpsService.startTracking(jest.fn());
      expect(gpsService.isTracking()).toBe(true);
    });
  });

  describe('duplicate watcher prevention', () => {
    it('does not start duplicate watchers if called twice', () => {
      mockWatchPosition.mockReturnValue(1);
      gpsService.startTracking(jest.fn());

      mockWatchPosition.mockReturnValue(2);
      gpsService.startTracking(jest.fn());

      // First watcher should have been cleared before starting second
      expect(mockClearWatch).toHaveBeenCalledWith(1);
      expect(mockWatchPosition).toHaveBeenCalledTimes(2);
    });
  });
});
