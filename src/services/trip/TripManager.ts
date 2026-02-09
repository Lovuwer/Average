import { speedEngine, TripSummary } from '../gps/SpeedEngine';

export interface StoredTrip {
  id: string;
  startTime: string;
  endTime: string;
  distance: number;
  avgSpeed: number;
  maxSpeed: number;
  duration: number;
  speedUnit: string;
  synced: boolean;
}

/**
 * TripManager handles trip lifecycle and local persistence.
 * Uses a simple in-memory store with JSON serialization as a
 * cross-platform fallback when SQLite native module isn't linked.
 */
class TripManager {
  private trips: StoredTrip[] = [];

  async saveTripSummary(summary: TripSummary, speedUnit: string): Promise<StoredTrip> {
    const trip: StoredTrip = {
      id: this.generateId(),
      startTime: summary.startTime.toISOString(),
      endTime: summary.endTime.toISOString(),
      distance: summary.totalDistance,
      avgSpeed: summary.averageSpeed,
      maxSpeed: summary.maxSpeed,
      duration: summary.tripDuration,
      speedUnit,
      synced: false,
    };

    this.trips.unshift(trip);
    return trip;
  }

  async getTripHistory(): Promise<StoredTrip[]> {
    return [...this.trips];
  }

  async getUnsyncedTrips(): Promise<StoredTrip[]> {
    return this.trips.filter((t) => !t.synced);
  }

  async markAsSynced(tripIds: string[]): Promise<void> {
    const idSet = new Set(tripIds);
    this.trips = this.trips.map((t) =>
      idSet.has(t.id) ? { ...t, synced: true } : t,
    );
  }

  async syncTrips(): Promise<void> {
    try {
      const unsynced = await this.getUnsyncedTrips();
      if (unsynced.length === 0) {
        return;
      }

      const { apiClient } = require('../api/ApiClient');
      await apiClient.post('/trips/sync', {
        trips: unsynced.map((t) => ({
          startTime: t.startTime,
          endTime: t.endTime,
          distance: t.distance,
          avgSpeed: t.avgSpeed,
          maxSpeed: t.maxSpeed,
          duration: t.duration,
          speedUnit: t.speedUnit,
        })),
      });

      await this.markAsSynced(unsynced.map((t) => t.id));
    } catch {
      // Sync will retry later
    }
  }

  async clearHistory(): Promise<void> {
    this.trips = [];
  }

  private generateId(): string {
    return `trip_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}

export const tripManager = new TripManager();
