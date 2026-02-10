import Geolocation, {
  GeoPosition,
  GeoError,
} from 'react-native-geolocation-service';
import { Platform } from 'react-native';
import { request, PERMISSIONS, RESULTS } from 'react-native-permissions';

export interface GPSPosition {
  latitude: number;
  longitude: number;
  speed: number; // m/s, -1 if unavailable
  altitude: number;
  accuracy: number;
  timestamp: number;
}

type GPSCallback = (position: GPSPosition) => void;
type ErrorCallback = (error: GeoError) => void;

class GPSService {
  private watchId: number | null = null;

  async requestPermissions(): Promise<boolean> {
    try {
      const permission = Platform.select({
        android: PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION,
        ios: PERMISSIONS.IOS.LOCATION_WHEN_IN_USE,
      });

      if (!permission) {
        return false;
      }

      const result = await request(permission);
      return result === RESULTS.GRANTED;
    } catch {
      return false;
    }
  }

  startTracking(onPosition: GPSCallback, onError?: ErrorCallback): void {
    if (this.watchId !== null) {
      this.stopTracking();
    }

    this.watchId = Geolocation.watchPosition(
      (position: GeoPosition) => {
        onPosition({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          speed: position.coords.speed ?? -1,
          altitude: position.coords.altitude ?? 0,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp,
        });
      },
      (error: GeoError) => {
        onError?.(error);
      },
      {
        enableHighAccuracy: true,
        distanceFilter: 1,
        interval: 1000,
        fastestInterval: 500,
        showsBackgroundLocationIndicator: true,
        forceRequestLocation: true,
      },
    );
  }

  stopTracking(): void {
    if (this.watchId !== null) {
      Geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
  }

  isTracking(): boolean {
    return this.watchId !== null;
  }
}

export const gpsService = new GPSService();
