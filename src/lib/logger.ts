import pino from 'pino';

const transport = pino.transport({
  target: 'pino-pretty',
  options: {
    colorize: true,
  },
});

export const logger = pino(
  {
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    base: {
      env: process.env.NODE_ENV || 'development',
    },
  },
  process.env.NODE_ENV === 'production' ? undefined : transport,
);
