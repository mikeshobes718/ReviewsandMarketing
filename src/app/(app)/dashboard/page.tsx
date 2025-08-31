"use client";

import { useEffect, useMemo, useState } from "react";

type Business = {
  name: string;
  google_maps_write_review_uri?: string | null;
  google_maps_place_uri?: string | null;
  review_link?: string | null;
  google_rating?: number | null;
};

export default function Dashboard() {
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("idToken") : null;
    if (!token) return;
    setLoading(true);
    fetch("/api/businesses/me", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (r) => {
        if (!r.ok) throw new Error(await r.text());
        return r.json();
      })
      .then((j) => setBusiness(j.business ?? null))
      .catch((e) => setError(e?.message ?? "Failed to load business"))
      .finally(() => setLoading(false));
  }, []);

  const reviewUrl = useMemo(() => {
    return business?.google_maps_write_review_uri || business?.review_link || undefined;
  }, [business]);

  const qrPng = useMemo(
    () => (reviewUrl ? `/api/qr?data=${encodeURIComponent(reviewUrl)}&format=png&scale=8` : null),
    [reviewUrl]
  );

  return (
    <main className="p-8 space-y-4">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      {loading && <div className="text-gray-600">Loading…</div>}
      {error && <div className="text-red-600 text-sm">{error}</div>}

      {!loading && !business && (
        <div className="space-y-2">
          <div className="text-gray-700">No business connected.</div>
          <a className="underline text-blue-600" href="/onboarding/business">
            Connect your business
          </a>
        </div>
      )}

      {business && (
        <div className="border rounded-md p-4 space-y-3">
          <div className="text-lg font-semibold">{business.name}</div>
          {typeof business.google_rating === "number" && (
            <div className="text-gray-700">Rating {business.google_rating}</div>
          )}

          {reviewUrl && (
            <div className="space-y-2">
              <div className="flex gap-2">
                <input className="w-full border rounded px-2 py-1" readOnly value={reviewUrl} />
                <button
                  className="px-3 py-1 rounded bg-blue-600 text-white"
                  onClick={() => navigator.clipboard.writeText(reviewUrl)}
                >
                  Copy link
                </button>
                <a className="px-3 py-1 rounded border" target="_blank" href={reviewUrl} rel="noreferrer">
                  Test link
                </a>
              </div>
              {qrPng && (
                <div className="flex items-center gap-4">
                  <img src={qrPng} alt="QR code" className="h-32 w-32 border rounded" />
                  <a className="underline text-blue-600" href={qrPng} download>
                    Download QR (PNG)
                  </a>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </main>
  );
}
