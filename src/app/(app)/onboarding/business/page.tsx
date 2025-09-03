'use client';

import { useEffect, useMemo, useState } from 'react';

type Suggestion = { placeId: string; mainText: string; secondaryText: string };

function newSessionToken() {
  return crypto.randomUUID();
}

export default function ConnectBusiness() {
  const [input, setInput] = useState('');
  const [sessionToken, setSessionToken] = useState<string>(() => newSessionToken());
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<{
    id: string;
    displayName?: string;
    formattedAddress?: string;
    rating?: number;
    userRatingCount?: number;
    googleMapsUri?: string;
    writeAReviewUri?: string;
  } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    if (!input.trim()) {
      setSuggestions([]);
      return;
    }
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch('/api/places/autocomplete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ input, sessionToken }),
          signal: ctrl.signal,
        });
        const data = await res.json();
        setSuggestions(data.items || []);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Autocomplete failed');
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => {
      ctrl.abort();
      clearTimeout(t);
    };
  }, [input, sessionToken]);

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
      const r = await fetch('/api/businesses/upsert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      window.location.href = '/dashboard';
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
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Connect your business</h1>
        <p className="text-gray-600">Search your business by name, then confirm the address.</p>

        <div className="relative">
        <input
          className="w-full rounded-xl border border-gray-200 px-4 py-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Start typing your business name…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        {loading && <div className="absolute right-3 top-3 text-sm text-gray-500">Searching…</div>}
        {Boolean(suggestions.length) && (
          <div className="mt-2 rounded-xl border border-gray-200 bg-white shadow-md">
            <ul className="max-h-72 overflow-auto">
              {suggestions.map((s) => (
                <li
                  key={s.placeId}
                  className="px-4 py-3 hover:bg-gray-50 cursor-pointer"
                  onClick={() => select(s.placeId)}
                >
                  <div className="font-medium">{s.mainText}</div>
                  <div className="text-sm text-gray-600">{s.secondaryText}</div>
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
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-3">
          <div className="text-lg font-semibold">{selected.displayName}</div>
          <div className="text-gray-700">{selected.formattedAddress}</div>
          <div className="text-gray-700">
            {selected.rating ? `Rating ${selected.rating} · ` : ''}{selected.userRatingCount ? `${selected.userRatingCount} reviews` : ''}
          </div>

          {reviewUrl && (
            <div className="space-y-2">
              <div className="flex gap-2">
                <input className="w-full rounded-xl border border-gray-200 px-3 py-2 focus:outline-none" readOnly value={reviewUrl} />
                <button
                  className="rounded-xl px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium hover:from-blue-700 hover:to-purple-700 transition"
                  onClick={() => navigator.clipboard.writeText(reviewUrl as string)}
                >
                  Copy
                </button>
                <a className="rounded-xl px-4 py-2 border border-gray-200 hover:bg-gray-50 transition" target="_blank" href={reviewUrl} rel="noreferrer">
                  Test
                </a>
              </div>

              <div className="flex items-center gap-4">
                {qrPng && <img src={qrPng} alt="QR code" className="h-32 w-32 border rounded" />}
                <div className="flex flex-col gap-2">
                  {qrPng && <a className="underline text-blue-600" href={qrPng} download>Download QR (PNG)</a>}
                  {qrSvg && <a className="underline text-blue-600" href={qrSvg} download>Download QR (SVG)</a>}
                </div>
              </div>
            </div>
          )}

          <div className="pt-2">
            <button
              disabled={saving}
              className="rounded-xl px-5 py-3 bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-50 transition"
              onClick={saveBusiness}
            >
              {saving ? 'Saving…' : 'Save business'}
            </button>
          </div>
        </div>
      )}

        {error && <div className="text-red-600 text-sm">{error}</div>}
      </div>
    </main>
  );
}


