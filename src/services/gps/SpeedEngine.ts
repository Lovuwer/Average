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
  
  // GPS accuracy gating
  private readonly MIN_GPS_ACCURACY = 20; // meters - reject readings with poor accuracy
  
  // Stationary detection
  private stationaryCount: number = 0;
  private readonly SPEED_DEAD_ZONE = 0.5; // m/s (~1.8 km/h)
  private readonly STATIONARY_THRESHOLD = 0.3; // m/s
  private readonly STATIONARY_COUNT_LIMIT = 3;

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
    this.stationaryCount = 0;
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
    // GPS accuracy gating - skip low-quality readings
    if (position.accuracy > this.MIN_GPS_ACCURACY) {
      return;
    }

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

    // Speed confidence check - cross-check all speeds with Haversine calculation
    if (this.lastPosition && rawSpeed > 0) {
      const haversineSpeed = calculateSpeed(
        this.lastPosition.latitude,
        this.lastPosition.longitude,
        this.lastPosition.timestamp,
        position.latitude,
        position.longitude,
        position.timestamp,
      );

      // If speeds differ by more than 50%, prefer the lower value
      const speedDiff = Math.abs(rawSpeed - haversineSpeed);
      const avgSpeed = (rawSpeed + haversineSpeed) / 2;
      if (avgSpeed > 0 && speedDiff / avgSpeed > 0.5) {
        rawSpeed = Math.min(rawSpeed, haversineSpeed);
      }
    }

    // Stationary detection - track consecutive low-speed readings
    if (rawSpeed < this.STATIONARY_THRESHOLD) {
      this.stationaryCount++;
      if (this.stationaryCount >= this.STATIONARY_COUNT_LIMIT) {
        // Force speed to 0 and reset Kalman filter when stationary
        this.kalmanFilter.reset(0);
        this.updateSpeedStatistics(0, position);
        return;
      }
    } else {
      // Moving - reset stationary counter
      this.stationaryCount = 0;
    }

    // Apply Kalman filter
    let filteredSpeed = this.kalmanFilter.filter(rawSpeed);

    // Apply dead zone to eliminate GPS jitter when nearly stationary
    if (filteredSpeed < this.SPEED_DEAD_ZONE) {
      filteredSpeed = 0;
    }

    const clampedSpeed = Math.max(0, filteredSpeed);
    this.updateSpeedStatistics(clampedSpeed, position);
  }

  private updateSpeedStatistics(speed: number, position: GPSPosition): void {
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
    this.speedReadings.push(speed);
    this.speedSum += speed;
    this.readingCount++;

    if (speed > this.maxSpeedValue) {
      this.maxSpeedValue = speed;
    }

    // Keep last 60 readings for chart
    this.speedHistoryBuffer.push(speed);
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
