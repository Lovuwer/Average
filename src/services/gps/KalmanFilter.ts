/**
 * 1D Kalman Filter for GPS speed smoothing.
 * Eliminates GPS jitter and provides smooth speed readings.
 */
export class KalmanFilter {
  private estimate: number;
  private estimateError: number;
  private processNoise: number;
  private measurementNoise: number;

  constructor(
    processNoise: number = 0.1,
    measurementNoise: number = 0.3,
    estimatedError: number = 1.0,
    initialEstimate: number = 0,
  ) {
    this.processNoise = processNoise;
    this.measurementNoise = measurementNoise;
    this.estimateError = estimatedError;
    this.estimate = initialEstimate;
  }

  filter(measurement: number): number {
    // Prediction step
    const predictionError = this.estimateError + this.processNoise;

    // Update step
    const kalmanGain = predictionError / (predictionError + this.measurementNoise);
    this.estimate = this.estimate + kalmanGain * (measurement - this.estimate);
    this.estimateError = (1 - kalmanGain) * predictionError;

    return this.estimate;
  }

  reset(initialEstimate: number = 0): void {
    this.estimate = initialEstimate;
    this.estimateError = 1.0;
  }

  getEstimate(): number {
    return this.estimate;
  }

  setProcessNoise(noise: number): void {
    this.processNoise = noise;
  }

  setMeasurementNoise(noise: number): void {
    this.measurementNoise = noise;
  }
}
