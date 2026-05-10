import pino from 'pino';
import { getEnv } from '../config/env.js';

function createLogger(): pino.Logger {
  let env: { NODE_ENV: string; LOG_LEVEL: string };
  try {
    env = getEnv();
  } catch {
    // Fallback if env hasn't been loaded yet
    env = { NODE_ENV: 'development', LOG_LEVEL: 'info' };
  }

  const transport =
    env.NODE_ENV === 'development'
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss',
            ignore: 'pid,hostname',
          },
        }
      : undefined;

  return pino({
    level: env.LOG_LEVEL,
    transport,
    serializers: {
      err: pino.stdSerializers.err,
      req: pino.stdSerializers.req,
      res: pino.stdSerializers.res,
    },
  });
}

export const logger = createLogger();
