"use client"

import { useState, useEffect } from "react"
import { X } from "lucide-react"

const CreateCustomPaymentMethodModal = ({ isOpen, onClose, onSave, editingMethod }) => {
  const [formData, setFormData] = useState({
    name: "",
    description: ""
  })

  useEffect(() => {
    if (editingMethod) {
      setFormData({
        name: editingMethod.name || "",
        description: editingMethod.description || ""
      })
    } else {
      setFormData({ name: "", description: "" })
    }
  }, [editingMethod])

  const handleSave = () => {
    if (!formData.name.trim()) return

    const paymentMethod = {
      name: formData.name.trim(),
      description: formData.description.trim()
    }
    
    onSave(paymentMethod)
    onClose()
    setFormData({ name: "", description: "" })
  }

  const handleClose = () => {
    onClose()
    setFormData({ name: "", description: "" })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-2xl mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {editingMethod ? 'Edit Custom Payment Method' : 'Create Custom Payment Method'}
          </h2>
          <div className="flex items-center space-x-3">
            <button
              onClick={handleSave}
              disabled={!formData.name.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {editingMethod ? 'Update' : 'Save'}
            </button>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Payment Method Name */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Custom payment method name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Ex. Wire transfer"
              autoFocus
            />
          </div>

          {/* Description */}
          <div>
            <div className="flex items-center space-x-2 mb-2">
              <label className="block text-sm font-medium text-gray-900">
                Description
              </label>
              <span className="text-sm text-gray-500">Optional</span>
            </div>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={4}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              placeholder="Add an optional description of how this method works"
            />
            <p className="text-sm text-gray-500 mt-2">
              When booking, customers will be able to see this description when selecting their payment method
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CreateCustomPaymentMethodModal 