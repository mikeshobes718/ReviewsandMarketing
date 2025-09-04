"use client";
import { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { clientAuth } from '@/lib/firebaseClient';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [show, setShow] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(null);
    try {
      // simple client validation
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        setEmailError('Enter a valid email');
        return;
      } else { setEmailError(null); }
      if (password.length < 6) {
        setPasswordError('Password must be at least 6 characters');
        return;
      } else { setPasswordError(null); }
      const cred = await signInWithEmailAndPassword(clientAuth, email, password);
      const token = await cred.user.getIdToken();
      try { localStorage.setItem('idToken', token); localStorage.setItem('userEmail', email); window.dispatchEvent(new Event('idtoken:changed')); } catch {}
      await fetch('/api/auth/session', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ idToken: token, days: 7 }) });
      try { window.dispatchEvent(new Event('idtoken:changed')); } catch {}
      window.location.href = '/dashboard';
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Login failed');
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
            <h1 className="text-2xl font-bold">Welcome back</h1>
            <p className="text-sm text-gray-600">Sign in to access your dashboard</p>
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
                <input aria-label="Password" className="w-full border rounded-xl px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500" type={show?'text':'password'} placeholder="••••••••" value={password} onChange={e=>setPassword(e.target.value)} onBlur={()=>{ if (password.length<6) setPasswordError('Password must be at least 6 characters'); else setPasswordError(null); }} required />
                <button type="button" aria-label={show? 'Hide password':'Show password'} onClick={()=>setShow(s=>!s)} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-gray-100">
                  <svg aria-hidden className="w-5 h-5 text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0Z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7Z"/></svg>
                </button>
              </div>
              {passwordError && <div role="alert" className="text-red-600 text-xs mt-1">{passwordError}</div>}
            </label>
            <button type="submit" disabled={loading} className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white py-2.5 font-medium shadow hover:from-blue-700 hover:to-purple-700 transition">{loading?'Signing in…':'Sign in'}</button>
            {error && <div role="alert" className="text-red-600 text-sm">{error}</div>}
          </form>
          <div className="mt-4 text-sm flex items-center justify-between">
            <a className="underline text-blue-600" href="/forgot">Forgot password?</a>
            <a className="text-gray-600 hover:text-gray-900" href="/register">Create account</a>
          </div>
        </div>
      </div>
    </main>
  );
}
