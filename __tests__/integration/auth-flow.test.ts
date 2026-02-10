const mockPost = jest.fn();
const mockGet = jest.fn();
jest.mock('../../src/services/api/ApiClient', () => ({
  apiClient: { post: mockPost, get: mockGet },
}));

const mockSetTokens = jest.fn(() => Promise.resolve());
const mockClearTokens = jest.fn(() => Promise.resolve());
const mockGetRefreshToken = jest.fn(() => Promise.resolve('refresh-token'));
const mockHasTokens = jest.fn(() => Promise.resolve(true));
jest.mock('../../src/services/auth/TokenManager', () => ({
  TokenManager: {
    setTokens: mockSetTokens,
    getRefreshToken: mockGetRefreshToken,
    clearTokens: mockClearTokens,
    hasTokens: mockHasTokens,
  },
}));

import { AuthService } from '../../src/services/auth/AuthService';

describe('Auth Flow Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetRefreshToken.mockReturnValue(Promise.resolve('refresh-token'));
    mockHasTokens.mockReturnValue(Promise.resolve(true));
  });

  it('full login flow: login → tokens stored → isAuthenticated returns true', async () => {
    const authResponse = {
      accessToken: 'access-123',
      refreshToken: 'refresh-456',
      user: { id: '1', email: 'test@test.com', displayName: 'Test' },
    };
    mockPost.mockResolvedValueOnce(authResponse);

    const result = await AuthService.login('test@test.com', 'password');

    expect(mockPost).toHaveBeenCalledWith('/auth/login', {
      email: 'test@test.com',
      password: 'password',
    });
    expect(mockSetTokens).toHaveBeenCalledWith('access-123', 'refresh-456');
    expect(result).toEqual(authResponse);

    // Verify isAuthenticated returns true
    mockGet.mockResolvedValueOnce({ valid: true });
    const authenticated = await AuthService.isAuthenticated();
    expect(authenticated).toBe(true);
  });

  it('full register flow: register → tokens stored', async () => {
    const authResponse = {
      accessToken: 'access-abc',
      refreshToken: 'refresh-def',
      user: { id: '2', email: 'new@test.com', displayName: 'New User' },
    };
    mockPost.mockResolvedValueOnce(authResponse);

    const result = await AuthService.register('new@test.com', 'password', 'New User');

    expect(mockPost).toHaveBeenCalledWith('/auth/register', {
      email: 'new@test.com',
      password: 'password',
      displayName: 'New User',
    });
    expect(mockSetTokens).toHaveBeenCalledWith('access-abc', 'refresh-def');
    expect(result).toEqual(authResponse);
  });

  it('token refresh flow: refreshToken → new tokens stored', async () => {
    const refreshResponse = {
      accessToken: 'new-access',
      refreshToken: 'new-refresh',
    };
    mockPost.mockResolvedValueOnce(refreshResponse);

    await AuthService.refreshToken();

    expect(mockGetRefreshToken).toHaveBeenCalled();
    expect(mockPost).toHaveBeenCalledWith('/auth/refresh', {
      refreshToken: 'refresh-token',
    });
    expect(mockSetTokens).toHaveBeenCalledWith('new-access', 'new-refresh');
  });

  it('logout flow: logout → tokens cleared', async () => {
    mockPost.mockResolvedValueOnce(undefined);

    await AuthService.logout();

    expect(mockPost).toHaveBeenCalledWith('/auth/logout');
    expect(mockClearTokens).toHaveBeenCalled();
  });

  it('failed login: apiClient throws → AuthService throws', async () => {
    mockPost.mockRejectedValueOnce(new Error('Invalid credentials'));

    await expect(AuthService.login('bad@test.com', 'wrong')).rejects.toThrow(
      'Invalid credentials',
    );
    expect(mockSetTokens).not.toHaveBeenCalled();
  });

  it('session check: isAuthenticated returns false when hasTokens is false', async () => {
    mockHasTokens.mockReturnValue(Promise.resolve(false));

    const authenticated = await AuthService.isAuthenticated();

    expect(authenticated).toBe(false);
    expect(mockGet).not.toHaveBeenCalled();
  });
});
