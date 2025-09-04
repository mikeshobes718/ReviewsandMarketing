"use client";
import { useEffect } from 'react';

export default function ClientAuthSync() {
  useEffect(() => {
    async function sync() {
      try {
        const token = localStorage.getItem('idToken');
        if (!token) return;
        await fetch('/api/auth/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken: token, days: 7 }),
        });
      } catch {}
    }
    // initial
    void sync();
    // listen for broadcasted changes and storage updates
    const onChanged = () => { void sync(); };
    window.addEventListener('idtoken:changed', onChanged as EventListener);
    window.addEventListener('storage', (e: Event) => {
      const ev = e as StorageEvent;
      if (ev.key === 'idToken') void sync();
    });
    window.addEventListener('focus', onChanged);
    return () => {
      window.removeEventListener('idtoken:changed', onChanged as EventListener);
      window.removeEventListener('focus', onChanged);
    };
  }, []);
  return null;
}
