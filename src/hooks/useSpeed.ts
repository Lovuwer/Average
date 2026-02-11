import { useEffect, useCallback } from 'react';
import { speedEngine, msToKmh, msToMph, metersToKm, metersToMiles } from '../services/gps/SpeedEngine';
import { gpsService } from '../services/gps/GPSService';
import { tripManager } from '../services/trip/TripManager';
import { useSpeedStore } from '../store/useSpeedStore';

export function useSpeed() {
  const {
    currentSpeed,
    averageSpeed,
    maxSpeed,
    distance,
    duration,
    speedHistory,
    isTracking,
    isPaused,
    speedUnit,
    confidence,
    motionState,
    primarySource,
    gpsAccuracy,
    stepFrequency,
    sensorHealth,
    updateSpeed,
    setTracking,
    setPaused,
    toggleUnit,
    reset,
  } = useSpeedStore();

  const convertSpeed = useCallback(
    (ms: number) => (speedUnit === 'kmh' ? msToKmh(ms) : msToMph(ms)),
    [speedUnit],
  );

  const convertDistance = useCallback(
    (m: number) => (speedUnit === 'kmh' ? metersToKm(m) : metersToMiles(m)),
    [speedUnit],
  );

  const startTrip = useCallback(async () => {
    const granted = await gpsService.requestPermissions();
    if (!granted) {
      return false;
    }

    speedEngine.start((data) => {
      updateSpeed(data);
    });
    setTracking(true);
    setPaused(false);
    return true;
  }, [updateSpeed, setTracking, setPaused]);

  const stopTrip = useCallback(async () => {
    const summary = speedEngine.stop();
    if (summary) {
      await tripManager.saveTripSummary(summary, speedUnit);
    }
    setTracking(false);
    setPaused(false);
    reset();
  }, [speedUnit, setTracking, setPaused, reset]);

  const pauseTrip = useCallback(() => {
    speedEngine.pause();
    setPaused(true);
  }, [setPaused]);

  const resumeTrip = useCallback(() => {
    speedEngine.resume();
    setPaused(false);
  }, [setPaused]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (speedEngine.running) {
        speedEngine.stop();
      }
    };
  }, []);

  const unitLabel = speedUnit === 'kmh' ? 'km/h' : 'mph';
  const distanceLabel = speedUnit === 'kmh' ? 'km' : 'mi';

  return {
    currentSpeed: convertSpeed(currentSpeed),
    averageSpeed: convertSpeed(averageSpeed),
    maxSpeed: convertSpeed(maxSpeed),
    distance: convertDistance(distance),
    duration,
    speedHistory,
    isTracking,
    isPaused,
    speedUnit,
    unitLabel,
    distanceLabel,
    confidence,
    motionState,
    primarySource,
    gpsAccuracy,
    stepFrequency,
    sensorHealth,
    startTrip,
    stopTrip,
    pauseTrip,
    resumeTrip,
    toggleUnit,
  };
}
