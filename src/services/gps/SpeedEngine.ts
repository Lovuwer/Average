import { sensorFusionEngine, FusionSpeedData, FusionTripSummary, FusionMotionState, Confidence, PrimarySource, SensorHealth } from '../sensors/SensorFusionEngine';

export interface SpeedData {
  currentSpeed: number; // filtered, m/s
  averageSpeed: number;
  maxSpeed: number;
  totalDistance: number; // meters
  tripDuration: number; // seconds
  speedHistory: number[]; // last 60 readings (m/s)
  confidence: Confidence;
  primarySource: PrimarySource;
  motionState: FusionMotionState;
  gpsAccuracy: number | null;
  stepFrequency: number;
  sensorHealth: SensorHealth;
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
  private isRunning: boolean = false;
  private isPausedState: boolean = false;
  private updateCallback: SpeedUpdateCallback | null = null;

  start(callback: SpeedUpdateCallback): void {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    this.updateCallback = callback;

    sensorFusionEngine.start((data: FusionSpeedData) => {
      if (this.updateCallback) {
        this.updateCallback(data);
      }
    });
  }

  stop(): TripSummary | null {
    if (!this.isRunning) {
      return null;
    }

    const summary = sensorFusionEngine.stop();
    this.isRunning = false;
    this.updateCallback = null;

    if (!summary) {
      return null;
    }

    return summary;
  }

  pause(): void {
    if (!this.isRunning || this.isPausedState) {
      return;
    }
    sensorFusionEngine.pause();
    this.isPausedState = true;
  }

  resume(): void {
    if (!this.isRunning || !this.isPausedState) {
      return;
    }
    sensorFusionEngine.resume();
    this.isPausedState = false;
  }

  reset(): void {
    sensorFusionEngine.reset();
    this.isRunning = false;
    this.isPausedState = false;
    this.updateCallback = null;
  }

  getCurrentData(): SpeedData {
    return sensorFusionEngine.getData();
  }

  get running(): boolean {
    return this.isRunning;
  }

  get paused(): boolean {
    return this.isPausedState;
  }
}

export const speedEngine = new SpeedEngine();
