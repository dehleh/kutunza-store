// Environment variable validation using envalid
import { cleanEnv, str, port, url } from 'envalid';

export const env = cleanEnv(process.env, {
  // Database
  DATABASE_URL: url({
    desc: 'PostgreSQL database connection URL',
    example: 'postgresql://user:password@localhost:5432/database',
  }),

  // Server
  PORT: port({ default: 3000, desc: 'Server port' }),
  NODE_ENV: str({
    choices: ['development', 'production', 'test'],
    default: 'development',
    desc: 'Node environment',
  }),

  // CORS
  ALLOWED_ORIGINS: str({
    default: '*',
    desc: 'Comma-separated list of allowed CORS origins',
  }),

  // Authentication
  API_KEY: str({
    desc: 'API key for authenticating requests',
    example: 'your-secret-api-key-here',
  }),
  JWT_SECRET: str({
    desc: 'Secret key for signing JWT tokens',
    example: 'your-jwt-secret-key-here',
  }),

  // Optional
  LOG_LEVEL: str({
    choices: ['fatal', 'error', 'warn', 'info', 'debug', 'trace'],
    default: 'info',
    desc: 'Logging level',
  }),
});
