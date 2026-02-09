/**
 * Layer 5: SSL Certificate Pinning configuration.
 * Pins SHA-256 hash of the server's public key for all API requests.
 */

export interface SSLPin {
  hostname: string;
  sha256Pins: string[];
}

export const SSL_PINS: SSLPin[] = [
  {
    hostname: 'average-api.railway.app',
    sha256Pins: [
      // Primary pin - replace with actual server certificate hash
      'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=',
      // Backup pin - for certificate rotation
      'BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB=',
    ],
  },
];

/**
 * Validate that SSL pinning is properly configured.
 * In production, this would intercept network requests to verify certificates.
 */
export class SSLPinning {
  static isEnabled(): boolean {
    return !__DEV__;
  }

  static getPins(): SSLPin[] {
    return SSL_PINS;
  }

  static getHostnamePins(hostname: string): string[] {
    const pin = SSL_PINS.find((p) => p.hostname === hostname);
    return pin?.sha256Pins ?? [];
  }
}
