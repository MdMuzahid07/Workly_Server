import pino from 'pino';
import { env } from '../config/index.js';

const isDevelopment = env.NODE_ENV === 'development';

const options: pino.LoggerOptions = {
  level: env.LOG_LEVEL,
  redact: {
    paths: [
      'password',
      '*.password',
      'token',
      '*.token',
      'secret',
      '*.secret',
      'cookie',
      '*.cookie',
      'headers.authorization',
      'headers.cookie',
      'headers["set-cookie"]',
      'req.headers.authorization',
      'req.headers.cookie',
      'req.headers["set-cookie"]',
    ],
    censor: '[REDACTED]',
  },
};

// In development, we use pino-pretty for human-readable colorized terminal output.
// In production, we write asynchronously to stdout using pino.destination({ sync: false })
// to avoid blocking the Node.js Event Loop.
export const logger = isDevelopment
  ? pino({
      ...options,
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          ignore: 'pid,hostname',
          translateTime: 'SYS:yyyy-mm-dd HH:MM:ss.l',
        },
      },
    })
  : pino(options, pino.destination({ sync: false }));

export default logger;
