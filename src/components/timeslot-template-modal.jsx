"use client"

import { useState, useEffect } from "react"
import { X } from "lucide-react"

const defaultTemplate = {
  days: {
    Sunday: { enabled: false, startTime: "9:00 AM", endTime: "6:00 PM" },
    Monday: { enabled: true, startTime: "9:00 AM", endTime: "6:00 PM" },
    Tuesday: { enabled: true, startTime: "9:00 AM", endTime: "6:00 PM" },
    Wednesday: { enabled: true, startTime: "9:00 AM", endTime: "6:00 PM" },
    Thursday: { enabled: true, startTime: "9:00 AM", endTime: "6:00 PM" },
    Friday: { enabled: true, startTime: "9:00 AM", endTime: "6:00 PM" },
    Saturday: { enabled: false, startTime: "9:00 AM", endTime: "6:00 PM" }
  },
  timeslotType: "Arrival windows"
}

const TimeslotTemplateModal = ({ isOpen, onClose, onSave }) => {
  const [template, setTemplate] = useState(defaultTemplate)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      // Reset form when modal opens
      setTemplate(defaultTemplate)
      setErrors({})
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  const handleDayToggle = (day) => {
    setTemplate({
      ...template,
      days: {
        ...template.days,
        [day]: {
          ...template.days[day],
          enabled: !template.days[day].enabled
        }
      }
    })
  }

  const handleTimeChange = (day, field, value) => {
    setTemplate({
      ...template,
      days: {
        ...template.days,
        [day]: {
          ...template.days[day],
          [field]: value
        }
      }
    })
  }

  const handleTimeslotTypeChange = (type) => {
    setTemplate({
      ...template,
      timeslotType: type
    })
  }

  const validateTemplate = () => {
    const newErrors = {}
    
    // Check if at least one day is enabled
    const enabledDays = Object.values(template.days).filter(day => day.enabled)
    if (enabledDays.length === 0) {
      newErrors.general = 'At least one day must be enabled'
    }
    
    // Check if enabled days have valid times
    enabledDays.forEach(day => {
      if (!day.startTime || !day.endTime) {
        newErrors.general = 'All enabled days must have start and end times'
      }
    })
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSave = () => {
    if (validateTemplate()) {
      onSave(template)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/80" onClick={onClose}>
      <div 
        className="fixed left-[50%] top-[50%] z-50 w-full max-w-lg translate-x-[-50%] translate-y-[-50%] rounded-lg border bg-white p-6 shadow-lg duration-200"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b pb-4">
          <h2 className="text-lg font-semibold">New Timeslot Template</h2>
          <button
            onClick={onClose}
            className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </button>
        </div>

        <div className="space-y-4 py-4">
          {errors.general && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-700">{errors.general}</p>
            </div>
          )}
          
          {Object.entries(template.days).map(([day, { enabled, startTime, endTime }]) => (
            <div key={day} className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => handleDayToggle(day)}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                    enabled ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      enabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
                <span className="font-medium">{day}</span>
              </div>
              {enabled && (
                <div className="flex items-center space-x-2">
                  <select
                    value={startTime}
                    onChange={(e) => handleTimeChange(day, 'startTime', e.target.value)}
                    className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  >
                    {Array.from({ length: 24 }, (_, i) => {
                      const hour = i % 12 || 12
                      const ampm = i < 12 ? 'AM' : 'PM'
                      return `${hour}:00 ${ampm}`
                    }).map((time) => (
                      <option key={time} value={time}>{time}</option>
                    ))}
                  </select>
                  <span>to</span>
                  <select
                    value={endTime}
                    onChange={(e) => handleTimeChange(day, 'endTime', e.target.value)}
                    className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  >
                    {Array.from({ length: 24 }, (_, i) => {
                      const hour = i % 12 || 12
                      const ampm = i < 12 ? 'AM' : 'PM'
                      return `${hour}:00 ${ampm}`
                    }).map((time) => (
                      <option key={time} value={time}>{time}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          ))}

          <div className="space-y-2">
            <label className="text-sm font-medium">Timeslot Type</label>
            <div className="flex flex-col space-y-1.5">
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  checked={template.timeslotType === "Arrival windows"}
                  onChange={() => handleTimeslotTypeChange("Arrival windows")}
                  className="h-4 w-4 rounded-full border border-gray-300 text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                />
                <span>Arrival windows</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  checked={template.timeslotType === "Fixed length"}
                  onChange={() => handleTimeslotTypeChange("Fixed length")}
                  className="h-4 w-4 rounded-full border border-gray-300 text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                />
                <span>Fixed length</span>
              </label>
            </div>
            <p className="text-sm text-gray-500">
              Example: Monday 9:00 AM - 11:00 AM, 11:00 AM - 1:00 PM
            </p>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t">
          <button
            onClick={handleSave}
            className="inline-flex items-center justify-center whitespace-nowrap rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  )
}

export default TimeslotTemplateModal