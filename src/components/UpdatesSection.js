export default function UpdatesSection() {
  const updates = [
    {
      date: "June 19, 2025",
      title: "Accept Tips on Invoice Payments",
      image: "/images/invoice-tipping.webp",
      link: "/change-log/invoice-tips",
    },
    {
      date: "April 23, 2025",
      title: "Fully Customize Your Booking Page's Color Scheme",
      image: "/images/custom-colors-hero2-min.png",
      link: "/change-log/booking-page-color-customization",
    },
  ]

  return (
    <section className="py-20 bg-yellow-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="space-y-12">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900">Recent updates</h2>
            <a
              href="/change-log"
              className="inline-flex items-center bg-white/70 text-blue-600 font-semibold px-4 py-2 rounded-full hover:bg-white transition-colors"
            >
              See changelog
              <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </a>
          </div>

          {/* Updates Grid */}
          <div className="grid md:grid-cols-2 gap-8">
            {updates.map((update, index) => (
              <a
                key={index}
                href={update.link}
                className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow group"
              >
                <div className="aspect-video bg-gray-200">
                  <img
                    src={update.image || "/placeholder.svg"}
                    alt={update.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-6">
                  <div className="text-sm text-gray-500 mb-2">{update.date}</div>
                  <h3 className="text-xl font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                    {update.title}
                  </h3>
                </div>
              </a>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
