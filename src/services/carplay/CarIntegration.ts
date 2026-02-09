import { Platform, NativeModules } from 'react-native';
import { SpeedData } from '../gps/SpeedEngine';

const { AutoBridge, CarPlayBridge } = NativeModules;

/**
 * CarIntegration sends speed data to native car interfaces
 * (Android Auto / Apple CarPlay) every update cycle.
 */
export class CarIntegration {
  static update(data: SpeedData): void {
    try {
      if (Platform.OS === 'android' && AutoBridge) {
        AutoBridge.updateSpeed(
          data.currentSpeed * 3.6, // m/s → km/h
          data.averageSpeed * 3.6,
          data.maxSpeed * 3.6,
          data.totalDistance,
          data.tripDuration,
        );
      } else if (Platform.OS === 'ios' && CarPlayBridge) {
        CarPlayBridge.updateSpeedData({
          speed: data.currentSpeed * 3.6,
          avgSpeed: data.averageSpeed * 3.6,
          maxSpeed: data.maxSpeed * 3.6,
          distance: data.totalDistance,
          duration: data.tripDuration,
        });
      }
    } catch {
      // Car interface not available, silently ignore
    }
  }
}
