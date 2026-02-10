import { AuthService } from '../../../../src/services/auth/AuthService';
import { apiClient } from '../../../../src/services/api/ApiClient';
import { TokenManager } from '../../../../src/services/auth/TokenManager';

jest.mock('../../../../src/services/api/ApiClient', () => ({
  apiClient: {
    post: jest.fn(),
    get: jest.fn(),
  },
}));

jest.mock('../../../../src/services/auth/TokenManager', () => ({
  TokenManager: {
    setTokens: jest.fn(() => Promise.resolve()),
    getRefreshToken: jest.fn(() => Promise.resolve('refresh-token')),
    clearTokens: jest.fn(() => Promise.resolve()),
    hasTokens: jest.fn(() => Promise.resolve(true)),
  },
}));

const mockApiClient = apiClient as jest.Mocked<typeof apiClient>;
const mockTokenManager = TokenManager as jest.Mocked<typeof TokenManager>;

const mockAuthResponse = {
  accessToken: 'access-123',
  refreshToken: 'refresh-456',
  user: { id: 'u1', email: 'test@example.com', displayName: 'Test User' },
};

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('calls apiClient.post with correct payload', async () => {
      mockApiClient.post.mockResolvedValue(mockAuthResponse);
      await AuthService.login('test@example.com', 'password123');
      expect(mockApiClient.post).toHaveBeenCalledWith('/auth/login', {
        email: 'test@example.com',
        password: 'password123',
      });
    });

    it('stores tokens on success via TokenManager.setTokens', async () => {
      mockApiClient.post.mockResolvedValue(mockAuthResponse);
      await AuthService.login('test@example.com', 'password123');
      expect(mockTokenManager.setTokens).toHaveBeenCalledWith('access-123', 'refresh-456');
    });

    it('throws on API error', async () => {
      mockApiClient.post.mockRejectedValue(new Error('Network error'));
      await expect(AuthService.login('test@example.com', 'password123')).rejects.toThrow(
        'Network error',
      );
    });
  });

  describe('register', () => {
    it('calls apiClient.post with correct payload', async () => {
      mockApiClient.post.mockResolvedValue(mockAuthResponse);
      await AuthService.register('test@example.com', 'password123', 'Test User');
      expect(mockApiClient.post).toHaveBeenCalledWith('/auth/register', {
        email: 'test@example.com',
        password: 'password123',
        displayName: 'Test User',
      });
    });

    it('stores tokens on success', async () => {
      mockApiClient.post.mockResolvedValue(mockAuthResponse);
      await AuthService.register('test@example.com', 'password123');
      expect(mockTokenManager.setTokens).toHaveBeenCalledWith('access-123', 'refresh-456');
    });
  });

  describe('refreshToken', () => {
    it('sends refresh token to /auth/refresh', async () => {
      mockApiClient.post.mockResolvedValue({
        accessToken: 'new-access',
        refreshToken: 'new-refresh',
      });
      await AuthService.refreshToken();
      expect(mockApiClient.post).toHaveBeenCalledWith('/auth/refresh', {
        refreshToken: 'refresh-token',
      });
    });

    it('throws when no refresh token', async () => {
      mockTokenManager.getRefreshToken.mockResolvedValue(null);
      await expect(AuthService.refreshToken()).rejects.toThrow('No refresh token available');
    });
  });

  describe('logout', () => {
    it('clears tokens', async () => {
      mockApiClient.post.mockResolvedValue(undefined);
      await AuthService.logout();
      expect(mockTokenManager.clearTokens).toHaveBeenCalled();
    });

    it('calls /auth/logout', async () => {
      mockApiClient.post.mockResolvedValue(undefined);
      await AuthService.logout();
      expect(mockApiClient.post).toHaveBeenCalledWith('/auth/logout');
    });
  });

  describe('isAuthenticated', () => {
    it('returns true when valid token exists and verify succeeds', async () => {
      mockTokenManager.hasTokens.mockResolvedValue(true);
      mockApiClient.get.mockResolvedValue({ valid: true, user: { id: 'u1' } });
      const result = await AuthService.isAuthenticated();
      expect(result).toBe(true);
    });

    it('returns false when no tokens', async () => {
      mockTokenManager.hasTokens.mockResolvedValue(false);
      const result = await AuthService.isAuthenticated();
      expect(result).toBe(false);
    });
  });
});
