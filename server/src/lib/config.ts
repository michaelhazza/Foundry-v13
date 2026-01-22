import 'dotenv/config';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} environment variable is required`);
  }
  return value;
}

function optionalEnv(name: string, defaultValue: string): string {
  return process.env[name] || defaultValue;
}

export const config = {
  // Required
  databaseUrl: requireEnv('DATABASE_URL'),
  jwtSecret: requireEnv('JWT_SECRET'),
  encryptionKey: requireEnv('ENCRYPTION_KEY'),

  // Required with defaults
  nodeEnv: optionalEnv('NODE_ENV', 'development'),
  port: parseInt(optionalEnv('PORT', '5000'), 10),

  // JWT
  jwtExpiresIn: optionalEnv('JWT_EXPIRES_IN', '1h'),
  jwtRefreshSecret: optionalEnv('JWT_REFRESH_SECRET', process.env.JWT_SECRET || 'refresh-secret'),
  jwtRefreshExpiresIn: optionalEnv('JWT_REFRESH_EXPIRES_IN', '7d'),

  // CORS
  corsOrigin: optionalEnv('CORS_ORIGIN', '*'),

  // Rate limiting
  rateLimitWindowMs: parseInt(optionalEnv('RATE_LIMIT_WINDOW_MS', '900000'), 10),
  rateLimitMaxRequests: parseInt(optionalEnv('RATE_LIMIT_MAX_REQUESTS', '100'), 10),

  // File upload
  maxFileSizeMb: parseInt(optionalEnv('MAX_FILE_SIZE_MB', '100'), 10),
  uploadDir: optionalEnv('UPLOAD_DIR', './uploads'),

  // Optional integrations
  teamworkApiUrl: process.env.TEAMWORK_API_URL,

  // Email (optional)
  smtpHost: process.env.SMTP_HOST,
  smtpPort: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587,
  smtpUser: process.env.SMTP_USER,
  smtpPass: process.env.SMTP_PASS,
  fromEmail: process.env.FROM_EMAIL,

  // Computed
  isDevelopment: optionalEnv('NODE_ENV', 'development') === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isEmailEnabled: !!(process.env.SMTP_HOST && process.env.SMTP_USER),
};
