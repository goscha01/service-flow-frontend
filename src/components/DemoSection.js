"use client"

import { useState, useEffect, useRef } from "react"

export default function DemoSection() {
  const [currentCard, setCurrentCard] = useState(0)
  const [isVisible, setIsVisible] = useState(false)
  const sectionRef = useRef(null)

  const cards = [
    {
      id: 1,
      image: "/images/quickfix.png",
      title: "Roofing Service Booking",
    },
    {
      id: 2,
      image: "/images/luxelift.png",
      title: "Auto Detailing Booking",
    },
    {
      id: 3,
      image: "/images/junkzen.png",
      title: "Appliance Repair Booking",
    },
    {
      id: 4,
      image: "/images/junk-remover.png",
      title: "Junk Removal Booking",
    },
  ]

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          startCardRotation()
        }
      },
      { threshold: 0.3 },
    )

    if (sectionRef.current) {
      observer.observe(sectionRef.current)
    }

    return () => observer.disconnect()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const startCardRotation = () => {
    const interval = setInterval(() => {
      setCurrentCard((prev) => (prev + 1) % cards.length)
    }, 3000)

    return () => clearInterval(interval)
  }

  return (
    <section ref={sectionRef} className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left Column - Content */}
          <div className="space-y-8">
            <div className="space-y-6">
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 leading-tight">
                Scheduling software that works the way your service business does.
              </h2>
              <p className="text-xl text-gray-600 leading-relaxed">
                Let customers book instantly, request preferred times, or ask for a custom quote. Serviceflow handles the
                scheduling logic, collects job details, and keeps your calendar accurate—so you can focus on growing
                your business.
              </p>
            </div>

            <div className="space-y-6">
              <div className="flex items-start space-x-4">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Embed or link</h3>
                  <p className="text-gray-600">
                    Embed the widget on any page or share a Serviceflow‑hosted link—same seamless flow for bookings and
                    requests.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Fully on‑brand</h3>
                  <p className="text-gray-600">
                    Tweak colors, pricing, and intake questions so each service's looks and feels 100% yours
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Card Stack Animation */}
          <div className="relative">
            <div className="relative w-full h-96 perspective-1000">
              {cards.map((card, index) => {
                const offset = index - currentCard

                return (
                  <div
                    key={card.id}
                    className={`absolute inset-0 w-full h-80 bg-white rounded-lg shadow-lg transition-all duration-700 ease-out ${
                      isVisible ? "opacity-100" : "opacity-0"
                    }`}
                    style={{
                      transform: `translateY(${offset * 20}px) translateZ(${-offset * 20}px) scale(${1 - Math.abs(offset) * 0.05})`,
                      zIndex: cards.length - Math.abs(offset),
                    }}
                  >
                    <img
                      src={card.image || "/placeholder.svg"}
                      alt={card.title}
                      className="w-full h-full object-cover rounded-lg"
                    />
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Demo CTA Section */}
        <div className="mt-16 bg-gray-50 rounded-2xl p-8">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Experience it yourself</h3>
              <p className="text-gray-600">
                Try scheduling with our demo home service companies to see Serviceflow in action.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="bg-blue-900 rounded-2xl p-6 text-white">
                <div className="mb-4">
                  <img src="/images/maidup-logo-white.svg" alt="MaidUp Logo" className="h-8 w-auto" />
                </div>
                <button className="bg-white text-blue-600 px-6 py-2 rounded-full font-semibold hover:bg-gray-100 transition-colors">
                  Book Now
                </button>
              </div>

              <div className="bg-red-500 rounded-2xl p-6 text-white">
                <div className="mb-4">
                  <img src="/images/plumbing-logo-white.svg" alt="Plumbing Logo" className="h-8 w-auto" />
                </div>
                <button className="bg-white text-blue-600 px-6 py-2 rounded-full font-semibold hover:bg-gray-100 transition-colors">
                  Book Now
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
