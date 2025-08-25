export default function IndustriesSection() {
  const industries = [
    "Alarm Installation",
    "Appliance Repair",
    "Lawn Care",
    "Junk Removal",
    "Carpet Cleaning",
    "Mobile Pet Services",
    "Garage Door Repair",
    "Gutter Installation & Cleaning",
    "Mobile Auto Detailing",
    "Plumbing",
    "TV Mounting",
    "HVAC",
    "Pressure Washing",
    "Window Cleaning",
    "Handyman Services",
    "Residential Cleaning",
    "Pool Services",
    "Dry Cleaning Delivery",
    "Mobile Phone Repair",
    "In-Home Hair & Makeup",
    "Locksmiths",
    "Painting",
    "Pest Control",
    "Party & Event Services",
  ]

  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left Column - Content */}
          <div className="space-y-8">
            <div className="space-y-6">
              <h2 className="text-2xl lg:text-3xl font-bold text-gray-900">Who uses Zenbooker?</h2>
              <p className="text-lg text-gray-600 leading-relaxed">
                From solo operators to national teams, Zenbooker helps service businesses all around the world simplify
                scheduling and grow.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {industries.map((industry, index) => (
                <div key={index} className="flex items-center space-x-3">
                  <svg className="w-5 h-5 text-blue-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="text-gray-700">{industry}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column - Illustration */}
          <div className="relative">
            <img
              src="/images/home-service-industries.svg"
              alt="Various home service industries"
              className="w-full h-auto"
            />
          </div>
        </div>
      </div>
    </section>
  )
}
