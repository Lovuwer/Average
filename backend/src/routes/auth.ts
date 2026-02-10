import { FastifyInstance } from 'fastify';
import crypto from 'crypto';
import { loginSchema } from '../schemas/validation';
import { authenticate } from '../middleware/auth';

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
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminEmail || !adminPassword) {
      return reply.status(500).send({ error: 'Server auth configuration error' });
    }

    if (email === adminEmail && password === adminPassword) {
      const accessToken = server.jwt.sign(
        { email: adminEmail, role: 'admin' },
        { expiresIn: process.env.JWT_ACCESS_EXPIRY || '15m' },
      );

      const refreshToken = crypto.randomUUID();

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
    // In single-user mode, just re-issue a token if the request has a valid refresh token format
    const body = request.body as { refreshToken?: string };
    if (!body?.refreshToken) {
      return reply.status(400).send({ error: 'Refresh token is required' });
    }

    const adminEmail = process.env.ADMIN_EMAIL;
    if (!adminEmail) {
      return reply.status(500).send({ error: 'Server auth configuration error' });
    }

    const accessToken = server.jwt.sign(
      { email: adminEmail, role: 'admin' },
      { expiresIn: process.env.JWT_ACCESS_EXPIRY || '15m' },
    );

    const newRefreshToken = crypto.randomUUID();

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
      const { email } = request.user as { email: string };

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
      return reply.send({ success: true });
    },
  );
}
