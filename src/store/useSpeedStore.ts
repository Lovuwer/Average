import { create } from 'zustand';

interface SpeedState {
  currentSpeed: number;
  averageSpeed: number;
  maxSpeed: number;
  distance: number;
  duration: number;
  speedHistory: number[];
  isTracking: boolean;
  isPaused: boolean;
  speedUnit: 'kmh' | 'mph';
  updateSpeed: (data: {
    currentSpeed: number;
    averageSpeed: number;
    maxSpeed: number;
    totalDistance: number;
    tripDuration: number;
    speedHistory: number[];
  }) => void;
  setTracking: (tracking: boolean) => void;
  setPaused: (paused: boolean) => void;
  toggleUnit: () => void;
  reset: () => void;
}

export const useSpeedStore = create<SpeedState>((set) => ({
  currentSpeed: 0,
  averageSpeed: 0,
  maxSpeed: 0,
  distance: 0,
  duration: 0,
  speedHistory: [],
  isTracking: false,
  isPaused: false,
  speedUnit: 'kmh',

  updateSpeed: (data) =>
    set({
      currentSpeed: data.currentSpeed,
      averageSpeed: data.averageSpeed,
      maxSpeed: data.maxSpeed,
      distance: data.totalDistance,
      duration: data.tripDuration,
      speedHistory: data.speedHistory,
    }),

  setTracking: (tracking) => set({ isTracking: tracking }),
  setPaused: (paused) => set({ isPaused: paused }),

  toggleUnit: () =>
    set((state) => ({
      speedUnit: state.speedUnit === 'kmh' ? 'mph' : 'kmh',
    })),

  reset: () =>
    set({
      currentSpeed: 0,
      averageSpeed: 0,
      maxSpeed: 0,
      distance: 0,
      duration: 0,
      speedHistory: [],
      isTracking: false,
      isPaused: false,
    }),
}));
