import type { FastifyInstance } from 'fastify';
import bcrypt from 'bcrypt';
import { getPrisma } from '../config/database.js';
import { registerSchema, loginSchema } from '../schemas/auth.schema.js';

export async function authRoutes(app: FastifyInstance): Promise<void> {
  // ─── POST /api/auth/register ─────────────────────────────
  app.post(
    '/api/auth/register',
    {
      schema: {
        description: 'Register a new user account',
        tags: ['auth'],
        body: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string', minLength: 8 },
          },
        },
      },
    },
    async (request, reply) => {
      const parsed = registerSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          success: false,
          data: null,
          cached: false,
          error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message ?? 'Invalid input' },
        });
      }

      const { email, password } = parsed.data;
      const prisma = getPrisma();

      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) {
        return reply.status(400).send({
          success: false,
          data: null,
          cached: false,
          error: { code: 'BAD_REQUEST', message: 'Email already exists' },
        });
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const user = await prisma.user.create({
        data: {
          email,
          passwordHash,
          role: 'analyst',
        },
      });

      const token = app.jwt.sign({ id: user.id, email: user.email, role: user.role });

      return reply.send({
        success: true,
        data: { token, user: { id: user.id, email: user.email, role: user.role } },
        cached: false,
      });
    },
  );

  // ─── POST /api/auth/login ─────────────────────────────
  app.post(
    '/api/auth/login',
    {
      schema: {
        description: 'Login to an existing account',
        tags: ['auth'],
        body: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const parsed = loginSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          success: false,
          data: null,
          cached: false,
          error: { code: 'VALIDATION_ERROR', message: 'Invalid input' },
        });
      }

      const { email, password } = parsed.data;
      const prisma = getPrisma();

      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        return reply.status(401).send({
          success: false,
          data: null,
          cached: false,
          error: { code: 'UNAUTHORIZED', message: 'Invalid credentials' },
        });
      }

      const isMatch = await bcrypt.compare(password, user.passwordHash);
      if (!isMatch) {
        return reply.status(401).send({
          success: false,
          data: null,
          cached: false,
          error: { code: 'UNAUTHORIZED', message: 'Invalid credentials' },
        });
      }

      const token = app.jwt.sign({ id: user.id, email: user.email, role: user.role });

      return reply.send({
        success: true,
        data: { token, user: { id: user.id, email: user.email, role: user.role } },
        cached: false,
      });
    },
  );
}
