import { apiClient } from '../api/ApiClient';
import { TokenManager } from './TokenManager';

interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    displayName: string | null;
  };
}

interface VerifyResponse {
  valid: boolean;
  user: {
    id: string;
    email: string;
    displayName: string | null;
  };
}

export class AuthService {
  static async login(email: string, password: string): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/login', {
      email,
      password,
    });

    await TokenManager.setTokens(response.accessToken, response.refreshToken);
    return response;
  }

  static async register(
    email: string,
    password: string,
    displayName?: string,
  ): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/register', {
      email,
      password,
      displayName,
    });

    await TokenManager.setTokens(response.accessToken, response.refreshToken);
    return response;
  }

  static async refreshToken(): Promise<void> {
    const refreshToken = await TokenManager.getRefreshToken();
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await apiClient.post<{ accessToken: string; refreshToken: string }>(
      '/auth/refresh',
      { refreshToken },
    );

    await TokenManager.setTokens(response.accessToken, response.refreshToken);
  }

  static async logout(): Promise<void> {
    try {
      await apiClient.post('/auth/logout');
    } catch {
      // Continue logout even if server call fails
    } finally {
      await TokenManager.clearTokens();
    }
  }

  static async isAuthenticated(): Promise<boolean> {
    try {
      const hasTokens = await TokenManager.hasTokens();
      if (!hasTokens) {
        return false;
      }

      const response = await apiClient.get<VerifyResponse>('/auth/verify');
      return response.valid;
    } catch {
      return false;
    }
  }
}
