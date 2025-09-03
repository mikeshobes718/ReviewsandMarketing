export default function TermsPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 mesh-bg">
      <section className="relative overflow-hidden pt-20 pb-10">
        <div className="pointer-events-none absolute inset-0 -z-10 [mask-image:radial-gradient(60%_50%_at_50%_0%,black,transparent)] bg-gradient-to-b from-blue-100/60 via-transparent to-transparent" />
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">Terms of Service</h1>
          <p className="text-gray-600 mb-8">Last updated: {new Date().toLocaleDateString()}</p>
          <div className="prose prose-slate max-w-none bg-white rounded-2xl p-8 shadow-sm border border-gray-100 gradient-border">
            <h2>1. Agreement</h2>
            <p>By using Reviews & Marketing, you agree to these terms.</p>
            <h2>2. Accounts</h2>
            <p>You are responsible for your account and activity.</p>
            <h2>3. Payments</h2>
            <p>Subscriptions are billed through Stripe; you can cancel anytime.</p>
          </div>
        </div>
      </section>
    </main>
  );
}


