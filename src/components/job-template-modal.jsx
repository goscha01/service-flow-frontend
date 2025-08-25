"use client"

import { useState, useEffect } from "react"
import { X, Save, AlertCircle, Check } from "lucide-react"
import { jobTemplatesAPI, servicesAPI } from "../services/api"

const JobTemplateModal = ({ isOpen, onClose, onSave, editingTemplate, userId }) => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [successMessage, setSuccessMessage] = useState("")
  const [services, setServices] = useState([])
  const [showServiceDropdown, setShowServiceDropdown] = useState(false)
  const [serviceSearch, setServiceSearch] = useState("")
  const [filteredServices, setFilteredServices] = useState([])

  // Form data
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    serviceId: "",
    estimatedDuration: "",
    estimatedPrice: "",
    defaultNotes: ""
  })

  // Selected service
  const [selectedService, setSelectedService] = useState(null)

  useEffect(() => {
    if (isOpen) {
      loadServices()
      if (editingTemplate) {
        setFormData({
          name: editingTemplate.name || "",
          description: editingTemplate.description || "",
          serviceId: editingTemplate.service_id || "",
          estimatedDuration: editingTemplate.estimated_duration || "",
          estimatedPrice: editingTemplate.estimated_price || "",
          defaultNotes: editingTemplate.default_notes || ""
        })
        setSelectedService({
          id: editingTemplate.service_id,
          name: editingTemplate.service_name,
          price: editingTemplate.service_price,
          duration: editingTemplate.service_duration
        })
        setServiceSearch(editingTemplate.service_name || "")
      } else {
        setFormData({
          name: "",
          description: "",
          serviceId: "",
          estimatedDuration: "",
          estimatedPrice: "",
          defaultNotes: ""
        })
        setSelectedService(null)
        setServiceSearch("")
      }
    }
  }, [isOpen, editingTemplate])

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

  const handleServiceSelect = (service) => {
    setSelectedService(service)
    setFormData(prev => ({ 
      ...prev, 
      serviceId: service.id,
      estimatedDuration: service.duration || "",
      estimatedPrice: service.price || ""
    }))
    setServiceSearch(service.name)
    setShowServiceDropdown(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.name || !formData.serviceId) {
      setError('Please fill in all required fields.')
      return
    }

    try {
      setLoading(true)
      setError("")
      
      const templateData = {
        ...formData,
        userId
      }

      if (editingTemplate) {
        await jobTemplatesAPI.update(editingTemplate.id, templateData)
        setSuccessMessage('Job template updated successfully!')
      } else {
        await jobTemplatesAPI.create(templateData)
        setSuccessMessage('Job template created successfully!')
      }
      
      setTimeout(() => {
        onSave()
        onClose()
      }, 1500)
    } catch (error) {
      console.error('Error saving job template:', error)
      setError('Failed to save job template. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {editingTemplate ? 'Edit Job Template' : 'Create Job Template'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Messages */}
        {error && (
          <div className="mx-6 mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <p className="text-red-700">{error}</p>
            </div>
          </div>
        )}

        {successMessage && (
          <div className="mx-6 mt-4 bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <Check className="w-5 h-5 text-green-500" />
              <p className="text-green-700">{successMessage}</p>
            </div>
          </div>
        )}

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Template Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Template Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="e.g., Standard House Cleaning"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="Describe this job template..."
            />
          </div>

          {/* Service Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Service *
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Search or select service..."
                value={serviceSearch}
                onChange={(e) => setServiceSearch(e.target.value)}
                onFocus={() => setShowServiceDropdown(true)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>

            {showServiceDropdown && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {filteredServices.map((service) => (
                  <button
                    key={service.id}
                    type="button"
                    onClick={() => handleServiceSelect(service)}
                    className="w-full px-4 py-2 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                  >
                    <div className="font-medium">{service.name}</div>
                    <div className="text-sm text-gray-500">
                      ${service.price} • {service.duration} minutes
                    </div>
                  </button>
                ))}
                {filteredServices.length === 0 && (
                  <div className="px-4 py-2 text-gray-500">No services found</div>
                )}
              </div>
            )}
          </div>

          {/* Estimated Duration and Price */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Estimated Duration (minutes)
              </label>
              <input
                type="number"
                value={formData.estimatedDuration}
                onChange={(e) => setFormData(prev => ({ ...prev, estimatedDuration: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="120"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Estimated Price ($)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.estimatedPrice}
                onChange={(e) => setFormData(prev => ({ ...prev, estimatedPrice: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="150.00"
              />
            </div>
          </div>

          {/* Default Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Default Notes
            </label>
            <textarea
              value={formData.defaultNotes}
              onChange={(e) => setFormData(prev => ({ ...prev, defaultNotes: e.target.value }))}
              rows={4}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="Default notes that will be added to jobs created from this template..."
            />
          </div>

          {/* Submit Button */}
          <div className="flex justify-end space-x-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              <Save className="w-4 h-4" />
              <span>{loading ? 'Saving...' : (editingTemplate ? 'Update' : 'Create')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default JobTemplateModal 