import { Platform, NativeModules, NativeEventEmitter } from 'react-native';

type LightChangeCallback = (lux: number) => void;

class AmbientLightBridge {
  private listener: any = null;

  startListening(callback: LightChangeCallback): void {
    if (Platform.OS !== 'android') {
      return; // No-op on iOS
    }

    try {
      const { AmbientLightModule } = NativeModules;
      if (!AmbientLightModule) return;

      const emitter = new NativeEventEmitter(AmbientLightModule);
      this.listener = emitter.addListener('onAmbientLightChange', (event) => {
        callback(event.lux);
      });
      AmbientLightModule.startListening();
    } catch {
      // Module not available
    }
  }

  stopListening(): void {
    if (this.listener) {
      this.listener.remove();
      this.listener = null;
    }

    if (Platform.OS === 'android') {
      try {
        const { AmbientLightModule } = NativeModules;
        if (AmbientLightModule) {
          AmbientLightModule.stopListening();
        }
      } catch {
        // Ignore
      }
    }
  }
}

export const ambientLightBridge = new AmbientLightBridge();
