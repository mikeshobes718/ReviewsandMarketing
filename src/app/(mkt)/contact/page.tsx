"use client";
import { useEffect, useState } from "react";

export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const [valid, setValid] = useState({ name: true, email: true, message: true });
  useEffect(() => {
    const emailOk = /[^\s@]+@[^\s@]+\.[^\s@]+/.test(email);
    setValid({ name: name.trim().length >= 2, email: emailOk, message: message.trim().length >= 10 });
  }, [name, email, message]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid.name || !valid.email || !valid.message) { setStatus("error"); setError("Please complete all fields"); return; }
    setStatus("sending");
    setError(null);
    try {
      let recaptchaToken: string | undefined;
      try {
        const siteKey = (process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || '').trim();
        const w = window as unknown as { grecaptcha?: { execute: (key: string, opts: { action: string }) => Promise<string> } };
        if (siteKey && w.grecaptcha) {
          recaptchaToken = await w.grecaptcha.execute(siteKey, { action: 'contact' });
        }
      } catch {}
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, message, recaptchaToken }),
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
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-4">Let’s talk</h1>
          <p className="text-gray-600 text-lg">We usually respond within one business day.</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8 items-start">
          <div className="lg:col-span-2 rounded-2xl border border-gray-200 bg-white/90 backdrop-blur-sm p-8 shadow-sm gradient-border">
            <form onSubmit={submit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input aria-label="Name" className={`w-full rounded-xl border px-3 py-2 focus:outline-none focus:ring-2 ${valid.name? 'border-gray-200 focus:ring-blue-500':'border-red-300 focus:ring-red-500'}`} value={name} onChange={(e) => setName(e.target.value)} required minLength={2} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input aria-label="Email" type="email" className={`w-full rounded-xl border px-3 py-2 focus:outline-none focus:ring-2 ${valid.email? 'border-gray-200 focus:ring-blue-500':'border-red-300 focus:ring-red-500'}`} value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                <textarea aria-label="Message" className={`w-full rounded-xl border px-3 py-2 h-40 focus:outline-none focus:ring-2 ${valid.message? 'border-gray-200 focus:ring-blue-500':'border-red-300 focus:ring-red-500'}`} value={message} onChange={(e) => setMessage(e.target.value)} required minLength={10} />
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
            <div className="rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 text-white p-4 text-sm shadow hover:shadow-md transition">
              <div className="font-medium">Need a demo?</div>
              <p className="text-blue-50">Book a 15‑minute walkthrough tailored to your business.</p>
              <a href="mailto:sales@reviewsandmarketing.com?subject=Demo%20request" className="underline mt-1 inline-block">Request a demo</a>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
