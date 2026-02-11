import { NativeModules, NativeEventEmitter, Platform } from 'react-native';

const { StepDetectorModule } = NativeModules;

export interface StepEvent {
  timestamp: number;
  cadence?: number;
  pace?: number;
  distance?: number;
}

class StepDetectorService {
  private eventEmitter: NativeEventEmitter | null = null;
  private stepSubscription: any = null;
  private countSubscription: any = null;
  private stepTimestamps: number[] = []; // circular buffer of last 10 step timestamps
  private iosCadence: number | null = null; // iOS-provided cadence (steps/sec)
  private iosPace: number | null = null; // iOS-provided pace (sec/meter)
  private iosDistance: number | null = null;
  private readonly MAX_BUFFER_SIZE = 10;
  private readonly STEP_TIMEOUT = 2000; // ms - if no step for 2s, user stopped
  private readonly MIN_VALID_EPOCH_MS = 1577836800000; // Jan 1, 2020 in epoch ms

  constructor() {
    if (StepDetectorModule) {
      this.eventEmitter = new NativeEventEmitter(StepDetectorModule);
    }
  }

  async isAvailable(): Promise<boolean> {
    if (!StepDetectorModule) {
      return false;
    }
    try {
      return await StepDetectorModule.isAvailable();
    } catch {
      return false;
    }
  }

  startListening(onStep?: (event: StepEvent) => void): void {
    if (!this.eventEmitter || !StepDetectorModule) {
      return;
    }

    this.stepTimestamps = [];
    this.iosCadence = null;
    this.iosPace = null;
    this.iosDistance = null;

    this.stepSubscription = this.eventEmitter.addListener(
      'onStepDetected',
      (data: any) => {
        // Ensure timestamp is in epoch-ms domain (compatible with Date.now())
        // If timestamp looks like boot-relative (< year 2020 in ms), use Date.now() instead
        const rawTs = data.timestamp;
        const timestamp = (rawTs && rawTs > this.MIN_VALID_EPOCH_MS) ? rawTs : Date.now();

        // Update circular buffer
        this.stepTimestamps.push(timestamp);
        if (this.stepTimestamps.length > this.MAX_BUFFER_SIZE) {
          this.stepTimestamps.shift();
        }

        // iOS provides cadence and pace directly (ML-refined, very accurate)
        if (data.cadence !== undefined && data.cadence !== null) {
          this.iosCadence = data.cadence;
        }
        if (data.pace !== undefined && data.pace !== null) {
          this.iosPace = data.pace;
        }
        if (data.distance !== undefined && data.distance !== null) {
          this.iosDistance = data.distance;
        }

        const event: StepEvent = {
          timestamp,
          cadence: data.cadence,
          pace: data.pace,
          distance: data.distance,
        };

        onStep?.(event);
      },
    );

    this.countSubscription = this.eventEmitter.addListener(
      'onStepCount',
      (_data: any) => {
        // Step count events used for distance tracking
      },
    );

    try {
      StepDetectorModule.start();
    } catch {
      // Graceful degradation
    }
  }

  stopListening(): void {
    if (StepDetectorModule) {
      try {
        StepDetectorModule.stop();
      } catch {
        // Graceful degradation
      }
    }
    if (this.stepSubscription) {
      this.stepSubscription.remove();
      this.stepSubscription = null;
    }
    if (this.countSubscription) {
      this.countSubscription.remove();
      this.countSubscription = null;
    }
    this.stepTimestamps = [];
    this.iosCadence = null;
    this.iosPace = null;
    this.iosDistance = null;
  }

  getStepFrequency(): number {
    // If iOS cadence is available, use it directly (ML-refined, very accurate)
    if (this.iosCadence !== null && this.iosCadence > 0) {
      return this.iosCadence;
    }

    // Android: calculate from step timestamps
    const bufferSize = this.stepTimestamps.length;
    if (bufferSize < 3) {
      return 0;
    }

    const lastTimestamp = this.stepTimestamps[bufferSize - 1];
    const now = Date.now();

    // If time since last step > 2 seconds, user stopped
    if (now - lastTimestamp > this.STEP_TIMEOUT) {
      return 0;
    }

    const firstTimestamp = this.stepTimestamps[0];
    const timeSpan = (lastTimestamp - firstTimestamp) / 1000; // seconds

    if (timeSpan <= 0) {
      return 0;
    }

    return (bufferSize - 1) / timeSpan;
  }

  getEstimatedSpeed(): number {
    // If iOS pace is available, use it (pace is sec/meter, speed is m/s)
    if (this.iosPace !== null && this.iosPace > 0) {
      return 1 / this.iosPace;
    }

    const stepFreq = this.getStepFrequency();
    if (stepFreq <= 0) {
      return 0;
    }

    const stride = this.getAdaptiveStride(stepFreq);
    return stepFreq * stride;
  }

  getCadence(): number | null {
    return this.iosCadence;
  }

  getPace(): number | null {
    return this.iosPace;
  }

  getIosDistance(): number | null {
    return this.iosDistance;
  }

  private getAdaptiveStride(stepFreq: number): number {
    if (stepFreq <= 1.5) {
      return 0.60; // slow walk
    } else if (stepFreq <= 2.2) {
      return 0.60 + ((stepFreq - 1.5) / (2.2 - 1.5)) * 0.15; // 0.60–0.75m normal walk
    } else if (stepFreq <= 2.8) {
      return 0.75 + ((stepFreq - 2.2) / (2.8 - 2.2)) * 0.20; // 0.75–0.95m fast walk/jog
    } else if (stepFreq <= 3.5) {
      return 0.95 + ((stepFreq - 2.8) / (3.5 - 2.8)) * 0.35; // 0.95–1.30m running
    } else {
      return 1.30; // sprinting, capped
    }
  }
}

export const stepDetectorService = new StepDetectorService();
