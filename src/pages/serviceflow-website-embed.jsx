"use client"

import { useState } from "react"
import Sidebar from "../components/sidebar"
import { ChevronLeft } from "lucide-react"

const ServiceFlowWebsiteEmbed = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const embedOptions = [
    {
      title: "Inline Embed",
      description: "Embed your booking form on your web page anywhere you want.",
      image: "/placeholder.svg?height=120&width=160",
    },
    {
      title: "Full Page",
      description: "Show your booking form on your website that takes up an entire page.",
      image: "/placeholder.svg?height=120&width=160",
    },
    {
      title: "Floating Button",
      description: "Add a floating button to your site to launch your booking form as a popup.",
      image: "/placeholder.svg?height=120&width=160",
    },
    {
      title: "Inline Button",
      description: "Add a button anywhere on your site to launch your booking form as a popup.",
      image: "/placeholder.svg?height=120&width=160",
    },
  ]

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Main Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} activePage="online-booking" />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header */}

        {/* Desktop Header */}
        <div className="hidden lg:flex bg-white border-b border-gray-200 px-6 py-4 items-center">
          <button className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 mr-4">
            <ChevronLeft className="w-5 h-5" />
            <span className="text-sm">Online Booking</span>
          </button>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Website Embed</h1>
            <p className="text-gray-600 mt-1">Choose the type of widget you'd like to embed</p>
          </div>
        </div>

        {/* Mobile Header Content */}
        <div className="lg:hidden bg-white border-b border-gray-200 px-4 py-4">
          <button className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-3">
            <ChevronLeft className="w-5 h-5" />
            <span className="text-sm">Online Booking</span>
          </button>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Website Embed</h1>
          <p className="text-gray-600 text-sm">Choose the type of widget you'd like to embed</p>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto">
          <div className="max-w-6xl mx-auto p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {embedOptions.map((option, index) => (
                <div
                  key={index}
                  className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
                >
                  <div className="mb-4">
                    <div className="w-full h-32 bg-gray-100 rounded-lg flex items-center justify-center mb-4">
                      <div className="text-gray-400 text-sm">Widget Preview</div>
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{option.title}</h3>
                  <p className="text-gray-600 text-sm">{option.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ServiceFlowWebsiteEmbed
