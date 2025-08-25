export default function TrustedBySection() {
  const logos = [
    { name: "Renewal by Andersen", src: "/images/Renewal-by-Andersen.svg" },
    { name: "BalconyCleaners", src: "/images/balcony-cleaners.svg" },
    { name: "Casabella", src: "/images/cassabella.svg" },
    { name: "Mr Clean Carpet Care", src: "/images/mr-clean-carpet-logo.svg" },
    { name: "Mike's Hauling Service", src: "/images/mhs.svg" },
    { name: "Spify", src: "/images/spify.jpeg" },
  ]

  return (
    <section className="py-16 bg-gradient-to-b from-orange-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <p className="text-lg font-medium text-gray-600">
            Trusted by home service businesses <span className="text-gray-800">worldwide</span>.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8 items-center">
          {logos.map((logo, index) => (
            <div
              key={index}
              className="bg-white/80 backdrop-blur-sm rounded-xl p-4 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1"
            >
              <img
                src={logo.src || "/placeholder.svg"}
                alt={`${logo.name} Logo`}
                className="w-full h-12 object-contain filter grayscale hover:grayscale-0 transition-all duration-300"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
