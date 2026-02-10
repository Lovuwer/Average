import { FastifyInstance } from 'fastify';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import prisma from '../prisma';
import {
  registerSchema,
  loginSchema,
  refreshSchema,
} from '../schemas/validation';
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

  // POST /auth/register
  server.post('/register', authRateLimit, async (request, reply) => {
    const parsed = registerSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Validation failed',
        details: parsed.error.flatten().fieldErrors,
      });
    }

    const { email, password, displayName } = parsed.data;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return reply.status(409).send({ error: 'Email already registered' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        displayName: displayName || null,
      },
    });

    // Generate tokens
    const accessToken = server.jwt.sign(
      { userId: user.id, email: user.email },
      { expiresIn: process.env.JWT_ACCESS_EXPIRY || '15m' },
    );

    const refreshToken = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await prisma.session.create({
      data: {
        userId: user.id,
        refreshToken,
        deviceId: 'unknown',
        platform: 'unknown',
        expiresAt,
      },
    });

    return reply.status(201).send({
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
      },
    });
  });

  // POST /auth/login
  server.post('/login', authRateLimit, async (request, reply) => {
    const parsed = loginSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Validation failed',
        details: parsed.error.flatten().fieldErrors,
      });
    }

    const { email, password } = parsed.data;

    // Find user
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return reply.status(401).send({ error: 'Invalid email or password' });
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return reply.status(401).send({ error: 'Invalid email or password' });
    }

    // Generate tokens
    const accessToken = server.jwt.sign(
      { userId: user.id, email: user.email },
      { expiresIn: process.env.JWT_ACCESS_EXPIRY || '15m' },
    );

    const refreshToken = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await prisma.session.create({
      data: {
        userId: user.id,
        refreshToken,
        deviceId: 'unknown',
        platform: 'unknown',
        expiresAt,
      },
    });

    return reply.send({
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
      },
    });
  });

  // POST /auth/refresh
  server.post('/refresh', async (request, reply) => {
    const parsed = refreshSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Validation failed',
        details: parsed.error.flatten().fieldErrors,
      });
    }

    const { refreshToken } = parsed.data;

    // Find session
    const session = await prisma.session.findUnique({
      where: { refreshToken },
      include: { user: true },
    });

    if (!session || session.expiresAt < new Date()) {
      if (session) {
        await prisma.session.delete({ where: { id: session.id } });
      }
      return reply.status(401).send({ error: 'Invalid or expired refresh token' });
    }

    // Rotate refresh token
    const newRefreshToken = crypto.randomUUID();
    const newExpiresAt = new Date();
    newExpiresAt.setDate(newExpiresAt.getDate() + 7);

    await prisma.session.update({
      where: { id: session.id },
      data: {
        refreshToken: newRefreshToken,
        expiresAt: newExpiresAt,
      },
    });

    // Generate new access token
    const accessToken = server.jwt.sign(
      { userId: session.user.id, email: session.user.email },
      { expiresIn: process.env.JWT_ACCESS_EXPIRY || '15m' },
    );

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
      const { userId } = request.user as { userId: string; email: string };

      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        return reply.status(401).send({ error: 'User not found' });
      }

      return reply.send({
        valid: true,
        user: {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
        },
      });
    },
  );

  // POST /auth/logout
  server.post(
    '/logout',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { userId } = request.user as { userId: string };

      // Delete all sessions for this user (or a specific one based on token)
      await prisma.session.deleteMany({ where: { userId } });

      return reply.send({ success: true });
    },
  );
}
