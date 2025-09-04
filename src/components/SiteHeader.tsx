"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function SiteHeader() {
  const [authed, setAuthed] = useState(false);
  const [pro, setPro] = useState<boolean | null>(null);
  const [planStatus, setPlanStatus] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showPricing, setShowPricing] = useState(false);
  const [email, setEmail] = useState<string>('');
  const [ctaLoading, setCtaLoading] = useState(false);
  useEffect(() => {
    async function refresh() {
      try {
        setAuthed(Boolean(localStorage.getItem('idToken')));
        setEmail(localStorage.getItem('userEmail') || '');
      } catch { setAuthed(false); setEmail(''); }
      // Server session check as reliable fallback
      try {
        const r = await fetch('/api/auth/me', { cache: 'no-store' });
        if (r.ok) {
          const j = await r.json();
          setAuthed(true);
          if (j?.email) setEmail(j.email);
        }
      } catch {}
      try {
        const r = await fetch('/api/entitlements', { cache: 'no-store' });
        if (r.ok) { const j = await r.json(); setPro(Boolean(j?.pro)); }
      } catch { setPro(null); }
      try {
        const r2 = await fetch('/api/plan/status', { cache: 'no-store' });
        if (r2.ok) { const j2 = await r2.json(); setPlanStatus(j2?.status || null); }
      } catch {}
    }
    void refresh();
    const onChanged = () => { void refresh(); };
    window.addEventListener('idtoken:changed', onChanged as EventListener);
    window.addEventListener('focus', onChanged);
    window.addEventListener('storage', (e: Event) => {
      const ev = e as StorageEvent;
      if (ev.key === 'idToken') onChanged();
    });
    return () => {
      window.removeEventListener('idtoken:changed', onChanged as EventListener);
      window.removeEventListener('focus', onChanged);
    };
  }, []);
  
  function getBillingPref(): 'monthly'|'yearly' {
    try { const v = localStorage.getItem('billingPreference'); if (v==='yearly' || v==='monthly') return v; } catch {}
    return 'monthly';
  }

  function setBillingPref(v: 'monthly'|'yearly') {
    try { localStorage.setItem('billingPreference', v); } catch {}
  }

  async function startCheckout(plan?: 'monthly'|'yearly') {
    try {
      setCtaLoading(true);
      const chosen = plan || getBillingPref();
      // If not signed in (no local idToken), include an email when possible; server prefers session cookie
      let payload: { plan: 'monthly'|'yearly'; uid?: string; email?: string } = { plan: chosen };
      try {
        const hasToken = Boolean(localStorage.getItem('idToken'));
        if (!hasToken) {
          let em = localStorage.getItem('userEmail') || '';
          if (!em) {
            const entered = window.prompt('Enter your email for checkout:') || '';
            if (!entered) throw new Error('Email is required to continue');
            em = entered;
          }
          payload = { plan: chosen, uid: 'anon', email: em };
        }
      } catch {}
      const r = await fetch('/api/stripe/checkout', { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify(payload) });
      if (!r.ok) throw new Error(await r.text());
      const j = await r.json();
      if (j?.url) { window.location.href = j.url; return; }
      // Fallback to pricing if no URL
      window.location.href = '/pricing';
    } catch (e) {
      // If something goes wrong, open the modal as a fallback
      setShowPricing(true);
    } finally {
      setCtaLoading(false);
    }
  }
  async function logout() {
    try { await fetch('/api/auth/logout', { method: 'POST' }); } catch {}
    try { localStorage.removeItem('idToken'); localStorage.removeItem('userEmail'); } catch {}
    window.location.href = '/';
  }
  return (
    <header className="sticky top-0 z-50 border-b border-gray-100/80 bg-white/70 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
            <svg aria-hidden className="w-5 h-5 text-white" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" clipRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" />
            </svg>
          </div>
          <span className="text-lg font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
            Reviews & Marketing
          </span>
          {pro === true && (
            <span className="ml-2 inline-flex items-center rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs px-2 py-0.5">Pro</span>
          )}
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          <Link href="/features" className="text-gray-600 hover:text-gray-900 font-medium transition-colors">
            Features
          </Link>
          <Link href="/pricing" className="text-gray-600 hover:text-gray-900 font-medium transition-colors">
            Pricing
          </Link>
          <Link href="/contact" className="text-gray-600 hover:text-gray-900 font-medium transition-colors">
            Contact
          </Link>
          {!authed && (
            <>
              <Link href="/login" className="text-gray-600 hover:text-gray-900 font-medium transition-colors">Sign in</Link>
              <Link href="/register" className="neon-button inline-flex items-center gap-2 rounded-lg px-3 py-2 font-medium transition">Create account</Link>
            </>
          )}
          {authed && pro === true && (
            <>
              <Link href="/dashboard" className="neon-button inline-flex items-center gap-2 rounded-lg px-3 py-2 font-medium transition">Dashboard</Link>
            </>
          )}
          {authed && pro === false && (
            planStatus === 'none' ? (
              <Link href="/pricing" className="neon-button inline-flex items-center gap-2 rounded-lg px-3 py-2 font-medium transition">Choose a Plan</Link>
            ) : (
              <button onClick={()=>startCheckout('monthly')} disabled={ctaLoading} className="neon-button inline-flex items-center gap-2 rounded-lg px-3 py-2 font-medium transition disabled:opacity-50">
                {ctaLoading ? 'Processing…' : 'Upgrade to Pro'}
              </button>
            )
          )}
          {authed && (
            <div className="flex items-center gap-3">
              {email && <span className="hidden lg:inline text-xs text-gray-500">Signed in as {email}</span>}
              <button onClick={logout} className="text-gray-600 hover:text-gray-900 font-medium">Logout</button>
            </div>
          )}
        </nav>

        {/* Mobile menu toggle */}
        <button className="md:hidden p-2 rounded-lg border border-gray-200 bg-white text-gray-700" aria-label="Open menu" onClick={()=>setMenuOpen(v=>!v)}>
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"/></svg>
        </button>
      </div>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white">
          <div className="max-w-7xl mx-auto px-4 py-3 grid gap-3">
            <Link href="/features" className="text-gray-700" onClick={()=>setMenuOpen(false)}>Features</Link>
            <Link href="/pricing" className="text-gray-700" onClick={()=>setMenuOpen(false)}>Pricing</Link>
            <Link href="/contact" className="text-gray-700" onClick={()=>setMenuOpen(false)}>Contact</Link>
            {!authed && (
              <div className="flex gap-3">
                <Link href="/login" className="text-gray-700" onClick={()=>setMenuOpen(false)}>Sign in</Link>
                <Link href="/register" className="text-gray-700" onClick={()=>setMenuOpen(false)}>Create account</Link>
              </div>
            )}
            {authed && pro === true && (
              <div className="flex gap-3">
                <Link href="/dashboard" className="text-gray-700" onClick={()=>setMenuOpen(false)}>Dashboard</Link>
              </div>
            )}
            {authed && pro === false && (
              <div className="flex gap-3">
                {planStatus==='none' ? (
                  <Link href="/pricing" className="text-gray-700" onClick={()=>setMenuOpen(false)}>Choose a Plan</Link>
                ) : (
                  <button onClick={()=>{setMenuOpen(false); void startCheckout('monthly');}} className="text-gray-700">Upgrade to Pro</button>
                )}
              </div>
            )}
            {authed && (
              <div className="flex flex-col gap-1">
                {email && (<div className="text-xs text-gray-500">Signed in as {email}</div>)}
                <button onClick={()=>{setMenuOpen(false);logout();}} className="text-gray-700">Logout</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Pricing modal */}
      {showPricing && <PricingModal onClose={()=>setShowPricing(false)} />}
    </header>
  );
}

