import { useState } from "react"
import { Info, Save } from "lucide-react"
import { useAuth } from "../context/AuthContext"
import axios from "axios"

const CreateCouponForm = () => {
  const { user } = useAuth()
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState("")
  
  const [formData, setFormData] = useState({
    code: "",
    discountType: "",
    discountAmount: "",
    applicationType: "all", // 'all' or 'specific'
    selectedServices: [],
    doesntExpire: false,
    expirationDate: "",
    restrictBeforeExpiration: false,
    limitTotalUses: false,
    canCombineWithRecurring: false,
    recurringApplicationType: "all" // 'all', 'first', etc.
  })

  const services = [
    { id: 1, name: "TV Mounting" },
    { id: 2, name: "Garage Door Repair" },
    { id: 3, name: "Smart Home Install" }
  ]

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleServiceToggle = (serviceId) => {
    setFormData(prev => ({
      ...prev,
      selectedServices: prev.selectedServices.includes(serviceId)
        ? prev.selectedServices.filter(id => id !== serviceId)
        : [...prev.selectedServices, serviceId]
    }))
  }

  const generateCode = () => {
    // Generate a random coupon code
    const code = 'COUPON-' + Math.random().toString(36).substring(2, 8).toUpperCase()
    setFormData(prev => ({ ...prev, code }))
  }

  const handleSave = async () => {
    if (!user?.id) {
      setSaveMessage("Please sign in to create coupons")
      return
    }

    if (!formData.code.trim()) {
      setSaveMessage("Please enter a coupon code")
      return
    }

    if (!formData.discountType) {
      setSaveMessage("Please select a discount type")
      return
    }

    if (!formData.discountAmount) {
      setSaveMessage("Please enter a discount amount")
      return
    }

    try {
      setIsSaving(true)
      setSaveMessage("")

      const couponData = {
        ...formData,
        userId: user.id,
        isActive: true
      }

      // Create axios instance for API calls
      const api = axios.create({
        baseURL: process.env.REACT_APP_API_URL || 'https://service-flow-backend-production-4568.up.railway.app/api',
        timeout: 15000,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // Add auth token
      const token = localStorage.getItem('authToken');
      if (token) {
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      }

      const response = await api.post('/coupons', couponData)
      
      setSaveMessage("Coupon created successfully!")
      setTimeout(() => {
        setSaveMessage("")
        // Reset form or redirect
        setFormData({
          code: "",
          discountType: "",
          discountAmount: "",
          applicationType: "all",
          selectedServices: [],
          doesntExpire: false,
          expirationDate: "",
          restrictBeforeExpiration: false,
          limitTotalUses: false,
          canCombineWithRecurring: false,
          recurringApplicationType: "all"
        })
      }, 2000)
    } catch (error) {
      console.error('Error creating coupon:', error)
      setSaveMessage(error.response?.data?.error || "Failed to create coupon. Please try again.")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-semibold text-gray-900 mb-8">Create Coupon</h1>

      <div className="space-y-6">
        {/* Coupon Code Section */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Coupon code
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                name="code"
                value={formData.code}
                onChange={handleInputChange}
                placeholder="e.g. SPRINGCLEAN-20-OFF"
                className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <button
                onClick={generateCode}
                type="button"
                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                Autogenerate code
              </button>
            </div>
            <p className="mt-1 text-sm text-gray-500">
              Customers will enter this code when booking online
            </p>
          </div>
        </div>

        {/* Discount Section */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="mb-4">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Discount</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type
                </label>
                <select
                  name="discountType"
                  value={formData.discountType}
                  onChange={handleInputChange}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Select discount type</option>
                  <option value="percentage">Percentage off</option>
                  <option value="fixed">Fixed amount off</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Discount amount
                </label>
                <input
                  type="text"
                  name="discountAmount"
                  value={formData.discountAmount}
                  onChange={handleInputChange}
                  placeholder="$25"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Applies To Section */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="mb-4">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Applies to</h2>
            <p className="text-sm text-gray-500 mb-4">
              Select the services that this coupon can be applied to
            </p>
            <div className="space-y-3">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="applicationType"
                  value="all"
                  checked={formData.applicationType === "all"}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <span className="ml-2 text-sm text-gray-900">All services</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="applicationType"
                  value="specific"
                  checked={formData.applicationType === "specific"}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <span className="ml-2 text-sm text-gray-900">Specific services</span>
              </label>
            </div>

            {formData.applicationType === "specific" && (
              <div className="mt-4 space-y-2">
                {services.map(service => (
                  <label key={service.id} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.selectedServices.includes(service.id)}
                      onChange={() => handleServiceToggle(service.id)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-900">{service.name}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Expiration Date Section */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="mb-4">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Expiration date</h2>
            <div className="space-y-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="doesntExpire"
                  checked={formData.doesntExpire}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-900">Doesn't expire</span>
              </label>

              {!formData.doesntExpire && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Use by
                  </label>
                  <input
                    type="date"
                    name="expirationDate"
                    value={formData.expirationDate}
                    onChange={handleInputChange}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              )}

              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="restrictBeforeExpiration"
                  checked={formData.restrictBeforeExpiration}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-900">
                  Restrict coupon to appointments on or before expiration date
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Usage Limits Section */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="mb-4">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Usage limits</h2>
            <div className="space-y-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="limitTotalUses"
                  checked={formData.limitTotalUses}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-900">
                  Limit the total number of times this coupon can be redeemed
                </span>
              </label>

              <div className="flex items-center space-x-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="canCombineWithRecurring"
                    checked={formData.canCombineWithRecurring}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-900">
                    This coupon can be combined with recurring booking discounts
                  </span>
                </label>
                <button
                  type="button"
                  className="text-gray-400 hover:text-gray-500"
                  title="Learn more about combining coupons"
                >
                  <Info className="h-4 w-4" />
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  For recurring bookings, apply coupon to...
                </label>
                <select
                  name="recurringApplicationType"
                  value={formData.recurringApplicationType}
                  onChange={handleInputChange}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="all">All jobs in recurring series</option>
                  <option value="first">First job only</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Save Button and Message */}
        <div className="mt-8 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {saveMessage && (
              <div className={`text-sm ${saveMessage.includes('success') ? 'text-green-600' : 'text-red-600'}`}>
                {saveMessage}
              </div>
            )}
            {isSaving && (
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                <span>Saving...</span>
              </div>
            )}
          </div>
          
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Creating...' : 'Create Coupon'}</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default CreateCouponForm 