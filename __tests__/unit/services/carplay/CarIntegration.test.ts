import { Platform, NativeModules } from 'react-native';
import { SpeedData } from '../../../../src/services/gps/SpeedEngine';

jest.mock('react-native', () => {
  const rn = jest.requireActual('react-native');
  rn.NativeModules.AutoBridge = {
    updateSpeed: jest.fn(),
  };
  rn.NativeModules.CarPlayBridge = {
    updateSpeedData: jest.fn(),
  };
  return rn;
});

// Import after mock setup so destructured refs pick up the mocks
import { CarIntegration } from '../../../../src/services/carplay/CarIntegration';

const mockAutoUpdateSpeed = NativeModules.AutoBridge.updateSpeed as jest.Mock;
const mockCarPlayUpdateSpeedData = NativeModules.CarPlayBridge.updateSpeedData as jest.Mock;

const mockSpeedData: SpeedData = {
  currentSpeed: 10, // 10 m/s = 36 km/h
  averageSpeed: 8, // 8 m/s = 28.8 km/h
  maxSpeed: 15, // 15 m/s = 54 km/h
  totalDistance: 5000,
  tripDuration: 600,
  speedHistory: [10, 11, 9],
};

describe('CarIntegration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls AutoBridge.updateSpeed on Android', () => {
    Platform.OS = 'android';
    CarIntegration.update(mockSpeedData);
    expect(mockAutoUpdateSpeed).toHaveBeenCalledWith(
      36, // 10 * 3.6
      28.8, // 8 * 3.6
      54, // 15 * 3.6
      5000,
      600,
    );
  });

  it('calls CarPlayBridge.updateSpeedData on iOS', () => {
    Platform.OS = 'ios';
    CarIntegration.update(mockSpeedData);
    expect(mockCarPlayUpdateSpeedData).toHaveBeenCalledWith({
      speed: 36,
      avgSpeed: 28.8,
      maxSpeed: 54,
      distance: 5000,
      duration: 600,
    });
  });

  it('handles missing bridge gracefully (no crash)', () => {
    Platform.OS = 'android';
    mockAutoUpdateSpeed.mockImplementation(() => {
      throw new Error('Bridge not available');
    });
    expect(() => CarIntegration.update(mockSpeedData)).not.toThrow();
  });

  it('formats speed data correctly (converts m/s to km/h by multiplying by 3.6)', () => {
    Platform.OS = 'android';
    const data: SpeedData = {
      currentSpeed: 1, // 1 m/s
      averageSpeed: 2,
      maxSpeed: 3,
      totalDistance: 100,
      tripDuration: 10,
      speedHistory: [1],
    };
    CarIntegration.update(data);
    expect(mockAutoUpdateSpeed).toHaveBeenCalledWith(
      3.6, // 1 * 3.6
      7.2, // 2 * 3.6
      10.8, // 3 * 3.6
      100,
      10,
    );
  });
});
