import { gpsService, GPSPosition } from '../gps/GPSService';
import { KalmanFilter } from '../gps/KalmanFilter';
import { haversineDistance } from '../gps/HaversineCalculator';
import { stepDetectorService } from './StepDetectorService';
import { accelerometerService, MotionState as AccelMotionState } from './AccelerometerService';

export type FusionMotionState = 'stationary' | 'walking' | 'running' | 'vehicle' | 'gps_dead_reckoning';
export type Confidence = 'low' | 'medium' | 'high';
export type PrimarySource = 'accelerometer' | 'pedometer' | 'gps' | 'fused' | 'dead_reckoning';

export interface SensorHealth {
  gps: boolean;
  accelerometer: boolean;
  gyroscope: boolean;
  pedometer: boolean;
  barometer: boolean;
}

export interface FusionSpeedData {
  currentSpeed: number;      // m/s, fused
  averageSpeed: number;
  maxSpeed: number;
  totalDistance: number;      // meters
  tripDuration: number;       // seconds
  speedHistory: number[];    // last 60 fused readings
  confidence: Confidence;
  primarySource: PrimarySource;
  motionState: FusionMotionState;
  gpsAccuracy: number | null;
  stepFrequency: number;
  sensorHealth: SensorHealth;
}

export interface FusionTripSummary extends FusionSpeedData {
  startTime: Date;
  endTime: Date;
}

type FusionCallback = (data: FusionSpeedData) => void;

class SensorFusionEngine {
  private kalmanFilter: KalmanFilter;
  private isRunning = false;
  private isPausedState = false;
  private callback: FusionCallback | null = null;

  // Trip state
  private startTime: Date | null = null;
  private pausedDuration = 0;
  private pauseStart: number | null = null;
  private speedSum = 0;
  private readingCount = 0;
  private maxSpeedValue = 0;
  private totalDistanceValue = 0;
  private speedHistoryBuffer: number[] = [];

  // Fusion state
  private motionState: FusionMotionState = 'stationary';
  private confidence: Confidence = 'low';
  private primarySource: PrimarySource = 'gps';
  private lastGpsPosition: GPSPosition | null = null;
  private lastGpsTime = 0;
  private lastFusedSpeed = 0;
  private motionStateChangeTime = 0;
  private lastStepTime = 0;

  // GPS dead reckoning
  private drStartTime = 0;
  private drSpeed = 0;

  // Sensor health
  private gpsAvailable = false;
  private pedometerAvailable = false;

  // Timer for minimum 2Hz emission
  private emitInterval: ReturnType<typeof setInterval> | null = null;

