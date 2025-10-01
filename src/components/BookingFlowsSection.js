"use client"

import { useState } from "react"

export default function BookingFlowsSection() {
  const [activeTab, setActiveTab] = useState("instant")

  const tabs = [
    { id: "instant", label: "Instant Booking", icon: "📅" },
    { id: "requests", label: "Service Requests", icon: "📋" },
    { id: "quotes", label: "Quote Requests", icon: "💰" },
  ]

  const content = {
    instant: {
      title: "Instant Online Booking",
      description:
        "Let customers instantly book services based on your team's real-time availability. They pick a service, select options, answer intake questions, and schedule directly online. Serviceflow can automatically take into account their location and your team's existing jobs when calculating available times.",
      image: "/images/online-booking-junk-removal.avif",
      link: "/online-booking-software",
    },
    requests: {
      title: "Service Request Management",
      description:
        "Allow customers to request services when they need more flexibility or custom pricing. Collect all the details upfront and respond with availability and pricing.",
      image: "/placeholder.svg?height=400&width=600",
      link: "/service-requests",
    },
    quotes: {
      title: "Quote Request System",
      description:
        "Let customers request detailed quotes for complex services. Gather project details and provide accurate estimates before booking.",
      image: "/placeholder.svg?height=400&width=600",
      link: "/quotes",
    },
  }

  return (
    <section className="py-20 bg-blue-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Tab Navigation */}
        <div className="flex justify-center mb-12">
          <div className="bg-white/60 backdrop-blur-sm rounded-full p-1 inline-flex">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative px-6 py-3 rounded-full text-sm font-medium transition-all duration-200 ${
                  activeTab === tab.id ? "bg-white text-blue-600 shadow-sm" : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <div className="space-y-4">
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900">{content[activeTab].title}</h2>
              <p className="text-lg text-gray-600 leading-relaxed">{content[activeTab].description}</p>
            </div>

            <div>
              <a
                href={content[activeTab].link}
                className="inline-flex items-center text-blue-600 font-semibold hover:text-blue-700 transition-colors"
              >
                Learn more
                <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </a>
            </div>
          </div>

          <div className="relative">
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
              <img
                src={content[activeTab].image || "/placeholder.svg"}
                alt={content[activeTab].title}
                className="w-full h-auto"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
