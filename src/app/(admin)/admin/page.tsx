"use client";
import { useEffect, useState } from 'react';

type PlanRow = { email: string; status: string };

export default function AdminPage() {
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [emailLookup, setEmailLookup] = useState('');
  const [plan, setPlan] = useState<PlanRow | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Basic admin gate: allow emails listed in ADMIN_EMAILS env (comma-separated)
    (async () => {
      try {
        const me = await fetch('/api/auth/me', { cache: 'no-store' });
        if (!me.ok) { setAuthorized(false); return; }
        const j = await me.json();
        const allow = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || '').split(',').map(s=>s.trim().toLowerCase()).filter(Boolean);
        setAuthorized(allow.length === 0 || allow.includes((j?.email || '').toLowerCase()));
      } catch { setAuthorized(false); }
    })();
  }, []);

  async function lookup() {
    setError(null); setPlan(null);
    try {
      const token = prompt('Admin token');
      if (!token) return;
      const r = await fetch(`/api/admin/plan?email=${encodeURIComponent(emailLookup)}`, { headers: { 'x-admin-token': token } });
      if (!r.ok) throw new Error(await r.text());
      const j = await r.json();
      setPlan({ email: j.email, status: j.status });
    } catch (e) { setError(e instanceof Error ? e.message : 'Lookup failed'); }
  }

  if (authorized === null) return null;
  if (!authorized) return <main className="min-h-screen flex items-center justify-center"><div className="text-gray-600">Forbidden</div></main>;

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 py-10">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Admin</h1>
        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">User plan lookup</h2>
          <div className="flex gap-2">
            <input value={emailLookup} onChange={e=>setEmailLookup(e.target.value)} placeholder="user@example.com" className="rounded-xl border px-3 py-2 flex-1"/>
            <button onClick={lookup} className="rounded-xl px-4 py-2 bg-gray-900 text-white">Lookup</button>
          </div>
          {plan && (
            <div className="mt-3 text-sm text-gray-800">{plan.email} → <span className="font-medium">{plan.status}</span></div>
          )}
          {error && <div className="mt-3 text-sm text-red-600">{error}</div>}
          <div className="mt-2 text-xs text-gray-500">Uses admin token to call /api/admin/plan</div>
        </section>
      </div>
    </main>
  );
}