  // Duration timer
  private durationInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.kalmanFilter = new KalmanFilter();
  }

  start(callback: FusionCallback): void {
    if (this.isRunning) return;

    this.reset();
    this.isRunning = true;
    this.startTime = new Date();
    this.callback = callback;
    this.motionStateChangeTime = Date.now();

    // Start GPS
    gpsService.startTracking((position) => {
      if (this.isPausedState) return;
      this.onGpsUpdate(position);
    });

    // Start step detector
    stepDetectorService.startListening((event) => {
      if (this.isPausedState) return;
      this.lastStepTime = event.timestamp || Date.now();
      this.pedometerAvailable = true;
    });

    // Start accelerometer/gyro/baro
    accelerometerService.startListening((data) => {
      if (this.isPausedState) return;
      this.onAccelUpdate(data.state);
    });

    // Check pedometer availability
    stepDetectorService.isAvailable().then((available) => {
      this.pedometerAvailable = available;
    });

    // Emit at minimum 2Hz (every 500ms) for fast initial response
    this.emitInterval = setInterval(() => {
      if (this.isRunning && !this.isPausedState) {
        this.runFusion();
      }
    }, 500);

    // Update duration every second
    this.durationInterval = setInterval(() => {
      if (this.isRunning && !this.isPausedState) {
        this.emitData();
      }
    }, 1000);
  }

  stop(): FusionTripSummary | null {
    if (!this.isRunning || !this.startTime) return null;

    gpsService.stopTracking();
    stepDetectorService.stopListening();
    accelerometerService.stopListening();

    if (this.emitInterval) {
      clearInterval(this.emitInterval);
      this.emitInterval = null;
    }
    if (this.durationInterval) {
      clearInterval(this.durationInterval);
      this.durationInterval = null;
    }

    const endTime = new Date();
    const summary: FusionTripSummary = {
      ...this.getData(),
      startTime: this.startTime,
      endTime,
    };

    this.isRunning = false;
    this.callback = null;
    return summary;
  }

  pause(): void {
    if (!this.isRunning || this.isPausedState) return;
    this.isPausedState = true;
    this.pauseStart = Date.now();
  }

  resume(): void {
    if (!this.isRunning || !this.isPausedState) return;
    if (this.pauseStart) {
      this.pausedDuration += Date.now() - this.pauseStart;
      this.pauseStart = null;
    }
    this.isPausedState = false;
  }

  getMotionState(): FusionMotionState {
    return this.motionState;
  }

  getSensorHealth(): SensorHealth {
    return {
      gps: this.gpsAvailable,
      accelerometer: accelerometerService.isAccelerometerActive(),
      gyroscope: accelerometerService.isGyroscopeActive(),
      pedometer: this.pedometerAvailable,
      barometer: accelerometerService.isBarometerActive(),
    };
  }

  isGpsAvailable(): boolean {
    return this.gpsAvailable;
  }

  getData(): FusionSpeedData {
    return {
      currentSpeed: this.lastFusedSpeed,
      averageSpeed: this.readingCount > 0 ? this.speedSum / this.readingCount : 0,
      maxSpeed: this.maxSpeedValue,
      totalDistance: this.totalDistanceValue,
      tripDuration: this.getElapsedSeconds(),
      speedHistory: [...this.speedHistoryBuffer],
      confidence: this.confidence,
      primarySource: this.primarySource,
      motionState: this.motionState,
      gpsAccuracy: this.lastGpsPosition?.accuracy ?? null,
      stepFrequency: stepDetectorService.getStepFrequency(),
      sensorHealth: this.getSensorHealth(),
    };
  }

  reset(): void {
    this.kalmanFilter.reset();
    this.lastGpsPosition = null;
    this.lastGpsTime = 0;
    this.speedSum = 0;
    this.readingCount = 0;
    this.maxSpeedValue = 0;
    this.totalDistanceValue = 0;
    this.speedHistoryBuffer = [];
    this.pausedDuration = 0;
    this.pauseStart = null;
    this.startTime = null;
    this.isPausedState = false;
    this.motionState = 'stationary';
    this.confidence = 'low';
    this.primarySource = 'gps';
    this.lastFusedSpeed = 0;
    this.motionStateChangeTime = 0;
    this.lastStepTime = 0;
    this.drStartTime = 0;
    this.drSpeed = 0;
    this.gpsAvailable = false;
    this.pedometerAvailable = false;
  }

  private onGpsUpdate(position: GPSPosition): void {
    // Update GPS availability
    this.gpsAvailable = true;
    this.lastGpsTime = Date.now();

    // If in dead reckoning, exit smoothly
    if (this.motionState === 'gps_dead_reckoning') {
      this.motionState = this.determineMotionState(position);
      this.motionStateChangeTime = Date.now();
    }

    // Distance calculation in vehicle mode
    if (this.lastGpsPosition && this.motionState === 'vehicle') {
      const dist = haversineDistance(
        this.lastGpsPosition.latitude,
        this.lastGpsPosition.longitude,
        position.latitude,
        position.longitude,
      );
      // Only add reasonable distances (< 500m between updates)
      if (dist < 500) {
        let adjustedDist = dist;
        const altChange = accelerometerService.getAltitudeChange();
        if (Math.abs(altChange) > 2 && dist > Math.abs(altChange)) {
          adjustedDist = Math.sqrt(dist * dist - altChange * altChange);
        }
        this.totalDistanceValue += adjustedDist;
      }
    } else if (this.lastGpsPosition && (this.motionState === 'walking' || this.motionState === 'running')) {
      // Walking/running distance: prefer iOS pedometer distance
      const iosDist = stepDetectorService.getIosDistance();
      if (iosDist !== null && iosDist > 0) {
        // iOS provides cumulative distance - handled by pedometer
      } else {
        // Android: use GPS distance as supplement
        const dist = haversineDistance(
          this.lastGpsPosition.latitude,
          this.lastGpsPosition.longitude,
          position.latitude,
          position.longitude,
        );
        if (dist < 100) {
          this.totalDistanceValue += dist;
        }
      }
    }

    this.lastGpsPosition = position;
    this.runFusion();
  }

  private onAccelUpdate(accelState: AccelMotionState): void {
    // The accelerometer classification is an input to our state machine
    // but the fusion engine makes the final decision
    this.runFusion();
  }

  private runFusion(): void {
    const now = Date.now();
    const gpsAge = now - this.lastGpsTime;
    const gpsSpeed = this.lastGpsPosition?.speed ?? -1;
    const gpsAccuracy = this.lastGpsPosition?.accuracy ?? 999;
    const accelState = accelerometerService.getCurrentState();
    const stepFreq = stepDetectorService.getStepFrequency();
    const timeSinceLastStep = now - this.lastStepTime;
    const timeSinceStateChange = now - this.motionStateChangeTime;

    // --- STATE MACHINE ---
    const previousState = this.motionState;

    // Check for GPS dead reckoning entry
    if (this.motionState === 'vehicle' && gpsAge > 3000 && this.lastGpsTime > 0) {
      this.motionState = 'gps_dead_reckoning';
      this.drStartTime = now;
      this.drSpeed = this.lastFusedSpeed;
      this.motionStateChangeTime = now;
    }

    // GPS dead reckoning exit handled in onGpsUpdate

    if (this.motionState !== 'gps_dead_reckoning') {
      this.motionState = this.determineMotionState(this.lastGpsPosition);
    }

    if (previousState !== this.motionState) {
      this.motionStateChangeTime = now;
    }

    // --- ADAPTIVE KALMAN ---
    this.tuneKalman(timeSinceStateChange, previousState !== this.motionState);

    // --- SPEED CALCULATION ---
    let fusedSpeed = 0;

    switch (this.motionState) {
      case 'stationary':
        fusedSpeed = 0;
        this.kalmanFilter.reset(0);
        this.confidence = 'high';
        this.primarySource = 'accelerometer';
        break;

      case 'walking':
        fusedSpeed = this.calculateWalkingSpeed(timeSinceStateChange, gpsSpeed, gpsAccuracy);
        break;

      case 'running':
        fusedSpeed = this.calculateRunningSpeed(timeSinceStateChange, gpsSpeed, gpsAccuracy);
        break;

      case 'vehicle':
        fusedSpeed = this.calculateVehicleSpeed(gpsSpeed, gpsAccuracy);
        break;

      case 'gps_dead_reckoning':
        fusedSpeed = this.calculateDeadReckoningSpeed(now);
        break;
    }

    // Apply Kalman filter (except stationary which resets it)
    if (this.motionState !== 'stationary') {
      fusedSpeed = this.kalmanFilter.filter(Math.max(0, fusedSpeed));
    }

    this.lastFusedSpeed = Math.max(0, fusedSpeed);

    // Update statistics
    this.speedSum += this.lastFusedSpeed;
    this.readingCount++;

    if (this.lastFusedSpeed > this.maxSpeedValue) {
      this.maxSpeedValue = this.lastFusedSpeed;
    }

    this.speedHistoryBuffer.push(this.lastFusedSpeed);
    if (this.speedHistoryBuffer.length > 60) {
      this.speedHistoryBuffer.shift();
    }

    this.emitData();
  }

  private determineMotionState(gpsPos: GPSPosition | null): FusionMotionState {
    const now = Date.now();
    const gpsSpeed = gpsPos?.speed ?? -1;
    const gpsSpeedMs = gpsSpeed >= 0 ? gpsSpeed : 0;
    const gpsAvailable = gpsSpeed >= 0;
    const gpsAccuracy = gpsPos?.accuracy ?? 999;
    const accelState = accelerometerService.getCurrentState();
    const accelActive = accelerometerService.isAccelerometerActive();
    const stepFreq = stepDetectorService.getStepFrequency();
    const timeSinceLastStep = now - this.lastStepTime;
    const stepsRecent = this.lastStepTime > 0 && timeSinceLastStep < 2000;
    const accelVariance = accelerometerService.getAccelVariance();

    // ═══════════════════════════════════════════════════════
    // TIER 1: GPS-BASED CLASSIFICATION (works without any sensors)
    // GPS is ALWAYS the ground truth for speed magnitude.
    // ═══════════════════════════════════════════════════════

    // Vehicle mode: GPS speed > 6 m/s (21.6 km/h) — no human runs this fast sustained
    if (gpsAvailable && gpsSpeedMs > 6) {
      return 'vehicle';
    }

    // Clear GPS movement: speed > 0.8 m/s (2.9 km/h) with reasonable accuracy
    // This is DEFINITELY not stationary — person is walking, running, or slow vehicle
    if (gpsAvailable && gpsSpeedMs > 0.8 && gpsAccuracy < 20) {
      // Sub-classify: running vs walking using GPS speed
      if (gpsSpeedMs > 3.0) {
        // > 10.8 km/h — running speed or slow cycling
        // If sensors confirm running, great. If not, still call it running from GPS alone.
        return 'running';
      }
      // 0.8 – 3.0 m/s (2.9 – 10.8 km/h) = walking or jogging
      return 'walking';
    }

    // ═══════════════════════════════════════════════════════
    // TIER 2: SENSOR-ENHANCED CLASSIFICATION (refines GPS)
    // Only used when GPS speed is ambiguous (0 – 0.8 m/s)
    // ═══════════════════════════════════════════════════════

    // If sensors are active and reporting, use them to disambiguate
    if (accelActive) {
      // Sensors say running + some GPS movement
      if ((accelState === 'running' || stepFreq > 2.5) && stepsRecent && gpsSpeedMs < 6) {
        return 'running';
      }

      // Sensors say walking
      if (stepsRecent && stepFreq > 0 && gpsSpeedMs < 3) {
        return 'walking';
      }

      // Accelerometer says walking (even without step detector)
      if (accelState === 'walking' && gpsSpeedMs < 3) {
        return 'walking';
      }

      // Accelerometer says vehicle (low-freq vibration, no steps)
      if (accelState === 'vehicle' && !stepsRecent) {
        return 'vehicle';
      }
    }

    // ═══════════════════════════════════════════════════════
    // TIER 3: GPS MARGINAL SPEED (0.3 – 0.8 m/s)
    // GPS jitter zone — could be stationary or slow walk
    // ═══════════════════════════════════════════════════════

    if (gpsAvailable && gpsSpeedMs > 0.3 && gpsAccuracy < 15) {
      // Marginal speed with good accuracy — probably slow walking
      // If we were already walking/running, stay in that state (hysteresis)
      if (this.motionState === 'walking' || this.motionState === 'running') {
        return 'walking';
      }
      // If we were stationary, give GPS the benefit of the doubt if speed sustained
      // But don't immediately jump to walking from one reading
      return 'stationary';
    }

    // ═══════════════════════════════════════════════════════
    // TIER 4: VEHICLE STATE TRANSITIONS
    // ═══════════════════════════════════════════════════════

    // Stay in vehicle mode at low speed if accelerometer shows vibration (engine idle at red light)
    if (this.motionState === 'vehicle' && gpsSpeedMs < 2) {
      if (accelActive && accelVariance >= 0.08) {
        // Engine vibration detected — likely stopped at red light, stay in vehicle briefly
        const timeLowSpeed = now - this.motionStateChangeTime;
        if (timeLowSpeed < 5000) {
          return 'vehicle';
        }
      }
      // Been stopped for a while → stationary
      return 'stationary';
    }

    // ═══════════════════════════════════════════════════════
    // TIER 5: DEFAULT — STATIONARY
    // ═══════════════════════════════════════════════════════

    // GPS speed < 0.3, no sensor movement, no steps → stationary
    if (gpsSpeedMs < 0.3 && (!accelActive || accelState === 'stationary') && !stepsRecent) {
      return 'stationary';
    }

    // Preserve current state if nothing definitively changed
    return this.motionState === 'gps_dead_reckoning' ? 'stationary' : this.motionState;
  }

  private calculateWalkingSpeed(timeSinceStateChange: number, gpsSpeed: number, gpsAccuracy: number): number {
    const stepSpeed = stepDetectorService.getEstimatedSpeed();
    const sensorsWorking = stepSpeed > 0;

    // ═══════════════════════════════════════════════════════
    // FAST PATH: If GPS has a valid speed, use it immediately
    // This is the key fix — GPS speed is available from the FIRST callback
    // No need to wait for pedometer to warm up
    // ═══════════════════════════════════════════════════════

    if (!sensorsWorking) {
      // Sensors are dead — pure GPS mode
      if (gpsSpeed >= 0 && gpsAccuracy < 20) {
        this.confidence = gpsAccuracy < 10 ? 'high' : 'medium';
        this.primarySource = 'gps';
        return gpsSpeed;
      }
      // No GPS either — use initial estimate briefly, then 0
      this.confidence = 'low';
      this.primarySource = 'accelerometer';
      return timeSinceStateChange < 2000 ? 1.2 : 0;
    }

    // ═══════════════════════════════════════════════════════
    // SENSOR-ENHANCED PATH: Blend pedometer + GPS
    // ═══════════════════════════════════════════════════════

    // Phase 1: 0–300ms, before steps are counted
    if (timeSinceStateChange < 300) {
      // If GPS already has a speed, use it instead of hardcoded 1.2
      if (gpsSpeed >= 0 && gpsAccuracy < 15) {
        this.confidence = 'medium';
        this.primarySource = 'gps';
        return gpsSpeed;
      }
      this.confidence = 'low';
      this.primarySource = 'accelerometer';
      return 1.2; // 4.3 km/h initial estimate
    }

    // Phase 2: 300ms–2s, 3+ steps collected
    if (timeSinceStateChange < 2000) {
      if (stepSpeed > 0) {
        const gpsUsable = gpsSpeed >= 0 && gpsAccuracy < 15;
        if (gpsUsable) {
          this.confidence = 'medium';
          this.primarySource = 'fused';
          return 0.8 * stepSpeed + 0.2 * gpsSpeed;
        }
        this.confidence = 'medium';
        this.primarySource = 'pedometer';
        return stepSpeed;
      }
      // Steps not ready yet but GPS is — use GPS
      if (gpsSpeed >= 0 && gpsAccuracy < 15) {
        this.confidence = 'medium';
        this.primarySource = 'gps';
        return gpsSpeed;
      }
      this.confidence = 'low';
      this.primarySource = 'accelerometer';
      return 1.2;
    }

    // Phase 3: 2s+, GPS has warmed up
    if (stepSpeed > 0 && gpsSpeed >= 0) {
      const gpsWeight = this.getGpsWeight(gpsAccuracy);
      this.confidence = 'high';
      this.primarySource = 'fused';
      return (1 - gpsWeight) * stepSpeed + gpsWeight * gpsSpeed;
    }

    if (stepSpeed > 0) {
      this.confidence = 'high';
      this.primarySource = 'pedometer';
      return stepSpeed;
    }

    if (gpsSpeed >= 0) {
      this.confidence = 'medium';
      this.primarySource = 'gps';
      return gpsSpeed;
    }

    this.confidence = 'low';
    this.primarySource = 'accelerometer';
    return 1.2;
  }

  private calculateRunningSpeed(timeSinceStateChange: number, gpsSpeed: number, gpsAccuracy: number): number {
    const stepSpeed = stepDetectorService.getEstimatedSpeed();
    const sensorsWorking = stepSpeed > 0;

    // Pure GPS mode when sensors are dead
    if (!sensorsWorking) {
      if (gpsSpeed >= 0 && gpsAccuracy < 20) {
        this.confidence = gpsAccuracy < 10 ? 'high' : 'medium';
        this.primarySource = 'gps';
        return gpsSpeed;
      }
      this.confidence = 'low';
      this.primarySource = 'accelerometer';
      return timeSinceStateChange < 2000 ? 2.8 : 0;
    }

    // Phase 1
    if (timeSinceStateChange < 300) {
      if (gpsSpeed >= 0 && gpsAccuracy < 15) {
        this.confidence = 'medium';
        this.primarySource = 'gps';
        return gpsSpeed;
      }
      this.confidence = 'low';
      this.primarySource = 'accelerometer';
      return 2.8; // 10 km/h initial estimate
    }

    // Phase 2
    if (timeSinceStateChange < 2000) {
      if (stepSpeed > 0) {
        const gpsUsable = gpsSpeed >= 0 && gpsAccuracy < 15;
        if (gpsUsable) {
          this.confidence = 'medium';
          this.primarySource = 'fused';
          return 0.7 * stepSpeed + 0.3 * gpsSpeed;
        }
        this.confidence = 'medium';
        this.primarySource = 'pedometer';
        return stepSpeed;
      }
      if (gpsSpeed >= 0 && gpsAccuracy < 15) {
        this.confidence = 'medium';
        this.primarySource = 'gps';
        return gpsSpeed;
      }
      this.confidence = 'low';
      this.primarySource = 'accelerometer';
      return 2.8;
    }

    // Phase 3 - higher GPS weight for running
    if (stepSpeed > 0 && gpsSpeed >= 0) {
      const gpsWeight = Math.min(0.5, this.getGpsWeight(gpsAccuracy) + 0.1);
      this.confidence = 'high';
      this.primarySource = 'fused';
      return (1 - gpsWeight) * stepSpeed + gpsWeight * gpsSpeed;
    }

    if (stepSpeed > 0) {
      this.confidence = 'high';
      this.primarySource = 'pedometer';
      return stepSpeed;
    }

    if (gpsSpeed >= 0) {
      this.confidence = 'medium';
      this.primarySource = 'gps';
      return gpsSpeed;
    }

    this.confidence = 'low';
    this.primarySource = 'accelerometer';
    return 2.8;
  }

  private calculateVehicleSpeed(gpsSpeed: number, gpsAccuracy: number): number {
    this.primarySource = 'gps';

    // GPS is AUTHORITATIVE in vehicle mode
    if (gpsSpeed < 0 || gpsAccuracy > 30) {
      this.confidence = 'low';
      return this.lastFusedSpeed; // maintain last speed if GPS bad
    }

    // Dead zone: GPS jitter while stopped at red light
    if (gpsSpeed < 0.5) {
      this.confidence = 'high';
      return 0;
    }

    this.confidence = 'high';
    return gpsSpeed;
  }

  private calculateDeadReckoningSpeed(now: number): number {
    const drDuration = (now - this.drStartTime) / 1000; // seconds

    this.confidence = 'low';
    this.primarySource = 'dead_reckoning';

    // Maximum DR duration: 60 seconds
    if (drDuration > 60) {
      return 0;
    }

    // Speed decays by 2% per second
    const decayFactor = Math.pow(0.98, drDuration);
    this.drSpeed = this.drSpeed * decayFactor;

    // Accumulate distance
    this.totalDistanceValue += this.drSpeed * 0.5; // 500ms intervals

    return this.drSpeed;
  }

  private getGpsWeight(accuracy: number): number {
    if (accuracy < 5) return 0.5;
    if (accuracy < 10) return 0.4;
    if (accuracy < 15) return 0.3;
    return 0.1;
  }

  private tuneKalman(timeSinceStateChange: number, stateJustChanged: boolean): void {
    const accelMag = accelerometerService.getAccelMagnitude();

    if (stateJustChanged || timeSinceStateChange < 1000) {
      // Just started moving - ADAPT FAST
      this.kalmanFilter.setProcessNoise(0.8);
      this.kalmanFilter.setMeasurementNoise(0.15);
      return;
    }

    switch (this.motionState) {
      case 'stationary':
        this.kalmanFilter.setProcessNoise(0.01);
        this.kalmanFilter.setMeasurementNoise(0.5);
        break;

      case 'walking':
        if (timeSinceStateChange > 3000) {
          this.kalmanFilter.setProcessNoise(0.05);
          this.kalmanFilter.setMeasurementNoise(0.2);
        }
        break;

      case 'running':
        this.kalmanFilter.setProcessNoise(0.08);
        this.kalmanFilter.setMeasurementNoise(0.2);
        break;

      case 'vehicle':
        if (accelMag > 1.5) {
          // Braking
          this.kalmanFilter.setProcessNoise(0.6);
          this.kalmanFilter.setMeasurementNoise(0.1);
        } else if (accelMag > 1.0) {
          // Accelerating
          this.kalmanFilter.setProcessNoise(0.5);
          this.kalmanFilter.setMeasurementNoise(0.1);
        } else if (accelMag < 0.3) {
          // Cruising
          this.kalmanFilter.setProcessNoise(0.03);
          this.kalmanFilter.setMeasurementNoise(0.1);
        } else {
          this.kalmanFilter.setProcessNoise(0.3);
          this.kalmanFilter.setMeasurementNoise(0.1);
        }
        break;

      case 'gps_dead_reckoning':
        this.kalmanFilter.setProcessNoise(0.3);
        this.kalmanFilter.setMeasurementNoise(0.8);
        break;
    }
  }

  private getElapsedSeconds(): number {
    if (!this.startTime) return 0;
    const now = Date.now();
    const elapsed = now - this.startTime.getTime() - this.pausedDuration;
    if (this.pauseStart) {
      return Math.floor((elapsed - (now - this.pauseStart)) / 1000);
    }
    return Math.floor(elapsed / 1000);
  }

  private emitData(): void {
    if (this.callback) {
      this.callback(this.getData());
    }
  }
}

export const sensorFusionEngine = new SensorFusionEngine();
