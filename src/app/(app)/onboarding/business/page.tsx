'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { clientAuth } from '@/lib/firebaseClient';

type Suggestion = { placeId: string; mainText: string; secondaryText: string };

function newSessionToken() {
  return crypto.randomUUID();
}

export default function ConnectBusiness() {
  const [verified, setVerified] = useState<boolean | null>(null);
  const [resendCooldown, setResendCooldown] = useState<number>(0);
  const [toast, setToast] = useState<string>('');
  const [input, setInput] = useState('');
  const [region, setRegion] = useState<string>('auto');
  const [coords, setCoords] = useState<{lat:number;lng:number}|null>(null);
  const [sessionToken, setSessionToken] = useState<string>(() => newSessionToken());
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const [selected, setSelected] = useState<{
    id: string;
    displayName?: string;
    formattedAddress?: string;
    rating?: number;
    userRatingCount?: number;
    googleMapsUri?: string;
    writeAReviewUri?: string;
    lat?: number;
    lng?: number;
  } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useLocation, setUseLocation] = useState<boolean>(true);
  const [mapFailed, setMapFailed] = useState<boolean>(false);
  const [isPro, setIsPro] = useState<boolean>(false);
  const [saved, setSaved] = useState<boolean>(false);
  const searchRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    // Best-effort geolocation bias
    if (useLocation && navigator && 'geolocation' in navigator) {
      try { navigator.geolocation.getCurrentPosition((pos)=>setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude })); } catch {}
    }
    const ctrl = new AbortController();
    if (!input.trim()) {
      setSuggestions([]);
      return;
    }
    setLoading(true);
    setError(null);
    const t = setTimeout(async () => {
      try {
        const res = await fetch('/api/places/autocomplete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            input,
            sessionToken,
            includedRegionCodes: region !== 'auto' ? region : undefined,
            lat: coords?.lat,
            lng: coords?.lng,
            language: (navigator.languages?.[0]||navigator.language||'').split('-')[0] || undefined,
          }),
          signal: ctrl.signal,
        });
        const data = await res.json();
        const items: Suggestion[] = data.items || [];
        setSuggestions(items);
        setActiveIndex(items.length ? 0 : -1);
      } catch (e) {
        // Ignore expected aborts from in-flight request when typing quickly
        if (e instanceof DOMException && e.name === 'AbortError') {
          return;
        }
        const msg = e instanceof Error ? e.message : 'Autocomplete failed';
        if (msg.toLowerCase().includes('abort')) return;
        setError(msg);
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => {
      ctrl.abort();
      clearTimeout(t);
    };
  }, [input, sessionToken, region, useLocation]);

  useEffect(() => {
    // Check email verification status periodically
    const check = async () => {
      try {
        if (clientAuth.currentUser) {
          await clientAuth.currentUser.reload();
          setVerified(clientAuth.currentUser.emailVerified);
        }
      } catch {}
    };
    check();
    const id = setInterval(check, 5000);
    return () => clearInterval(id);
  }, []);

  // Fetch entitlement status to decide QR visibility for Starter
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/entitlements', { cache: 'no-store' });
        if (r.ok) {
          const j = await r.json();
          setIsPro(Boolean(j?.pro));
        }
      } catch {}
    })();
  }, []);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  function getResendQuotaOk(): boolean {
    try {
      const now = Date.now();
      const start = Number(localStorage.getItem('verifyCountStart') || '0');
      const count = Number(localStorage.getItem('verifyCount') || '0');
      const windowMs = 60 * 60 * 1000; // 1h
      if (!start || now - start > windowMs) return true;
      return count < 3;
    } catch { return true; }
  }

  function recordResend() {
    try {
      const now = Date.now();
      const start = Number(localStorage.getItem('verifyCountStart') || '0');
      const windowMs = 60 * 60 * 1000; // 1h
      if (!start || now - start > windowMs) {
        localStorage.setItem('verifyCountStart', String(now));
        localStorage.setItem('verifyCount', '1');
      } else {
        const count = Number(localStorage.getItem('verifyCount') || '0') + 1;
        localStorage.setItem('verifyCount', String(count));
      }
    } catch {}
  }

  async function resendVerify() {
    if (resendCooldown > 0) return;
    if (!getResendQuotaOk()) { setToast('Too many verification emails sent. Try again later.'); setTimeout(()=>setToast(''),3000); return; }
    try {
      const targetEmail = (typeof window !== 'undefined' ? localStorage.getItem('userEmail') : '') || '';
      if (!targetEmail) throw new Error('Sign in to resend verification');
      await fetch('/api/auth/email', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ email: targetEmail, type: 'verify' }) });
      setToast('Verification email sent.');
      setResendCooldown(30);
      recordResend();
    } catch (e) {
      setToast(e instanceof Error ? e.message : 'Failed to send verification email');
    } finally {
      setTimeout(() => setToast(''), 3000);
    }
  }

  async function select(placeId: string) {
    setLoading(true);
    setError(null);
    try {
      const url = `/api/places/details?placeId=${encodeURIComponent(placeId)}&sessionToken=${encodeURIComponent(sessionToken)}`;
      const res = await fetch(url);
      const data = await res.json();
      setSelected(data);
      setSessionToken(newSessionToken());
      setSuggestions([]);
      setActiveIndex(-1);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch place details');
    } finally {
      setLoading(false);
    }
  }

  async function saveBusiness() {
    if (!selected) return;
    setSaving(true);
    setError(null);
    try {
      // Authorization header with Firebase ID token as required by API
      let idToken = '';
      try { idToken = (typeof window !== 'undefined' ? localStorage.getItem('idToken') : '') || ''; } catch {}
      const r = await fetch('/api/businesses/upsert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}) },
        body: JSON.stringify({
          name: selected.displayName,
          google_place_id: selected.id,
          google_maps_place_uri: selected.googleMapsUri,
          google_maps_write_review_uri: selected.writeAReviewUri,
          review_link: selected.writeAReviewUri,
          google_rating: selected.rating ?? null,
          address: selected.formattedAddress ?? null,
        }),
      });
      if (!r.ok) throw new Error(await r.text());
      setSaved(true);
      setToast('Saved — opening your dashboard…');
      try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch {}
      setTimeout(() => { window.location.href = '/dashboard'; }, 900);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  const reviewUrl = selected?.writeAReviewUri as string | undefined;
  const qrPng = useMemo(() => (reviewUrl ? `/api/qr?data=${encodeURIComponent(reviewUrl)}&format=png&scale=8` : null), [reviewUrl]);
  const qrSvg = useMemo(() => (reviewUrl ? `/api/qr?data=${encodeURIComponent(reviewUrl)}&format=svg&scale=8` : null), [reviewUrl]);

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 py-10">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Connect your business</h1>
            <p className="text-gray-600">Follow the steps below to get your Google review link and QR code.</p>
          </div>
          {verified === true && (
            <span className="inline-flex items-center gap-2 rounded-full bg-green-50 text-green-700 border border-green-200 px-3 py-1 text-sm">
              <svg aria-hidden className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 100 20 10 10 0 000-20Zm-1 14l-4-4 1.41-1.41L11 12.17l4.59-4.58L17 9l-6 7Z"/></svg>
              Email verified
            </span>
          )}
          {verified === false && (
            <button onClick={resendVerify} className="inline-flex items-center gap-2 rounded-full bg-yellow-50 text-yellow-800 border border-yellow-200 px-3 py-1 text-sm" disabled={resendCooldown>0}>
              <svg aria-hidden className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 100 20 10 10 0 000-20Zm-1 5h2v6h-2V7Zm0 8h2v2h-2v-2Z"/></svg>
              {resendCooldown>0 ? `Resend in ${resendCooldown}s` : 'Resend verify' }
            </button>
          )}
        </div>

        {toast && <div className="rounded-xl border border-blue-200 bg-blue-50 text-blue-800 p-3">{toast}</div>}

        <div className="relative">
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            className="w-full rounded-xl border border-gray-200 px-4 py-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Step 1 — Search your business by name"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            ref={searchRef}
            onKeyDown={(e) => {
              if (!suggestions.length) return;
              if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex((i)=> (i+1) % suggestions.length); }
              else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIndex((i)=> (i-1+suggestions.length) % suggestions.length); }
              else if (e.key === 'Enter') { e.preventDefault(); const sel = suggestions[activeIndex] || suggestions[0]; if (sel) void select(sel.placeId); }
              else if (e.key === 'Escape') { setSuggestions([]); setActiveIndex(-1); }
            }}
          />
          <select
            aria-label="Search region"
            className="sm:w-64 rounded-xl border border-gray-200 px-3 py-3 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={region}
            onChange={(e)=>setRegion(e.target.value)}
            title="Bias search to a country"
          >
            <option value="auto">All countries</option>
            <option value="US">United States</option>
            <option value="CA">Canada</option>
            <option value="MX">Mexico</option>
            <option value="AR">Argentina</option>
            <option value="BR">Brazil</option>
            <option value="CL">Chile</option>
            <option value="PE">Peru</option>
            <option value="CO">Colombia</option>
            <option value="GB">United Kingdom</option>
            <option value="IE">Ireland</option>
            <option value="ES">Spain</option>
            <option value="PT">Portugal</option>
            <option value="FR">France</option>
            <option value="DE">Germany</option>
            <option value="IT">Italy</option>
            <option value="NL">Netherlands</option>
            <option value="SE">Sweden</option>
            <option value="DK">Denmark</option>
            <option value="NO">Norway</option>
            <option value="FI">Finland</option>
            <option value="CH">Switzerland</option>
            <option value="AT">Austria</option>
            <option value="BE">Belgium</option>
            <option value="PL">Poland</option>
            <option value="CZ">Czech Republic</option>
            <option value="AU">Australia</option>
            <option value="NZ">New Zealand</option>
            <option value="JP">Japan</option>
            <option value="KR">South Korea</option>
            <option value="SG">Singapore</option>
            <option value="HK">Hong Kong</option>
            <option value="MY">Malaysia</option>
            <option value="TH">Thailand</option>
            <option value="VN">Vietnam</option>
            <option value="PH">Philippines</option>
            <option value="IN">India</option>
            <option value="AE">United Arab Emirates</option>
            <option value="SA">Saudi Arabia</option>
            <option value="ZA">South Africa</option>
            <option value="NG">Nigeria</option>
            <option value="KE">Kenya</option>
          </select>
          <label className="inline-flex items-center gap-2 text-sm text-gray-700 select-none">
            <input type="checkbox" checked={useLocation} onChange={(e)=>{ setUseLocation(e.target.checked); if (!e.target.checked) setCoords(null); else if (navigator?.geolocation) { try { navigator.geolocation.getCurrentPosition((pos)=>setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude })); } catch {} } }} />
            Use my location
          </label>
        </div>
        {loading && <div className="absolute right-3 top-3 text-sm text-gray-500">Searching…</div>}
        {Boolean(suggestions.length) && (
          <div className="mt-2 rounded-xl border border-gray-200 bg-white shadow-md" role="listbox" aria-label="Business suggestions">
            <ul className="max-h-72 overflow-auto">
              {suggestions.map((s) => (
                <li
                  key={s.placeId}
                  className={`px-4 py-3 cursor-pointer flex items-start justify-between ${activeIndex>=0 && suggestions[activeIndex]?.placeId===s.placeId ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                  onMouseEnter={()=> setActiveIndex(suggestions.findIndex(x=>x.placeId===s.placeId))}
                  onMouseDown={(e)=> e.preventDefault()}
                  onClick={() => select(s.placeId)}
                >
                  <div>
                    <div className="font-medium">{s.mainText}</div>
                    <div className="text-sm text-gray-600">{s.secondaryText}</div>
                  </div>
                  <span className="ml-4 text-xs text-blue-600">Use this</span>
                </li>
              ))}
            </ul>
            <div className="border-t px-3 py-2 text-xs text-gray-500 flex items-center gap-2">
              <span>Powered by Google</span>
            </div>
          </div>
        )}
        </div>

        {selected && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xl font-semibold">{selected.displayName}</div>
              <div className="text-gray-700">{selected.formattedAddress}</div>
              <div className="text-gray-700">
                {selected.rating ? `Rating ${selected.rating} • ` : ''}{selected.userRatingCount ? `${selected.userRatingCount} reviews` : ''}
              </div>
            </div>
            {selected.googleMapsUri && (
              <a className="text-sm text-blue-600 underline" href={selected.googleMapsUri} target="_blank" rel="noreferrer">Open in Google Maps</a>
            )}
          </div>

          {selected && selected.lat && selected.lng && (
            <div className="rounded-xl border border-gray-200 overflow-hidden">
              {!mapFailed ? (
                <img
                  alt="Map preview"
                  className="w-full h-48 object-cover"
                  src={`/api/maps/static?lat=${encodeURIComponent(String(selected.lat))}&lng=${encodeURIComponent(String(selected.lng))}&w=800&h=220&zoom=15`}
                  onError={() => setMapFailed(true)}
                />
              ) : (
                <iframe
                  title="Map preview"
                  className="w-full h-48"
                  src={`https://www.google.com/maps?q=${encodeURIComponent(String(selected.lat))},${encodeURIComponent(String(selected.lng))}&z=15&output=embed`}
                />
              )}
            </div>
          )}

          {reviewUrl && (isPro || saved) && (
            <div className="space-y-3">
              <label className="text-sm font-medium text-gray-800">Step 2 — Your Google review link</label>
              <div className="flex gap-2">
                <input className="w-full rounded-xl border border-gray-200 px-3 py-2 focus:outline-none" readOnly value={reviewUrl} />
                <button
                  className="rounded-xl px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium hover:from-blue-700 hover:to-purple-700 transition"
                  onClick={async () => { await navigator.clipboard.writeText(reviewUrl as string); setToast('Copied review link'); setTimeout(()=>setToast(''),2000); }}
                >
                  Copy
                </button>
                <a aria-label="Open review link" className="rounded-xl px-4 py-2 border border-gray-200 hover:bg-gray-50 transition" target="_blank" href={reviewUrl} rel="noreferrer">
                  Open
                </a>
              </div>

              <div>
                <div className="text-sm font-medium text-gray-800 mb-2">Step 3 — QR code (share or print)</div>
                <div className="flex items-center gap-4">
                  {qrPng && <Image src={qrPng} alt="QR code" width={140} height={140} className="h-36 w-36 border rounded" unoptimized />}
                  <div className="flex flex-col gap-2">
                    {qrPng && <a className="underline text-blue-600" href={qrPng} download>Download QR (PNG)</a>}
                    {qrSvg && <a className="underline text-blue-600" href={qrSvg} download>Download QR (SVG)</a>}
                    <div className="text-xs text-gray-500">Tip: print it or add it to receipts to get more reviews.</div>
                  </div>
                </div>
              </div>
            </div>
          )}
          {!isPro && !saved && (
            <div className="text-xs text-gray-500">QR will appear after you save (Pro sees it immediately).</div>
          )}

          <div className="flex items-center justify-between pt-1">
            <button className="text-gray-700 underline" onClick={()=>{ setSelected(null); setActiveIndex(-1); setMapFailed(false); setSessionToken(newSessionToken()); setTimeout(()=>searchRef.current?.focus(), 0); }}>Back to search</button>
            <button
              disabled={saving}
              className="rounded-xl px-5 py-3 bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-50 transition"
              onClick={saveBusiness}
            >
              {saving ? 'Saving…' : 'Save and continue'}
            </button>
          </div>
        </div>
      )}

        {error && <div className="text-red-600 text-sm">{error}</div>}
        {!selected && (
          <div className="text-xs text-gray-500">Don’t see your business? <a className="underline" href="https://www.google.com/business/" target="_blank" rel="noreferrer">Add it on Google</a>.</div>
        )}
      </div>
    </main>
  );
}
