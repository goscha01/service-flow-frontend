export default function ContractorSection() {
  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left Column - Content */}
          <div className="space-y-8">
            <div className="space-y-6">
              <span className="text-xs font-bold text-blue-600 uppercase tracking-wide">Self-Managed Availability</span>
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900">
                Online booking that works with independent contractors.
              </h2>
              <p className="text-lg text-gray-600 leading-relaxed">
                With Serviceflow, you can empower your contractors to control their own availability and update their
                schedules as needed. This real-time availability is automatically pushed to your online booking page—so
                customers always see up-to-date openings.
              </p>
            </div>
          </div>

          {/* Right Column - Mobile Demo */}
          <div className="relative">
            <div className="bg-white rounded-3xl shadow-xl overflow-hidden max-w-sm mx-auto">
             <video
  src="/images/ad-hoc-avb-mmobile-demo-vert-2.mp4"
  className="w-full h-full object-cover"
  autoPlay
  muted
  loop
  playsInline
/>

            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
