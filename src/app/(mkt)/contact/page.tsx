"use client";
import { useState } from "react";

export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setError(null);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, message }),
      });
      if (!res.ok) throw new Error(await res.text());
      setStatus("sent");
      setName("");
      setEmail("");
      setMessage("");
    } catch (e: unknown) {
      setStatus("error");
      setError(e instanceof Error ? e.message : "Failed to send message");
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 mesh-bg py-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-4">Contact Us</h1>
          <p className="text-gray-600 text-lg">We usually respond within one business day.</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8 items-start">
          <div className="lg:col-span-2 rounded-2xl border border-gray-200 bg-white p-8 shadow-sm gradient-border">
            <form onSubmit={submit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input className="w-full rounded-xl border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input type="email" className="w-full rounded-xl border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                <textarea className="w-full rounded-xl border border-gray-200 px-3 py-2 h-40 focus:outline-none focus:ring-2 focus:ring-blue-500" value={message} onChange={(e) => setMessage(e.target.value)} required />
              </div>
              <button disabled={status === "sending"} className="neon-button rounded-xl px-6 py-3 font-medium disabled:opacity-50 transition">
                {status === "sending" ? "Sending…" : "Send message"}
              </button>
              {status === "sent" && <div className="text-green-700 text-sm">Thanks! We received your message.</div>}
              {status === "error" && <div className="text-red-700 text-sm">{error}</div>}
            </form>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm space-y-4 glow-card">
            <h2 className="text-lg font-semibold text-gray-900">Get in touch</h2>
            <p className="text-gray-600">Prefer email? Reach us at {" "}
              <a href="mailto:support@reviewsandmarketing.com" className="block font-medium text-blue-600 hover:underline break-all whitespace-normal">support@reviewsandmarketing.com</a>
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-gray-600">
              <div>
                <div className="font-medium text-gray-900">Sales</div>
                <a href="mailto:sales@reviewsandmarketing.com" className="block break-all whitespace-normal hover:underline text-blue-600">sales@reviewsandmarketing.com</a>
              </div>
              <div>
                <div className="font-medium text-gray-900">Support</div>
                <a href="mailto:support@reviewsandmarketing.com" className="block break-all whitespace-normal hover:underline text-blue-600">support@reviewsandmarketing.com</a>
              </div>
            </div>
            <div className="pt-2 text-xs text-gray-500">Mon–Fri, 9am–6pm ET</div>
          </div>
        </div>
      </div>
    </main>
  );
}


