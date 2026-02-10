export interface FilteredState {
  latitude: number;
  longitude: number;
  speed: number;
  heading: number;
  quality: 'excellent' | 'good' | 'fair' | 'poor';
}

export interface GPSMeasurement {
  latitude: number;
  longitude: number;
  accuracy: number;
  speed?: number;
  timestamp: number;
}

export class KalmanFilter2D {
  private state: number[]; // [lat, lon, vN, vE]
  private covariance: number[][];
  private processNoise: number;
  private measurementNoise: number;
  private initialized: boolean = false;
  private lastTimestamp: number = 0;
  private lastAccuracy: number = 30;

  constructor(config?: {
    processNoise?: number;
    measurementNoise?: number;
    initialAccuracy?: number;
  }) {
    this.processNoise = config?.processNoise ?? 0.01;
    this.measurementNoise = config?.measurementNoise ?? 1.0;
    this.lastAccuracy = config?.initialAccuracy ?? 30;

    this.state = [0, 0, 0, 0];
    this.covariance = [
      [1, 0, 0, 0],
      [0, 1, 0, 0],
      [0, 0, 1, 0],
      [0, 0, 0, 1],
    ];
  }

  predict(dt: number): void {
    if (!this.initialized || dt <= 0) return;

    // State transition: position += velocity * dt
    this.state[0] += this.state[2] * dt;
    this.state[1] += this.state[3] * dt;

    // Update covariance with process noise
    const q = this.processNoise * dt;
    for (let i = 0; i < 4; i++) {
      this.covariance[i][i] += q;
    }
  }

  update(measurement: GPSMeasurement): FilteredState {
    const dt = this.initialized
      ? (measurement.timestamp - this.lastTimestamp) / 1000
      : 0;

    if (!this.initialized) {
      this.state = [measurement.latitude, measurement.longitude, 0, 0];
      this.initialized = true;
      this.lastTimestamp = measurement.timestamp;
      this.lastAccuracy = measurement.accuracy;
      return this.getFilteredState();
    }

    this.predict(dt);

    // Adaptive measurement noise based on GPS accuracy
    const adaptiveMeasurementNoise = this.measurementNoise * (measurement.accuracy / 10);

    // Innovation (difference between measurement and prediction)
    const innovLat = measurement.latitude - this.state[0];
    const innovLon = measurement.longitude - this.state[1];

    // Outlier rejection: if innovation > 3 sigma, reduce trust
    const sigma = Math.sqrt(this.covariance[0][0] + adaptiveMeasurementNoise);
    const innovMagnitude = Math.sqrt(innovLat * innovLat + innovLon * innovLon);
    const effectiveNoise = innovMagnitude > 3 * sigma
      ? adaptiveMeasurementNoise * 10
      : adaptiveMeasurementNoise;

    // Kalman gain for position
    const kPos = this.covariance[0][0] / (this.covariance[0][0] + effectiveNoise);
    const kVel = this.covariance[2][2] / (this.covariance[2][2] + effectiveNoise * 2);

    // Update state
    this.state[0] += kPos * innovLat;
    this.state[1] += kPos * innovLon;

    if (dt > 0) {
      this.state[2] += kVel * (innovLat / dt);
      this.state[3] += kVel * (innovLon / dt);
    }

    // Update covariance
    for (let i = 0; i < 2; i++) {
      this.covariance[i][i] *= (1 - kPos);
    }
    for (let i = 2; i < 4; i++) {
      this.covariance[i][i] *= (1 - kVel);
    }

    this.lastTimestamp = measurement.timestamp;
    this.lastAccuracy = measurement.accuracy;

    return this.getFilteredState();
  }

  getSpeed(): number {
    const vN = this.state[2];
    const vE = this.state[3];
    // Convert from degrees/s to m/s (approximate)
    const vNms = vN * 111320;
    const vEms = vE * 111320 * Math.cos(this.state[0] * Math.PI / 180);
    return Math.sqrt(vNms * vNms + vEms * vEms);
  }

  getHeading(): number {
    const vN = this.state[2];
    const vE = this.state[3];
    let heading = Math.atan2(vE, vN) * 180 / Math.PI;
    if (heading < 0) heading += 360;
    return heading;
  }

  getQuality(): 'excellent' | 'good' | 'fair' | 'poor' {
    if (this.lastAccuracy < 5) return 'excellent';
    if (this.lastAccuracy < 15) return 'good';
    if (this.lastAccuracy < 30) return 'fair';
    return 'poor';
  }

  reset(): void {
    this.state = [0, 0, 0, 0];
    this.covariance = [
      [1, 0, 0, 0],
      [0, 1, 0, 0],
      [0, 0, 1, 0],
      [0, 0, 0, 1],
    ];
    this.initialized = false;
    this.lastTimestamp = 0;
    this.lastAccuracy = 30;
  }

  private getFilteredState(): FilteredState {
    return {
      latitude: this.state[0],
      longitude: this.state[1],
      speed: this.getSpeed(),
      heading: this.getHeading(),
      quality: this.getQuality(),
    };
  }
}
