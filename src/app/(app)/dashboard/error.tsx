"use client";
export default function DashboardError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-red-50 py-10">
      <div className="max-w-xl mx-auto px-4 text-center space-y-4">
        <h1 className="text-3xl font-bold text-gray-900">Something went wrong</h1>
        <p className="text-gray-700">{error?.message || 'An unexpected error occurred while loading your dashboard.'}</p>
        <button onClick={reset} className="rounded-xl px-4 py-2 bg-gray-900 text-white">Try again</button>
      </div>
    </main>
  );
}

