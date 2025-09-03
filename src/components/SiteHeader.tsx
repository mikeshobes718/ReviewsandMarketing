import Link from "next/link";

export default function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-gray-100/80 bg-white/70 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
            <svg className="w-5 h-5 text-white" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
              <path fillRule="evenodd" clipRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" />
            </svg>
          </div>
          <span className="text-lg font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
            Reviews & Marketing
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          <Link href="/features" className="text-gray-600 hover:text-gray-900 font-medium transition-colors">
            Features
          </Link>
          <Link href="/pricing" className="text-gray-600 hover:text-gray-900 font-medium transition-colors">
            Pricing
          </Link>
          <Link href="/contact" className="text-gray-600 hover:text-gray-900 font-medium transition-colors">
            Contact
          </Link>
          <Link href="/dashboard" className="neon-button inline-flex items-center gap-2 rounded-lg px-3 py-2 font-medium transition">
            Dashboard
          </Link>
        </nav>
      </div>
    </header>
  );
}


