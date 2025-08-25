"use client"

import { X } from "lucide-react"
import { useState, useEffect } from "react"

const ModifierModal = ({ isOpen, onClose, editingModifier = null, onSave }) => {
  const [formData, setFormData] = useState({
    name: "",
    type: "fixed",
    amount: "",
    isRequired: false
  })

  useEffect(() => {
    if (editingModifier) {
      setFormData(editingModifier)
    } else {
      setFormData({
        name: "",
        type: "fixed",
        amount: "",
        isRequired: false
      })
    }
  }, [editingModifier, isOpen])

  if (!isOpen) return null

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  const handleSave = () => {
    onSave(formData)
    onClose()
  }

  const handleCancel = () => {
    onClose()
  }

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-lg w-full max-w-md">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">
              {editingModifier ? "Edit Modifier" : "Add New Modifier"}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500 hover:bg-gray-100 p-1 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Modifier Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Rush Job, Weekend Service"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Type
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="fixed">Fixed Amount</option>
                <option value="percentage">Percentage</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Amount
              </label>
              <div className="relative">
                {formData.type === "percentage" && (
                  <span className="absolute right-3 top-2 text-gray-500">%</span>
                )}
                {formData.type === "fixed" && (
                  <span className="absolute left-3 top-2 text-gray-500">$</span>
                )}
                <input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder={formData.type === "percentage" ? "25" : "50"}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    formData.type === "fixed" ? "pl-8" : "pr-8"
                  }`}
                />
              </div>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="isRequired"
                checked={formData.isRequired}
                onChange={(e) => setFormData({ ...formData, isRequired: e.target.checked })}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="isRequired" className="ml-2 block text-sm text-gray-700">
                Required for all bookings
              </label>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
          <button
            onClick={handleCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 border border-gray-300 rounded-lg"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
          >
            {editingModifier ? "Save Changes" : "Create Modifier"}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ModifierModal