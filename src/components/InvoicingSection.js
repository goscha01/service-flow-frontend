export default function InvoicingSection() {
  return (
    <section className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left Column - Content */}
          <div className="space-y-8">
            <div className="space-y-6">
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900">Easy invoicing for faster payments.</h2>
              <p className="text-lg text-gray-600 leading-relaxed">
                Send professional invoices that customers can review and pay online after the job is complete.
              </p>
            </div>

            <div>
              <a
                href="/invoicing"
                className="inline-flex items-center text-blue-600 font-semibold hover:text-blue-700 transition-colors"
              >
                Explore Invoicing
                <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </a>
            </div>
          </div>

          {/* Right Column - Invoice Preview */}
          <div className="relative">
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
              <img
                src="/images/send-invoice-payment-links-hero.avif"
                alt="Invoice payment interface"
                className="w-full h-auto"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
