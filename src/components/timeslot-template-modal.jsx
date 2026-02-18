"use client"

import { useState, useEffect } from "react"
import { X } from "lucide-react"

const defaultTemplate = {
  name: "",
  description: "",
  timeslotType: "Arrival windows",
  drivingTime: 0,
  arrivalWindowLength: 60
}

const TimeslotTemplateModal = ({ isOpen, onClose, onSave, existingTemplate }) => {
  const [template, setTemplate] = useState(defaultTemplate)
  const [errors, setErrors] = useState({})

  const isEditMode = !!existingTemplate

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      if (existingTemplate) {
        setTemplate({ ...defaultTemplate, ...existingTemplate })
      } else {
        setTemplate(defaultTemplate)
      }
      setErrors({})
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, existingTemplate])

  const validateTemplate = () => {
    const newErrors = {}

    if (!template.name || template.name.trim() === '') {
      newErrors.name = 'Template name is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSave = () => {
    if (validateTemplate()) {
      onSave(template)
    }
  }

  // Generate example timeslots based on current settings
  const getExampleSlots = () => {
    const interval = template.drivingTime || 60
    const windowLen = template.arrivalWindowLength || 60
    const slots = []
    let startMin = 480 // 8:00 AM

    for (let i = 0; i < 3; i++) {
      const endMin = startMin + windowLen
      const startH = Math.floor(startMin / 60)
      const endH = Math.floor(endMin / 60)
      const startAmPm = startH >= 12 ? 'PM' : 'AM'
      const endAmPm = endH >= 12 ? 'PM' : 'AM'
      const startH12 = startH > 12 ? startH - 12 : (startH === 0 ? 12 : startH)
      const endH12 = endH > 12 ? endH - 12 : (endH === 0 ? 12 : endH)
      const startM = startMin % 60
      const endM = endMin % 60
      slots.push(`${startH12}:${startM.toString().padStart(2, '0')} ${startAmPm} - ${endH12}:${endM.toString().padStart(2, '0')} ${endAmPm}`)
      startMin = endMin
    }
    return slots
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/80" onClick={onClose}>
      <div
        className="fixed left-[50%] top-[50%] z-50 w-full max-w-lg translate-x-[-50%] translate-y-[-50%] rounded-lg border bg-white p-6 shadow-lg duration-200"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b pb-4">
          <h2 className="text-lg font-semibold">{isEditMode ? 'Edit Timeslot Template' : 'New Timeslot Template'}</h2>
          <button
            onClick={onClose}
            className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </button>
        </div>

        <div className="space-y-5 py-4">
          {errors.general && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-700">{errors.general}</p>
            </div>
          )}

          {/* Template Name */}
          <div className="space-y-1">
            <label className="text-sm font-medium">Template Name</label>
            <input
              type="text"
              value={template.name}
              onChange={(e) => setTemplate({ ...template, name: e.target.value })}
              placeholder="e.g., St. Petersburg, Jacksonville"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            />
            {errors.name && (
              <p className="text-sm text-red-600">{errors.name}</p>
            )}
          </div>

          {/* Description (optional) */}
          <div className="space-y-1">
            <label className="text-sm font-medium">Description <span className="text-gray-400">(optional)</span></label>
            <input
              type="text"
              value={template.description || ''}
              onChange={(e) => setTemplate({ ...template, description: e.target.value })}
              placeholder="Brief description of this template"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            />
          </div>

          {/* Timeslot Options */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Timeslot Options</h3>
            <div className="border border-gray-200 rounded-lg divide-y divide-gray-200">
              {/* Timeslot Format */}
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-sm text-gray-700">Timeslot format</span>
                <select
                  value={template.timeslotType}
                  onChange={(e) => setTemplate({ ...template, timeslotType: e.target.value })}
                  className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Arrival windows">Arrival windows</option>
                  <option value="Fixed length">Fixed length</option>
                </select>
              </div>

              {/* Timeslot Interval (driving time) */}
              <div className="flex items-center justify-between px-4 py-3">
                <div>
                  <span className="text-sm text-gray-700">Timeslot interval</span>
                  <p className="text-xs text-gray-400">Driving time blocked before each job</p>
                </div>
                <select
                  value={template.drivingTime}
                  onChange={(e) => setTemplate({ ...template, drivingTime: parseInt(e.target.value) })}
                  className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={0}>No buffer</option>
                  <option value={15}>15 minutes</option>
                  <option value={30}>30 minutes</option>
                  <option value={45}>45 minutes</option>
                  <option value={60}>1 hour</option>
                </select>
              </div>

              {/* Arrival Window Length */}
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-sm text-gray-700">Arrival window length</span>
                <select
                  value={template.arrivalWindowLength || 60}
                  onChange={(e) => setTemplate({ ...template, arrivalWindowLength: parseInt(e.target.value) })}
                  className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={30}>30 minutes</option>
                  <option value={60}>1 hour</option>
                  <option value={90}>1.5 hours</option>
                  <option value={120}>2 hours</option>
                  <option value={180}>3 hours</option>
                  <option value={240}>4 hours</option>
                </select>
              </div>
            </div>
          </div>

          {/* Example */}
          <div>
            <p className="text-xs font-medium text-gray-500 mb-2 text-right">EXAMPLE</p>
            <div className="flex flex-wrap gap-2 justify-end">
              {getExampleSlots().map((slot, i) => (
                <span key={i} className="px-3 py-1.5 bg-gray-100 border border-gray-200 rounded-md text-xs text-gray-700">
                  {slot}
                </span>
              ))}
            </div>
          </div>

          {/* Driving time info */}
          {template.drivingTime > 0 && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-xs text-amber-800">
                {template.drivingTime} minutes of driving time will be blocked before each job in the availability view.
              </p>
            </div>
          )}
        </div>

        <div className="flex justify-end pt-4 border-t">
          <button
            onClick={handleSave}
            className="inline-flex items-center justify-center whitespace-nowrap rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
          >
            {isEditMode ? 'Save Changes' : 'Save Template'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default TimeslotTemplateModal
