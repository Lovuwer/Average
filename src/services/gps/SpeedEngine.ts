import { gpsService, GPSPosition } from './GPSService';
import { KalmanFilter } from './KalmanFilter';
import { haversineDistance, calculateSpeed } from './HaversineCalculator';

export interface SpeedData {
  currentSpeed: number; // filtered, m/s
  averageSpeed: number;
  maxSpeed: number;
  totalDistance: number; // meters
  tripDuration: number; // seconds
  speedHistory: number[]; // last 60 readings (m/s)
}

export interface TripSummary extends SpeedData {
  startTime: Date;
  endTime: Date;
}

// Unit conversion helpers
export function msToKmh(ms: number): number {
  return ms * 3.6;
}

export function msToMph(ms: number): number {
  return ms * 2.23694;
}

export function metersToKm(m: number): number {
  return m / 1000;
}

export function metersToMiles(m: number): number {
  return m / 1609.344;
}

type SpeedUpdateCallback = (data: SpeedData) => void;

class SpeedEngine {
  private kalmanFilter: KalmanFilter;
  private isRunning: boolean = false;
  private isPausedState: boolean = false;
  private startTime: Date | null = null;
  private pausedDuration: number = 0;
  private pauseStart: number | null = null;
  private lastPosition: GPSPosition | null = null;
  private speedReadings: number[] = [];
  private speedSum: number = 0;
  private readingCount: number = 0;
  private maxSpeedValue: number = 0;
  private totalDistanceValue: number = 0;
  private speedHistoryBuffer: number[] = [];
  private updateCallback: SpeedUpdateCallback | null = null;
  private durationInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.kalmanFilter = new KalmanFilter();
  }

  start(callback: SpeedUpdateCallback): void {
    if (this.isRunning) {
      return;
    }

    this.reset();
    this.isRunning = true;
    this.startTime = new Date();
    this.updateCallback = callback;

    gpsService.startTracking((position) => {
      if (this.isPausedState) {
        return;
      }
      this.processPosition(position);
    });

    // Update duration every second
    this.durationInterval = setInterval(() => {
      if (this.isRunning && !this.isPausedState) {
        this.emitUpdate();
      }
    }, 1000);
  }

  stop(): TripSummary | null {
    if (!this.isRunning || !this.startTime) {
      return null;
    }

    gpsService.stopTracking();

    if (this.durationInterval) {
      clearInterval(this.durationInterval);
      this.durationInterval = null;
    }

    const endTime = new Date();
    const summary: TripSummary = {
      ...this.getCurrentData(),
      startTime: this.startTime,
      endTime,
    };

    this.isRunning = false;
    this.updateCallback = null;

    return summary;
  }

  pause(): void {
    if (!this.isRunning || this.isPausedState) {
      return;
    }
    this.isPausedState = true;
    this.pauseStart = Date.now();
  }

  resume(): void {
    if (!this.isRunning || !this.isPausedState) {
      return;
    }
    if (this.pauseStart) {
      this.pausedDuration += Date.now() - this.pauseStart;
      this.pauseStart = null;
    }
    this.isPausedState = false;
  }

  reset(): void {
    this.kalmanFilter.reset();
    this.lastPosition = null;
    this.speedReadings = [];
    this.speedSum = 0;
    this.readingCount = 0;
    this.maxSpeedValue = 0;
    this.totalDistanceValue = 0;
    this.speedHistoryBuffer = [];
    this.pausedDuration = 0;
    this.pauseStart = null;
    this.startTime = null;
    this.isPausedState = false;
  }

  getCurrentData(): SpeedData {
    const currentSpeed =
      this.speedReadings.length > 0
        ? this.speedReadings[this.speedReadings.length - 1]
        : 0;

    return {
      currentSpeed,
      averageSpeed: this.readingCount > 0 ? this.speedSum / this.readingCount : 0,
      maxSpeed: this.maxSpeedValue,
      totalDistance: this.totalDistanceValue,
      tripDuration: this.getElapsedSeconds(),
      speedHistory: [...this.speedHistoryBuffer],
    };
  }

  get running(): boolean {
    return this.isRunning;
  }

  get paused(): boolean {
    return this.isPausedState;
  }

  private processPosition(position: GPSPosition): void {
    let rawSpeed: number;

    if (position.speed >= 0) {
      rawSpeed = position.speed;
    } else if (this.lastPosition) {
      // Fallback: calculate speed using Haversine
      rawSpeed = calculateSpeed(
        this.lastPosition.latitude,
        this.lastPosition.longitude,
        this.lastPosition.timestamp,
        position.latitude,
        position.longitude,
        position.timestamp,
      );
    } else {
      rawSpeed = 0;
    }

    // Apply Kalman filter
    const filteredSpeed = this.kalmanFilter.filter(rawSpeed);
    const clampedSpeed = Math.max(0, filteredSpeed);

    // Update distance
    if (this.lastPosition) {
      const dist = haversineDistance(
        this.lastPosition.latitude,
        this.lastPosition.longitude,
        position.latitude,
        position.longitude,
      );
      this.totalDistanceValue += dist;
    }

    // Update statistics
    this.speedReadings.push(clampedSpeed);
    this.speedSum += clampedSpeed;
    this.readingCount++;

    if (clampedSpeed > this.maxSpeedValue) {
      this.maxSpeedValue = clampedSpeed;
    }

    // Keep last 60 readings for chart
    this.speedHistoryBuffer.push(clampedSpeed);
    if (this.speedHistoryBuffer.length > 60) {
      this.speedHistoryBuffer.shift();
    }

    this.lastPosition = position;
    this.emitUpdate();
  }

  private getElapsedSeconds(): number {
    if (!this.startTime) {
      return 0;
    }
    const now = Date.now();
    const elapsed = now - this.startTime.getTime() - this.pausedDuration;
    if (this.pauseStart) {
      return Math.floor((elapsed - (now - this.pauseStart)) / 1000);
    }
    return Math.floor(elapsed / 1000);
  }

  private emitUpdate(): void {
    if (this.updateCallback) {
      this.updateCallback(this.getCurrentData());
    }
  }
}

export const speedEngine = new SpeedEngine();
