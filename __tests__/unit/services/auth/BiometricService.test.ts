jest.mock('react-native-biometrics', () => {
  return {
    default: jest.fn().mockImplementation(() => ({
      isSensorAvailable: jest.fn().mockResolvedValue({ available: true, biometryType: 'FaceID' }),
      simplePrompt: jest.fn().mockResolvedValue({ success: true }),
      createKeys: jest.fn().mockResolvedValue({ publicKey: 'test-public-key' }),
      createSignature: jest.fn().mockResolvedValue({ success: true, signature: 'test-signature' }),
      deleteKeys: jest.fn().mockResolvedValue({ keysDeleted: true }),
    })),
  };
}, { virtual: true });

import { BiometricService } from '../../../../src/services/auth/BiometricService';

describe('BiometricService', () => {
  let service: BiometricService;

  beforeEach(() => {
    service = new BiometricService();
    jest.clearAllMocks();
  });

  it('isAvailable returns true when sensor exists', async () => {
    const result = await service.isAvailable();
    expect(result.available).toBe(true);
  });

  it('isAvailable returns correct biometryType', async () => {
    const result = await service.isAvailable();
    expect(result.biometryType).toBe('FaceID');
  });

  it('authenticate resolves true on success', async () => {
    const result = await service.authenticate();
    expect(result).toBe(true);
  });

  it('authenticate uses custom prompt message', async () => {
    const result = await service.authenticate('Custom prompt');
    expect(result).toBe(true);
  });

  it('createKeys returns a public key string', async () => {
    const key = await service.createKeys();
    expect(typeof key).toBe('string');
    expect(key).toBe('test-public-key');
  });

  it('signPayload returns a signature string', async () => {
    const sig = await service.signPayload('test-payload');
    expect(typeof sig).toBe('string');
    expect(sig).toBe('test-signature');
  });

  it('deleteKeys resolves without error', async () => {
    await expect(service.deleteKeys()).resolves.not.toThrow();
  });

  it('isAvailable returns false when no sensor', async () => {
    jest.resetModules();
    jest.mock('react-native-biometrics', () => ({
      default: jest.fn().mockImplementation(() => ({
        isSensorAvailable: jest.fn().mockResolvedValue({ available: false, biometryType: null }),
      })),
    }), { virtual: true });
    const { BiometricService: BS } = require('../../../../src/services/auth/BiometricService');
    const s = new BS();
    const result = await s.isAvailable();
    expect(result.available).toBe(false);
  });

  it('authenticate resolves false on cancel', async () => {
    jest.resetModules();
    jest.mock('react-native-biometrics', () => ({
      default: jest.fn().mockImplementation(() => ({
        isSensorAvailable: jest.fn().mockResolvedValue({ available: true, biometryType: 'FaceID' }),
        simplePrompt: jest.fn().mockResolvedValue({ success: false }),
      })),
    }), { virtual: true });
    const { BiometricService: BS } = require('../../../../src/services/auth/BiometricService');
    const s = new BS();
    const result = await s.authenticate();
    expect(result).toBe(false);
  });

  it('handles sensor unavailable gracefully', async () => {
    jest.resetModules();
    jest.mock('react-native-biometrics', () => ({
      default: jest.fn().mockImplementation(() => ({
        isSensorAvailable: jest.fn().mockRejectedValue(new Error('Sensor error')),
      })),
    }), { virtual: true });
    const { BiometricService: BS } = require('../../../../src/services/auth/BiometricService');
    const s = new BS();
    const result = await s.isAvailable();
    expect(result.available).toBe(false);
    expect(result.biometryType).toBeNull();
  });
});
