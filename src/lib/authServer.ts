import { cookies } from 'next/headers';
import { getAuthAdmin } from './firebaseAdmin';

const AUTH_COOKIE = 'idToken';

export async function requireUid(): Promise<string> {
  const token = (await cookies()).get(AUTH_COOKIE)?.value;
  if (!token) throw new Error('unauthenticated');
  const decoded = await getAuthAdmin().verifyIdToken(token);
  return decoded.uid;
}


