"use client";
import { useEffect, useState } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { clientAuth } from '@/lib/firebaseClient';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [show, setShow] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [criteria, setCriteria] = useState({
    length: false,
    upper: false,
    lower: false,
    digit: false,
    special: false,
    noEmail: true,
  });

  function assess(pw: string, em: string) {
    const length = pw.length >= 8;
    const upper = /[A-Z]/.test(pw);
    const lower = /[a-z]/.test(pw);
    const digit = /\d/.test(pw);
    const special = /[^A-Za-z0-9]/.test(pw);
    const noEmail = em ? !pw.toLowerCase().includes(em.split('@')[0]?.toLowerCase() || '') : true;
    const groups = [upper, lower, digit, special].filter(Boolean).length;
    let s = 0;
    if (length) s++;
    if (groups >= 2) s++;
    if (groups >= 3) s++;
    if (groups >= 4 && length && pw.length >= 12) s++;
    setCriteria({ length, upper, lower, digit, special, noEmail });
    setScore(s);
  }

  useEffect(() => { assess(password, email); }, [password, email]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(null);
    try {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setEmailError('Enter a valid email'); return; } else setEmailError(null);
      // baseline password policy: min 8 and at least 3 of 4 types
      const groups = [criteria.upper, criteria.lower, criteria.digit, criteria.special].filter(Boolean).length;
      if (!(criteria.length && groups >= 3 && criteria.noEmail)) {
        setPasswordError('Use at least 8 characters and 3 of: uppercase, lowercase, number, symbol. Avoid using your email.');
        return;
      } else setPasswordError(null);
      const cred = await createUserWithEmailAndPassword(clientAuth, email, password);
      const token = await cred.user.getIdToken();
      try { localStorage.setItem('idToken', token); localStorage.setItem('userEmail', email); window.dispatchEvent(new Event('idtoken:changed')); } catch {}
      await fetch('/api/auth/session', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ idToken: token, days: 7 }) });
      try { window.dispatchEvent(new Event('idtoken:changed')); } catch {}
      // Send branded verification email via Postmark-backed route
      await fetch('/api/auth/email', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ email, type: 'verify' }) });
      window.location.href = '/verify-email';
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Registration failed');
    } finally { setLoading(false); }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-blue-50 py-12">
      <div className="max-w-md mx-auto px-4">
        <div className="rounded-2xl border border-gray-200 bg-white/90 backdrop-blur-sm shadow-xl p-6">
          <div className="mb-4 text-center">
            <div className="mx-auto w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center mb-3">
              <svg aria-hidden className="w-6 h-6 text-white" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" clipRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" /></svg>
            </div>
            <h1 className="text-2xl font-bold">Create your account</h1>
            <p className="text-sm text-gray-600">Start collecting reviews in minutes</p>
          </div>
          <form onSubmit={submit} className="space-y-4" noValidate>
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Email</span>
              <input aria-label="Email" className="mt-1 w-full border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" type="email" placeholder="you@example.com" value={email} onChange={e=>setEmail(e.target.value)} onBlur={()=>{ if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) setEmailError('Enter a valid email'); else setEmailError(null); }} required />
              {emailError && <div role="alert" className="text-red-600 text-xs mt-1">{emailError}</div>}
            </label>
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Password</span>
              <div className="mt-1 relative">
                <input aria-label="Password" className="w-full border rounded-xl px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500" type={show?'text':'password'} placeholder="Create a strong password" value={password} onChange={e=>setPassword(e.target.value)} onBlur={()=>{ if (password.length<6) setPasswordError('Password must be at least 6 characters'); else setPasswordError(null); }} required />
                <button type="button" aria-label={show? 'Hide password':'Show password'} onClick={()=>setShow(s=>!s)} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-gray-100">
                  <svg aria-hidden className="w-5 h-5 text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0Z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7Z"/></svg>
                </button>
              </div>
              {passwordError && <div role="alert" className="text-red-600 text-xs mt-1">{passwordError}</div>}
              {/* Strength meter */}
              <div className="mt-2">
                <div className="flex h-2 overflow-hidden rounded bg-gray-100">
                  <div className={`${score>0?'bg-red-400':'bg-transparent'} flex-1 transition-all`} />
                  <div className={`${score>1?'bg-yellow-400':'bg-transparent'} flex-1 transition-all`} />
                  <div className={`${score>2?'bg-green-400':'bg-transparent'} flex-1 transition-all`} />
                  <div className={`${score>3?'bg-emerald-500':'bg-transparent'} flex-1 transition-all`} />
                </div>
                <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-700">
                  <StrengthItem ok={criteria.length} label="8+ characters" />
                  <StrengthItem ok={criteria.upper} label="Uppercase" />
                  <StrengthItem ok={criteria.lower} label="Lowercase" />
                  <StrengthItem ok={criteria.digit} label="Number" />
                  <StrengthItem ok={criteria.special} label="Symbol" />
                  <StrengthItem ok={criteria.noEmail} label="Not similar to email" />
                </div>
              </div>
            </label>
            <button type="submit" disabled={loading} className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white py-2.5 font-medium shadow hover:from-blue-700 hover:to-purple-700 transition">{loading?'Creating…':'Create account'}</button>
            {error && <div role="alert" className="text-red-600 text-sm">{error}</div>}
          </form>
          <div className="mt-4 text-sm flex items-center justify-between">
            <a className="text-gray-600 hover:text-gray-900" href="/login">Have an account? Sign in</a>
            <a className="underline text-blue-600" href="/forgot">Forgot password</a>
          </div>
        </div>
      </div>
    </main>
  );
}

function StrengthItem({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className={`inline-flex items-center gap-1 ${ok ? 'text-green-700' : 'text-gray-500'}`}>
      <svg aria-hidden className={`w-3.5 h-3.5 ${ok ? 'text-green-600' : 'text-gray-400'}`} viewBox="0 0 24 24" fill="currentColor">
        {ok ? (
          <path d="M12 2a10 10 0 100 20 10 10 0 000-20Zm-1 14l-4-4 1.41-1.41L11 12.17l4.59-4.58L17 9l-6 7Z"/>
        ) : (
          <path d="M12 22C6.48 22 2 17.52 2 12S6.48 2 12 2s10 4.48 10 10-4.48 10-10 10Zm0-2a8 8 0 100-16 8 8 0 000 16Z"/>
        )}
      </svg>
      <span>{label}</span>
    </div>
  );
}
