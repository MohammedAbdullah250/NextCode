const isProduction = process.env.NODE_ENV === 'production';

if (isProduction && !process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET must be set in production.');
}

export const config = {
  port: Number(process.env.PORT ?? 4000),
  isProduction,
  jwtSecret: process.env.JWT_SECRET ?? 'freshtrack-dev-secret-do-not-use-in-production',
  databasePath: process.env.DATABASE_PATH ?? './data/freshtrack.db',
  // US-04: products expiring within this many days are "approaching expiry".
  expiryWarningDays: Number(process.env.EXPIRY_WARNING_DAYS ?? 3),
  sessionHours: 8,
};
