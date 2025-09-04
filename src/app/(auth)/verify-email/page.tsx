"use client";
import { useEffect, useState } from 'react';
import { clientAuth } from '@/lib/firebaseClient';
import { onAuthStateChanged } from 'firebase/auth';

export default function VerifyEmailPage() {
  const [email, setEmail] = useState<string>('');
  const [status, setStatus] = useState<'idle'|'sent'|'verified'|'error'>('idle');
  const [message, setMessage] = useState<string>('');
  const [cooldown, setCooldown] = useState<number>(0);

  useEffect(() => {
    try { setEmail(localStorage.getItem('userEmail') || ''); } catch {}
    const unsub = onAuthStateChanged(clientAuth, () => {});
    return () => unsub();
  }, []);

  async function resend() {
    if (cooldown>0) return;
    try {
      // resend quota client-side: 3 per hour
      const now = Date.now();
      const start = Number(localStorage.getItem('verifyCountStart') || '0');
      const count = Number(localStorage.getItem('verifyCount') || '0');
      const windowMs = 60*60*1000;
      if (start && now - start < windowMs && count >= 3) {
        setStatus('error'); setMessage('Too many verification emails sent. Try again later.'); return;
      }
      const targetEmail = (localStorage.getItem('userEmail') || '').trim();
      if (!targetEmail) { setStatus('error'); setMessage('Please sign in again to resend verification.'); return; }
      await fetch('/api/auth/email', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ email: targetEmail, type: 'verify' }) });
      setStatus('sent');
      setMessage('Verification email sent. Please check your inbox.');
      // update quota and cooldown
      if (!start || now - start > windowMs) {
        localStorage.setItem('verifyCountStart', String(now));
        localStorage.setItem('verifyCount', '1');
      } else {
        localStorage.setItem('verifyCount', String(count+1));
      }
      setCooldown(30);
    } catch (e) {
      setStatus('error');
      setMessage(e instanceof Error ? e.message : 'Failed to send verification email');
    }
  }

  async function check() {
    try {
      if (clientAuth.currentUser) {
        await clientAuth.currentUser.reload();
        if (clientAuth.currentUser.emailVerified) {
          setStatus('verified');
          setMessage('Email verified! Redirecting…');
          const token = await clientAuth.currentUser.getIdToken();
          await fetch('/api/auth/session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken: token, days: 7 }) });
          try { window.dispatchEvent(new Event('idtoken:changed')); } catch {}
          setTimeout(() => { window.location.href = '/pricing?welcome=1'; }, 1200);
          return;
        }
        setStatus('idle');
        setMessage('Not verified yet. Click “I verified” after confirming your email.');
        return;
      }
      const idToken = localStorage.getItem('idToken');
      if (idToken) {
        await fetch('/api/auth/session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken, days: 7 }) });
        try { window.dispatchEvent(new Event('idtoken:changed')); } catch {}
        window.location.href = '/pricing?welcome=1';
        return;
      }
      setStatus('error');
      setMessage('Please sign in again.');
    } catch (e) {
      setStatus('error');
      setMessage(e instanceof Error ? e.message : 'Failed to verify');
    }
  }

  // Avoid auto-resend; Safari may restore user asynchronously
  useEffect(() => { if (cooldown<=0) return; const t=setTimeout(()=>setCooldown(s=>Math.max(0,s-1)),1000); return ()=>clearTimeout(t); }, [cooldown]);

  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-blue-50 py-12">
      <div className="max-w-md mx-auto px-4">
        <div className="rounded-2xl border border-gray-200 bg-white/90 backdrop-blur-sm shadow-xl p-6">
          <div className="text-center mb-4">
            <div className="mx-auto w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center mb-3">
              <svg aria-hidden className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M2 6a2 2 0 012-2h16a2 2 0 012 2l-10 6L2 6Zm20 2.24-10 6-10-6V18a2 2 0 002 2h16a2 2 0 002-2V8.24Z"/></svg>
            </div>
            <h1 className="text-2xl font-bold">Verify your email</h1>
            <p className="text-sm text-gray-600">We sent a verification link to {email || 'your email'}.</p>
          </div>
          {message && (
            <div className={`mb-3 rounded-lg px-3 py-2 text-sm ${status==='error' ? 'bg-red-50 text-red-700 border border-red-200' : status==='verified' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-blue-50 text-blue-700 border border-blue-200'}`}>{message}</div>
          )}
          <div className="flex gap-2">
            <button onClick={check} className="flex-1 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white py-2.5 font-medium">I verified</button>
            <button onClick={resend} disabled={cooldown>0} className="px-4 rounded-xl border border-gray-300 text-gray-800 disabled:opacity-50">{cooldown>0?`Resend in ${cooldown}s`:'Resend'}</button>
          </div>
        </div>
      </div>
    </main>
  );
}
