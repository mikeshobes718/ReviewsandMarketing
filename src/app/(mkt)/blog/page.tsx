import Link from "next/link";

export default function BlogPage() {
  const posts = [
    { title: "How to ask for reviews the right way", date: "Aug 2025", excerpt: "Scripts and timing that work, for in‑person, email, and QR." },
    { title: "QR codes that actually get scanned", date: "Jul 2025", excerpt: "Design, placement, and offers that drive action." },
    { title: "Turn 3★ experiences into 5★ outcomes", date: "Jun 2025", excerpt: "Service recovery workflows that build trust." },
  ];

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 mesh-bg">
      <header className="relative overflow-hidden pt-20 pb-10">
        <div className="pointer-events-none absolute inset-0 -z-10 [mask-image:radial-gradient(60%_50%_at_50%_0%,black,transparent)] bg-gradient-to-b from-blue-100/60 via-transparent to-transparent" />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-4">Insights & Playbooks</h1>
          <p className="text-lg md:text-xl text-gray-600">Proven tactics for collecting and converting more reviews.</p>
        </div>
      </header>

      <section className="pb-24">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 grid md:grid-cols-3 gap-6">
          {posts.map((p, i) => (
            <article key={i} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-lg transition gradient-border">
              <div className="text-sm text-blue-600 font-medium mb-2">{p.date}</div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">{p.title}</h2>
              <p className="text-gray-600 mb-4">{p.excerpt}</p>
              <Link href="#" className="text-blue-600 hover:text-blue-700 font-medium">Read more →</Link>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}


