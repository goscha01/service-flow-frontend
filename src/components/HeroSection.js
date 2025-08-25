"use client"

import { useState, useEffect } from "react"

export default function HeroSection() {
  const [email, setEmail] = useState("")
  const [animationStep, setAnimationStep] = useState(0)

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimationStep(1)
    }, 500)
    return () => clearTimeout(timer)
  }, [])

  const handleSubmit = (e) => {
    e.preventDefault()
    // Handle form submission
    console.log("Email submitted:", email)
  }

  return (
    <section className="relative pt-20 pb-16 bg-gradient-to-b from-orange-50 to-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Column - Content */}
          <div className="space-y-8">
            <div className="space-y-6">
              <h1 className="text-4xl lg:text-5xl xl:text-6xl font-bold text-gray-900 leading-tight">
                The best booking experience for home service businesses.
              </h1>
              <p className="text-xl text-gray-600 leading-relaxed">
                Take bookings, send quotes, and schedule jobs in real time—plus manage dispatch and payments, all in one
                place.
              </p>
            </div>

            {/* Email Signup Form */}
            <div className="space-y-4">
              <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md">
                <input
                  type="email"
                  placeholder="Your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
                <button
                  type="submit"
                  className="px-6 py-3 bg-green-500 text-white font-semibold rounded-lg hover:bg-green-600 transition-colors"
                >
                  Start Free Trial
                </button>
              </form>
              <p className="text-sm text-gray-500">14-day free trial • No credit card required • Easy setup</p>
            </div>
          </div>

          {/* Right Column - Animated Demo */}
          <div className="relative lg:ml-8">
            <div className="relative w-full h-96 lg:h-[500px]">
              {/* Background Cards */}
              <div
                className={`absolute top-32 left-7 w-56 h-56 bg-cover bg-center rounded-3xl transition-all duration-1000 ${
                  animationStep >= 1 ? "opacity-100 transform translate-x-0" : "opacity-0 transform translate-x-32"
                }`}
                style={{
                  backgroundImage: "url('/images/cleaner.avif')",
                  backgroundColor: "#e3f2fd",
                }}
              />

              <div
                className={`absolute top-4 right-7 w-44 h-52 bg-cover bg-center rounded-3xl transition-all duration-1000 delay-150 ${
                  animationStep >= 1 ? "opacity-100 transform translate-x-0" : "opacity-0 transform translate-x-32"
                }`}
                style={{
                  backgroundImage: "url('/images/tv-mounting.avif')",
                  backgroundColor: "#fce4ec",
                }}
              />

              <div
                className={`absolute bottom-4 right-0 w-56 h-56 bg-cover bg-center rounded-3xl transition-all duration-1000 delay-300 ${
                  animationStep >= 1 ? "opacity-100 transform translate-x-0" : "opacity-0 transform translate-x-32"
                }`}
                style={{
                  backgroundImage: "url('/images/junkremoval.avif')",
                  backgroundColor: "#e8f5e8",
                }}
              />

              {/* Foreground UI Elements */}
              <div
                className={`absolute top-2 left-20 w-56 h-36 bg-white rounded-lg shadow-lg transition-all duration-800 delay-1000 ${
                  animationStep >= 1 ? "opacity-100 transform translate-y-0" : "opacity-0 transform -translate-y-12"
                }`}
              >
                <img
                  src="/images/admin.avif"
                  alt="Admin dashboard"
                  className="w-full h-full object-cover rounded-lg"
                />
              </div>

              <div
                className={`absolute bottom-20 left-2 w-44 h-28 bg-white rounded-lg shadow-lg transition-all duration-800 delay-1200 ${
                  animationStep >= 1 ? "opacity-100 transform translate-y-0" : "opacity-0 transform translate-y-12"
                }`}
              >
                <img
                  src="/images/date.svg"
                  alt="Date picker"
                  className="w-full h-full object-cover rounded-lg"
                />
              </div>

              <div
                className={`absolute top-24 right-16 w-32 h-36 bg-white rounded-lg shadow-lg transition-all duration-800 delay-1400 ${
                  animationStep >= 1 ? "opacity-100 transform translate-x-0" : "opacity-0 transform translate-x-12"
                }`}
              >
                <img
                  src="/images/bracket.svg"
                  alt="Service customizer"
                  className="w-full h-full object-cover rounded-lg"
                />
              </div>

              <div
                className={`absolute bottom-8 right-20 w-28 h-40 bg-white rounded-lg shadow-lg transition-all duration-800 delay-1600 ${
                  animationStep >= 1 ? "opacity-100 transform scale-100" : "opacity-0 transform scale-90"
                }`}
              >
                <img
                  src="/images/estimate.svg"
                  alt="Quote estimate"
                  className="w-full h-full object-cover rounded-lg"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
