"use client"

import { useState } from "react"
import { useNavigate } from "react-router-dom"
import Sidebar from "../components/sidebar"
import MobileHeader from "../components/mobile-header"
import { ChevronLeft, Star, Zap, Shield, Users, ExternalLink } from "lucide-react"

const WhatsNewPage = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const navigate = useNavigate()

  const updates = [
    {
      date: "December 2024",
      version: "v2.1.0",
      icon: Star,
      iconColor: "text-yellow-500",
      iconBg: "bg-yellow-100",
      title: "Enhanced User Experience",
      description: "Complete redesign of the dashboard with improved navigation and modern UI components.",
      features: [
        "New dashboard layout with improved metrics",
        "Streamlined navigation sidebar",
        "Enhanced mobile responsiveness",
        "Dark mode support (coming soon)"
      ]
    },
    {
      date: "November 2024",
      version: "v2.0.5",
      icon: Zap,
      iconColor: "text-blue-500",
      iconBg: "bg-blue-100",
      title: "Performance Improvements",
      description: "Significant speed improvements and optimization across all features.",
      features: [
        "40% faster page load times",
        "Improved scheduling performance",
        "Optimized mobile app experience",
        "Better offline capabilities"
      ]
    },
    {
      date: "October 2024",
      version: "v2.0.0",
      icon: Users,
      iconColor: "text-green-500",
      iconBg: "bg-green-100",
      title: "Team Management Features",
      description: "New tools for managing team members and improving collaboration.",
      features: [
        "Enhanced team member profiles",
        "Role-based permissions system",
        "Team availability calendar",
        "Improved notification system"
      ]
    },
    {
      date: "September 2024",
      version: "v1.9.8",
      icon: Shield,
      iconColor: "text-purple-500",
      iconBg: "bg-purple-100",
      title: "Security & Compliance",
      description: "Enhanced security features and compliance with industry standards.",
      features: [
        "Two-factor authentication",
        "Enhanced data encryption",
        "GDPR compliance tools",
        "Security audit logging"
      ]
    }
  ]

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 lg:ml-64 xl:ml-72">
        {/* Mobile Header */}
        <MobileHeader onMenuClick={() => setSidebarOpen(true)} />

        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
            >
              <ChevronLeft className="w-5 h-5" />
              <span className="text-sm">Back</span>
            </button>
            <h1 className="text-2xl font-semibold text-gray-900">What's New in Service Flow</h1>
          </div>
          <p className="text-gray-600 mt-2">Stay up to date with the latest features and improvements</p>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          <div className="max-w-4xl mx-auto p-6">
            <div className="space-y-8">
              {updates.map((update, index) => {
                const Icon = update.icon
                return (
                  <div key={index} className="bg-white border border-gray-200 rounded-lg p-8 shadow-sm">
                    <div className="flex items-start space-x-6">
                      <div className={`w-16 h-16 ${update.iconBg} rounded-xl flex items-center justify-center flex-shrink-0`}>
                        <Icon className={`w-8 h-8 ${update.iconColor}`} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-4">
                          <h2 className="text-2xl font-semibold text-gray-900">{update.title}</h2>
                          <div className="flex items-center space-x-3">
                            <span className="text-sm bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-medium">
                              {update.version}
                            </span>
                            <span className="text-base text-gray-500">{update.date}</span>
                          </div>
                        </div>
                        <p className="text-gray-700 text-lg mb-6">{update.description}</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {update.features.map((feature, featureIndex) => (
                            <div key={featureIndex} className="flex items-start space-x-3">
                              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                              <span className="text-gray-700">{feature}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Call to Action Section */}
            <div className="mt-12 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-8">
              <div className="text-center">
                <h3 className="text-2xl font-semibold text-gray-900 mb-4">
                  Want to see what we're working on next?
                </h3>
                <p className="text-gray-600 mb-8 text-lg">
                  Join our community and help shape the future of Service Flow
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6">
                  <button
                    onClick={() => window.open("https://feedback.service-flow.com", "_blank")}
                    className="flex items-center space-x-2 px-6 py-3 text-base font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                  >
                    <span>Request Features</span>
                    <ExternalLink className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => window.open("https://roadmap.service-flow.com", "_blank")}
                    className="flex items-center space-x-2 px-6 py-3 text-base font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                  >
                    <span>View Roadmap</span>
                    <ExternalLink className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default WhatsNewPage