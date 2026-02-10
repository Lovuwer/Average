import EncryptedStorage from 'react-native-encrypted-storage';

const ACCESS_TOKEN_KEY = 'average_access_token';
const REFRESH_TOKEN_KEY = 'average_refresh_token';

export class TokenManager {
  static async getAccessToken(): Promise<string | null> {
    try {
      return await EncryptedStorage.getItem(ACCESS_TOKEN_KEY);
    } catch {
      return null;
    }
  }

  static async getRefreshToken(): Promise<string | null> {
    try {
      return await EncryptedStorage.getItem(REFRESH_TOKEN_KEY);
    } catch {
      return null;
    }
  }

  static async setTokens(accessToken: string, refreshToken: string): Promise<void> {
    try {
      await EncryptedStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
      await EncryptedStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    } catch (error) {
      console.error('Failed to store tokens:', error);
      throw error;
    }
  }

  static async clearTokens(): Promise<void> {
    try {
      await EncryptedStorage.removeItem(ACCESS_TOKEN_KEY);
      await EncryptedStorage.removeItem(REFRESH_TOKEN_KEY);
    } catch (error) {
      console.error('Failed to clear tokens:', error);
    }
  }

  static async hasTokens(): Promise<boolean> {
    const accessToken = await this.getAccessToken();
    return accessToken !== null;
  }
}
