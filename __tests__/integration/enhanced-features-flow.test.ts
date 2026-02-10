jest.mock('@react-native-community/netinfo', () => ({
  default: {
    addEventListener: jest.fn(() => jest.fn()),
  },
}), { virtual: true });

import { SpeedAlertService } from '../../src/services/alerts/SpeedAlertService';
import { ThemeManager } from '../../src/services/theme/ThemeManager';
import { TripExportService } from '../../src/services/export/TripExportService';
import { SyncManager } from '../../src/services/sync/SyncManager';
import { useSettingsStore } from '../../src/store/useSettingsStore';

jest.mock('../../src/services/api/ApiClient', () => ({
  apiClient: { post: jest.fn().mockResolvedValue({}) },
}));

describe('Enhanced Features Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useSettingsStore.setState({
      speedUnit: 'kmh',
      speedAlert: { enabled: true, speedLimit: 100, warningThreshold: 0.9, alertType: 'both', cooldownSeconds: 10 },
      themeMode: 'dark',
      ambientLuxThreshold: 20,
      nightStartHour: 19,
      nightEndHour: 6,
    });
  });

  it('speed alert triggers at configured limit', () => {
    const alertService = new SpeedAlertService();
    const config = useSettingsStore.getState().speedAlert;
    const result = alertService.checkSpeed(105, config);
    expect(result.level).toBe('exceeded');
    expect(result.shouldAlert).toBe(true);
  });

  it('theme switches based on ambient light', () => {
    const manager = new ThemeManager();
    manager.addLuxReading(5);
    expect(manager.getAmbientTheme(20)).toBe('dark');
    manager.addLuxReading(50);
    manager.addLuxReading(50);
    manager.addLuxReading(50);
    manager.addLuxReading(50);
    expect(manager.getAmbientTheme(20)).toBe('light');
  });

  it('trip export generates valid CSV', () => {
    const exportService = new TripExportService();
    const csv = exportService.generateCSV([{
      id: '1', date: '2024-01-01', startTime: '08:00', endTime: '09:00',
      duration: '01:00:00', distance: '50 km', averageSpeed: '50 km/h',
      maxSpeed: '80 km/h', speedUnit: 'km/h',
    }]);
    expect(csv).toContain('Date,Start Time');
    expect(csv).toContain('2024-01-01');
  });

  it('offline sync queues trips when offline', async () => {
    const syncManager = new SyncManager();
    syncManager.setOnline(false);
    await syncManager.enqueue({
      type: 'trip', payload: { id: 'trip-1' }, createdAt: Date.now(), maxRetries: 3,
    });
    expect(syncManager.getQueueStatus().pending).toBe(1);
  });

  it('offline sync processes queue when coming online', async () => {
    const syncManager = new SyncManager();
    syncManager.setOnline(false);
    await syncManager.enqueue({
      type: 'trip', payload: { id: 'trip-1' }, createdAt: Date.now(), maxRetries: 3,
    });
    syncManager.setOnline(true);
    await syncManager.processQueue();
    expect(syncManager.getQueueStatus().pending).toBe(0);
  });

  it('settings persist across store updates', () => {
    const store = useSettingsStore.getState();
    store.setSpeedAlert({ speedLimit: 80 });
    store.setThemeMode('auto-system');
    store.setSpeedUnit('mph');

    const state = useSettingsStore.getState();
    expect(state.speedAlert.speedLimit).toBe(80);
    expect(state.themeMode).toBe('auto-system');
    expect(state.speedUnit).toBe('mph');
  });
});
