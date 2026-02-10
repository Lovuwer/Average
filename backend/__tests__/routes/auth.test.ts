import {
  registerSchema,
  loginSchema,
  refreshSchema,
} from '../../src/schemas/validation';

describe('Auth Route Validation', () => {
  describe('registerSchema', () => {
    it('accepts valid registration data', () => {
      const result = registerSchema.safeParse({
        email: 'user@example.com',
        password: 'securepass123',
      });
      expect(result.success).toBe(true);
    });

    it('rejects invalid email format', () => {
      const result = registerSchema.safeParse({
        email: 'not-an-email',
        password: 'securepass123',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Invalid email address');
      }
    });

    it('rejects short password (< 8 chars)', () => {
      const result = registerSchema.safeParse({
        email: 'user@example.com',
        password: 'short',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe(
          'Password must be at least 8 characters',
        );
      }
    });

    it('accepts registration with displayName', () => {
      const result = registerSchema.safeParse({
        email: 'user@example.com',
        password: 'securepass123',
        displayName: 'John Doe',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.displayName).toBe('John Doe');
      }
    });

    it('accepts registration without displayName', () => {
      const result = registerSchema.safeParse({
        email: 'user@example.com',
        password: 'securepass123',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.displayName).toBeUndefined();
      }
    });

    it('rejects empty email', () => {
      const result = registerSchema.safeParse({
        email: '',
        password: 'securepass123',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('loginSchema', () => {
    it('accepts valid login data', () => {
      const result = loginSchema.safeParse({
        email: 'user@example.com',
        password: 'securepass123',
      });
      expect(result.success).toBe(true);
    });

    it('rejects invalid email', () => {
      const result = loginSchema.safeParse({
        email: 'bad-email',
        password: 'securepass123',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Invalid email address');
      }
    });

    it('rejects empty password', () => {
      const result = loginSchema.safeParse({
        email: 'user@example.com',
        password: '',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Password is required');
      }
    });
  });

  describe('refreshSchema', () => {
    it('accepts valid refresh token', () => {
      const result = refreshSchema.safeParse({
        refreshToken: 'some-valid-refresh-token-string',
      });
      expect(result.success).toBe(true);
    });

    it('rejects empty refresh token', () => {
      const result = refreshSchema.safeParse({
        refreshToken: '',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe(
          'Refresh token is required',
        );
      }
    });
  });
});
