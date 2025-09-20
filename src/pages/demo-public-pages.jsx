import { useState } from "react"
import { Copy, ExternalLink, Link } from "lucide-react"

const DemoPublicPages = () => {
  const [copied, setCopied] = useState("")

  const businessSlug = "justwebagency" // This would come from user settings
  const baseUrl = window.location.origin

  const pages = [
    {
      title: "Public Booking Page",
      description: "Customers can book services directly through this page",
      url: `${baseUrl}/book/${businessSlug}`,
      features: [
        "Multi-step booking process",
        "Service selection",
        "Date and time picker",
        "Contact information collection",
        "Automatic job and invoice creation"
      ]
    },
    {
      title: "Public Quote Page", 
      description: "Customers can request custom quotes for their projects",
      url: `${baseUrl}/quote/${businessSlug}`,
      features: [
        "Detailed project description",
        "Service type selection",
        "Urgency and budget options",
        "Contact information",
        "Automatic request creation"
      ]
    }
  ]

  const handleCopy = (text, type) => {
    navigator.clipboard.writeText(text)
    setCopied(type)
    setTimeout(() => setCopied(""), 2000)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Public Booking & Quote Pages
          </h1>
          <p className="text-lg text-gray-600">
            These are the public pages that visitors can access to book services or request quotes.
            They automatically load your business settings and branding.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {pages.map((page, index) => (
            <div key={index} className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                {page.title}
              </h2>
              <p className="text-gray-600 mb-4">{page.description}</p>
              
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between">
                  <code className="text-sm text-gray-700 break-all">{page.url}</code>
                  <div className="flex space-x-2 ml-4">
                    <button
                      onClick={() => handleCopy(page.url, `url-${index}`)}
                      className="p-2 text-gray-500 hover:text-gray-700"
                      title="Copy URL"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <a
                      href={page.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 text-gray-500 hover:text-gray-700"
                      title="Open in new tab"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>
                {copied === `url-${index}` && (
                  <p className="text-green-600 text-sm mt-2">✓ URL copied!</p>
                )}
              </div>

              <h3 className="font-medium text-gray-900 mb-3">Features:</h3>
              <ul className="space-y-2">
                {page.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-start space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                    <span className="text-sm text-gray-600">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            How It Works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-blue-600 font-bold">1</span>
              </div>
              <h3 className="font-medium text-gray-900 mb-2">Dynamic Settings</h3>
              <p className="text-sm text-gray-600">
                Pages automatically load your business settings, branding, and services
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-green-600 font-bold">2</span>
              </div>
              <h3 className="font-medium text-gray-900 mb-2">Custom Branding</h3>
              <p className="text-sm text-gray-600">
                Your logo, colors, and content are applied automatically
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-purple-600 font-bold">3</span>
              </div>
              <h3 className="font-medium text-gray-900 mb-2">Data Integration</h3>
              <p className="text-sm text-gray-600">
                Bookings and quotes are automatically created in your system
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 bg-blue-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">
            🎯 URL Structure
          </h3>
          <div className="space-y-2 text-sm">
            <p className="text-blue-800">
              <strong>Booking:</strong> <code>yourdomain.com/book/your-business-slug</code>
            </p>
            <p className="text-blue-800">
              <strong>Quote:</strong> <code>yourdomain.com/quote/your-business-slug</code>
            </p>
            <p className="text-blue-700 mt-3">
              The business slug is automatically generated from your business name (lowercase, no spaces)
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DemoPublicPages 