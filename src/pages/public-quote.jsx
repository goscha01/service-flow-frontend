import { useState, useEffect } from "react"
import { useParams } from "react-router-dom"
import { 
  MapPin, 
  Send, 
  CheckCircle,
  ArrowLeft,
  Star,
  FileText,
  Phone,
  Mail,
  MessageSquare
} from "lucide-react"
import axios from "axios"
import AddressAutocomplete from "../components/address-autocomplete"

// Create axios instance for public API calls
const publicApi = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'https://service-flow-backend-production-4568.up.railway.app/api',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// API base URL for Google Places API proxy
const API_BASE_URL = 'https://service-flow-backend-production-4568.up.railway.app'

const PublicQuote = () => {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [settings, setSettings] = useState(null)
  const [submitted, setSubmitted] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    serviceType: "",
    description: "",
    urgency: "normal",
    preferredDate: "",
    budget: "",
    additionalInfo: ""
  })
  const [availableServices, setAvailableServices] = useState([])
  const [addressSuggestions, setAddressSuggestions] = useState([])
  const [showAddressSuggestions, setShowAddressSuggestions] = useState(false)

  // Get business slug from URL parameters
  const { userSlug } = useParams()
  const businessSlug = userSlug

  // Load business settings and services
  useEffect(() => {
    const loadBusinessData = async () => {
      try {
        setLoading(true)
        
        // Load business settings
        const settingsResponse = await publicApi.get(`/public/business/${businessSlug}/settings`)
        setSettings(settingsResponse.data)
        
        // Load available services
        const servicesResponse = await publicApi.get(`/public/business/${businessSlug}/services`)
        setAvailableServices(servicesResponse.data)
        
      } catch (error) {
        console.error('Error loading business data:', error)
        setError('Business not found or unavailable')
      } finally {
        setLoading(false)
      }
    }

    loadBusinessData()
  }, [businessSlug])

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleAddressSelect = (addressData) => {
    setFormData(prev => ({
      ...prev,
      address: addressData.formattedAddress,
      city: addressData.components.city,
      state: addressData.components.state,
      zipCode: addressData.components.zipCode
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    try {
      await publicApi.post(`/public/business/${businessSlug}/quote`, formData)
      setSubmitted(true)
    } catch (error) {
      setError('Failed to submit quote request. Please try again.')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: settings?.branding?.headerBackground || '#ffffff' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{ borderColor: settings?.branding?.primaryColor || '#4CAF50' }}></div>
          <p className="text-gray-600">Loading quote form...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-red-600 text-2xl">!</span>
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Quote Request Unavailable</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: settings?.branding?.headerBackground || '#ffffff' }}>
        <div className="max-w-md mx-auto text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">Quote Request Submitted!</h1>
          <p className="text-gray-600 mb-6">
            Thank you for your quote request. We'll review your requirements and get back to you within 24 hours.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded-lg text-white font-medium"
            style={{ backgroundColor: settings?.branding?.primaryColor || '#4CAF50' }}
          >
            Submit Another Request
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: settings?.branding?.headerBackground || '#ffffff' }}>
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {settings?.branding?.logo ? (
              <img 
                src={settings.branding.logo}
                onError={(e) => {
                  console.error('Failed to load logo:', settings.branding.logo);
                  e.target.style.display = 'none';
                }} 
                alt="Logo" 
                className="h-8 object-contain"
              />
            ) : (
              <h1 className="text-xl font-semibold" style={{ color: settings?.branding?.primaryColor || '#4CAF50' }}>
                Get a Quote
              </h1>
            )}
            
            {!settings?.branding?.hideServiceFlowBranding && (
              <div className="flex items-center space-x-1 text-xs text-gray-500">
                <span>Powered by</span>
                <div className="w-4 h-4 bg-blue-600 rounded flex items-center justify-center">
                  <span className="text-white font-bold text-xs">S</span>
                </div>
                <span>serviceflow</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Hero Section */}
      {settings?.branding?.heroImage && (
        <div className="relative h-48 bg-cover bg-center" style={{ backgroundImage: `url(${settings.branding.heroImage})` }}>
          <div className="absolute inset-0 bg-black bg-opacity-40"></div>
          <div className="relative h-full flex items-center justify-center">
            <div className="text-center text-white">
              <h2 className="text-2xl font-bold mb-2">Get Your Free Quote</h2>
              <p className="text-lg">Tell us about your project and we'll provide a customized quote</p>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Quote Form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-semibold mb-6">Request a Quote</h2>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Contact Information */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Contact Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:outline-none"
                        style={{ '--tw-ring-color': settings?.branding?.primaryColor || '#4CAF50' }}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                      <input
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:outline-none"
                        style={{ '--tw-ring-color': settings?.branding?.primaryColor || '#4CAF50' }}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:outline-none"
                        style={{ '--tw-ring-color': settings?.branding?.primaryColor || '#4CAF50' }}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                      <AddressAutocomplete
                        value={formData.address}
                        onChange={(value) => handleInputChange('address', value)}
                        onAddressSelect={handleAddressSelect}
                        placeholder="Enter your address"
                        className="w-full"
                        showValidationResults={true}
                      />
                    </div>
                  </div>
                </div>

                {/* Project Details */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Project Details</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Service Type *</label>
                      <select
                        required
                        value={formData.serviceType}
                        onChange={(e) => handleInputChange('serviceType', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:outline-none"
                        style={{ '--tw-ring-color': settings?.branding?.primaryColor || '#4CAF50' }}
                      >
                        <option value="">Select a service</option>
                        {availableServices.map((service) => (
                          <option key={service.id} value={service.id}>
                            {service.name}
                          </option>
                        ))}
                        <option value="custom">Custom Service</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Project Description *</label>
                      <textarea
                        required
                        rows={4}
                        value={formData.description}
                        onChange={(e) => handleInputChange('description', e.target.value)}
                        placeholder="Please describe your project requirements in detail..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:outline-none"
                        style={{ '--tw-ring-color': settings?.branding?.primaryColor || '#4CAF50' }}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Urgency</label>
                        <select
                          value={formData.urgency}
                          onChange={(e) => handleInputChange('urgency', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:outline-none"
                          style={{ '--tw-ring-color': settings?.branding?.primaryColor || '#4CAF50' }}
                        >
                          <option value="low">Low - No rush</option>
                          <option value="normal">Normal - Within 2 weeks</option>
                          <option value="high">High - Within 1 week</option>
                          <option value="urgent">Urgent - ASAP</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Preferred Start Date</label>
                        <input
                          type="date"
                          value={formData.preferredDate}
                          onChange={(e) => handleInputChange('preferredDate', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:outline-none"
                          style={{ '--tw-ring-color': settings?.branding?.primaryColor || '#4CAF50' }}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Budget Range</label>
                      <select
                        value={formData.budget}
                        onChange={(e) => handleInputChange('budget', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:outline-none"
                        style={{ '--tw-ring-color': settings?.branding?.primaryColor || '#4CAF50' }}
                      >
                        <option value="">Select budget range</option>
                        <option value="under-500">Under $500</option>
                        <option value="500-1000">$500 - $1,000</option>
                        <option value="1000-2500">$1,000 - $2,500</option>
                        <option value="2500-5000">$2,500 - $5,000</option>
                        <option value="5000-10000">$5,000 - $10,000</option>
                        <option value="over-10000">Over $10,000</option>
                        <option value="flexible">Flexible - Let me know</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Additional Information</label>
                      <textarea
                        rows={3}
                        value={formData.additionalInfo}
                        onChange={(e) => handleInputChange('additionalInfo', e.target.value)}
                        placeholder="Any additional details, special requirements, or questions..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:outline-none"
                        style={{ '--tw-ring-color': settings?.branding?.primaryColor || '#4CAF50' }}
                      />
                    </div>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="pt-4">
                  <button
                    type="submit"
                    className="w-full py-3 px-6 rounded-lg text-white font-medium flex items-center justify-center space-x-2"
                    style={{ backgroundColor: settings?.branding?.primaryColor || '#4CAF50' }}
                  >
                    <Send className="w-4 h-4" />
                    <span>Submit Quote Request</span>
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-lg p-6 sticky top-4">
              <h3 className="font-semibold text-gray-900 mb-4">Why Get a Quote?</h3>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <Star className="w-5 h-5 text-yellow-400 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-gray-900">Custom Pricing</h4>
                    <p className="text-sm text-gray-600">Get a personalized quote based on your specific needs</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <Star className="w-5 h-5 text-yellow-400 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-gray-900">No Obligation</h4>
                    <p className="text-sm text-gray-600">Free quote with no commitment required</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <Star className="w-5 h-5 text-yellow-400 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-gray-900">Quick Response</h4>
                    <p className="text-sm text-gray-600">We'll get back to you within 24 hours</p>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-gray-200">
                <h4 className="font-medium text-gray-900 mb-3">Need Help?</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center space-x-2">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">Call us for immediate assistance</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">Email us your questions</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <MessageSquare className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">Live chat available</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PublicQuote 