export default function SupportPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 mesh-bg">
      <section className="relative overflow-hidden pt-20 pb-10">
        <div className="pointer-events-none absolute inset-0 -z-10 [mask-image:radial-gradient(60%_50%_at_50%_0%,black,transparent)] bg-gradient-to-b from-blue-100/60 via-transparent to-transparent" />
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">Support</h1>
          <p className="text-lg text-gray-600">We’re here to help you succeed with reviews.</p>
        </div>
      </section>

      <section className="pb-24">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 gradient-border">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Contact Us</h2>
            <p className="text-gray-600">Email: <a className="text-blue-600 hover:underline" href="mailto:support@reviewsandmarketing.com">support@reviewsandmarketing.com</a></p>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 gradient-border">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">FAQs</h2>
            <div className="divide-y divide-gray-100">
              {[{
                q: "Can’t find your Google Place ID?",
                a: "Use our built-in Places search in Dashboard → Settings to locate and save it.",
              },{
                q: "QR won’t scan on older devices?",
                a: "Increase contrast and size in the QR generator, and print at 300 DPI.",
              },{
                q: "Stripe checkout not redirecting?",
                a: "Ensure your callback URL is set in Dashboard → Billing, then retry.",
              }].map((f, i) => (
                <details key={i} className="py-3 group">
                  <summary className="flex items-center justify-between cursor-pointer list-none">
                    <span className="font-medium text-gray-900">{f.q}</span>
                    <span className="text-gray-400 group-open:rotate-45 transition">+</span>
                  </summary>
                  <p className="mt-2 text-gray-600">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}


