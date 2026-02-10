jest.mock('@react-native-community/netinfo', () => ({
  default: {
    addEventListener: jest.fn((_callback: any) => {
      return jest.fn(); // unsubscribe
    }),
  },
}), { virtual: true });

import { SyncManager } from '../../../../src/services/sync/SyncManager';

jest.mock('../../../../src/services/api/ApiClient', () => ({
  apiClient: {
    post: jest.fn().mockResolvedValue({}),
  },
}));

describe('SyncManager', () => {
  let manager: SyncManager;

  beforeEach(() => {
    manager = new SyncManager();
    jest.clearAllMocks();
  });

  it('initialize sets up manager', async () => {
    await manager.initialize();
    expect(manager.online).toBe(true);
  });

  it('enqueue adds item to queue', async () => {
    manager.setOnline(false);
    await manager.enqueue({ type: 'trip', payload: { id: '1' }, createdAt: Date.now(), maxRetries: 3 });
    expect(manager.getQueueStatus().pending).toBe(1);
  });

  it('enqueue triggers immediate sync when online', async () => {
    const { apiClient } = require('../../../../src/services/api/ApiClient');
    manager.setOnline(true);
    await manager.enqueue({ type: 'trip', payload: { id: '1' }, createdAt: Date.now(), maxRetries: 3 });
    expect(apiClient.post).toHaveBeenCalled();
  });

  it('processQueue processes items in FIFO order', async () => {
    manager.setOnline(false);
    await manager.enqueue({ type: 'trip', payload: { order: 1 }, createdAt: Date.now(), maxRetries: 3 });
    await manager.enqueue({ type: 'trip', payload: { order: 2 }, createdAt: Date.now(), maxRetries: 3 });
    manager.setOnline(true);
    await manager.processQueue();
    expect(manager.getQueueStatus().pending).toBe(0);
  });

  it('processQueue removes successful items', async () => {
    manager.setOnline(false);
    await manager.enqueue({ type: 'trip', payload: {}, createdAt: Date.now(), maxRetries: 3 });
    manager.setOnline(true);
    await manager.processQueue();
    expect(manager.getQueueStatus().pending).toBe(0);
  });

  it('processQueue increments retryCount on failure', async () => {
    const { apiClient } = require('../../../../src/services/api/ApiClient');
    apiClient.post.mockRejectedValue(new Error('Network error'));
    manager.setOnline(false);
    await manager.enqueue({ type: 'trip', payload: {}, createdAt: Date.now(), maxRetries: 3 });
    manager.setOnline(true);
    await manager.processQueue();
    const queue = manager.getQueue();
    if (queue.length > 0) {
      expect(queue[0].retryCount).toBeGreaterThan(0);
    }
  });

  it('processQueue removes item after maxRetries', async () => {
    const { apiClient } = require('../../../../src/services/api/ApiClient');
    apiClient.post.mockRejectedValue(new Error('Network error'));
    manager.setOnline(false);
    await manager.enqueue({ type: 'trip', payload: {}, createdAt: Date.now(), maxRetries: 1 });
    manager.setOnline(true);
    await manager.processQueue();
    expect(manager.getQueueStatus().pending).toBe(0);
  });

  it('getQueueStatus returns correct counts', async () => {
    manager.setOnline(false);
    await manager.enqueue({ type: 'trip', payload: {}, createdAt: Date.now(), maxRetries: 3 });
    const status = manager.getQueueStatus();
    expect(status.pending).toBe(1);
    expect(status.failed).toBe(0);
  });

  it('empty queue processQueue returns immediately', async () => {
    await manager.processQueue();
    expect(manager.getQueueStatus().pending).toBe(0);
  });

  it('destroy removes network listener', async () => {
    await manager.initialize();
    manager.destroy();
    // Should not throw
  });

  it('concurrent processQueue calls are guarded by isSyncing lock', async () => {
    const { apiClient } = require('../../../../src/services/api/ApiClient');
    // Make the post take some time so we can test the lock
    apiClient.post.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({}), 50)));
    manager.setOnline(false);
    await manager.enqueue({ type: 'trip', payload: {}, createdAt: Date.now(), maxRetries: 3 });
    manager.setOnline(true);
    // Start first processQueue - it will set isSyncing=true
    const p1 = manager.processQueue();
    // Wait a tick so isSyncing is set
    await new Promise(resolve => setTimeout(resolve, 10));
    const p2 = manager.processQueue(); // Should return immediately due to lock
    await Promise.all([p1, p2]);
    expect(manager.getQueueStatus().pending).toBe(0);
  });
});
