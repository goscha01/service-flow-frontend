"use client"

import { useState, useEffect } from "react"
import { X, User, Clock, MapPin, DollarSign, Calendar, FileText } from "lucide-react"

const EditJobModal = ({ isOpen, onClose, job, onSave }) => {
  const [formData, setFormData] = useState({
    title: "",
    client: "",
    time: "",
    duration: "",
    earnings: "",
    location: "",
    status: "",
    type: "",
    notes: ""
  })

  useEffect(() => {
    if (job) {
      setFormData({
        title: job.title || "",
        client: job.client || "",
        time: job.time || "",
        duration: job.duration || "",
        earnings: job.earnings || "",
        location: job.location || "",
        status: job.status || "pending",
        type: job.type || "repair",
        notes: job.notes || ""
      })
    }
  }, [job])

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSave = () => {
    if (onSave) {
      onSave({ ...job, ...formData })
    }
    onClose()
  }

  if (!isOpen || !job) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[var(--sf-border-light)]">
          <h2 className="text-xl font-semibold text-[var(--sf-text-primary)]">Edit Job</h2>
          <button onClick={onClose} className="p-2 hover:bg-[var(--sf-bg-hover)] rounded-lg">
            <X className="w-5 h-5 text-[var(--sf-text-muted)]" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Basic Information */}
          <div>
            <h3 className="text-lg font-medium text-[var(--sf-text-primary)] mb-4">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[var(--sf-text-primary)] mb-2">Job Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--sf-border-light)] rounded-lg focus:ring-2 focus:ring-[var(--sf-blue-500)] focus:border-[var(--sf-blue-500)]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--sf-text-primary)] mb-2">Client</label>
                <input
                  type="text"
                  value={formData.client}
                  onChange={(e) => handleInputChange('client', e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--sf-border-light)] rounded-lg focus:ring-2 focus:ring-[var(--sf-blue-500)] focus:border-[var(--sf-blue-500)]"
                />
              </div>
            </div>
          </div>

          {/* Schedule */}
          <div>
            <h3 className="text-lg font-medium text-[var(--sf-text-primary)] mb-4">Schedule</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-[var(--sf-text-primary)] mb-2">Time</label>
                <input
                  type="text"
                  value={formData.time}
                  onChange={(e) => handleInputChange('time', e.target.value)}
                  placeholder="09:00 - 12:00"
                  className="w-full px-3 py-2 border border-[var(--sf-border-light)] rounded-lg focus:ring-2 focus:ring-[var(--sf-blue-500)] focus:border-[var(--sf-blue-500)]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--sf-text-primary)] mb-2">Duration</label>
                <input
                  type="text"
                  value={formData.duration}
                  onChange={(e) => handleInputChange('duration', e.target.value)}
                  placeholder="3h"
                  className="w-full px-3 py-2 border border-[var(--sf-border-light)] rounded-lg focus:ring-2 focus:ring-[var(--sf-blue-500)] focus:border-[var(--sf-blue-500)]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--sf-text-primary)] mb-2">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => handleInputChange('status', e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--sf-border-light)] rounded-lg focus:ring-2 focus:ring-[var(--sf-blue-500)] focus:border-[var(--sf-blue-500)]"
                >
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>
          </div>

          {/* Location & Payment */}
          <div>
            <h3 className="text-lg font-medium text-[var(--sf-text-primary)] mb-4">Location & Payment</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[var(--sf-text-primary)] mb-2">Location</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => handleInputChange('location', e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--sf-border-light)] rounded-lg focus:ring-2 focus:ring-[var(--sf-blue-500)] focus:border-[var(--sf-blue-500)]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--sf-text-primary)] mb-2">Earnings</label>
                <input
                  type="text"
                  value={formData.earnings}
                  onChange={(e) => handleInputChange('earnings', e.target.value)}
                  placeholder="$450"
                  className="w-full px-3 py-2 border border-[var(--sf-border-light)] rounded-lg focus:ring-2 focus:ring-[var(--sf-blue-500)] focus:border-[var(--sf-blue-500)]"
                />
              </div>
            </div>
          </div>

          {/* Service Type */}
          <div>
            <h3 className="text-lg font-medium text-[var(--sf-text-primary)] mb-4">Service Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[var(--sf-text-primary)] mb-2">Service Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => handleInputChange('type', e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--sf-border-light)] rounded-lg focus:ring-2 focus:ring-[var(--sf-blue-500)] focus:border-[var(--sf-blue-500)]"
                >
                  <option value="plumbing">Plumbing</option>
                  <option value="repair">Repair</option>
                  <option value="cleaning">Cleaning</option>
                  <option value="installation">Installation</option>
                  <option value="maintenance">Maintenance</option>
                </select>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <h3 className="text-lg font-medium text-[var(--sf-text-primary)] mb-4">Notes</h3>
            <textarea
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-[var(--sf-border-light)] rounded-lg focus:ring-2 focus:ring-[var(--sf-blue-500)] focus:border-[var(--sf-blue-500)]"
              placeholder="Add any additional notes about this job..."
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-[var(--sf-border-light)]">
          <button
            onClick={onClose}
            className="px-4 py-2 text-[var(--sf-text-secondary)] bg-white border border-[var(--sf-border-light)] rounded-lg hover:bg-[var(--sf-bg-hover)] font-semibold transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-[var(--sf-blue-500)] text-white rounded-lg hover:bg-[var(--sf-blue-600)] font-semibold transition-colors"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  )
}

export default EditJobModal 