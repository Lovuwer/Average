import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import fastifyJwt from '@fastify/jwt';
import { authRoutes } from './routes/auth';
import { tripRoutes } from './routes/trips';
import { licenseRoutes } from './routes/license';

const buildServer = async () => {
  const server = Fastify({
    logger: true,
  });

  // CORS
  await server.register(cors, {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
  });

  // Rate limiting
  await server.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
  });

  // JWT
  await server.register(fastifyJwt, {
    secret: process.env.JWT_SECRET || 'default-secret-change-me',
  });

  // Decorate with authenticate
  server.decorate('authenticate', async (request: any, reply: any) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.status(401).send({ error: 'Unauthorized' });
    }
  });

  // Health check
  server.get('/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  // Register routes
  await server.register(authRoutes, { prefix: '/auth' });
  await server.register(tripRoutes, { prefix: '/trips' });
  await server.register(licenseRoutes, { prefix: '/license' });

  return server;
};

const start = async () => {
  const server = await buildServer();

  const port = parseInt(process.env.PORT || '3000', 10);
  const host = process.env.HOST || '0.0.0.0';

  try {
    await server.listen({ port, host });
    console.log(`Server listening on ${host}:${port}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();
