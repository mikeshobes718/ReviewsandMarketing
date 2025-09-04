"use client";
import { useEffect, useState } from 'react';

type Member = { uid: string; role: string; added_at: string };
type Invite = { email: string; role: string; invited_at: string; token: string };

export default function SettingsPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [canManage, setCanManage] = useState(false);
  const [role, setRole] = useState<string>('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [businessId, setBusinessId] = useState<string>('');
  const [pro, setPro] = useState<boolean | null>(null);

  useEffect(() => {
    // load my business id and members
    (async () => {
      try {
        // Fetch entitlements first to toggle UI
        try {
          const ent = await fetch('/api/entitlements', { cache: 'no-store' });
          if (ent.ok) { const ej = await ent.json(); setPro(Boolean(ej?.pro)); }
        } catch {}

        const biz = await fetch('/api/businesses/me', { headers: bearer() });
        const j = await biz.json();
        const id = j?.business?.id || '';
        setBusinessId(id);
        if (id) {
          const r = await fetch(`/api/members/list?businessId=${id}`, { cache: 'no-store' });
          const data = await r.json();
          setMembers(data.members || []);
          setInvites(data.invites || []);
          setCanManage(Boolean(data.canManage));
          setRole(data.role || '');
        }
      } catch (e) { setError('Failed to load settings'); }
      finally { setLoading(false); }
    })();
  }, []);

  function bearer(): HeadersInit {
    const t = typeof window !== 'undefined' ? localStorage.getItem('idToken') : null;
    return t ? ({ Authorization: `Bearer ${t}` } as Record<string,string>) : {};
  }

  async function invite() {
    if (!businessId) return;
    setError(null);
    try {
      await fetch('/api/members/invite', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ businessId, email, role: 'member' }) });
      setEmail('');
      const r = await fetch(`/api/members/list?businessId=${businessId}`);
      const data = await r.json(); setInvites(data.invites||[]); setMembers(data.members||[]);
    } catch (e) { setError('Invite failed'); }
  }

  async function remove(uid: string) {
    if (!businessId) return;
    await fetch('/api/members/remove', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ businessId, uid }) });
    const r = await fetch(`/api/members/list?businessId=${businessId}`);
    const data = await r.json(); setInvites(data.invites||[]); setMembers(data.members||[]);
  }

  useEffect(() => {
    const url = new URL(window.location.href);
    const token = url.searchParams.get('accept');
    if (token) {
      fetch('/api/members/accept', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }) })
        .then(()=> window.history.replaceState({}, '', '/settings'));
    }
  }, []);

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 py-10">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Settings</h1>
        {pro === false && (
          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-blue-800">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="font-medium">Unlock team invites and advanced features</div>
                <div className="text-sm">Upgrade to Pro to manage members and access premium functionality.</div>
              </div>
              <a href="/pricing" className="rounded-xl px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium shadow hover:from-blue-700 hover:to-purple-700 transition">Upgrade to Pro</a>
            </div>
          </div>
        )}
        {error && <div className="text-red-600 text-sm">{error}</div>}

        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Members</h2>
          {!canManage && <p className="text-sm text-gray-600">You don’t have permission to manage members.</p>}
          {canManage && (
            <div className="flex gap-2 mb-4">
              <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Invite email" className="rounded-xl border px-3 py-2 flex-1"/>
              <button onClick={invite} className="rounded-xl px-4 py-2 bg-gray-900 text-white">Invite</button>
            </div>
          )}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <div className="font-medium mb-2">Current members</div>
              <ul className="divide-y">
                {members.map(m => (
                  <li key={m.uid} className="py-2 flex items-center justify-between">
                    <span className="text-gray-800">{m.uid}</span>
                    <span className="text-sm text-gray-600">{m.role}</span>
                    {canManage && <button onClick={()=>remove(m.uid)} className="text-red-600 text-sm">Remove</button>}
                  </li>
                ))}
                {members.length===0 && <li className="py-2 text-gray-500 text-sm">No members yet.</li>}
              </ul>
            </div>
            <div>
              <div className="font-medium mb-2">Pending invites</div>
              <ul className="divide-y">
                {invites.map(i => (
                  <li key={i.token} className="py-2 flex items-center justify-between">
                    <span>{i.email}</span>
                    <span className="text-sm text-gray-600">{i.role}</span>
                  </li>
                ))}
                {invites.length===0 && <li className="py-2 text-gray-500 text-sm">No pending invites.</li>}
              </ul>
            </div>
          </div>
        </section>

      </div>
    </main>
  );
}
