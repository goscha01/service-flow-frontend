"use client"

import { useState } from "react"
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [activeDropdown, setActiveDropdown] = useState(null)
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  const handleNavigation = (path) => {
    try {
      navigate(path)
      setIsMenuOpen(false)
      setActiveDropdown(null)
    } catch (error) {
      console.error('Navigation error:', error)
    }
  }

  const handleLogout = () => {
    try {
      logout()
      navigate('/')
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center">
            <img src="/logo.svg" alt="ServiceFlow" className="h-10 w-auto" />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-8">
            <div
              className="relative"
              onMouseEnter={() => setActiveDropdown("product")}
              onMouseLeave={() => setActiveDropdown(null)}
            >
              <button className="flex items-center text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium">
                Product
                <svg className="ml-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {activeDropdown === "product" && (
                <div className="absolute top-full left-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 p-6">
                  <div className="space-y-4">
                    <button 
                      onClick={() => handleNavigation("/online-booking")}
                      className="flex items-start space-x-3 p-2 rounded-lg hover:bg-gray-50 w-full text-left"
                    >
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                        <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">Online Booking</h3>
                        <p className="text-sm text-gray-500">Let customers book services 24/7</p>
                      </div>
                    </button>

                    <button
                      onClick={() => handleNavigation("/service-requests")}
                      className="flex items-start space-x-3 p-2 rounded-lg hover:bg-gray-50 w-full text-left"
                    >
                      <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                        <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">Service Requests</h3>
                        <p className="text-sm text-gray-500">Let customers request quotes or bookings</p>
                      </div>
                    </button>

                    <button 
                      onClick={() => handleNavigation("/invoicing")}
                      className="flex items-start space-x-3 p-2 rounded-lg hover:bg-gray-50 w-full text-left"
                    >
                      <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                        <svg className="w-4 h-4 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">Invoicing</h3>
                        <p className="text-sm text-gray-500">Send invoices & payment links</p>
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => handleNavigation("/pricing")}
              className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
            >
              Pricing
            </button>

            <div
              className="relative"
              onMouseEnter={() => setActiveDropdown("resources")}
              onMouseLeave={() => setActiveDropdown(null)}
            >
              <button className="flex items-center text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium">
                Resources
                <svg className="ml-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {activeDropdown === "resources" && (
                <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 p-4">
                  <div className="space-y-2">
                    <button 
                      onClick={() => handleNavigation("/help")}
                      className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md w-full text-left"
                    >
                      Help Center
                    </button>
                    <button
                      onClick={() => handleNavigation("/whats-new")}
                      className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md w-full text-left"
                    >
                      Product Updates
                    </button>
                    <button
                      onClick={() => handleNavigation("/settings/developers")}
                      className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md w-full text-left"
                    >
                      Developers
                    </button>
                  </div>
                </div>
              )}
            </div>
          </nav>

          {/* CTA Buttons */}
          <div className="hidden lg:flex items-center space-x-4">
            {user ? (
              <>
                <button
                  onClick={() => handleNavigation("/dashboard")}
                  className="text-gray-700 hover:text-gray-900 px-3 py-2 text-sm font-medium"
                >
                  Dashboard
                </button>
                <button
                  onClick={handleLogout}
                  className="text-gray-700 hover:text-gray-900 px-3 py-2 text-sm font-medium"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => handleNavigation("/signin")}
                  className="text-gray-700 hover:text-gray-900 px-3 py-2 text-sm font-medium"
                >
                  Sign In
                </button>
                <button
                  onClick={() => handleNavigation("/signup")}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  Start Free Trial
                </button>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <button className="lg:hidden p-2" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>

        {/* Mobile menu */}
        {isMenuOpen && (
          <div className="lg:hidden py-4 border-t border-gray-200">
            <div className="space-y-2">
              <button
                onClick={() => handleNavigation("/")}
                className="block px-3 py-2 text-gray-700 hover:bg-gray-50 rounded-md w-full text-left"
              >
                Features
              </button>
              <button
                onClick={() => handleNavigation("/pricing")}
                className="block px-3 py-2 text-gray-700 hover:bg-gray-50 rounded-md w-full text-left"
              >
                Pricing
              </button>
              <button
                onClick={() => handleNavigation("/help")}
                className="block px-3 py-2 text-gray-700 hover:bg-gray-50 rounded-md w-full text-left"
              >
                Help
              </button>
              <div className="pt-4 space-y-2">
                {user ? (
                  <>
                    <button
                      onClick={() => handleNavigation("/dashboard")}
                      className="block px-3 py-2 text-gray-700 hover:bg-gray-50 rounded-md w-full text-left"
                    >
                      Dashboard
                    </button>
                    <button
                      onClick={handleLogout}
                      className="block px-3 py-2 text-gray-700 hover:bg-gray-50 rounded-md w-full text-left"
                    >
                      Sign Out
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => handleNavigation("/signin")}
                      className="block px-3 py-2 text-gray-700 hover:bg-gray-50 rounded-md w-full text-left"
                    >
                      Sign In
                    </button>
                    <button
                      onClick={() => handleNavigation("/signup")}
                      className="block bg-blue-600 text-white px-3 py-2 rounded-md hover:bg-blue-700 w-full"
                    >
                      Start Free Trial
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
