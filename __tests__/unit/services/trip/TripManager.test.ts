jest.mock('../../../../src/services/api/ApiClient', () => ({
  apiClient: {
    post: jest.fn(() => Promise.resolve()),
  },
}));

jest.mock('../../../../src/services/gps/SpeedEngine', () => ({
  speedEngine: {},
  TripSummary: {},
}));

import { tripManager } from '../../../../src/services/trip/TripManager';

const makeSummary = (overrides = {}) => ({
  startTime: new Date('2024-01-15T10:00:00Z'),
  endTime: new Date('2024-01-15T11:00:00Z'),
  totalDistance: 5000,
  averageSpeed: 25,
  maxSpeed: 40,
  tripDuration: 3600,
  ...overrides,
});

describe('TripManager', () => {
  beforeEach(async () => {
    await tripManager.clearHistory();
  });

  it('getTripHistory returns empty array initially', async () => {
    const trips = await tripManager.getTripHistory();
    expect(trips).toEqual([]);
  });

  it('saveTripSummary adds a trip', async () => {
    await tripManager.saveTripSummary(makeSummary(), 'kmh');
    const trips = await tripManager.getTripHistory();
    expect(trips).toHaveLength(1);
  });

  it('saveTripSummary generates a unique id', async () => {
    const trip1 = await tripManager.saveTripSummary(makeSummary(), 'kmh');
    const trip2 = await tripManager.saveTripSummary(makeSummary(), 'kmh');
    expect(trip1.id).not.toBe(trip2.id);
  });

  it('getTripHistory returns saved trips', async () => {
    await tripManager.saveTripSummary(makeSummary(), 'kmh');
    await tripManager.saveTripSummary(makeSummary(), 'mph');
    const trips = await tripManager.getTripHistory();
    expect(trips).toHaveLength(2);
    expect(trips[0].speedUnit).toBe('mph');
    expect(trips[1].speedUnit).toBe('kmh');
  });

  it('getUnsyncedTrips returns only unsynced trips', async () => {
    const trip = await tripManager.saveTripSummary(makeSummary(), 'kmh');
    await tripManager.saveTripSummary(makeSummary(), 'kmh');
    await tripManager.markAsSynced([trip.id]);

    const unsynced = await tripManager.getUnsyncedTrips();
    expect(unsynced).toHaveLength(1);
    expect(unsynced[0].synced).toBe(false);
  });

  it('markAsSynced marks trips as synced', async () => {
    const trip = await tripManager.saveTripSummary(makeSummary(), 'kmh');
    expect(trip.synced).toBe(false);

    await tripManager.markAsSynced([trip.id]);
    const trips = await tripManager.getTripHistory();
    const synced = trips.find((t) => t.id === trip.id);
    expect(synced?.synced).toBe(true);
  });

  it('clearHistory clears all trips', async () => {
    await tripManager.saveTripSummary(makeSummary(), 'kmh');
    await tripManager.saveTripSummary(makeSummary(), 'kmh');
    await tripManager.clearHistory();
    const trips = await tripManager.getTripHistory();
    expect(trips).toEqual([]);
  });
});
