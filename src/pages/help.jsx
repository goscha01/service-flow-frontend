"use client"

import { useState } from "react"
import { useNavigate } from "react-router-dom"
import Sidebar from "../components/sidebar"
import { ChevronLeft, Book, MessageCircle, Video, FileText, Mail, Phone, ExternalLink, Search, Clock } from "lucide-react"

const HelpPage = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const navigate = useNavigate()

  const helpTopics = [
    {
      icon: Book,
      title: "Getting Started Guide",
      description: "Learn the basics of setting up your Serviceflow account and creating your first booking",
      link: "https://help.service-flow.com/getting-started",
      color: "text-blue-500",
      bg: "bg-blue-100",
      featured: true
    },
    {
      icon: Video,
      title: "Video Tutorials",
      description: "Watch step-by-step video guides covering all major features",
      link: "https://help.service-flow.com/videos",
      color: "text-green-500",
      bg: "bg-green-100",
      featured: true
    },
    {
      icon: FileText,
      title: "Knowledge Base",
      description: "Browse our comprehensive collection of articles and FAQs",
      link: "https://help.service-flow.com/articles",
      color: "text-purple-500",
      bg: "bg-purple-100",
      featured: true
    },
    {
      icon: MessageCircle,
      title: "Live Chat Support",
      description: "Get instant help from our support team during business hours",
      action: "openChat",
      color: "text-orange-500",
      bg: "bg-orange-100",
      featured: true
    }
  ]

  const quickLinks = [
    {
      category: "Setup & Configuration",
      links: [
        { title: "Setting up services", link: "https://help.service-flow.com/services" },
        { title: "Managing team members", link: "https://help.service-flow.com/team" },
        { title: "Payment setup", link: "https://help.service-flow.com/payments" },
        { title: "Online booking configuration", link: "https://help.service-flow.com/booking" }
      ]
    },
    {
      category: "Daily Operations",
      links: [
        { title: "Scheduling appointments", link: "https://help.service-flow.com/scheduling" },
        { title: "Managing customer requests", link: "https://help.service-flow.com/requests" },
        { title: "Processing payments", link: "https://help.service-flow.com/payment-processing" },
        { title: "Generating reports", link: "https://help.service-flow.com/reports" }
      ]
    },
    {
      category: "Integrations",
      links: [
        { title: "Calendar syncing", link: "https://help.service-flow.com/calendar" },
        { title: "Email notifications", link: "https://help.service-flow.com/notifications" },
        { title: "API documentation", link: "https://help.service-flow.com/api" },
        { title: "Third-party integrations", link: "https://help.service-flow.com/integrations" }
      ]
    }
  ]

  const faqItems = [
    {
      question: "How do I add a new service?",
      answer: "Navigate to Services from the sidebar, click 'Add Service', and fill in your service details including pricing, duration, and any custom fields."
    },
    {
      question: "Can customers book online?",
      answer: "Yes! Serviceflow provides a customizable online booking page that you can share with customers or embed on your website."
    },
    {
      question: "How do I set up payment processing?",
      answer: "Go to Settings > Payments to connect your Stripe account and configure payment options for online bookings."
    },
    {
      question: "Can I sync with my Google Calendar?",
      answer: "Yes, you can sync your Serviceflow schedule with Google Calendar, Outlook, and other calendar apps from Settings > Calendar Syncing."
    }
  ]

  const handleActionClick = (item) => {
    if (item.action === "openChat") {
      console.log("Opening chat support...")
    } else if (item.link) {
      window.open(item.link, "_blank")
    }
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 lg:ml-64 xl:ml-72">
        {/* Mobile Header */}

        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center space-x-4 mb-4">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
            >
              <ChevronLeft className="w-5 h-5" />
              <span className="text-sm">Back</span>
            </button>
            <h1 className="text-2xl font-semibold text-gray-900">Help & Support</h1>
          </div>
          
          {/* Search Bar */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search help articles..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          <div className="max-w-6xl mx-auto p-6">
            {/* Hero Section */}
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">How can we help you?</h2>
              <p className="text-xl text-gray-600">Find answers, get support, or learn something new</p>
            </div>

            {/* Main Help Topics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
              {helpTopics.map((topic, index) => {
                const Icon = topic.icon
                return (
                  <div
                    key={index}
                    onClick={() => handleActionClick(topic)}
                    className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-all cursor-pointer group"
                  >
                    <div className="text-center">
                      <div className={`w-16 h-16 ${topic.bg} rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:scale-105 transition-transform`}>
                        <Icon className={`w-8 h-8 ${topic.color}`} />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">{topic.title}</h3>
                      <p className="text-gray-600 text-sm leading-relaxed">{topic.description}</p>
                      {topic.link && (
                        <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-gray-600 mx-auto mt-3" />
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Quick Links Sections */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
              {quickLinks.map((section, index) => (
                <div key={index} className="bg-white rounded-xl border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">{section.category}</h3>
                  <div className="space-y-3">
                    {section.links.map((link, linkIndex) => (
                      <a
                        key={linkIndex}
                        href={link.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors group"
                      >
                        <span className="text-sm text-gray-700 group-hover:text-gray-900">{link.title}</span>
                        <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
                      </a>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* FAQ Section */}
            <div className="bg-white rounded-xl border border-gray-200 p-8 mb-12">
              <h3 className="text-2xl font-semibold text-gray-900 mb-6">Frequently Asked Questions</h3>
              <div className="space-y-6">
                {faqItems.map((faq, index) => (
                  <div key={index} className="border-b border-gray-200 pb-6 last:border-b-0 last:pb-0">
                    <h4 className="text-lg font-medium text-gray-900 mb-2">{faq.question}</h4>
                    <p className="text-gray-600">{faq.answer}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Contact Support */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-8">
              <div className="text-center mb-8">
                <h3 className="text-2xl font-semibold text-gray-900 mb-4">Still need help?</h3>
                <p className="text-gray-600 text-lg">Our support team is here to help you succeed</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
                <div className="bg-white rounded-lg p-6 text-center">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <Mail className="w-6 h-6 text-blue-500" />
                  </div>
                  <h4 className="text-lg font-medium text-gray-900 mb-2">Email Support</h4>
                  <p className="text-gray-600 mb-4">Get detailed help via email</p>
                  <a 
                    href="mailto:support@service-flow.com" 
                    className="text-blue-600 hover:text-blue-800 font-medium"
                  >
                    support@service-flow.com
                  </a>
                </div>
                
                <div className="bg-white rounded-lg p-6 text-center">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <Phone className="w-6 h-6 text-green-500" />
                  </div>
                  <h4 className="text-lg font-medium text-gray-900 mb-2">Phone Support</h4>
                  <p className="text-gray-600 mb-4">Speak directly with our team</p>
                  <a 
                    href="tel:+1-555-123-4567" 
                    className="text-green-600 hover:text-green-800 font-medium"
                  >
                    +1 (555) 123-4567
                  </a>
                </div>
              </div>
              
              <div className="flex items-center justify-center mt-6 text-gray-500">
                <Clock className="w-4 h-4 mr-2" />
                <span className="text-sm">Support hours: Monday - Friday, 9 AM - 6 PM EST</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default HelpPage 