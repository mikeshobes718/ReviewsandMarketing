"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import SharePerformanceChart from "./SharePerformanceChart";
import Image from 'next/image';

type Business = {
  name: string;
  google_maps_write_review_uri?: string | null;
  google_maps_place_uri?: string | null;
  review_link?: string | null;
  google_rating?: number | null;
};

function RatingStars({ value = 0 }: { value?: number | null }) {
  const v = Math.max(0, Math.min(5, Number(value ?? 0)));
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg aria-hidden
          key={i}
          className={`w-4 h-4 ${i < Math.round(v) ? "text-yellow-400" : "text-gray-300"}`}
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<{ revenueUSD: number; newBusinesses: number; totalClicks: number } | null>(null);
  const [subs, setSubs] = useState<{ active: number; mrrUSD: number } | null>(null);

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
  useEffect(() => {
    fetch('/api/analytics/summary', { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((j) => setSummary({ revenueUSD: j.revenueUSD || 0, newBusinesses: j.newBusinesses || 0, totalClicks: j.totalClicks || 0 }))
      .catch(() => setSummary({ revenueUSD: 0, newBusinesses: 0, totalClicks: 0 }));
  }, []);

  useEffect(() => {
    fetch('/api/analytics/subscribers', { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((j) => setSubs({ active: j.active || 0, mrrUSD: j.mrrUSD || 0 }))
      .catch(() => setSubs({ active: 0, mrrUSD: 0 }));
  }, []);

  const reviewUrl = useMemo(() => {
    return business?.google_maps_write_review_uri || business?.review_link || undefined;
  }, [business]);

  const qrPng = useMemo(
    () => (reviewUrl ? `/api/qr?data=${encodeURIComponent(reviewUrl)}&format=png&scale=8` : null),
    [reviewUrl]
  );
  const [limit, setLimit] = useState<{pro:boolean;used:number;limit:number|null}|null>(null);
  useEffect(()=>{ fetch('/api/limits/reviews').then(r=>r.ok?r.json():Promise.reject()).then(setLimit).catch(()=>setLimit(null)); },[]);

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600 mt-1">Manage your review links, QR codes, and track performance.</p>
            {limit && !limit.pro && (
              <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-yellow-50 text-yellow-800 px-3 py-1 text-sm border border-yellow-200">
                <span>{`${limit.used}/${limit.limit} review requests used this month`}</span>
              </div>
            )}
          </div>
          {!business && (
            <Link
              href="/onboarding/business"
              className="inline-flex items-center gap-2 rounded-xl px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium shadow hover:from-blue-700 hover:to-purple-700 transition"
            >
              Connect business
              <svg aria-hidden className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 12h14M12 5l7 7-7 7"/></svg>
            </Link>
          )}
        </div>

        {/* Top stats */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-600">Today’s Revenue</div>
                <div className="text-2xl font-semibold text-gray-900">${summary ? summary.revenueUSD.toFixed(2) : '—'}</div>
              </div>
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white flex items-center justify-center">
              <svg aria-hidden className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3C7.03 3 3 7.03 3 12s4.03 9 9 9 9-4.03 9-9-4.03-9-9-9Zm1 15h-2v-2h2v2Zm2.07-7.75-.9.92C13.45 11.9 13 12.5 13 14h-2v-.5c0-.8.45-1.5 1.17-2.17l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25Z"/></svg>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-600">New Businesses Today</div>
                <div className="text-2xl font-semibold text-gray-900">{summary ? summary.newBusinesses : '—'}</div>
              </div>
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 text-white flex items-center justify-center">
              <svg aria-hidden className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M16 11c1.66 0 2.99-1.34 2.99-3A3 3 0 0016 5a3 3 0 000 6Zm-8 0c1.66 0 2.99-1.34 2.99-3A3 3 0 008 5a3 3 0 000 6Zm0 2c-2.33 0-7 1.17-7 3.5V20h14v-3.5C15 14.17 10.33 13 8 13Zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V20h6v-3.5c0-2.33-4.67-3.5-7-3.5Z"/></svg>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-600">Clicks Today</div>
                <div className="text-2xl font-semibold text-gray-900">{summary ? summary.totalClicks : '—'}</div>
              </div>
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white flex items-center justify-center">
              <svg aria-hidden className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4Zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4Z"/></svg>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-600">Pro Subscription</div>
                <div className="text-2xl font-semibold text-gray-900">$49.99/mo</div>
              </div>
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-fuchsia-500 to-rose-500 text-white flex items-center justify-center">
              <svg aria-hidden className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M3 13h2v-2H3v2Zm4 0h14v-2H7v2Zm-4 6h2v-2H3v2Zm4 0h14v-2H7v2ZM3 7h2V5H3v2Zm4 0h14V5H7v2Z"/></svg>
              </div>
                      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-600">Active Subscribers</div>
                <div className="text-2xl font-semibold text-gray-900">{subs ? subs.active : '—'}</div>
              </div>
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-500 text-white flex items-center justify-center">
              <svg aria-hidden className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M16 11c1.66 0 2.99-1.34 2.99-3A3 3 0 0016 5a3 3 0 000 6Zm-8 0c1.66 0 2.99-1.34 2.99-3A3 3 0 008 5a3 3 0 000 6Zm0 2c-2.33 0-7 1.17-7 3.5V20h14v-3.5C15 14.17 10.33 13 8 13Zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V20h6v-3.5c0-2.33-4.67-3.5-7-3.5Z"/></svg>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-600">MRR</div>
                <div className="text-2xl font-semibold text-gray-900">{subs ? `$${subs.mrrUSD.toFixed(2)}` : '—'}</div>
              </div>
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white flex items-center justify-center">
              <svg aria-hidden className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3C7.03 3 3 7.03 3 12s4.03 9 9 9 9-4.03 9-9-4.03-9-9-9Zm1 15h-2v-2h2v2Zm2.07-7.75-.9.92C13.45 11.9 13 12.5 13 14h-2v-.5c0-.8.45-1.5 1.17-2.17l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25Z"/></svg>
              </div>
            </div>
          </div>
</div>
          </div>
        </div>

        {loading && (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm animate-pulse">
            <div className="h-5 w-48 bg-gray-100 rounded mb-4" />
            <div className="h-3 w-full bg-gray-100 rounded mb-2" />
            <div className="h-3 w-2/3 bg-gray-100 rounded" />
          </div>
        )}

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>
        )}

        {!loading && !business && (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto mb-3 h-12 w-12 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 text-white flex items-center justify-center">
              <svg aria-hidden className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 100 20 10 10 0 000-20Zm1 9h4v2h-4v4h-2v-4H7v-2h4V7h2v4Z"/></svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900">No business connected</h2>
            <p className="text-gray-600 mt-1">Connect your business to generate links and QR codes.</p>
            <div className="mt-5">
              <Link href="/onboarding/business" className="inline-flex items-center gap-2 rounded-xl px-5 py-3 bg-gray-900 text-white hover:bg-gray-800 transition">
                Connect now
                <svg aria-hidden className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 12h14M12 5l7 7-7 7"/></svg>
              </Link>
            </div>
          </div>
        )}

        {business && (
          <div className="grid lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5 space-y-6">
              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-lg font-semibold text-gray-900">{business.name}</div>
                    {typeof business.google_rating === "number" && (
                      <div className="mt-1 flex items-center gap-2 text-gray-700">
                        <RatingStars value={business.google_rating} />
                        <span className="text-sm">{business.google_rating.toFixed(1)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {reviewUrl && (
                <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Review link</div>
                    <div className="flex gap-2">
                      <input className="w-full rounded-xl border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" readOnly value={reviewUrl} />
                      <button
                        className="rounded-xl px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium hover:from-blue-700 hover:to-purple-700 transition"
                        onClick={() => navigator.clipboard.writeText(reviewUrl)}
                      >
                        Copy
                      </button>
                      <a className="rounded-xl px-4 py-2 border border-gray-200 hover:bg-gray-50 transition" target="_blank" href={reviewUrl} rel="noreferrer">
                        Test
                      </a>
                    </div>
                  </div>

                  {qrPng && (
                    <div className="flex items-center gap-5">
                      <Image src={qrPng} alt="QR code" width={128} height={128} className="h-32 w-32 rounded-xl border border-gray-200" unoptimized />
                      <a className="text-blue-600 hover:text-blue-700 underline" href={qrPng} download>
                        Download QR (PNG)
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="lg:col-span-7">
              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">Sales overview</h2>
                </div>
                <SharePerformanceChart />
              </div>

              <div className="mt-6 grid md:grid-cols-2 gap-6">
                <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                  <h3 className="text-base font-semibold text-gray-900 mb-3">Active Users</h3>
                  <div className="h-32 rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200" />
                </div>
                <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                  <h3 className="text-base font-semibold text-gray-900 mb-3">Tips</h3>
                  <p className="text-sm text-gray-600">Share your review link on receipts and thank‑you emails to boost conversions.</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
