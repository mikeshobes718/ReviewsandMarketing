import { redirect } from 'next/navigation';
import { requireUid } from '@/lib/authServer';
import { hasActivePro } from '@/lib/entitlements';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  let uid: string;
  try { uid = await requireUid(); } catch {
    redirect('/login?next=/dashboard');
  }
  const pro = await hasActivePro(uid);
  if (!pro) redirect('/pricing');
  return <>{children}</>;
}

