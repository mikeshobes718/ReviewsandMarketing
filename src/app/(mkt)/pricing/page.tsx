"use client";

import { useState } from "react";
import Link from "next/link";

export default function Pricing() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [annual, setAnnual] = useState(true);

  async function handleSubscribe() {
    try {
      setError(null);
      setLoading(true);
      // In a real flow you'll have an authenticated user with UID/email
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid: "anon", email: "customer@example.com" }),
      });
      if (!res.ok) throw new Error(await res.text());
      const j = await res.json();
      if (j?.url) window.location.href = j.url;
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Checkout failed";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  const starterPrice = annual ? 24 : 29;
  const proPrice = annual ? 63 : 79;
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 mesh-bg">
      {/* Pricing Header */}
      <section className="relative overflow-hidden pt-20 pb-10">
        <div className="pointer-events-none absolute inset-0 -z-10 [mask-image:radial-gradient(60%_50%_at_50%_0%,black,transparent)] bg-gradient-to-b from-blue-100/60 via-transparent to-transparent" />
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <span className="inline-flex items-center px-4 py-2 rounded-full bg-white/70 text-blue-800 text-sm font-medium mb-6 shadow ring-1 ring-blue-200">14‑day free trial</span>
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-4">
            Simple, transparent pricing
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Everything you need to collect more reviews and grow reputation.
          </p>
          <div className="mt-8 inline-flex items-center gap-3 bg-white/80 border border-gray-200 rounded-full p-1 shadow-sm">
            <button
              className={`${annual ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white" : "text-gray-700"} px-4 py-2 rounded-full text-sm font-medium transition`}
              onClick={() => setAnnual(true)}
              aria-pressed={annual}
            >
              Annual
            </button>
            <button
              className={`${!annual ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white" : "text-gray-700"} px-4 py-2 rounded-full text-sm font-medium transition`}
              onClick={() => setAnnual(false)}
              aria-pressed={!annual}
            >
              Monthly
            </button>
            <span className="hidden sm:inline text-xs px-2 py-1 rounded-full bg-green-100 text-green-700 ml-1">Save 20% annually</span>
          </div>
        </div>
      </section>

      {/* Guarantee strip */}
      <section className="pb-6">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl bg-white/80 backdrop-blur-sm border border-gray-100 shadow-sm p-4 md:p-5 flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="text-gray-800 font-medium">30‑day money‑back guarantee</div>
            <div className="text-gray-500 text-sm">No setup fees • Cancel anytime</div>
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="pb-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Starter Plan */}
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-200 hover:shadow-xl transition-all duration-300 gradient-border">
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Starter</h3>
                <p className="text-gray-600 mb-6">Perfect for small businesses getting started</p>
                <div className="mb-6">
                  <span className="text-5xl font-bold text-gray-900">${starterPrice}</span>
                  <span className="text-xl text-gray-600">/mo</span>
                </div>
                <p className="text-sm text-gray-500">{annual ? "Billed annually" : "Billed monthly"} • Cancel anytime</p>
              </div>
              
              <ul className="space-y-4 mb-8">
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-700">Unlimited Google review links</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-700">Unlimited QR code generation</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-700">Email request templates</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-700">Basic analytics dashboard</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-700">Email support</span>
                </li>
              </ul>
              
              <button 
                onClick={handleSubscribe} 
                disabled={loading} 
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold py-3 px-6 rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200 transform hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </div>
                ) : (
                  "Start Free Trial"
                )}
              </button>
              
              {error && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              )}
            </div>

            {/* Pro Plan - Featured */}
            <div className="relative bg-white rounded-2xl p-8 shadow-xl border-2 border-blue-500 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 gradient-border">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <span className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-full text-sm font-semibold">
                  Most Popular
                </span>
              </div>
              
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Pro</h3>
                <p className="text-gray-600 mb-6">For growing businesses that need more power</p>
                <div className="mb-6">
                  <span className="text-5xl font-bold text-gray-900">${proPrice}</span>
                  <span className="text-xl text-gray-600">/mo</span>
                </div>
                <p className="text-sm text-gray-500">{annual ? "Billed annually" : "Billed monthly"} • Cancel anytime</p>
              </div>
              
              <ul className="space-y-4 mb-8">
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-700">Everything in Starter</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-700">Custom domains & branding</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-700">Advanced analytics & reporting</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-700">Priority support</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-700">API access</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-700">Team collaboration</span>
                </li>
            </ul>
              
              <button 
                onClick={handleSubscribe} 
                disabled={loading}
                className="w-full bg-gray-900 text-white font-semibold py-3 px-6 rounded-xl hover:bg-gray-800 transition-all duration-200 transform hover:scale-105 shadow-lg disabled:opacity-50"
              >
                {loading ? "Processing..." : "Start Free Trial"}
            </button>
            </div>

            {/* Enterprise Plan */}
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-200 hover:shadow-lg transition-all duration-300 gradient-border">
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Enterprise</h3>
                <p className="text-gray-600 mb-6">For large teams and complex needs</p>
                <div className="mb-6">
                  <span className="text-5xl font-bold text-gray-900">Custom</span>
                </div>
                <p className="text-sm text-gray-500">Tailored solutions for your business</p>
          </div>

              <ul className="space-y-4 mb-8">
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-700">Everything in Pro</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-700">Custom integrations</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-700">Dedicated account manager</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-700">SLA guarantees</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-700">On-premise options</span>
                </li>
            </ul>
              
              <button 
                onClick={() => alert("Contact sales for Enterprise plan")} 
                className="w-full border-2 border-gray-300 text-gray-700 font-semibold py-3 px-6 rounded-xl hover:border-gray-400 hover:bg-gray-50 transition-all duration-200"
              >
                Contact Sales
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Comparison Strip */}
      <section className="py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl bg-white/80 backdrop-blur-sm border border-gray-100 shadow-sm p-6 md:p-8">
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="font-semibold text-gray-900">Feature</div>
              <div className="font-semibold text-gray-900 text-center">Starter</div>
              <div className="font-semibold text-gray-900 text-center">Pro</div>
              <div className="py-2 text-gray-700">Unlimited review links</div>
              <div className="py-2 text-center">✓</div>
              <div className="py-2 text-center">✓</div>
              <div className="py-2 text-gray-700">QR code generation</div>
              <div className="py-2 text-center">✓</div>
              <div className="py-2 text-center">✓</div>
              <div className="py-2 text-gray-700">Custom branding</div>
              <div className="py-2 text-center">–</div>
              <div className="py-2 text-center">✓</div>
              <div className="py-2 text-gray-700">Advanced analytics</div>
              <div className="py-2 text-center">–</div>
              <div className="py-2 text-center">✓</div>
              <div className="py-2 text-gray-700">Priority support</div>
              <div className="py-2 text-center">–</div>
              <div className="py-2 text-center">✓</div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
              Frequently Asked Questions
            </h2>
            <p className="text-xl text-gray-600">
              Everything you need to know about our pricing and plans
            </p>
          </div>

          <div className="space-y-8">
            <div className="bg-white rounded-2xl p-8 shadow-sm">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                Can I cancel my subscription anytime?
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Yes, you can cancel your subscription at any time. There are no long-term contracts or cancellation fees. 
                You&apos;ll continue to have access to your plan until the end of your current billing period.
              </p>
            </div>
            
            <div className="bg-white rounded-2xl p-8 shadow-sm">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                Is there a free trial?
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Yes! We offer a 14-day free trial on all plans. No credit card required to start. 
                You can explore all features and decide if Reviews & Marketing is right for your business.
              </p>
            </div>
            
            <div className="bg-white rounded-2xl p-8 shadow-sm">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                What payment methods do you accept?
              </h3>
              <p className="text-gray-600 leading-relaxed">
                We accept all major credit cards (Visa, Mastercard, American Express) and PayPal. 
                All payments are processed securely through Stripe.
              </p>
        </div>

            <div className="bg-white rounded-2xl p-8 shadow-sm">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                Do you offer discounts for annual billing?
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Yes! We offer a 20% discount when you choose annual billing. This saves you money and 
                gives you peace of mind with a longer commitment.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Ready to start collecting more reviews?
          </h2>
          <p className="text-xl text-blue-100 mb-10 leading-relaxed">
            Join hundreds of businesses already growing their reputation. 
            Start your free trial today.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button 
              onClick={handleSubscribe}
              disabled={loading}
              className="inline-flex items-center justify-center px-8 py-4 bg-white text-blue-600 font-semibold rounded-xl hover:bg-gray-100 transition-all duration-200 transform hover:scale-105 shadow-lg disabled:opacity-50"
            >
              {loading ? "Processing..." : "Start Free Trial"}
            </button>
            <Link 
              href="/dashboard" 
              className="inline-flex items-center justify-center px-8 py-4 border-2 border-white/30 text-white font-semibold rounded-xl hover:bg-white/10 transition-all duration-200"
            >
              View Dashboard
            </Link>
          </div>
          <p className="text-blue-200 text-sm mt-6">No credit card required • 14-day free trial</p>
      </div>
      </section>
    </main>
  );
}
