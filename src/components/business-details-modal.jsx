"use client"

import { useState, useEffect } from "react"
import { X, ChevronDown } from "lucide-react"
import { businessDetailsAPI } from "../services/api"
import { useAuth } from "../context/AuthContext"

const BusinessDetailsModal = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  const [formData, setFormData] = useState({
    businessName: "",
    businessEmail: "",
    phone: "",
    email: "",
    firstName: "",
    lastName: "",
    location: "123 Main Street, New York, NY 10001",
    timezone: "America/New_York",
    currency: "US Dollar - USD",
    countryCode: "+1",
    notificationEmail: "",
    phoneNumber: "",
    website: "",
  })

  // Load business details when modal opens
  useEffect(() => {
    if (isOpen && user?.id) {
      loadBusinessDetails();
    }
  }, [isOpen, user]);

  const loadBusinessDetails = async () => {
    try {
      setLoading(true);
      const businessData = await businessDetailsAPI.getBusinessDetails(user.id);
      setFormData(prev => ({
        ...prev,
        businessName: businessData.businessName || "",
        businessEmail: businessData.businessEmail || "",
        phone: businessData.phone || "",
        email: businessData.email || "",
        firstName: businessData.firstName || "",
        lastName: businessData.lastName || "",
      }));
    } catch (error) {
      console.error('Error loading business details:', error);
      setMessage({ type: 'error', text: 'Failed to load business details' });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSave = async () => {
    try {
      setSaving(true);
      setMessage({ type: '', text: '' });
      
      await businessDetailsAPI.updateBusinessDetails({
        userId: user.id,
        businessName: formData.businessName,
        businessEmail: formData.businessEmail,
        phone: formData.phone,
        email: formData.email,
        firstName: formData.firstName,
        lastName: formData.lastName
      });
      
      setMessage({ type: 'success', text: 'Business details saved successfully!' });
      setTimeout(() => {
        setMessage({ type: '', text: '' });
        onClose();
      }, 2000);
    } catch (error) {
      console.error('Error saving business details:', error);
      setMessage({ type: 'error', text: error.response?.data?.error || 'Failed to save business details' });
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Business Details</h2>
          <div className="flex items-center space-x-3">
            {message.text && (
              <span className={`text-sm ${message.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                {message.text}
              </span>
            )}
            <button 
              onClick={handleSave}
              disabled={saving || loading}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Form Content */}
        <div className="p-6 space-y-6">
          {loading && (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading business details...</p>
            </div>
          )}
          {/* Business Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Business Name</label>
            <input
              type="text"
              value={formData.businessName}
              onChange={(e) => handleInputChange("businessName", e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              disabled={loading}
            />
            <p className="text-xs text-gray-500 mt-1">This will appear in your dashboard, booking page and emails.</p>
          </div>

          {/* First Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">First Name</label>
            <input
              type="text"
              value={formData.firstName}
              onChange={(e) => handleInputChange("firstName", e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              disabled={loading}
            />
          </div>

          {/* Last Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
            <input
              type="text"
              value={formData.lastName}
              onChange={(e) => handleInputChange("lastName", e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              disabled={loading}
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange("email", e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              disabled={loading}
            />
          </div>

          {/* Business Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Business Email</label>
            <input
              type="email"
              value={formData.businessEmail}
              onChange={(e) => handleInputChange("businessEmail", e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              disabled={loading}
              placeholder="contact@yourbusiness.com"
            />
            <p className="text-xs text-gray-500 mt-1">This email will be used for business communications and customer inquiries.</p>
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => handleInputChange("phone", e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              disabled={loading}
            />
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => handleInputChange("location", e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
            <p className="text-xs text-gray-500 mt-1">
              Used to set timezone and service area. Also used for other location based optimizations on the booking
              page and admin.
            </p>
          </div>

          {/* Timezone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Timezone</label>
            <div className="relative">
              <select
                value={formData.timezone}
                onChange={(e) => handleInputChange("timezone", e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-8 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none appearance-none"
              >
                <option>Africa/Lagos</option>
                <option>America/New_York</option>
                <option>Europe/London</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
            </div>
          </div>

          {/* Currency */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Currency</label>
            <div className="relative">
              <select
                value={formData.currency}
                onChange={(e) => handleInputChange("currency", e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-8 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none appearance-none"
              >
                <option>Nigerian Naira - NGN</option>
                <option>US Dollar - USD</option>
                <option>Euro - EUR</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
            </div>
          </div>

          {/* Country Calling Code */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Country Calling Code</label>
            <div className="relative">
              <select
                value={formData.countryCode}
                onChange={(e) => handleInputChange("countryCode", e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-8 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none appearance-none"
              >
                <option>+1</option>
                <option>+234</option>
                <option>+44</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Used for sending SMS notifications to customers and team members.
            </p>
          </div>

          {/* Business Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Business Email</label>
            <input
              type="email"
              value={formData.businessEmail}
              onChange={(e) => handleInputChange("businessEmail", e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
            <p className="text-xs text-gray-500 mt-1">
              Customer replies to email notifications will be sent to this email address.
            </p>
          </div>

          {/* Notification Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Notification Email</label>
            <input
              type="email"
              value={formData.notificationEmail}
              onChange={(e) => handleInputChange("notificationEmail", e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
            <p className="text-xs text-gray-500 mt-1">
              Notifications for things like new bookings are sent to this address.
            </p>
          </div>

          {/* Phone Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
            <input
              type="tel"
              value={formData.phoneNumber}
              onChange={(e) => handleInputChange("phoneNumber", e.target.value)}
              placeholder="Phone Number"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
            <p className="text-xs text-gray-500 mt-1">
              Shown on customer invoices. Also displayed on the booking page when a location is outside of your service
              area.
            </p>
          </div>

          {/* Website */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Website</label>
            <input
              type="url"
              value={formData.website}
              onChange={(e) => handleInputChange("website", e.target.value)}
              placeholder="Website"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default BusinessDetailsModal
