import { z } from 'zod';

const ServerEnvSchema = z.object({
  APP_URL: z.string().url(),

  STRIPE_SECRET_KEY: z.string().min(1),
  STRIPE_PUBLISHABLE_KEY: z.string().min(1),
  STRIPE_PRICE_ID: z.string().min(1),
  STRIPE_WEBHOOK_SECRET: z.string().min(1),

  POSTMARK_SERVER_TOKEN: z.string().min(1),
  EMAIL_FROM: z.string().email(),

  GOOGLE_MAPS_API_KEY: z.string().min(1),

  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  FIREBASE_SERVICE_ACCOUNT_B64: z.string().min(1),
});

type ServerEnv = z.infer<typeof ServerEnvSchema>;

let _env: ServerEnv | null = null;

/** Validate and cache env at runtime when first used (not at import). */
export function getEnv(): ServerEnv {
  if (_env) return _env;
  const parsed = ServerEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `${i.path.join('.')}: ${i.message}`)
      .join(', ');
    throw new Error(`Missing/invalid server env: ${issues}`);
  }
  _env = parsed.data;
  return _env;
}

/** Convenience for public client config (no validation; optional at build). */
export const PUBLIC_ENV = {
  NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
  NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
  NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || '',
};
