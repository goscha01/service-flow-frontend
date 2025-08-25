"use client"

import { useState } from "react"
import { X } from "lucide-react"

const SchedulingBookingModal = ({ isOpen, onClose }) => {
  const [settings, setSettings] = useState({
    timeslotInterval: "1 hour",
    arrivalWindow: "2 hours",
    availabilityMethod: "service-provider",
    serviceProviders: 1,
    limitDistance: false,
    dailyJobLimit: false,
    preventOutsideHours: false,
    minBookingNotice: "No lead time needed",
    maxBookingNotice: "No limit",
  })

  const handleToggle = (settingKey) => {
    setSettings(prev => ({
      ...prev,
      [settingKey]: !prev[settingKey]
    }))
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Scheduling & Booking</h2>
          <div className="flex items-center space-x-3">
            <button className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
              Save
            </button>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-8">
          {/* Timeslot Options */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Timeslot Options</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Timeslot interval</label>
                <p className="text-xs text-gray-500 mb-2">Controls how many timeslots are presented to customers</p>
                <select 
                  value={settings.timeslotInterval}
                  onChange={(e) => setSettings(prev => ({ ...prev, timeslotInterval: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                >
                  <option>1 hour</option>
                  <option>30 minutes</option>
                  <option>2 hours</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Arrival window length</label>
                <select 
                  value={settings.arrivalWindow}
                  onChange={(e) => setSettings(prev => ({ ...prev, arrivalWindow: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                >
                  <option>2 hours</option>
                  <option>1 hour</option>
                  <option>3 hours</option>
                </select>
              </div>
            </div>

            {/* Example Timeline */}
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium text-gray-700 mb-2">EXAMPLE</p>
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
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Availability Options</h3>
            <p className="text-sm text-gray-600 mb-4">
              Control how Zenbooker should calculate bookable timeslots for your business
            </p>

            <div className="space-y-4">
              <div className="border border-blue-200 bg-blue-50 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <input 
                    type="radio" 
                    name="availability" 
                    checked={settings.availabilityMethod === "service-provider"}
                    onChange={() => setSettings(prev => ({ ...prev, availabilityMethod: "service-provider" }))}
                    className="mt-1" 
                  />
                  <div>
                    <h4 className="font-medium text-gray-900">Based on service provider availability</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      Shows a timeslot as available if the minimum number of service providers required for the job are
                      scheduled to work at the time and have no overlapping jobs assigned to them.
                    </p>
                    <div className="mt-3">
                      <input
                        type="number"
                        value={settings.serviceProviders}
                        onChange={(e) => setSettings(prev => ({ ...prev, serviceProviders: parseInt(e.target.value) }))}
                        className="w-20 border border-gray-300 rounded px-2 py-1 text-sm"
                        min="1"
                      />
                      <span className="ml-2 text-sm text-gray-600">service provider</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <input 
                    type="radio" 
                    name="availability" 
                    checked={settings.availabilityMethod === "manual"}
                    onChange={() => setSettings(prev => ({ ...prev, availabilityMethod: "manual" }))}
                  />
                  <div>
                    <h4 className="font-medium text-gray-900">Manual</h4>
                    <p className="text-sm text-gray-600 mt-1">
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
                  <h4 className="font-medium text-gray-900">Limit Distance Between Jobs</h4>
                  <p className="text-sm text-gray-600">
                    Enable to limit the distance between jobs for providers. Affects which timeslots are available
                    depending on the location of the customer booking.
                  </p>
                </div>
                <button 
                  onClick={() => handleToggle('limitDistance')}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    settings.limitDistance ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.limitDistance ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-gray-900">Daily Job Limit</h4>
                </div>
                <button 
                  onClick={() => handleToggle('dailyJobLimit')}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    settings.dailyJobLimit ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.dailyJobLimit ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-gray-900">
                    Prevent bookings that would end outside of business hours
                  </h4>
                  <p className="text-sm text-gray-600">
                    Prevents services with long durations from being booked later in the day.
                  </p>
                </div>
                <button 
                  onClick={() => handleToggle('preventOutsideHours')}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    settings.preventOutsideHours ? 'bg-blue-600' : 'bg-gray-300'
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
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Minimum & future booking lead time</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Min. booking notice</label>
                <p className="text-xs text-gray-500 mb-2">
                  How much lead time do you need before a job can be scheduled online?
                </p>
                <select 
                  value={settings.minBookingNotice}
                  onChange={(e) => setSettings(prev => ({ ...prev, minBookingNotice: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                >
                  <option>No lead time needed</option>
                  <option>1 hour</option>
                  <option>1 day</option>
                  <option>1 week</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Max. booking notice</label>
                <p className="text-xs text-gray-500 mb-2">How far in advance can new jobs be scheduled online?</p>
                <select 
                  value={settings.maxBookingNotice}
                  onChange={(e) => setSettings(prev => ({ ...prev, maxBookingNotice: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
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
