export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 mesh-bg">
      <section className="relative overflow-hidden pt-20 pb-10">
        <div className="pointer-events-none absolute inset-0 -z-10 [mask-image:radial-gradient(60%_50%_at_50%_0%,black,transparent)] bg-gradient-to-b from-blue-100/60 via-transparent to-transparent" />
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">Privacy Policy</h1>
          <p className="text-gray-600 mb-8">Last updated: {new Date().toLocaleDateString()}</p>
          <div className="prose prose-slate max-w-none bg-white rounded-2xl p-8 shadow-sm border border-gray-100 gradient-border">
            <p>We respect your privacy and are committed to protecting it. This policy explains what data we collect, how we use it, and your choices.</p>
            <h2>Data We Collect</h2>
            <ul>
              <li>Account and contact information</li>
              <li>Usage and analytics data</li>
              <li>Payment information processed by Stripe</li>
            </ul>
            <h2>How We Use Data</h2>
            <ul>
              <li>Provide and improve the service</li>
              <li>Communicate product updates</li>
              <li>Detect, prevent, and address abuse</li>
            </ul>
            <h2>Your Choices</h2>
            <p>Contact us to access, correct, or delete your data where applicable.</p>
          </div>
        </div>
      </section>
    </main>
  );
}


