import * as admin from 'firebase-admin';

let cachedAuth: admin.auth.Auth | null = null;

export function getAuthAdmin(): admin.auth.Auth {
  if (cachedAuth) return cachedAuth;

  // Initialize only when first needed to avoid build-time env parsing
  const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_B64;
  if (!b64) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_B64 is not set');
  }

  const jsonString = Buffer.from(b64, 'base64').toString('utf8');
  const creds = JSON.parse(jsonString);

  const app = admin.apps.length
    ? admin.app()
    : admin.initializeApp({ credential: admin.credential.cert(creds) });

  cachedAuth = admin.auth(app);
  return cachedAuth;
}

export function getFirebaseAdminApp(): admin.app.App {
  if (admin.apps.length) return admin.app();

  const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_B64;
  if (!b64) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_B64 is not set');
  }

  const jsonString = Buffer.from(b64, 'base64').toString('utf8');
  const creds = JSON.parse(jsonString);

  return admin.initializeApp({ credential: admin.credential.cert(creds) });
}
