import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { z } from 'zod';
import { calculateHealth } from './scoring.js';

async function bootstrap() {
  const app = Fastify({
    logger: true,
    bodyLimit: 1024 * 1024,
  });

  await app.register(cors, {
    origin: true,
    credentials: true,
  });

  await app.register(helmet);

  await app.register(rateLimit, {
    max: 120,
    timeWindow: '1 minute',
  });

  app.get('/health', async () => ({
    status: 'ok',
    service: 'nexus-api',
  }));

  app.get('/ready', async () => ({
    status: 'ready',
    dependencies: {
      database: 'adapter-required',
      redis: 'adapter-required',
    },
  }));

  app.get('/api/v1/demo/health', async () => {
    const score = calculateHealth({
      complexity: 18,
      securityFindings: 1,
      outdatedDeps: 2,
      activity: 93,
      architectureSmells: 2,
    });

    return {
      success: true,
      data: score,
      demo: true,
    };
  });

  const analyzeSchema = z.object({
    repositoryId: z.string().min(1),
    branch: z.string().min(1).default('main'),
  });

  app.post('/api/v1/analyses', async (request, reply) => {
    const parsed = analyzeSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid analysis request',
        },
      });
    }

    return reply.code(202).send({
      success: true,
      data: {
        status: 'queued',
        repositoryId: parsed.data.repositoryId,
        branch: parsed.data.branch,
      },
    });
  });

  app.setErrorHandler((error, request, reply) => {
    request.log.error(
      {
        err: error,
        requestId: request.id,
      },
      'request_failed',
    );

    return reply.code(500).send({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Request could not be completed',
      },
    });
  });

  await app.listen({
    port: Number(process.env.PORT ?? 4000),
    host: '0.0.0.0',
  });
}

bootstrap().catch((error) => {
  console.error('Failed to start NEXUS API:', error);
  process.exit(1);
});