import { AuthService } from '../../../src/services/auth/AuthService';

jest.mock('../../../src/services/auth/AuthService', () => ({
  AuthService: {
    login: jest.fn(),
    register: jest.fn(),
    logout: jest.fn(),
    isAuthenticated: jest.fn(),
  },
}));

const mockedAuthService = AuthService as jest.Mocked<typeof AuthService>;

import { useAuthStore } from '../../../src/store/useAuthStore';

const initialState = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
};

describe('useAuthStore', () => {
  beforeEach(() => {
    useAuthStore.setState(initialState);
    jest.clearAllMocks();
  });

  it('has correct initial state', () => {
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
    expect(state.isLoading).toBe(false);
    expect(state.error).toBeNull();
  });

  it('login() sets user and isAuthenticated on success', async () => {
    const mockUser = { id: '1', email: 'test@test.com', displayName: 'Test' };
    mockedAuthService.login.mockResolvedValue({
      accessToken: 'token',
      refreshToken: 'refresh',
      user: mockUser,
    });

    const result = await useAuthStore.getState().login('test@test.com', 'password');

    expect(result).toBe(true);
    const state = useAuthStore.getState();
    expect(state.user).toEqual(mockUser);
    expect(state.isAuthenticated).toBe(true);
    expect(state.isLoading).toBe(false);
  });

  it('login() sets error on failure', async () => {
    mockedAuthService.login.mockRejectedValue(new Error('Invalid credentials'));

    const result = await useAuthStore.getState().login('bad@test.com', 'wrong');

    expect(result).toBe(false);
    const state = useAuthStore.getState();
    expect(state.error).toBe('Invalid credentials');
    expect(state.isAuthenticated).toBe(false);
    expect(state.isLoading).toBe(false);
  });

  it('login() sets isLoading during operation', async () => {
    let resolveLogin: (value: unknown) => void;
    const loginPromise = new Promise((resolve) => {
      resolveLogin = resolve;
    });
    mockedAuthService.login.mockReturnValue(loginPromise as Promise<never>);

    const loginCall = useAuthStore.getState().login('test@test.com', 'password');
    expect(useAuthStore.getState().isLoading).toBe(true);

    resolveLogin!({
      accessToken: 'token',
      refreshToken: 'refresh',
      user: { id: '1', email: 'test@test.com', displayName: null },
    });
    await loginCall;

    expect(useAuthStore.getState().isLoading).toBe(false);
  });

  it('register() sets user and isAuthenticated on success', async () => {
    const mockUser = { id: '2', email: 'new@test.com', displayName: 'New User' };
    mockedAuthService.register.mockResolvedValue({
      accessToken: 'token',
      refreshToken: 'refresh',
      user: mockUser,
    });

    const result = await useAuthStore.getState().register('new@test.com', 'password', 'New User');

    expect(result).toBe(true);
    const state = useAuthStore.getState();
    expect(state.user).toEqual(mockUser);
    expect(state.isAuthenticated).toBe(true);
    expect(state.isLoading).toBe(false);
  });

  it('logout() clears user and isAuthenticated', async () => {
    useAuthStore.setState({
      user: { id: '1', email: 'test@test.com', displayName: 'Test' },
      isAuthenticated: true,
    });
    mockedAuthService.logout.mockResolvedValue(undefined);

    await useAuthStore.getState().logout();

    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
    expect(state.isLoading).toBe(false);
  });

  it('checkAuth() updates isAuthenticated based on AuthService', async () => {
    mockedAuthService.isAuthenticated.mockResolvedValue(true);
    const result = await useAuthStore.getState().checkAuth();
    expect(result).toBe(true);
    expect(useAuthStore.getState().isAuthenticated).toBe(true);

    mockedAuthService.isAuthenticated.mockResolvedValue(false);
    const result2 = await useAuthStore.getState().checkAuth();
    expect(result2).toBe(false);
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });

  it('clearError() clears error state', () => {
    useAuthStore.setState({ error: 'Some error' });
    useAuthStore.getState().clearError();
    expect(useAuthStore.getState().error).toBeNull();
  });
});
