export class BiometricService {
  async isAvailable(): Promise<{
    available: boolean;
    biometryType: 'FaceID' | 'TouchID' | 'Biometrics' | null;
  }> {
    try {
      const ReactNativeBiometrics = require('react-native-biometrics').default;
      const rnBiometrics = new ReactNativeBiometrics();
      const { available, biometryType } = await rnBiometrics.isSensorAvailable();
      return { available, biometryType: biometryType || null };
    } catch {
      return { available: false, biometryType: null };
    }
  }

  async authenticate(promptMessage?: string): Promise<boolean> {
    try {
      const ReactNativeBiometrics = require('react-native-biometrics').default;
      const rnBiometrics = new ReactNativeBiometrics();
      const { success } = await rnBiometrics.simplePrompt({
        promptMessage: promptMessage || 'Authenticate to access Average',
      });
      return success;
    } catch {
      return false;
    }
  }

  async createKeys(): Promise<string> {
    const ReactNativeBiometrics = require('react-native-biometrics').default;
    const rnBiometrics = new ReactNativeBiometrics();
    const { publicKey } = await rnBiometrics.createKeys();
    return publicKey;
  }

  async signPayload(payload: string): Promise<string> {
    const ReactNativeBiometrics = require('react-native-biometrics').default;
    const rnBiometrics = new ReactNativeBiometrics();
    const { success, signature } = await rnBiometrics.createSignature({
      promptMessage: 'Authenticate',
      payload,
    });
    if (!success) throw new Error('Biometric authentication failed');
    return signature;
  }

  async deleteKeys(): Promise<void> {
    const ReactNativeBiometrics = require('react-native-biometrics').default;
    const rnBiometrics = new ReactNativeBiometrics();
    await rnBiometrics.deleteKeys();
  }
}

export const biometricService = new BiometricService();
