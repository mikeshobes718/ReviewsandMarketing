'use client';

import { useEffect, useState } from 'react';
import 'chart.js/auto';
import 'chartjs-adapter-date-fns';
import { Line } from 'react-chartjs-2';

type Data = {
  labels: string[];
  series: Record<string, number[]>;
  totals: Record<string, number>;
};

const CHANNELS = ['qr','whatsapp','sms','email','link'] as const;
const COLORS: Record<string, string> = {
  qr: '#2563EB',
  whatsapp: '#22C55E',
  sms: '#06B6D4',
  email: '#F59E0B',
  link: '#64748B',
};

export default function SharePerformanceChart() {
  const [data, setData] = useState<Data | null>(null);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('idToken') : null;
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
    fetch('/api/analytics/links/timeseries?days=30', { cache: 'no-store', headers })
      .then(r => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then(setData)
      .catch(() => setData(null));
  }, []);

  if (!data) return null;

  const datasets = CHANNELS.map((ch) => ({
    label: ch.toUpperCase(),
    data: data.labels.map((d, i) => ({ x: d, y: data.series[ch]?.[i] || 0 })),
    borderColor: COLORS[ch],
    backgroundColor: COLORS[ch],
    tension: 0.25,
    borderWidth: 2,
    pointRadius: 0,
  }));

  return (
    <div className="border rounded-md p-4 space-y-3">
      <h2 className="text-lg font-semibold">Share performance (last 30 days)</h2>
      <Line
        data={{ datasets }}
        options={{
          maintainAspectRatio: false,
          responsive: true,
          scales: {
            x: { type: 'time', time: { unit: 'day' } },
            y: { beginAtZero: true, ticks: { precision: 0 } },
          },
          plugins: { legend: { position: 'bottom' } },
        }}
        height={260}
      />
    </div>
  );
}


