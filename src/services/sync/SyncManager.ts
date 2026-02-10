export interface SyncQueueItem {
  id: string;
  type: 'trip' | 'settings' | 'license_check';
  payload: any;
  createdAt: number;
  retryCount: number;
  maxRetries: number;
}

export class SyncManager {
  private syncQueue: SyncQueueItem[] = [];
  private isSyncing: boolean = false;
  private networkListener: (() => void) | null = null;
  private isOnline: boolean = true;
  private lastSyncAt: number | null = null;

  async initialize(): Promise<void> {
    // Load any persisted queue and start listening
    try {
      const NetInfo = require('@react-native-community/netinfo').default;
      const unsubscribe = NetInfo.addEventListener((state: any) => {
        const wasOffline = !this.isOnline;
        this.isOnline = state.isConnected ?? false;
        if (wasOffline && this.isOnline && !this.isSyncing) {
          this.processQueue();
        }
      });
      this.networkListener = unsubscribe;
    } catch {
      // NetInfo not available, assume online
    }
  }

  async enqueue(item: Omit<SyncQueueItem, 'id' | 'retryCount'>): Promise<void> {
    const queueItem: SyncQueueItem = {
      ...item,
      id: `sync_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      retryCount: 0,
    };
    this.syncQueue.push(queueItem);

    if (this.isOnline && !this.isSyncing) {
      await this.processQueue();
    }
  }

  async processQueue(): Promise<void> {
    if (this.isSyncing || this.syncQueue.length === 0) return;

    this.isSyncing = true;
    const { apiClient } = require('../api/ApiClient');

    const itemsToProcess = [...this.syncQueue];
    for (const item of itemsToProcess) {
      try {
        if (item.type === 'trip') {
          await apiClient.post('/trips/sync', { trips: [item.payload] });
        }
        this.syncQueue = this.syncQueue.filter(q => q.id !== item.id);
        this.lastSyncAt = Date.now();
      } catch {
        item.retryCount++;
        if (item.retryCount >= item.maxRetries) {
          // Move to dead letter (just remove from queue)
          this.syncQueue = this.syncQueue.filter(q => q.id !== item.id);
        }
        // Exponential backoff delay
        const delay = Math.min(1000 * Math.pow(2, item.retryCount), 30000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    this.isSyncing = false;
  }

  getQueueStatus(): { pending: number; failed: number; lastSyncAt: number | null } {
    return {
      pending: this.syncQueue.length,
      failed: this.syncQueue.filter(q => q.retryCount >= q.maxRetries).length,
      lastSyncAt: this.lastSyncAt,
    };
  }

  getQueue(): SyncQueueItem[] {
    return [...this.syncQueue];
  }

  get online(): boolean {
    return this.isOnline;
  }

  setOnline(online: boolean): void {
    this.isOnline = online;
  }

  destroy(): void {
    if (this.networkListener) {
      this.networkListener();
      this.networkListener = null;
    }
  }
}

export const syncManager = new SyncManager();
