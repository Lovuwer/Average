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
  confidence: 'low' | 'medium' | 'high';
  motionState: 'stationary' | 'walking' | 'running' | 'vehicle' | 'gps_dead_reckoning';
  primarySource: string;
  gpsAccuracy: number | null;
  stepFrequency: number;
  sensorHealth: { gps: boolean; accelerometer: boolean; gyroscope: boolean; pedometer: boolean; barometer: boolean };
  updateSpeed: (data: {
    currentSpeed: number;
    averageSpeed: number;
    maxSpeed: number;
    totalDistance: number;
    tripDuration: number;
    speedHistory: number[];
    confidence?: 'low' | 'medium' | 'high';
    primarySource?: string;
    motionState?: 'stationary' | 'walking' | 'running' | 'vehicle' | 'gps_dead_reckoning';
    gpsAccuracy?: number | null;
    stepFrequency?: number;
    sensorHealth?: { gps: boolean; accelerometer: boolean; gyroscope: boolean; pedometer: boolean; barometer: boolean };
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
  confidence: 'low',
  motionState: 'stationary',
  primarySource: 'gps',
  gpsAccuracy: null,
  stepFrequency: 0,
  sensorHealth: { gps: false, accelerometer: false, gyroscope: false, pedometer: false, barometer: false },

  updateSpeed: (data) =>
    set({
      currentSpeed: data.currentSpeed,
      averageSpeed: data.averageSpeed,
      maxSpeed: data.maxSpeed,
      distance: data.totalDistance,
      duration: data.tripDuration,
      speedHistory: data.speedHistory,
      confidence: data.confidence ?? 'low',
      primarySource: data.primarySource ?? 'gps',
      motionState: data.motionState ?? 'stationary',
      gpsAccuracy: data.gpsAccuracy ?? null,
      stepFrequency: data.stepFrequency ?? 0,
      sensorHealth: data.sensorHealth ?? { gps: false, accelerometer: false, gyroscope: false, pedometer: false, barometer: false },
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
      confidence: 'low',
      motionState: 'stationary',
      primarySource: 'gps',
      gpsAccuracy: null,
      stepFrequency: 0,
      sensorHealth: { gps: false, accelerometer: false, gyroscope: false, pedometer: false, barometer: false },
    }),
}));
