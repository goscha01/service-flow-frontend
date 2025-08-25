"use client"

import { useState, useEffect } from "react"
import { X, Plus, Minus, Search, User, DollarSign, Calendar, FileText, Trash2 } from "lucide-react"
import { estimatesAPI, customersAPI, servicesAPI } from "../services/api"
import LoadingButton from "./loading-button"

const EstimateModal = ({ isOpen, onClose, onSave, editingEstimate = null, userId }) => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [customers, setCustomers] = useState([])
  const [services, setServices] = useState([])
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false)
  const [showServiceDropdown, setShowServiceDropdown] = useState(false)
  const [customerSearch, setCustomerSearch] = useState("")
  const [serviceSearch, setServiceSearch] = useState("")
  const [filteredCustomers, setFilteredCustomers] = useState([])
  const [filteredServices, setFilteredServices] = useState([])

  // Form data
  const [formData, setFormData] = useState({
    customerId: "",
    services: [],
    totalAmount: 0,
    validUntil: "",
    notes: ""
  })

  // Selected customer and services
  const [selectedCustomer, setSelectedCustomer] = useState(null)

  useEffect(() => {
    if (isOpen) {
      loadCustomers()
      loadServices()
      if (editingEstimate) {
        setFormData({
          customerId: editingEstimate.customer_id || "",
          services: editingEstimate.services ? JSON.parse(editingEstimate.services) : [],
          totalAmount: editingEstimate.total_amount || 0,
          validUntil: editingEstimate.valid_until || "",
          notes: editingEstimate.notes || ""
        })
        setSelectedCustomer({
          id: editingEstimate.customer_id,
          first_name: editingEstimate.customer_first_name,
          last_name: editingEstimate.customer_last_name,
          email: editingEstimate.customer_email
        })
        setCustomerSearch(`${editingEstimate.customer_first_name} ${editingEstimate.customer_last_name}`)
      } else {
        setFormData({
          customerId: "",
          services: [],
          totalAmount: 0,
          validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          notes: ""
        })
        setSelectedCustomer(null)
        setCustomerSearch("")
      }
    }
  }, [isOpen, editingEstimate])

  useEffect(() => {
    // Filter customers based on search
    if (customerSearch) {
      const filtered = customers.filter(customer =>
        `${customer.first_name} ${customer.last_name}`.toLowerCase().includes(customerSearch.toLowerCase()) ||
        customer.email?.toLowerCase().includes(customerSearch.toLowerCase())
      )
      setFilteredCustomers(filtered)
    } else {
      setFilteredCustomers(customers)
    }
  }, [customerSearch, customers])

  useEffect(() => {
    // Filter services based on search
    if (serviceSearch) {
      const filtered = services.filter(service =>
        service.name.toLowerCase().includes(serviceSearch.toLowerCase()) ||
        service.category?.toLowerCase().includes(serviceSearch.toLowerCase())
      )
      setFilteredServices(filtered)
    } else {
      setFilteredServices(services)
    }
  }, [serviceSearch, services])

  // Calculate total when services change
  useEffect(() => {
    const total = formData.services.reduce((sum, service) => {
      return sum + (service.price * service.quantity)
    }, 0)
    setFormData(prev => ({ ...prev, totalAmount: total }))
  }, [formData.services])

  const loadCustomers = async () => {
    try {
      const customersData = await customersAPI.getAll({ userId })
      setCustomers(customersData)
      setFilteredCustomers(customersData)
    } catch (error) {
      console.error('Error loading customers:', error)
      setError('Failed to load customers.')
    }
  }

  const loadServices = async () => {
    try {
      const servicesData = await servicesAPI.getAll(userId)
      const servicesArray = servicesData.services || servicesData || []
      setServices(servicesArray)
      setFilteredServices(servicesArray)
    } catch (error) {
      console.error('Error loading services:', error)
      setError('Failed to load services.')
    }
  }

  const handleCustomerSelect = (customer) => {
    setSelectedCustomer(customer)
    setFormData(prev => ({ ...prev, customerId: customer.id }))
    setCustomerSearch(`${customer.first_name} ${customer.last_name}`)
    setShowCustomerDropdown(false)
  }

  const handleServiceSelect = (service) => {
    const existingServiceIndex = formData.services.findIndex(s => s.serviceId === service.id)
    
    if (existingServiceIndex >= 0) {
      // Update quantity if service already exists
      const updatedServices = [...formData.services]
      updatedServices[existingServiceIndex].quantity += 1
      setFormData(prev => ({ ...prev, services: updatedServices }))
    } else {
      // Add new service
      const newService = {
        serviceId: service.id,
        name: service.name,
        price: service.price,
        quantity: 1,
        description: service.description
      }
      setFormData(prev => ({ 
        ...prev, 
        services: [...prev.services, newService] 
      }))
    }
    
    setServiceSearch("")
    setShowServiceDropdown(false)
  }

  const handleServiceQuantityChange = (serviceId, newQuantity) => {
    if (newQuantity <= 0) {
      // Remove service if quantity is 0 or less
      setFormData(prev => ({
        ...prev,
        services: prev.services.filter(s => s.serviceId !== serviceId)
      }))
    } else {
      // Update quantity
      setFormData(prev => ({
        ...prev,
        services: prev.services.map(s => 
          s.serviceId === serviceId ? { ...s, quantity: newQuantity } : s
        )
      }))
    }
  }

  const handleRemoveService = (serviceId) => {
    setFormData(prev => ({
      ...prev,
      services: prev.services.filter(s => s.serviceId !== serviceId)
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.customerId || formData.services.length === 0) {
      setError('Please select a customer and add at least one service.')
      return
    }

    try {
      setLoading(true)
      setError("")
      
      const estimateData = {
        ...formData,
        userId
      }

      if (editingEstimate) {
        await estimatesAPI.update(editingEstimate.id, estimateData)
      } else {
        await estimatesAPI.create(estimateData)
      }
      
      onSave()
      onClose()
    } catch (error) {
      console.error('Error saving estimate:', error)
      setError('Failed to save estimate. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {editingEstimate ? 'Edit Estimate' : 'Create Estimate'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mx-6 mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <X className="h-5 w-5 text-red-400" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">{error}</h3>
              </div>
            </div>
          </div>
        )}

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Customer Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Customer *
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search customers..."
                value={customerSearch}
                onChange={(e) => {
                  setCustomerSearch(e.target.value)
                  setShowCustomerDropdown(true)
                }}
                onFocus={() => setShowCustomerDropdown(true)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
              
              {showCustomerDropdown && filteredCustomers.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {filteredCustomers.map((customer) => (
                    <button
                      key={customer.id}
                      type="button"
                      onClick={() => handleCustomerSelect(customer)}
                      className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center space-x-3"
                    >
                      <User className="w-4 h-4 text-gray-400" />
                      <div>
                        <div className="font-medium text-gray-900">
                          {customer.first_name} {customer.last_name}
                        </div>
                        {customer.email && (
                          <div className="text-sm text-gray-500">{customer.email}</div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Services Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Services *
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search services..."
                value={serviceSearch}
                onChange={(e) => {
                  setServiceSearch(e.target.value)
                  setShowServiceDropdown(true)
                }}
                onFocus={() => setShowServiceDropdown(true)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
              
              {showServiceDropdown && filteredServices.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {filteredServices.map((service) => (
                    <button
                      key={service.id}
                      type="button"
                      onClick={() => handleServiceSelect(service)}
                      className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center justify-between"
                    >
                      <div className="flex items-center space-x-3">
                        <FileText className="w-4 h-4 text-gray-400" />
                        <div>
                          <div className="font-medium text-gray-900">{service.name}</div>
                          {service.description && (
                            <div className="text-sm text-gray-500">{service.description}</div>
                          )}
                        </div>
                      </div>
                      <div className="text-sm font-medium text-gray-900">
                        {formatCurrency(service.price)}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Selected Services */}
          {formData.services.length > 0 && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Selected Services</h3>
              <div className="space-y-3">
                {formData.services.map((service) => (
                  <div key={service.serviceId} className="flex items-center justify-between bg-white rounded-lg p-3 border border-gray-200">
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{service.name}</div>
                      {service.description && (
                        <div className="text-sm text-gray-500">{service.description}</div>
                      )}
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={() => handleServiceQuantityChange(service.serviceId, service.quantity - 1)}
                          className="w-6 h-6 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-8 text-center text-sm font-medium">{service.quantity}</span>
                        <button
                          type="button"
                          onClick={() => handleServiceQuantityChange(service.serviceId, service.quantity + 1)}
                          className="w-6 h-6 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="text-sm font-medium text-gray-900">
                        {formatCurrency(service.price * service.quantity)}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveService(service.serviceId)}
                        className="ml-2 p-1 text-gray-400 hover:text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Total Amount */}
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <span className="text-lg font-medium text-gray-900">Total Amount</span>
              <span className="text-2xl font-bold text-blue-600">
                {formatCurrency(formData.totalAmount)}
              </span>
            </div>
          </div>

          {/* Valid Until */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Valid Until
            </label>
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-gray-400" />
              <input
                type="date"
                value={formData.validUntil}
                onChange={(e) => setFormData(prev => ({ ...prev, validUntil: e.target.value }))}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              rows={4}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="Add any additional notes for this estimate..."
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !formData.customerId || formData.services.length === 0}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {loading ? (
                <LoadingButton />
              ) : (
                <>
                  <DollarSign className="w-4 h-4" />
                  <span>{editingEstimate ? 'Update Estimate' : 'Create Estimate'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default EstimateModal 