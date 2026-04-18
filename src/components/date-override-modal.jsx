"use client"

import { useState, useEffect } from "react"
import { X, Plus, Trash2 } from "lucide-react"

const labelOptions = ['Vacation', 'Holiday', 'Visit', 'Training', 'Personal', 'Custom']

const DateOverrideModal = ({ isOpen, onClose, onSave, existingOverride, defaultMode = 'unavailable' }) => {
  const [override, setOverride] = useState({
    date: '',
    available: false,
    hours: [],
    label: ''
  })
  const [errors, setErrors] = useState({})

  const isEditMode = !!existingOverride

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      if (existingOverride) {
        // Legacy entries may have hours as a string ("09:00-17:00") — normalize to array.
        let hoursArr = existingOverride.hours
        if (typeof hoursArr === 'string') {
          if (hoursArr.toLowerCase() === 'unavailable' || !hoursArr.trim()) {
            hoursArr = []
          } else {
            hoursArr = hoursArr.split(',').map(seg => {
              const [s, e] = seg.trim().split('-')
              return { start: (s || '').trim(), end: (e || '').trim() }
            }).filter(h => h.start && h.end)
          }
        }
        if (!Array.isArray(hoursArr)) hoursArr = []
        setOverride({
          date: existingOverride.date || '',
          available: existingOverride.available !== false,
          hours: hoursArr,
          label: existingOverride.label || ''
        })
      } else {
        const startInCustomMode = defaultMode === 'custom_hours'
        setOverride({
          date: '',
          available: startInCustomMode,
          hours: startInCustomMode ? [{ start: '09:00', end: '17:00' }] : [],
          label: ''
        })
      }
      setErrors({})
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => { document.body.style.overflow = 'unset' }
  }, [isOpen, existingOverride, defaultMode])

  const handleSave = () => {
    const newErrors = {}
    if (!override.date) newErrors.date = 'Date is required'
    if (override.available && override.hours.length > 0) {
      override.hours.forEach((h, i) => {
        if (!h.start || !h.end) {
          newErrors[`hours_${i}`] = 'Start and end time are required'
        } else if (h.start >= h.end) {
          newErrors[`hours_${i}`] = 'End time must be after start time'
        }
      })
    }
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }
    onSave(override)
  }

  const addTimeSlot = () => {
    setOverride(prev => ({
      ...prev,
      hours: [...prev.hours, { start: '09:00', end: '17:00' }]
    }))
  }

  const removeTimeSlot = (index) => {
    setOverride(prev => ({
      ...prev,
      hours: prev.hours.filter((_, i) => i !== index)
    }))
  }

  const updateTimeSlot = (index, field, value) => {
    setOverride(prev => ({
      ...prev,
      hours: prev.hours.map((h, i) => i === index ? { ...h, [field]: value } : h)
    }))
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-[var(--sf-border-light)]">
          <h2 className="text-lg font-semibold text-[var(--sf-text-primary)]">
            {isEditMode ? 'Edit Date Override' : 'Add Date Override'}
          </h2>
          <button onClick={onClose} className="text-[var(--sf-text-muted)] hover:text-[var(--sf-text-secondary)] p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-[var(--sf-text-primary)] mb-1">Date</label>
            <input
              type="date"
              value={override.date}
              onChange={e => setOverride(prev => ({ ...prev, date: e.target.value }))}
              className="w-full border border-[var(--sf-border-light)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--sf-blue-500)]"
            />
            {errors.date && <p className="text-xs text-red-600 mt-1">{errors.date}</p>}
          </div>

          {/* Label / Reason */}
          <div>
            <label className="block text-sm font-medium text-[var(--sf-text-primary)] mb-1">Reason</label>
            <select
              value={override.label}
              onChange={e => setOverride(prev => ({ ...prev, label: e.target.value }))}
              className="w-full border border-[var(--sf-border-light)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--sf-blue-500)] bg-white"
            >
              <option value="">Select reason (optional)</option>
              {labelOptions.map(label => (
                <option key={label} value={label}>{label}</option>
              ))}
            </select>
          </div>

          {/* Available toggle */}
          <div>
            <label className="block text-sm font-medium text-[var(--sf-text-primary)] mb-2">Availability</label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setOverride(prev => ({ ...prev, available: false, hours: [] }))}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  !override.available
                    ? 'bg-red-50 border-red-300 text-red-700'
                    : 'bg-white border-[var(--sf-border-light)] text-[var(--sf-text-secondary)] hover:bg-[var(--sf-bg-page)]'
                }`}
              >
                Unavailable
              </button>
              <button
                type="button"
                onClick={() => setOverride(prev => ({ ...prev, available: true }))}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  override.available
                    ? 'bg-green-50 border-green-300 text-green-700'
                    : 'bg-white border-[var(--sf-border-light)] text-[var(--sf-text-secondary)] hover:bg-[var(--sf-bg-page)]'
                }`}
              >
                Custom Hours
              </button>
            </div>
          </div>

          {/* Custom time slots (only when available) */}
          {override.available && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-[var(--sf-text-primary)]">Time Slots</label>
                <button
                  type="button"
                  onClick={addTimeSlot}
                  className="text-[var(--sf-blue-500)] hover:text-[var(--sf-blue-500)] text-sm font-medium flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Add Slot
                </button>
              </div>
              {override.hours.length === 0 && (
                <p className="text-xs text-[var(--sf-text-muted)]">No custom time slots. Regular working hours will apply.</p>
              )}
              <div className="space-y-2">
                {override.hours.map((slot, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      type="time"
                      value={slot.start}
                      onChange={e => updateTimeSlot(index, 'start', e.target.value)}
                      className="flex-1 border border-[var(--sf-border-light)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--sf-blue-500)]"
                    />
                    <span className="text-[var(--sf-text-muted)] text-sm">to</span>
                    <input
                      type="time"
                      value={slot.end}
                      onChange={e => updateTimeSlot(index, 'end', e.target.value)}
                      className="flex-1 border border-[var(--sf-border-light)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--sf-blue-500)]"
                    />
                    <button
                      type="button"
                      onClick={() => removeTimeSlot(index)}
                      className="text-red-400 hover:text-red-600 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    {errors[`hours_${index}`] && (
                      <p className="text-xs text-red-600">{errors[`hours_${index}`]}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 p-6 border-t border-[var(--sf-border-light)]">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-[var(--sf-text-primary)] bg-white border border-[var(--sf-border-light)] rounded-lg hover:bg-[var(--sf-bg-page)]"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm font-medium text-white bg-[var(--sf-blue-500)] rounded-lg hover:bg-[var(--sf-blue-600)]"
          >
            {isEditMode ? 'Save Changes' : 'Add Override'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default DateOverrideModal
