import fp from 'fastify-plugin';
import fastifyJwt from '@fastify/jwt';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { getEnv } from '../config/env.js';

export default fp(async (app) => {
  const env = getEnv();

  await app.register(fastifyJwt, {
    secret: env.JWT_SECRET,
    sign: {
      expiresIn: env.JWT_EXPIRES_IN,
    },
  });

  app.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.status(401).send({
        success: false,
        data: null,
        cached: false,
        error: { code: 'UNAUTHORIZED', message: 'Unauthorized or invalid token' },
      });
    }
  });
});

declare module 'fastify' {
  export interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { id: string; email: string; role: string }; // payload type is used for signing and verifying
    user: {
      id: string;
      email: string;
      role: string;
    }; // user type is return type of `request.user` object
  }
}
