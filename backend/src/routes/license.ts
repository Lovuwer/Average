import { FastifyInstance } from 'fastify';
import rateLimit from '@fastify/rate-limit';
import prisma from '../prisma';
import { licenseValidateSchema } from '../schemas/validation';
import { authenticate } from '../middleware/auth';

export async function licenseRoutes(server: FastifyInstance): Promise<void> {
  // Rate limit for license routes
  await server.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
  });

  // All license routes require authentication
  server.addHook('preHandler', authenticate);

  // POST /license/validate
  server.post('/validate', async (request, reply) => {
    const parsed = licenseValidateSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Validation failed',
        details: parsed.error.flatten().fieldErrors,
      });
    }

    const { userId } = request.user as { userId: string };
    const { key, deviceId, platform, model, osVersion, appVersion } = parsed.data;

    // Find license key
    const license = await prisma.licenseKey.findUnique({
      where: { key },
    });

    if (!license) {
      return reply.status(404).send({ error: 'Invalid license key' });
    }

    if (!license.isActive) {
      return reply.status(403).send({ error: 'License key is deactivated' });
    }

    if (license.userId !== userId) {
      return reply.status(403).send({ error: 'License key does not belong to this user' });
    }

    if (license.expiresAt && license.expiresAt < new Date()) {
      return reply.status(403).send({ error: 'License key has expired' });
    }

    // Check device count
    const deviceCount = await prisma.deviceFingerprint.count({
      where: { userId },
    });

    const existingDevice = await prisma.deviceFingerprint.findUnique({
      where: { deviceId },
    });

    if (!existingDevice && deviceCount >= license.maxDevices) {
      return reply.status(403).send({
        error: `Maximum device limit (${license.maxDevices}) reached`,
      });
    }

    // Upsert device fingerprint
    await prisma.deviceFingerprint.upsert({
      where: { deviceId },
      update: {
        platform,
        model,
        osVersion,
        appVersion,
        lastSeen: new Date(),
      },
      create: {
        userId,
        deviceId,
        platform,
        model,
        osVersion,
        appVersion,
      },
    });

    return reply.send({
      valid: true,
      license: {
        id: license.id,
        maxDevices: license.maxDevices,
        expiresAt: license.expiresAt,
      },
    });
  });
}
