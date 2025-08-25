export default function ServiceTerritoriesSection() {
  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left Column - Content */}
          <div className="bg-blue-100 rounded-3xl p-8 lg:p-12">
            <div className="space-y-6">
              <div>
                <span className="text-xs font-bold text-blue-600 uppercase tracking-wide">Service Territories</span>
                <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mt-2">Control where and when you work.</h2>
              </div>

              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Define your service areas</h3>
                  <p className="text-gray-600">
                    Define the geographic regions your business serves. And block scheduling for addresses outside your
                    service areas.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Customize availability by location</h3>
                  <p className="text-gray-600">Set different hours and assign specific providers to each area.</p>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Geographic pricing rules</h3>
                  <p className="text-gray-600">
                    Automatically adjust prices based on where the customer needs the service.
                  </p>
                </div>
              </div>

              <div>
                <a
                  href="/service-territories"
                  className="inline-flex items-center bg-white/70 text-blue-600 font-semibold px-4 py-2 rounded-full hover:bg-white transition-colors"
                >
                  Explore Service Territories
                  <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </a>
              </div>
            </div>
          </div>

          {/* Right Column - Map Visual */}
          <div className="relative">
            <img
              src="/images/map.png"
              alt="Service territory map"
              className="w-full h-auto rounded-2xl shadow-lg"
            />
          </div>
        </div>
      </div>
    </section>
  )
}
