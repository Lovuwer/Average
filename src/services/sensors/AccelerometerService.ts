export type MotionState = 'stationary' | 'walking' | 'running' | 'vehicle';

export interface MotionData {
  state: MotionState;
  accelVariance: number;
  magnitude: number;
  timestamp: number;
}

class AccelerometerService {
  private accelSubscription: any = null;
  private gyroSubscription: any = null;
  private baroSubscription: any = null;

  // Gravity removal
  private gravity = { x: 0, y: 0, z: 0 };

  // Sliding window for magnitude (100 readings = 2s at 50Hz)
  private magnitudeBuffer: number[] = [];
  private readonly FULL_WINDOW_SIZE = 100;
  private readonly FAST_WINDOW_SIZE = 25; // 500ms at 50Hz
  private startTime: number = 0;

  // Motion classification
  private currentState: MotionState = 'stationary';
  private debounceCount = 0;
  private debounceTarget: MotionState = 'stationary';
  private readonly DEBOUNCE_THRESHOLD = 5;

  // Gyroscope
  private yawRate: number = 0; // rad/s
  private headingDelta: number = 0; // degrees
  private lastGyroTimestamp: number = 0;

  // Barometer
  private initialAltitude: number | null = null;
  private currentAltitude: number = 0;

  // Callback
  private onDataCallback: ((data: MotionData) => void) | null = null;
  private accelActive = false;
  private gyroActive = false;
  private baroActive = false;

  startListening(onData?: (data: MotionData) => void): void {
    this.onDataCallback = onData || null;
    this.startTime = Date.now();
    this.magnitudeBuffer = [];
    this.gravity = { x: 0, y: 0, z: 0 };
    this.currentState = 'stationary';
    this.debounceCount = 0;
    this.yawRate = 0;
    this.headingDelta = 0;
    this.lastGyroTimestamp = 0;
    this.initialAltitude = null;
    this.currentAltitude = 0;

    try {
      const sensors = require('react-native-sensors');
      const { accelerometer, gyroscope, barometer, setUpdateIntervalForType } = sensors;

      // Set update intervals
      setUpdateIntervalForType('accelerometer', 20); // 50Hz
      setUpdateIntervalForType('gyroscope', 50); // 20Hz
      setUpdateIntervalForType('barometer', 1000); // 1Hz

      // Accelerometer subscription
      this.accelSubscription = accelerometer.subscribe({
        next: (data: { x: number; y: number; z: number; timestamp: number }) => {
          this.processAccelerometer(data);
        },
        error: () => {
          this.accelActive = false;
        },
      });
      this.accelActive = true;

      // Gyroscope subscription
      this.gyroSubscription = gyroscope.subscribe({
        next: (data: { x: number; y: number; z: number; timestamp: number }) => {
          this.processGyroscope(data);
        },
        error: () => {
          this.gyroActive = false;
        },
      });
      this.gyroActive = true;

      // Barometer subscription
      this.baroSubscription = barometer.subscribe({
        next: (data: { pressure: number }) => {
          this.processBarometer(data);
        },
        error: () => {
          this.baroActive = false;
        },
      });
      this.baroActive = true;
    } catch {
      // Graceful degradation - sensors not available
    }
  }

  stopListening(): void {
    if (this.accelSubscription) {
      this.accelSubscription.unsubscribe();
      this.accelSubscription = null;
    }
    if (this.gyroSubscription) {
      this.gyroSubscription.unsubscribe();
      this.gyroSubscription = null;
    }
    if (this.baroSubscription) {
      this.baroSubscription.unsubscribe();
      this.baroSubscription = null;
    }
    this.accelActive = false;
    this.gyroActive = false;
    this.baroActive = false;
    this.onDataCallback = null;
  }

  getCurrentState(): MotionState {
    return this.currentState;
  }

  getAccelMagnitude(): number {
    if (this.magnitudeBuffer.length === 0) return 0;
    return this.magnitudeBuffer[this.magnitudeBuffer.length - 1];
  }

  getAccelVariance(): number {
    return this.calculateVariance();
  }

  getLinearAcceleration(): { x: number; y: number; z: number } {
    return { x: 0, y: 0, z: 0 }; // simplified - full impl uses gravity removal
  }

  getYawRate(): number {
    return this.yawRate;
  }

  getHeadingDelta(): number {
    return this.headingDelta;
  }

  resetHeadingDelta(): void {
    this.headingDelta = 0;
  }

  getAltitudeChange(): number {
    if (this.initialAltitude === null) return 0;
    return this.currentAltitude - this.initialAltitude;
  }

  resetAltitude(): void {
    this.initialAltitude = this.currentAltitude;
  }

  isAccelerometerActive(): boolean {
    return this.accelActive;
  }

