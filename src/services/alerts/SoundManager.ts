export class SoundManager {
  private initialized: boolean = false;

  async initialize(): Promise<void> {
    this.initialized = true;
  }

  async playWarning(): Promise<void> {
    if (!this.initialized) return;
    // Sound playback - would use react-native-sound in real device
  }

  async playExceeded(): Promise<void> {
    if (!this.initialized) return;
    // Sound playback - would use react-native-sound in real device
  }

  release(): void {
    this.initialized = false;
  }
}

export const soundManager = new SoundManager();
