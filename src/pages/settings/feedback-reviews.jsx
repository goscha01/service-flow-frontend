"use client"

import { useState } from "react"
import { useNavigate } from "react-router-dom"
import Sidebar from "../../components/sidebar"
import MobileHeader from "../../components/mobile-header"
import { ChevronLeft, Star } from "lucide-react"

const FeedbackReviews = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const navigate = useNavigate()
  const [settings, setSettings] = useState({
    collectInternalFeedback: true,
    welcomeHeadline: "Rate Your Service",
    welcomeDescription: "",
    commentsPlaceholder: "Add any notes or comments",
    buttonText: "Send Feedback",
    defaultThankYouMessage: "Hi, Thank you! Your feedback help us improve.",
    customMessage: "Don't change confirmation message",
    minimumRating: "4 stars",
  })

  const reviewSites = [
    { name: "Google", icon: "🔍", connected: false },
    { name: "Facebook", icon: "📘", connected: false },
    { name: "Nextdoor", icon: "🏠", connected: false },
    { name: "HomeAdvisor", icon: "🏡", connected: false },
    { name: "Thumbtack", icon: "👍", connected: false },
    { name: "Angi", icon: "🔧", connected: false },
    { name: "YellowPages", icon: "📞", connected: false },
    { name: "Trustpilot", icon: "⭐", connected: false },
  ]

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0">
        <MobileHeader onMenuClick={() => setSidebarOpen(true)} />

        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate("/settings")}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
            >
              <ChevronLeft className="w-5 h-5" />
              <span className="text-sm">Settings</span>
            </button>
            <h1 className="text-2xl font-semibold text-gray-900">Feedback & Reviews</h1>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          <div className="flex">
            {/* Left Panel */}
            <div className="flex-1 p-6 space-y-8">
              {/* Customer feedback form */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Customer feedback form</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Serviceflow can automatically send post-job follow up emails to customers, asking them to rate their
                  service. <button className="text-blue-600 hover:text-blue-700">Learn more</button>
                </p>
                <p className="text-sm text-gray-600 mb-6">
                  You can edit the contents of the feedback request email in Settings → Client Notifications → Follow
                  Up.
                </p>

                {/* Collect Internal Feedback */}
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-900">Collect Internal Feedback</h4>
                    <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">NEW</span>
                  </div>
                  <p className="text-sm text-gray-600 mb-4">
                    Turn this on to collect internal feedback from your customers before asking them to rate you on
                    public review sites.
                  </p>
                  <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-blue-600">
                    <span className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform translate-x-6" />
                  </button>
                </div>

                {/* Form Fields */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Welcome headline</label>
                    <input
                      type="text"
                      value={settings.welcomeHeadline}
                      onChange={(e) => setSettings({ ...settings, welcomeHeadline: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Welcome description</label>
                    <input
                      type="text"
                      placeholder="Optional"
                      value={settings.welcomeDescription}
                      onChange={(e) => setSettings({ ...settings, welcomeDescription: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Comments field placeholder</label>
                    <input
                      type="text"
                      value={settings.commentsPlaceholder}
                      onChange={(e) => setSettings({ ...settings, commentsPlaceholder: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Button text</label>
                    <input
                      type="text"
                      value={settings.buttonText}
                      onChange={(e) => setSettings({ ...settings, buttonText: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Feedback submission confirmation */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Feedback submission confirmation</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Customize the message displayed after a customer rates their service.
                </p>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Default thank you message</label>
                    <textarea
                      value={settings.defaultThankYouMessage}
                      onChange={(e) => setSettings({ ...settings, defaultThankYouMessage: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      rows={3}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Display custom message for ratings that are...
                    </label>
                    <select
                      value={settings.customMessage}
                      onChange={(e) => setSettings({ ...settings, customMessage: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    >
                      <option>Don't change confirmation message</option>
                      <option>4 stars or higher</option>
                      <option>3 stars or lower</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Review sites */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Review sites</h3>
                <p className="text-sm text-gray-600 mb-4">
                  After a customer submits their internal job feedback, you can ask if they'd like to post a review for
                  your business on review sites.
                </p>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Minimum rating for showing review site links
                  </label>
                  <select
                    value={settings.minimumRating}
                    onChange={(e) => setSettings({ ...settings, minimumRating: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none max-w-xs"
                  >
                    <option>4 stars</option>
                    <option>3 stars</option>
                    <option>5 stars</option>
                  </select>
                </div>

                <button className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 mb-6">
                  Save
                </button>

                {/* Review Sites List */}
                <div className="space-y-4">
                  {reviewSites.map((site, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">{site.icon}</span>
                        <span className="font-medium text-gray-900">{site.name}</span>
                      </div>
                      <button className="text-blue-600 hover:text-blue-700 font-medium text-sm">Connect</button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Panel - Preview */}
            <div className="w-80 bg-gray-100 p-6">
              <div className="bg-white rounded-lg p-6 shadow-sm">
                <h4 className="font-medium text-gray-900 mb-4">PREVIEW</h4>

                <div className="text-center space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">Rate Your Service</h3>

                  <div className="flex justify-center space-x-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star key={star} className="w-6 h-6 text-yellow-400 fill-current" />
                    ))}
                  </div>

                  <p className="text-sm text-gray-600">How would you rate our service?</p>

                  <button className="w-full bg-green-600 text-white py-2 rounded-lg font-medium">Send Feedback</button>
                </div>

                <div className="mt-8 pt-6 border-t border-gray-200">
                  <div className="flex justify-center space-x-1 mb-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star key={star} className="w-5 h-5 text-yellow-400 fill-current" />
                    ))}
                  </div>
                  <p className="text-center text-sm text-gray-600">Customer feedback will be displayed here</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default FeedbackReviews
