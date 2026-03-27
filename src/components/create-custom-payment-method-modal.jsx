"use client"

import { useState, useEffect } from "react"
import { X } from "lucide-react"

const CreateCustomPaymentMethodModal = ({ isOpen, onClose, onSave, editingMethod, initialFee }) => {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    fee: 0
  })

  useEffect(() => {
    if (editingMethod) {
      setFormData({
        name: editingMethod.name || "",
        description: editingMethod.description || "",
        fee: initialFee ?? 0
      })
    } else {
      setFormData({ name: "", description: "", fee: 0 })
    }
  }, [editingMethod, initialFee])

  const handleSave = () => {
    if (!formData.name.trim()) return

    const paymentMethod = {
      name: formData.name.trim(),
      description: formData.description.trim(),
      fee: parseFloat(formData.fee) || 0
    }

    onSave(paymentMethod)
    onClose()
    setFormData({ name: "", description: "", fee: 0 })
  }

  const handleClose = () => {
    onClose()
    setFormData({ name: "", description: "", fee: 0 })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-2xl mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[var(--sf-border-light)]">
          <h2 className="text-xl font-semibold text-[var(--sf-text-primary)]">
            {editingMethod ? 'Edit Custom Payment Method' : 'Create Custom Payment Method'}
          </h2>
          <div className="flex items-center space-x-3">
            <button
              onClick={handleSave}
              disabled={!formData.name.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-[var(--sf-blue-500)] rounded-md hover:bg-[var(--sf-blue-600)] focus:outline-none focus:ring-2 focus:ring-[var(--sf-blue-500)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {editingMethod ? 'Update' : 'Save'}
            </button>
            <button
              onClick={handleClose}
              className="text-[var(--sf-text-muted)] hover:text-[var(--sf-text-secondary)]"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Payment Method Name */}
          <div>
            <label className="block text-sm font-medium text-[var(--sf-text-primary)] mb-2">
              Custom payment method name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full border border-[var(--sf-border-light)] rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--sf-blue-500)] focus:border-[var(--sf-blue-500)]"
              placeholder="Ex. Wire transfer"
              autoFocus
            />
          </div>

          {/* Processing Fee */}
          <div>
            <label className="block text-sm font-medium text-[var(--sf-text-primary)] mb-2">
              Processing Fee %
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={formData.fee}
                onChange={(e) => setFormData(prev => ({ ...prev, fee: e.target.value }))}
                className="w-24 border border-[var(--sf-border-light)] rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--sf-blue-500)] focus:border-[var(--sf-blue-500)]"
                placeholder="0"
              />
              <span className="text-sm text-[var(--sf-text-muted)]">%</span>
            </div>
            <p className="text-sm text-[var(--sf-text-muted)] mt-1">
              Fee deducted before calculating tips. Set to 0 for no fee.
            </p>
          </div>

          {/* Description */}
          <div>
            <div className="flex items-center space-x-2 mb-2">
              <label className="block text-sm font-medium text-[var(--sf-text-primary)]">
                Description
              </label>
              <span className="text-sm text-[var(--sf-text-muted)]">Optional</span>
            </div>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
              className="w-full border border-[var(--sf-border-light)] rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--sf-blue-500)] focus:border-[var(--sf-blue-500)] resize-none"
              placeholder="Add an optional description of how this method works"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default CreateCustomPaymentMethodModal 