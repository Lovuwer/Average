import { FastifyInstance } from 'fastify';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { loginSchema } from '../schemas/validation';
import { authenticate } from '../middleware/auth';

// In-memory store for valid refresh tokens (single-user mode)
const validRefreshTokens = new Set<string>();

export async function authRoutes(server: FastifyInstance): Promise<void> {
  // Stricter rate limit for auth endpoints
  const authRateLimit = {
    config: {
      rateLimit: {
        max: 20,
        timeWindow: '1 minute',
      },
    },
  };

  // POST /auth/register — Registration is disabled (single-user mode)
  server.post('/register', authRateLimit, async (_request, reply) => {
    return reply.status(403).send({ error: 'Registration is disabled.' });
  });

  // POST /auth/login — Single-user mode: validate against environment variables
  server.post('/login', authRateLimit, async (request, reply) => {
    const parsed = loginSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Validation failed',
        details: parsed.error.flatten().fieldErrors,
      });
    }

    const { email, password } = parsed.data;

    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH;

    if (!adminEmail || !adminPasswordHash) {
      return reply.status(500).send({ error: 'Server auth configuration error' });
    }

    const isValidPassword = await bcrypt.compare(password, adminPasswordHash);

    if (email === adminEmail && isValidPassword) {
      const accessToken = server.jwt.sign(
        { email: adminEmail, role: 'admin' },
        { expiresIn: process.env.JWT_ACCESS_EXPIRY || '15m' },
      );

      const refreshToken = crypto.randomUUID();
      validRefreshTokens.add(refreshToken);

      return reply.send({
        accessToken,
        refreshToken,
        user: {
          id: 'admin',
          email: adminEmail,
          displayName: 'Admin',
        },
      });
    }

    return reply.status(401).send({ error: 'Invalid credentials' });
  });

  // POST /auth/refresh
  server.post('/refresh', async (request, reply) => {
    const body = request.body as { refreshToken?: string };
    if (!body?.refreshToken) {
      return reply.status(400).send({ error: 'Refresh token is required' });
    }

    if (!validRefreshTokens.has(body.refreshToken)) {
      return reply.status(401).send({ error: 'Invalid or expired refresh token' });
    }

    // Rotate: remove old, issue new
    validRefreshTokens.delete(body.refreshToken);

    const adminEmail = process.env.ADMIN_EMAIL;
    if (!adminEmail) {
      return reply.status(500).send({ error: 'Server auth configuration error' });
    }

    const accessToken = server.jwt.sign(
      { email: adminEmail, role: 'admin' },
      { expiresIn: process.env.JWT_ACCESS_EXPIRY || '15m' },
    );

    const newRefreshToken = crypto.randomUUID();
    validRefreshTokens.add(newRefreshToken);

    return reply.send({
      accessToken,
      refreshToken: newRefreshToken,
    });
  });

  // GET /auth/verify
  server.get(
    '/verify',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { email } = request.user as { email: string; role: string };

      return reply.send({
        valid: true,
        user: {
          id: 'admin',
          email,
          displayName: 'Admin',
        },
      });
    },
  );

  // POST /auth/logout
  server.post(
    '/logout',
    { preHandler: [authenticate] },
    async (_request, reply) => {
      // Clear all refresh tokens on logout
      validRefreshTokens.clear();
      return reply.send({ success: true });
    },
  );
}
