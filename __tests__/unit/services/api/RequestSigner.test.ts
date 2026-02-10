import { RequestSigner } from '../../../../src/services/security/RequestSigner';

describe('RequestSigner', () => {
  describe('sign()', () => {
    it('returns a string', () => {
      const result = RequestSigner.sign('{"data":"test"}', 1700000000000, 'nonce-1');
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('produces different results for different payloads', () => {
      const sig1 = RequestSigner.sign('payload-a', 1700000000000, 'nonce-1');
      const sig2 = RequestSigner.sign('payload-b', 1700000000000, 'nonce-1');
      expect(sig1).not.toBe(sig2);
    });

    it('is deterministic (same inputs produce same output)', () => {
      const sig1 = RequestSigner.sign('same-payload', 1700000000000, 'nonce-1');
      const sig2 = RequestSigner.sign('same-payload', 1700000000000, 'nonce-1');
      expect(sig1).toBe(sig2);
    });
  });

  describe('generateNonce()', () => {
    it('returns unique values', () => {
      const nonces = new Set<string>();
      for (let i = 0; i < 100; i++) {
        nonces.add(RequestSigner.generateNonce());
      }
      expect(nonces.size).toBe(100);
    });
  });

  describe('createSignedHeaders()', () => {
    it('includes X-Timestamp, X-Nonce, X-Signature headers', () => {
      const headers = RequestSigner.createSignedHeaders({ key: 'value' });
      expect(headers).toHaveProperty('X-Timestamp');
      expect(headers).toHaveProperty('X-Nonce');
      expect(headers).toHaveProperty('X-Signature');
      expect(headers['X-Timestamp']).toBeTruthy();
      expect(headers['X-Nonce']).toBeTruthy();
      expect(headers['X-Signature']).toBeTruthy();
    });
  });
});