function PricingModal({ onClose }: { onClose: () => void }) {
  const [billing, setBilling] = useState<'monthly'|'yearly'>('monthly');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string|null>(null);

  async function checkout() {
    try {
      setLoading(true); setError(null);
      // If not signed in, gather an email
      let payload: { plan: 'monthly'|'yearly'; uid?: string; email?: string } = { plan: billing };
      try { if (!localStorage.getItem('idToken')) {
        let email = localStorage.getItem('userEmail') || '';
        if (!email) {
          const promptVal = window.prompt('Enter your email for checkout:');
          if (!promptVal) throw new Error('Email is required to checkout');
          email = promptVal;
        }
        payload = { plan: billing, uid: 'anon', email };
      }} catch {}
      const res = await fetch('/api/stripe/checkout', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error(await res.text());
      const j = await res.json();
      if (j?.url) window.location.href = j.url; else throw new Error('No checkout URL');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Checkout failed');
    } finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold">Upgrade to Pro</h3>
          <button aria-label="Close" onClick={onClose} className="p-1 rounded hover:bg-gray-100">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        <p className="text-sm text-gray-600 mb-4">Access custom branding, team invites, and advanced analytics.</p>
        <div className="flex items-center gap-2 mb-4">
          <button className={`px-3 py-1.5 rounded-full border ${billing==='monthly'?'bg-gray-900 text-white border-gray-900':'border-gray-300 text-gray-700'}`} onClick={()=>{ setBilling('monthly'); try{ localStorage.setItem('billingPreference','monthly'); }catch{} }}>Monthly $49.99</button>
          <button className={`px-3 py-1.5 rounded-full border ${billing==='yearly'?'bg-gray-900 text-white border-gray-900':'border-gray-300 text-gray-700'}`} onClick={()=>{ setBilling('yearly'); try{ localStorage.setItem('billingPreference','yearly'); }catch{} }}>Yearly $499</button>
        </div>
        {error && <div className="text-sm text-red-600 mb-2">{error}</div>}
        <button disabled={loading} onClick={checkout} className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white py-2.5 font-medium disabled:opacity-50">
          {loading ? 'Processing…' : 'Continue to Checkout'}
        </button>
      </div>
    </div>
  );
}
