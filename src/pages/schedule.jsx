import React, { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import Sidebar from '../components/sidebar'
import MobileHeader from '../components/mobile-header'
import TeamCalendar from '../components/team-calendar'
import UpdateAvailabilityModal from '../components/update-availability-modal'
import { Calendar, Plus, Clock, Users } from 'lucide-react'

const Schedule = () => {
  const { user } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState(null)
  const [showAvailabilityModal, setShowAvailabilityModal] = useState(false)
  const [selectedDates, setSelectedDates] = useState([])

  const handleDateClick = (date) => {
    setSelectedDate(date)
    setSelectedDates([date.toISOString().split('T')[0]])
    setShowAvailabilityModal(true)
  }

  const handleAvailabilitySave = (availabilityData) => {
    console.log('Availability saved:', availabilityData)
    // Here you would save the availability data to the backend
    setShowAvailabilityModal(false)
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Please log in</h2>
          <p className="text-gray-600">You need to be logged in to view the schedule.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <MobileHeader onMenuClick={() => setSidebarOpen(true)} />
      
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      {/* Main Content */}
      <div className="lg:pl-64">
        <div className="p-6">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Schedule</h1>
                <p className="text-gray-600">Manage your team's availability and schedule</p>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setShowAvailabilityModal(true)}
                  className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Availability</span>
                </button>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Calendar className="w-6 h-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Jobs</p>
                  <p className="text-2xl font-bold text-gray-900">24</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Users className="w-6 h-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Team Members</p>
                  <p className="text-2xl font-bold text-gray-900">8</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Clock className="w-6 h-6 text-yellow-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Hours This Week</p>
                  <p className="text-2xl font-bold text-gray-900">156</p>
                </div>
              </div>
            </div>
          </div>

          {/* Team Calendar */}
          <div className="mb-6">
            <TeamCalendar 
              userId={user.id}
              onDateClick={handleDateClick}
              selectedDate={selectedDate}
            />
          </div>

          {/* Selected Date Details */}
          {selectedDate && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Schedule for {selectedDate.toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Team member availability for selected date */}
                <div className="p-4 border border-gray-200 rounded-lg">
                  <h4 className="font-medium text-gray-900">Morning Shift</h4>
                  <p className="text-sm text-gray-600">9:00 AM - 12:00 PM</p>
                  <div className="mt-2 space-y-2">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 rounded-full bg-blue-600"></div>
                      <span className="text-sm">John Doe</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 rounded-full bg-green-600"></div>
                      <span className="text-sm">Jane Smith</span>
                    </div>
                  </div>
                </div>
                
                <div className="p-4 border border-gray-200 rounded-lg">
                  <h4 className="font-medium text-gray-900">Afternoon Shift</h4>
                  <p className="text-sm text-gray-600">1:00 PM - 5:00 PM</p>
                  <div className="mt-2 space-y-2">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 rounded-full bg-purple-600"></div>
                      <span className="text-sm">Mike Johnson</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 rounded-full bg-orange-600"></div>
                      <span className="text-sm">Sarah Wilson</span>
                    </div>
                  </div>
                </div>
                
                <div className="p-4 border border-gray-200 rounded-lg">
                  <h4 className="font-medium text-gray-900">Evening Shift</h4>
                  <p className="text-sm text-gray-600">6:00 PM - 9:00 PM</p>
                  <div className="mt-2 space-y-2">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 rounded-full bg-red-600"></div>
                      <span className="text-sm">Tom Brown</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Update Availability Modal */}
      <UpdateAvailabilityModal
        isOpen={showAvailabilityModal}
        onClose={() => setShowAvailabilityModal(false)}
        onSave={handleAvailabilitySave}
        selectedDates={selectedDates}
        availability={[]}
      />
    </div>
  )
}

export default Schedule
