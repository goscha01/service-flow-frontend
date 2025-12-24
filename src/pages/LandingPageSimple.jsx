"use client"

import { useState } from "react"
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function LandingPageSimple() {
  const [email, setEmail] = useState("")
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  const handleSubmit = (e) => {
    e.preventDefault()
    // Navigate to signup with email
    navigate(`/signup?email=${encodeURIComponent(email)}`)
  }

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const logos = [
    { name: "Renewal by Andersen", src: "/images/Renewal-by-Andersen.svg" },
    { name: "Casabella", src: "/images/cassabella.svg" },
    { name: "Mr Clean Carpet Care", src: "/images/mr-clean-carpet-logo.svg" },
    { name: "Mike's Hauling Service", src: "/images/mhs.svg" },
    { name: "Spify", src: "/images/spify.jpeg" },
  ]

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center">
              <img src="/logo.svg" alt="ServiceFlow" className="h-10 w-auto" />
            </Link>

            {/* Navigation */}
            <nav className="flex items-center space-x-6">
              {user ? (
                <>
                  <button
                    onClick={() => navigate("/dashboard")}
                    className="text-gray-700 hover:text-gray-900 text-sm font-medium"
                  >
                    Dashboard
                  </button>
                  <button
                    onClick={handleLogout}
                    className="text-gray-700 hover:text-gray-900 text-sm font-medium"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <button
                  onClick={() => navigate("/signin")}
                  className="text-gray-700 hover:text-gray-900 text-sm font-medium"
                >
                  Sign In
                </button>
              )}
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-32 pb-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Column - Content */}
            <div className="space-y-8">
              <div className="space-y-6">
                <h1 className="text-4xl lg:text-5xl xl:text-6xl font-bold text-gray-900 leading-tight">
                  The best booking experience for home service businesses.
                </h1>
                <p className="text-xl text-gray-600 leading-relaxed">
                  Take bookings, send quotes, and schedule jobs in real time—plus manage dispatch and payments, all in one place.
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
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    required
                  />
                  <button
                    type="submit"
                    className="px-6 py-3 bg-green-500 text-white font-semibold rounded-lg hover:bg-green-600 transition-colors"
                  >
                    Start Free Trial
                  </button>
                </form>
                <p className="text-sm text-gray-500">14-day free trial. No credit card required. Easy setup.</p>
              </div>
            </div>

            {/* Right Column - App Mockups (Simplified) */}
            <div className="relative hidden lg:block">
              <div className="relative w-full h-96">
                {/* Placeholder for app screenshots - can be replaced with actual images */}
                <div className="absolute top-0 left-0 w-64 h-80 bg-blue-50 rounded-xl shadow-lg"></div>
                <div className="absolute top-12 right-0 w-56 h-72 bg-green-50 rounded-xl shadow-lg"></div>
                <div className="absolute bottom-0 left-12 w-60 h-64 bg-purple-50 rounded-xl shadow-lg"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trusted By Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="text-lg font-medium text-gray-600">
              Trusted by home service businesses <span className="text-gray-800">worldwide</span>.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8 items-center justify-items-center">
            {logos.map((logo, index) => (
              <div
                key={index}
                className="bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
              >
                <img
                  src={logo.src || "/placeholder.svg"}
                  alt={`${logo.name} Logo`}
                  className="w-full h-12 object-contain filter grayscale hover:grayscale-0 transition-all"
                />
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}

