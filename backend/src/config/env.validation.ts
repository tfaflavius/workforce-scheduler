import * as Joi from 'joi';

/**
 * Joi validation schema for environment variables.
 * Validates required vars at startup — fail-fast instead of cryptic runtime errors.
 */
export const envValidationSchema = Joi.object({
  // Application
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().default(3000),
  CORS_ORIGIN: Joi.string().optional(),
  FRONTEND_URL: Joi.string().uri().optional(),

  // Database (required)
  DATABASE_HOST: Joi.string().required(),
  DATABASE_PORT: Joi.number().default(5432),
  DATABASE_USER: Joi.string().required(),
  DATABASE_PASSWORD: Joi.string().required(),
  DATABASE_NAME: Joi.string().required(),
  DATABASE_SSL: Joi.string().valid('true', 'false').default('false'),

  // TypeORM
  TYPEORM_SYNC: Joi.string().valid('true', 'false').optional(),

  // Authentication (required)
  JWT_SECRET: Joi.string().min(16).required(),

  // Supabase (required for file storage)
  SUPABASE_URL: Joi.string().uri().required(),
  SUPABASE_ANON_KEY: Joi.string().required(),
  SUPABASE_SERVICE_ROLE_KEY: Joi.string().required(),

  // Email (optional — app works without email)
  RESEND_API_KEY: Joi.string().optional(),
  RESEND_FROM_EMAIL: Joi.string().optional(),

  // Push Notifications (optional)
  VAPID_PUBLIC_KEY: Joi.string().optional(),
  VAPID_PRIVATE_KEY: Joi.string().optional(),
  VAPID_SUBJECT: Joi.string().optional(),
  ENABLE_PUSH_NOTIFICATIONS: Joi.string().valid('true', 'false').optional(),

  // Render hosting (auto-set)
  RENDER_EXTERNAL_URL: Joi.string().uri().optional(),
}).options({ allowUnknown: true }); // Allow other env vars (system, npm, etc.)
