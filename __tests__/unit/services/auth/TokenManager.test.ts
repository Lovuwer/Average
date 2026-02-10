jest.mock('react-native-encrypted-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
}));

import EncryptedStorage from 'react-native-encrypted-storage';
import { TokenManager } from '../../../../src/services/auth/TokenManager';

const mockEncryptedStorage = EncryptedStorage as jest.Mocked<typeof EncryptedStorage>;

describe('TokenManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAccessToken', () => {
    it('calls EncryptedStorage.getItem', async () => {
      mockEncryptedStorage.getItem.mockResolvedValue('token-abc');
      const result = await TokenManager.getAccessToken();
      expect(mockEncryptedStorage.getItem).toHaveBeenCalledWith('average_access_token');
      expect(result).toBe('token-abc');
    });

    it('returns null on error', async () => {
      mockEncryptedStorage.getItem.mockRejectedValue(new Error('Storage error'));
      const result = await TokenManager.getAccessToken();
      expect(result).toBeNull();
    });
  });

  describe('getRefreshToken', () => {
    it('calls EncryptedStorage.getItem', async () => {
      mockEncryptedStorage.getItem.mockResolvedValue('refresh-xyz');
      const result = await TokenManager.getRefreshToken();
      expect(mockEncryptedStorage.getItem).toHaveBeenCalledWith('average_refresh_token');
      expect(result).toBe('refresh-xyz');
    });
  });

  describe('setTokens', () => {
    it('saves both tokens to EncryptedStorage', async () => {
      await TokenManager.setTokens('access-123', 'refresh-456');
      expect(mockEncryptedStorage.setItem).toHaveBeenCalledWith(
        'average_access_token',
        'access-123',
      );
      expect(mockEncryptedStorage.setItem).toHaveBeenCalledWith(
        'average_refresh_token',
        'refresh-456',
      );
    });
  });

  describe('clearTokens', () => {
    it('removes both tokens', async () => {
      await TokenManager.clearTokens();
      expect(mockEncryptedStorage.removeItem).toHaveBeenCalledWith('average_access_token');
      expect(mockEncryptedStorage.removeItem).toHaveBeenCalledWith('average_refresh_token');
    });
  });

  describe('hasTokens', () => {
    it('returns true when access token exists', async () => {
      mockEncryptedStorage.getItem.mockResolvedValue('some-token');
      const result = await TokenManager.hasTokens();
      expect(result).toBe(true);
    });

    it('returns false when no access token', async () => {
      mockEncryptedStorage.getItem.mockResolvedValue(null);
      const result = await TokenManager.hasTokens();
      expect(result).toBe(false);
    });
  });
});
