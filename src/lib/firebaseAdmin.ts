import * as admin from 'firebase-admin';
import { getEnv } from './env';

let _app: admin.app.App | null = null;

export function getFirebaseAdminApp(): admin.app.App {
  if (_app) return _app;
  if (!admin.apps.length) {
    const json = Buffer.from(getEnv().FIREBASE_SERVICE_ACCOUNT_B64, 'base64').toString('utf8');
    _app = admin.initializeApp({ credential: admin.credential.cert(JSON.parse(json)) });
  } else {
    _app = admin.app();
  }
  return _app;
}

export function getAuthAdmin(): admin.auth.Auth {
  return admin.auth(getFirebaseAdminApp());
}