  isGyroscopeActive(): boolean {
    return this.gyroActive;
  }

  isBarometerActive(): boolean {
    return this.baroActive;
  }

  private processAccelerometer(data: { x: number; y: number; z: number; timestamp: number }): void {
    // Gravity removal using low-pass filter
    this.gravity.x = 0.8 * this.gravity.x + 0.2 * data.x;
    this.gravity.y = 0.8 * this.gravity.y + 0.2 * data.y;
    this.gravity.z = 0.8 * this.gravity.z + 0.2 * data.z;

    // Linear acceleration
    const linearX = data.x - this.gravity.x;
    const linearY = data.y - this.gravity.y;
    const linearZ = data.z - this.gravity.z;

    // Magnitude
    const magnitude = Math.sqrt(linearX * linearX + linearY * linearY + linearZ * linearZ);

    // Use fast or full window
    const elapsed = Date.now() - this.startTime;
    const windowSize = elapsed < 500 ? this.FAST_WINDOW_SIZE : this.FULL_WINDOW_SIZE;

    this.magnitudeBuffer.push(magnitude);
    if (this.magnitudeBuffer.length > windowSize) {
      this.magnitudeBuffer = this.magnitudeBuffer.slice(-windowSize);
    }

    // Classify motion
    const variance = this.calculateVariance();
    const dominantFreq = this.calculateDominantFrequency();
    const newState = this.classifyMotion(variance, dominantFreq);

    // Debounce
    if (newState !== this.debounceTarget) {
      this.debounceTarget = newState;
      this.debounceCount = 1;
    } else {
      this.debounceCount++;
    }

    if (this.debounceCount >= this.DEBOUNCE_THRESHOLD) {
      if (this.currentState !== newState) {
        this.currentState = newState;
      }
    }

    // Emit data
    this.onDataCallback?.({
      state: this.currentState,
      accelVariance: variance,
      magnitude,
      timestamp: data.timestamp || Date.now(),
    });
  }

  private processGyroscope(data: { x: number; y: number; z: number; timestamp: number }): void {
    this.yawRate = data.z; // z-axis rotation = yaw

    if (this.lastGyroTimestamp > 0 && data.timestamp > 0) {
      const dt = (data.timestamp - this.lastGyroTimestamp) / 1000;
      if (dt > 0 && dt < 1) { // sanity check
        this.headingDelta += (data.z * dt * 180) / Math.PI; // radians to degrees
      }
    }
    this.lastGyroTimestamp = data.timestamp;
  }

  private processBarometer(data: { pressure: number }): void {
    // Convert pressure to altitude: altitude = 44330 * (1 - (pressure / 1013.25) ^ 0.1903)
    const altitude = 44330 * (1 - Math.pow(data.pressure / 1013.25, 0.1903));
    this.currentAltitude = altitude;

    if (this.initialAltitude === null) {
      this.initialAltitude = altitude;
    }
  }

  private calculateVariance(): number {
    const buf = this.magnitudeBuffer;
    if (buf.length < 3) return 0;

    const mean = buf.reduce((a, b) => a + b, 0) / buf.length;
    const variance = buf.reduce((sum, val) => sum + (val - mean) * (val - mean), 0) / buf.length;
    return variance;
  }

  private calculateDominantFrequency(): number {
    const buf = this.magnitudeBuffer;
    if (buf.length < 10) return 0;

    const mean = buf.reduce((a, b) => a + b, 0) / buf.length;
    let zeroCrossings = 0;
    for (let i = 1; i < buf.length; i++) {
      if ((buf[i] - mean) * (buf[i - 1] - mean) < 0) {
        zeroCrossings++;
      }
    }

    // At 50Hz, window duration = buffer.length / 50 seconds
    const windowDuration = buf.length / 50;
    return zeroCrossings / 2 / windowDuration;
  }

  private classifyMotion(variance: number, dominantFreq: number): MotionState {
    if (variance < 0.08) {
      return 'stationary';
    }

    if (variance >= 0.6 && variance <= 5.0 && dominantFreq >= 2.0 && dominantFreq <= 4.0) {
      return 'running';
    }

    if (variance >= 0.08 && variance <= 0.6 && dominantFreq >= 1.2 && dominantFreq <= 2.5) {
      return 'walking';
    }

    // Vehicle: low-variance, non-periodic vibration
    if (variance >= 0.08 && variance <= 1.5 && dominantFreq < 1.0) {
      return 'vehicle';
    }

    // Smooth sustained acceleration = vehicle
    if (variance >= 0.08 && variance <= 0.5) {
      return 'vehicle';
    }

    // Default to previous state or stationary
    return this.currentState;
  }
}

export const accelerometerService = new AccelerometerService();
