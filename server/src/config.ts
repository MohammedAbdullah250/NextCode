const DEFAULT_PORT = 4000;
const DEFAULT_WARNING_DAYS = 3;
const SESSION_HOURS = 8;

const isProduction = process.env.NODE_ENV === 'production';

if (isProduction && !process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET must be set in production.');
}

export const config = {
  port: Number(process.env.PORT ?? DEFAULT_PORT),
  isProduction,
  jwtSecret: process.env.JWT_SECRET ?? 'freshtrack-dev-secret-do-not-use-in-production',
  databasePath: process.env.DATABASE_PATH ?? './data/freshtrack.db',
  expiryWarningDays: Number(process.env.EXPIRY_WARNING_DAYS ?? DEFAULT_WARNING_DAYS),
  sessionHours: SESSION_HOURS,
};
