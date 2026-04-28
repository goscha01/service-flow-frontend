"use client"

import { useEffect, useState } from "react"
import { X } from "lucide-react"
import { availabilityAPI } from "../services/api"

// Display-string <-> minutes mapping for the dropdowns.
// Keep both options arrays in sync with the DEFAULTS constants.
const INTERVAL_OPTIONS = [
  { label: "30 minutes", minutes: 30 },
  { label: "1 hour", minutes: 60 },
  { label: "2 hours", minutes: 120 },
]
const ARRIVAL_OPTIONS = [
  { label: "1 hour", minutes: 60 },
  { label: "2 hours", minutes: 120 },
  { label: "3 hours", minutes: 180 },
]

const DEFAULT_INTERVAL_MIN = 60
const DEFAULT_ARRIVAL_MIN = 120

const minutesToLabel = (mins, options, fallbackLabel) => {
  const found = options.find(o => o.minutes === mins)
  return found ? found.label : fallbackLabel
}
const labelToMinutes = (label, options, fallbackMin) => {
  const found = options.find(o => o.label === label)
  return found ? found.minutes : fallbackMin
}

const SchedulingBookingModal = ({ isOpen, onClose, userId }) => {
  const [settings, setSettings] = useState({
    timeslotInterval: minutesToLabel(DEFAULT_INTERVAL_MIN, INTERVAL_OPTIONS, "1 hour"),
    arrivalWindow: minutesToLabel(DEFAULT_ARRIVAL_MIN, ARRIVAL_OPTIONS, "2 hours"),
    availabilityMethod: "service-provider",
    serviceProviders: 1,
    limitDistance: false,
    dailyJobLimit: false,
    preventOutsideHours: false,
    minBookingNotice: "No lead time needed",
    maxBookingNotice: "No limit",
  })
  const [businessHours, setBusinessHours] = useState(null)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState("")

  // Load persisted scheduling settings whenever the modal opens.
  useEffect(() => {
    if (!isOpen || !userId) return
    let cancelled = false
    ;(async () => {
      try {
        setSaveError("")
        const resp = await availabilityAPI.getAvailability(userId)
        const bh = resp?.businessHours || resp?.business_hours || {}
        const parsed = typeof bh === "string" ? JSON.parse(bh) : bh
        if (cancelled) return
        setBusinessHours(parsed)
        const sched = parsed?.schedulingSettings || {}
        setSettings(prev => ({
          ...prev,
          timeslotInterval: minutesToLabel(
            sched.timeslotInterval ?? DEFAULT_INTERVAL_MIN,
            INTERVAL_OPTIONS,
            prev.timeslotInterval
          ),
          arrivalWindow: minutesToLabel(
            sched.arrivalWindow ?? DEFAULT_ARRIVAL_MIN,
            ARRIVAL_OPTIONS,
            prev.arrivalWindow
          ),
        }))
      } catch (err) {
        console.error("Error loading scheduling settings:", err)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [isOpen, userId])

  const handleToggle = (settingKey) => {
    setSettings(prev => ({
      ...prev,
      [settingKey]: !prev[settingKey]
    }))
  }

  const handleSave = async () => {
    if (!userId || !businessHours) {
      setSaveError("Cannot save — availability not loaded.")
      return
    }
    setIsSaving(true)
    setSaveError("")
    try {
      const intervalMin = labelToMinutes(settings.timeslotInterval, INTERVAL_OPTIONS, DEFAULT_INTERVAL_MIN)
      const arrivalMin = labelToMinutes(settings.arrivalWindow, ARRIVAL_OPTIONS, DEFAULT_ARRIVAL_MIN)
      const merged = {
        ...businessHours,
        schedulingSettings: {
          ...(businessHours.schedulingSettings || {}),
          timeslotInterval: intervalMin,
          arrivalWindow: arrivalMin,
        },
      }
      await availabilityAPI.updateAvailability({ businessHours: merged })
      setBusinessHours(merged)
      onClose?.()
    } catch (err) {
      console.error("Error saving scheduling settings:", err)
      setSaveError(err?.response?.data?.error || err?.message || "Save failed")
    } finally {
      setIsSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[var(--sf-border-light)]">
          <h2 className="text-xl font-semibold text-[var(--sf-text-primary)]">Scheduling & Booking</h2>
          <div className="flex items-center space-x-3">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="bg-[var(--sf-blue-500)] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[var(--sf-blue-600)] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSaving ? "Saving..." : "Save"}
            </button>
            <button onClick={onClose} className="p-2 hover:bg-[var(--sf-bg-hover)] rounded-lg">
              <X className="w-5 h-5 text-[var(--sf-text-muted)]" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-8">
          {saveError && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {saveError}
            </div>
          )}
          {/* Timeslot Options */}
          <div>
            <h3 className="text-lg font-semibold text-[var(--sf-text-primary)] mb-4">Timeslot Options</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-[var(--sf-text-primary)] mb-2">Timeslot interval</label>
                <p className="text-xs text-[var(--sf-text-muted)] mb-2">Controls how many timeslots are presented to customers</p>
                <select
                  value={settings.timeslotInterval}
                  onChange={(e) => setSettings(prev => ({ ...prev, timeslotInterval: e.target.value }))}
                  className="w-full border border-[var(--sf-border-light)] rounded-lg px-3 py-2 focus:ring-2 focus:ring-[var(--sf-blue-500)] focus:border-[var(--sf-blue-500)] outline-none"
                >
                  {INTERVAL_OPTIONS.map(opt => (
                    <option key={opt.minutes} value={opt.label}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--sf-text-primary)] mb-2">Arrival window length</label>
                <select
                  value={settings.arrivalWindow}
                  onChange={(e) => setSettings(prev => ({ ...prev, arrivalWindow: e.target.value }))}
                  className="w-full border border-[var(--sf-border-light)] rounded-lg px-3 py-2 focus:ring-2 focus:ring-[var(--sf-blue-500)] focus:border-[var(--sf-blue-500)] outline-none"
                >
                  {ARRIVAL_OPTIONS.map(opt => (
                    <option key={opt.minutes} value={opt.label}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Example Timeline */}
            <div className="mt-4 p-4 bg-[var(--sf-bg-page)] rounded-lg">
              <p className="text-sm font-medium text-[var(--sf-text-primary)] mb-2">EXAMPLE</p>
              <div className="flex items-center space-x-4 text-xs">
                <div className="text-center">
                  <div className="font-medium">8:00 AM - 10:00 AM</div>
                </div>
                <div className="text-center">
                  <div className="font-medium">9:00 AM - 11:00 AM</div>
                </div>
                <div className="text-center">
                  <div className="font-medium">10:00 AM - 12:00 PM</div>
                </div>
              </div>
            </div>
          </div>

          {/* Availability Options */}
          <div>
            <h3 className="text-lg font-semibold text-[var(--sf-text-primary)] mb-4">Availability Options</h3>
            <p className="text-sm text-[var(--sf-text-secondary)] mb-4">
              Control how Serviceflow should calculate bookable timeslots for your business
            </p>

            <div className="space-y-4">
              <div className="border border-blue-200 bg-[var(--sf-blue-50)] rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <input
                    type="radio"
                    name="availability"
                    checked={settings.availabilityMethod === "service-provider"}
                    onChange={() => setSettings(prev => ({ ...prev, availabilityMethod: "service-provider" }))}
                    className="mt-1"
                  />
                  <div>
                    <h4 className="font-medium text-[var(--sf-text-primary)]">Based on service provider availability</h4>
                    <p className="text-sm text-[var(--sf-text-secondary)] mt-1">
                      Shows a timeslot as available if the minimum number of service providers required for the job are
                      scheduled to work at the time and have no overlapping jobs assigned to them.
                    </p>
                    <div className="mt-3">
                      <input
                        type="number"
                        value={settings.serviceProviders}
                        onChange={(e) => setSettings(prev => ({ ...prev, serviceProviders: parseInt(e.target.value) }))}
                        className="w-20 border border-[var(--sf-border-light)] rounded px-2 py-1 text-sm"
                        min="1"
                      />
                      <span className="ml-2 text-sm text-[var(--sf-text-secondary)]">service provider</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border border-[var(--sf-border-light)] rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <input
                    type="radio"
                    name="availability"
                    checked={settings.availabilityMethod === "manual"}
                    onChange={() => setSettings(prev => ({ ...prev, availabilityMethod: "manual" }))}
                  />
                  <div>
                    <h4 className="font-medium text-[var(--sf-text-primary)]">Manual</h4>
                    <p className="text-sm text-[var(--sf-text-secondary)] mt-1">
                      Lets you set the maximum number of jobs that can be booked per slot or day.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Toggle Options */}
            <div className="space-y-4 mt-6">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-[var(--sf-text-primary)]">Limit Distance Between Jobs</h4>
                  <p className="text-sm text-[var(--sf-text-secondary)]">
                    Enable to limit the distance between jobs for providers. Affects which timeslots are available
                    depending on the location of the customer booking.
                  </p>
                </div>
                <button
                  onClick={() => handleToggle('limitDistance')}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    settings.limitDistance ? 'bg-[var(--sf-blue-500)]' : 'bg-gray-300'
                  }`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.limitDistance ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-[var(--sf-text-primary)]">Daily Job Limit</h4>
                </div>
                <button
                  onClick={() => handleToggle('dailyJobLimit')}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    settings.dailyJobLimit ? 'bg-[var(--sf-blue-500)]' : 'bg-gray-300'
                  }`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.dailyJobLimit ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-[var(--sf-text-primary)]">
                    Prevent bookings that would end outside of business hours
                  </h4>
                  <p className="text-sm text-[var(--sf-text-secondary)]">
                    Prevents services with long durations from being booked later in the day.
                  </p>
                </div>
                <button
                  onClick={() => handleToggle('preventOutsideHours')}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    settings.preventOutsideHours ? 'bg-[var(--sf-blue-500)]' : 'bg-gray-300'
                  }`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.preventOutsideHours ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
              </div>
            </div>
          </div>

          {/* Minimum & future booking lead time */}
          <div>
            <h3 className="text-lg font-semibold text-[var(--sf-text-primary)] mb-4">Minimum & future booking lead time</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-[var(--sf-text-primary)] mb-2">Min. booking notice</label>
                <p className="text-xs text-[var(--sf-text-muted)] mb-2">
                  How much lead time do you need before a job can be scheduled online?
                </p>
                <select
                  value={settings.minBookingNotice}
                  onChange={(e) => setSettings(prev => ({ ...prev, minBookingNotice: e.target.value }))}
                  className="w-full border border-[var(--sf-border-light)] rounded-lg px-3 py-2 focus:ring-2 focus:ring-[var(--sf-blue-500)] focus:border-[var(--sf-blue-500)] outline-none"
                >
                  <option>No lead time needed</option>
                  <option>1 hour</option>
                  <option>1 day</option>
                  <option>1 week</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--sf-text-primary)] mb-2">Max. booking notice</label>
                <p className="text-xs text-[var(--sf-text-muted)] mb-2">How far in advance can new jobs be scheduled online?</p>
                <select
                  value={settings.maxBookingNotice}
                  onChange={(e) => setSettings(prev => ({ ...prev, maxBookingNotice: e.target.value }))}
                  className="w-full border border-[var(--sf-border-light)] rounded-lg px-3 py-2 focus:ring-2 focus:ring-[var(--sf-blue-500)] focus:border-[var(--sf-blue-500)] outline-none"
                >
                  <option>No limit</option>
                  <option>1 month</option>
                  <option>3 months</option>
                  <option>6 months</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SchedulingBookingModal
