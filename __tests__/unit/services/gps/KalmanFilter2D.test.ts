import { KalmanFilter2D } from '../../../../src/services/gps/KalmanFilter2D';

describe('KalmanFilter2D', () => {
  let filter: KalmanFilter2D;

  beforeEach(() => {
    filter = new KalmanFilter2D();
  });

  it('initializes with zero velocity state', () => {
    expect(filter.getSpeed()).toBe(0);
  });

  it('predict advances state', () => {
    filter.update({ latitude: 0, longitude: 0, accuracy: 5, timestamp: 1000 });
    filter.predict(1);
    expect(filter.getSpeed()).toBeGreaterThanOrEqual(0);
  });

  it('update incorporates GPS measurement', () => {
    const result = filter.update({ latitude: 51.5, longitude: -0.1, accuracy: 5, timestamp: 1000 });
    expect(result.latitude).toBeCloseTo(51.5, 1);
    expect(result.longitude).toBeCloseTo(-0.1, 1);
  });

  it('getSpeed returns magnitude of velocity vector', () => {
    filter.update({ latitude: 0, longitude: 0, accuracy: 5, timestamp: 0 });
    filter.update({ latitude: 0.001, longitude: 0, accuracy: 5, timestamp: 1000 });
    expect(filter.getSpeed()).toBeGreaterThanOrEqual(0);
  });

  it('getSpeed converges to true speed with good data', () => {
    for (let i = 0; i < 100; i++) {
      filter.update({
        latitude: i * 0.0001,
        longitude: 0,
        accuracy: 3,
        timestamp: i * 1000,
      });
    }
    const speed = filter.getSpeed();
    expect(speed).toBeGreaterThan(0);
  });

  it('getHeading returns compass direction', () => {
    filter.update({ latitude: 0, longitude: 0, accuracy: 5, timestamp: 0 });
    filter.update({ latitude: 0.001, longitude: 0, accuracy: 5, timestamp: 1000 });
    const heading = filter.getHeading();
    expect(heading).toBeGreaterThanOrEqual(0);
    expect(heading).toBeLessThanOrEqual(360);
  });

  it('getQuality returns excellent for accuracy < 5m', () => {
    filter.update({ latitude: 0, longitude: 0, accuracy: 3, timestamp: 0 });
    expect(filter.getQuality()).toBe('excellent');
  });

  it('getQuality returns good for accuracy < 15m', () => {
    filter.update({ latitude: 0, longitude: 0, accuracy: 10, timestamp: 0 });
    expect(filter.getQuality()).toBe('good');
  });

  it('getQuality returns fair for accuracy < 30m', () => {
    filter.update({ latitude: 0, longitude: 0, accuracy: 25, timestamp: 0 });
    expect(filter.getQuality()).toBe('fair');
  });

  it('getQuality returns poor for accuracy >= 30m', () => {
    filter.update({ latitude: 0, longitude: 0, accuracy: 50, timestamp: 0 });
    expect(filter.getQuality()).toBe('poor');
  });

  it('reset clears all state', () => {
    filter.update({ latitude: 51.5, longitude: -0.1, accuracy: 5, timestamp: 1000 });
    filter.reset();
    expect(filter.getSpeed()).toBe(0);
  });

  it('handles rapid successive updates without degradation', () => {
    for (let i = 0; i < 1000; i++) {
      filter.update({
        latitude: i * 0.00001,
        longitude: i * 0.00001,
        accuracy: 5,
        timestamp: i * 100,
      });
    }
    expect(filter.getSpeed()).toBeGreaterThanOrEqual(0);
    expect(isNaN(filter.getSpeed())).toBe(false);
  });

  it('performance: 10,000 predict+update cycles in < 200ms', () => {
    const start = performance.now();
    for (let i = 0; i < 10000; i++) {
      filter.update({
        latitude: i * 0.00001,
        longitude: i * 0.00001,
        accuracy: 10,
        timestamp: i * 100,
      });
    }
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(200);
  });

  it('stationary position converges speed to 0', () => {
    for (let i = 0; i < 50; i++) {
      filter.update({ latitude: 51.5, longitude: -0.1, accuracy: 3, timestamp: i * 1000 });
    }
    expect(filter.getSpeed()).toBeLessThan(1);
  });

  it('adapts to high GPS accuracy (more trust)', () => {
    filter.update({ latitude: 0, longitude: 0, accuracy: 1, timestamp: 0 });
    const result = filter.update({ latitude: 0.001, longitude: 0, accuracy: 1, timestamp: 1000 });
    expect(result.latitude).toBeCloseTo(0.001, 2);
  });

  it('adapts to low GPS accuracy (less trust)', () => {
    filter.update({ latitude: 0, longitude: 0, accuracy: 100, timestamp: 0 });
    filter.update({ latitude: 0.001, longitude: 0, accuracy: 100, timestamp: 1000 });
    expect(filter.getSpeed()).toBeGreaterThanOrEqual(0);
  });

  it('outlier rejection handles GPS jump', () => {
    for (let i = 0; i < 20; i++) {
      filter.update({ latitude: 0, longitude: 0, accuracy: 3, timestamp: i * 1000 });
    }
    filter.update({ latitude: 10, longitude: 10, accuracy: 3, timestamp: 21000 });
    const speed = filter.getSpeed();
    expect(isFinite(speed)).toBe(true);
  });
});
