import axios from 'axios';

jest.mock('axios', () => {
  const mockAxiosInstance = {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() },
    },
  };
  return {
    create: jest.fn(() => mockAxiosInstance),
    post: jest.fn(),
    __mockInstance: mockAxiosInstance,
  };
});

jest.mock('../../../../src/services/auth/TokenManager', () => ({
  TokenManager: {
    getAccessToken: jest.fn(() => Promise.resolve('test-token')),
    getRefreshToken: jest.fn(() => Promise.resolve('refresh-token')),
    setTokens: jest.fn(() => Promise.resolve()),
    clearTokens: jest.fn(() => Promise.resolve()),
  },
}));

// Import after mocks are set up
const mockAxios = axios as jest.Mocked<typeof axios> & { __mockInstance: any };
const mockInstance = mockAxios.__mockInstance;

describe('ApiClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Re-setup create mock since clearAllMocks resets it
    (axios.create as jest.Mock).mockReturnValue(mockInstance);
  });

  it('creates axios instance with correct base URL', () => {
    // Re-require to trigger constructor
    jest.isolateModules(() => {
      require('../../../../src/services/api/ApiClient');
    });
    expect(axios.create).toHaveBeenCalledWith(
      expect.objectContaining({
        baseURL: expect.any(String),
        timeout: 15000,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
  });

  it('sets up request and response interceptors', () => {
    jest.isolateModules(() => {
      require('../../../../src/services/api/ApiClient');
    });
    expect(mockInstance.interceptors.request.use).toHaveBeenCalled();
    expect(mockInstance.interceptors.response.use).toHaveBeenCalled();
  });

  it('get() calls axios instance get and returns data', async () => {
    mockInstance.get.mockResolvedValue({ data: { id: 1, name: 'test' } });
    const { apiClient } = require('../../../../src/services/api/ApiClient');
    const result = await apiClient.get('/test');
    expect(mockInstance.get).toHaveBeenCalledWith('/test', { params: undefined });
    expect(result).toEqual({ id: 1, name: 'test' });
  });

  it('post() calls axios instance post and returns data', async () => {
    mockInstance.post.mockResolvedValue({ data: { success: true } });
    const { apiClient } = require('../../../../src/services/api/ApiClient');
    const result = await apiClient.post('/test', { key: 'value' });
    expect(mockInstance.post).toHaveBeenCalledWith('/test', { key: 'value' });
    expect(result).toEqual({ success: true });
  });

  it('put() calls axios instance put and returns data', async () => {
    mockInstance.put.mockResolvedValue({ data: { updated: true } });
    const { apiClient } = require('../../../../src/services/api/ApiClient');
    const result = await apiClient.put('/test', { key: 'value' });
    expect(mockInstance.put).toHaveBeenCalledWith('/test', { key: 'value' });
    expect(result).toEqual({ updated: true });
  });

  it('delete() calls axios instance delete and returns data', async () => {
    mockInstance.delete.mockResolvedValue({ data: { deleted: true } });
    const { apiClient } = require('../../../../src/services/api/ApiClient');
    const result = await apiClient.delete('/test');
    expect(mockInstance.delete).toHaveBeenCalledWith('/test');
    expect(result).toEqual({ deleted: true });
  });
});
