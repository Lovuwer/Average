import { FastifyInstance } from 'fastify';
import rateLimit from '@fastify/rate-limit';
import prisma from '../prisma';
import { tripSyncSchema, tripHistorySchema } from '../schemas/validation';
import { authenticate } from '../middleware/auth';

export async function tripRoutes(server: FastifyInstance): Promise<void> {
  // Rate limit for trip routes
  await server.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
  });

  // All trip routes require authentication
  server.addHook('preHandler', authenticate);

  // POST /trips/sync — bulk upsert trips from device
  server.post('/sync', async (request, reply) => {
    const parsed = tripSyncSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Validation failed',
        details: parsed.error.flatten().fieldErrors,
      });
    }

    const { userId } = request.user as { userId: string };
    const { trips } = parsed.data;

    const results = await Promise.all(
      trips.map(async (trip) => {
        const tripData = {
          userId,
          startTime: new Date(trip.startTime),
          endTime: trip.endTime ? new Date(trip.endTime) : null,
          distance: trip.distance,
          avgSpeed: trip.avgSpeed,
          maxSpeed: trip.maxSpeed,
          duration: trip.duration,
          speedUnit: trip.speedUnit,
        };

        if (trip.id) {
          // Upsert: update if exists, create if not
          return prisma.trip.upsert({
            where: { id: trip.id },
            update: tripData,
            create: { id: trip.id, ...tripData },
          });
        }

        return prisma.trip.create({ data: tripData });
      }),
    );

    return reply.send({
      synced: results.length,
      trips: results,
    });
  });

  // GET /trips/history — paginated trip history
  server.get('/history', async (request, reply) => {
    const parsed = tripHistorySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Validation failed',
        details: parsed.error.flatten().fieldErrors,
      });
    }

    const { userId } = request.user as { userId: string };
    const { page, limit } = parsed.data;
    const skip = (page - 1) * limit;

    const [trips, total] = await Promise.all([
      prisma.trip.findMany({
        where: { userId },
        orderBy: { startTime: 'desc' },
        skip,
        take: limit,
      }),
      prisma.trip.count({ where: { userId } }),
    ]);

    return reply.send({
      trips,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  });
}
