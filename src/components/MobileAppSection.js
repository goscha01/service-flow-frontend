export default function MobileAppSection() {
  return (
    <section className="py-20 bg-orange-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left Column - Mobile App Image */}
          <div className="relative">
            <img
              src="/images/Serviceflow-mobile-field-app-hero-4.avif"
              alt="Service Flow mobile field app"
              className="w-full max-w-sm mx-auto h-auto"
            />
          </div>

          {/* Right Column - Content */}
          <div className="space-y-8">
            <div className="space-y-6">
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900">Keep your team connected in the field.</h2>
              <p className="text-lg text-gray-600 leading-relaxed">
                Serviceflow's mobile web app offers your service providers the convenience of viewing their daily
                schedules, upcoming jobs, and accessing customer information right from their smartphone or tablet.
                <br />
                <br />
                Android users can install the app directly from their browser, while iOS users can add the app to their
                home screen to enable push notifications.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
