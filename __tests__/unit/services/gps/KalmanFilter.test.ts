import { KalmanFilter } from '../../../../src/services/gps/KalmanFilter';

describe('KalmanFilter', () => {
  let filter: KalmanFilter;

  beforeEach(() => {
    filter = new KalmanFilter();
  });

  it('initializes with correct default parameters (estimate starts at 0)', () => {
    expect(filter.getEstimate()).toBe(0);
  });

  it('filters a single measurement correctly', () => {
    const result = filter.filter(10);
    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThanOrEqual(10);
    expect(result).toBe(filter.getEstimate());
  });

  it('converges to stable value with repeated identical inputs', () => {
    const target = 50;
    let lastResult = 0;
    for (let i = 0; i < 100; i++) {
      lastResult = filter.filter(target);
    }
    expect(lastResult).toBeCloseTo(target, 0);
  });

  it('smooths noisy data', () => {
    const noisyInputs = [50, 80, 45, 90, 55];
    const outputs: number[] = [];

    for (const input of noisyInputs) {
      outputs.push(filter.filter(input));
    }

    const inputRange = Math.max(...noisyInputs) - Math.min(...noisyInputs);
    const outputRange = Math.max(...outputs) - Math.min(...outputs);

    // Output range should be smaller than input range (smoothing effect)
    expect(outputRange).toBeLessThan(inputRange);
  });

  it('handles zero input', () => {
    const result = filter.filter(0);
    expect(result).toBe(0);
  });

  it('handles negative speed gracefully', () => {
    const negativeValue = -10;
    let result = 0;
    for (let i = 0; i < 50; i++) {
      result = filter.filter(negativeValue);
    }
    // Should approach the negative input over time with smoothing
    expect(result).toBeLessThan(0);
    expect(result).toBeCloseTo(negativeValue, 0);
  });

  it('reset method clears state', () => {
    filter.filter(100);
    filter.filter(100);
    expect(filter.getEstimate()).toBeGreaterThan(0);

    filter.reset();
    expect(filter.getEstimate()).toBe(0);
  });

  it('reset method accepts an initial estimate', () => {
    filter.reset(25);
    expect(filter.getEstimate()).toBe(25);
  });

  it('different noise parameters change filter behavior', () => {
    const filterLowNoise = new KalmanFilter(0.001, 0.1);
    const filterHighNoise = new KalmanFilter(1.0, 10.0);

    const measurement = 50;
    const resultLow = filterLowNoise.filter(measurement);
    const resultHigh = filterHighNoise.filter(measurement);

    // Different noise params should produce different results
    expect(resultLow).not.toBeCloseTo(resultHigh, 5);
  });

  it('performance: 10,000 filter calls complete in < 100ms', () => {
    const start = performance.now();
    for (let i = 0; i < 10000; i++) {
      filter.filter(Math.random() * 100);
    }
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(100);
  });
});
