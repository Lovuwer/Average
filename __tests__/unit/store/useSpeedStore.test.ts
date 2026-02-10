import { useSpeedStore } from '../../../src/store/useSpeedStore';

describe('useSpeedStore', () => {
  beforeEach(() => {
    useSpeedStore.setState({
      currentSpeed: 0,
      averageSpeed: 0,
      maxSpeed: 0,
      distance: 0,
      duration: 0,
      speedHistory: [],
      isTracking: false,
      isPaused: false,
      speedUnit: 'kmh',
    });
  });

  it('has correct initial state', () => {
    const state = useSpeedStore.getState();
    expect(state.currentSpeed).toBe(0);
    expect(state.averageSpeed).toBe(0);
    expect(state.maxSpeed).toBe(0);
    expect(state.distance).toBe(0);
    expect(state.duration).toBe(0);
    expect(state.speedHistory).toEqual([]);
    expect(state.isTracking).toBe(false);
    expect(state.isPaused).toBe(false);
    expect(state.speedUnit).toBe('kmh');
  });

  it('updateSpeed() updates currentSpeed, averageSpeed, maxSpeed, distance, duration, speedHistory', () => {
    useSpeedStore.getState().updateSpeed({
      currentSpeed: 10,
      averageSpeed: 8,
      maxSpeed: 15,
      totalDistance: 500,
      tripDuration: 60,
      speedHistory: [5, 10, 15],
    });

    const state = useSpeedStore.getState();
    expect(state.currentSpeed).toBe(10);
    expect(state.averageSpeed).toBe(8);
    expect(state.maxSpeed).toBe(15);
    expect(state.distance).toBe(500);
    expect(state.duration).toBe(60);
    expect(state.speedHistory).toEqual([5, 10, 15]);
  });

  it('setTracking(true) sets isTracking to true', () => {
    useSpeedStore.getState().setTracking(true);
    expect(useSpeedStore.getState().isTracking).toBe(true);
  });

  it('setTracking(false) sets isTracking to false', () => {
    useSpeedStore.setState({ isTracking: true });
    useSpeedStore.getState().setTracking(false);
    expect(useSpeedStore.getState().isTracking).toBe(false);
  });

  it('setPaused(true) sets isPaused to true', () => {
    useSpeedStore.getState().setPaused(true);
    expect(useSpeedStore.getState().isPaused).toBe(true);
  });

  it('toggleUnit() switches between kmh and mph', () => {
    expect(useSpeedStore.getState().speedUnit).toBe('kmh');
    useSpeedStore.getState().toggleUnit();
    expect(useSpeedStore.getState().speedUnit).toBe('mph');
    useSpeedStore.getState().toggleUnit();
    expect(useSpeedStore.getState().speedUnit).toBe('kmh');
  });

  it('reset() clears all values back to initial state except speedUnit', () => {
    useSpeedStore.setState({
      currentSpeed: 10,
      averageSpeed: 8,
      maxSpeed: 15,
      distance: 500,
      duration: 60,
      speedHistory: [5, 10],
      isTracking: true,
      isPaused: true,
      speedUnit: 'mph',
    });

    useSpeedStore.getState().reset();

    const state = useSpeedStore.getState();
    expect(state.currentSpeed).toBe(0);
    expect(state.averageSpeed).toBe(0);
    expect(state.maxSpeed).toBe(0);
    expect(state.distance).toBe(0);
    expect(state.duration).toBe(0);
    expect(state.speedHistory).toEqual([]);
    expect(state.isTracking).toBe(false);
    expect(state.isPaused).toBe(false);
    expect(state.speedUnit).toBe('mph');
  });
});
