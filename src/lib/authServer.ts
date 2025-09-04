import { cookies } from 'next/headers';
import { getAuthAdmin } from './firebaseAdmin';

const AUTH_COOKIE = 'idToken';

export async function requireUid(): Promise<string> {
  const token = (await cookies()).get(AUTH_COOKIE)?.value;
  if (!token) throw new Error('unauthenticated');
  const auth = getAuthAdmin();
  try {
    const decoded = await auth.verifySessionCookie(token, true);
    return decoded.uid as string;
  } catch {
    // Fallback for older cookies that may contain a raw ID token
    const decoded = await auth.verifyIdToken(token);
    return decoded.uid as string;
  }
}



