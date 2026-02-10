import '@testing-library/jest-native/extend-expect';

// Mock react-native-encrypted-storage
jest.mock('react-native-encrypted-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
}));

// Mock react-native-geolocation-service
jest.mock('react-native-geolocation-service', () => ({
  watchPosition: jest.fn(),
  clearWatch: jest.fn(),
  getCurrentPosition: jest.fn(),
  requestAuthorization: jest.fn(() => Promise.resolve('granted')),
}));

// Mock react-native-device-info
jest.mock('react-native-device-info', () => ({
  getUniqueId: jest.fn(() => Promise.resolve('test-device-id-123')),
  getModel: jest.fn(() => 'Test Model'),
  getSystemVersion: jest.fn(() => '14.0'),
  getVersion: jest.fn(() => '1.0.0'),
  getBundleId: jest.fn(() => 'com.average.app'),
  isEmulator: jest.fn(() => Promise.resolve(false)),
  getFingerprint: jest.fn(() => Promise.resolve('release-keys')),
  getTags: jest.fn(() => Promise.resolve('release-keys')),
}));

// Mock react-native-permissions
jest.mock('react-native-permissions', () => ({
  PERMISSIONS: {
    ANDROID: { ACCESS_FINE_LOCATION: 'android.permission.ACCESS_FINE_LOCATION' },
    IOS: { LOCATION_WHEN_IN_USE: 'ios.permission.LOCATION_WHEN_IN_USE' },
  },
  RESULTS: {
    GRANTED: 'granted',
    DENIED: 'denied',
    BLOCKED: 'blocked',
  },
  request: jest.fn(() => Promise.resolve('granted')),
  check: jest.fn(() => Promise.resolve('granted')),
}));

// Mock @shopify/react-native-skia
jest.mock('@shopify/react-native-skia', () => ({
  Canvas: 'Canvas',
  RoundedRect: 'RoundedRect',
  BackdropBlur: 'BackdropBlur',
  Fill: 'Fill',
  useCanvasRef: jest.fn(),
}));

// Mock react-native-reanimated
jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return Reanimated;
});

// Mock react-native-haptic-feedback
jest.mock('react-native-haptic-feedback', () => ({
  trigger: jest.fn(),
}), { virtual: true });

// Mock react-native-keep-awake
jest.mock('react-native-keep-awake', () => ({
  activate: jest.fn(),
  deactivate: jest.fn(),
}), { virtual: true });

// Mock react-native-sqlite-storage
jest.mock('react-native-sqlite-storage', () => ({
  openDatabase: jest.fn(() => ({
    transaction: jest.fn((callback) => {
      callback({
        executeSql: jest.fn((sql, params, success) => {
          if (success) success({}, { rows: { length: 0, raw: () => [] } });
        }),
      });
    }),
  })),
}));

// Mock NativeModules for CarPlay/Android Auto bridges
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

// Silence console warnings in tests
global.console.warn = jest.fn();
