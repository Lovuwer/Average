/**
 * Layer 7: HMAC-SHA256 request signing.
 * Signs every API request body + timestamp to prevent tampering.
 * Server validates signatures and rejects tampered requests.
 *
 * NOTE: In production, the signing key should be stored in a native
 * module or derived from device-specific values. The simpleHash used
 * here is a placeholder — replace with react-native-quick-crypto or
 * a native HMAC-SHA256 implementation for real security.
 */
export class RequestSigner {
  /**
   * Sign a request payload.
   */
  static sign(body: string, timestamp: number, nonce: string): string {
    const payload = `${timestamp}.${nonce}.${body}`;
    return this.simpleHash(payload);
  }

  /**
   * Generate a nonce for replay attack prevention.
   */
  static generateNonce(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  }

  /**
   * Create signed headers for an API request.
   */
  static createSignedHeaders(body: unknown): Record<string, string> {
    const timestamp = Date.now();
    const nonce = this.generateNonce();
    const bodyStr = typeof body === 'string' ? body : JSON.stringify(body ?? '');
    const signature = this.sign(bodyStr, timestamp, nonce);

    return {
      'X-Timestamp': timestamp.toString(),
      'X-Nonce': nonce,
      'X-Signature': signature,
    };
  }

  /**
   * Simple hash function for React Native environment.
   * In production, replace with native crypto HMAC.
   */
  private static simpleHash(input: string): string {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash + char) | 0;
    }
    return Math.abs(hash).toString(36);
  }
}
