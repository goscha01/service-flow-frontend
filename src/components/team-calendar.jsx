import React, { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Calendar, Clock, User } from 'lucide-react'
import { teamAPI } from '../services/api'

const TeamCalendar = ({ userId, onDateClick, selectedDate }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [teamMembers, setTeamMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [availabilityData, setAvailabilityData] = useState({})

  useEffect(() => {
    fetchTeamMembers()
  }, [userId])

  const fetchTeamMembers = async () => {
    try {
      setLoading(true)
      const response = await teamAPI.getAll(userId)
      setTeamMembers(response.teamMembers || [])
    } catch (error) {
      console.error('Error fetching team members:', error)
    } finally {
      setLoading(false)
    }
  }

  const generateCalendarDays = () => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startDate = new Date(firstDay)
    startDate.setDate(startDate.getDate() - firstDay.getDay())
    
    const days = []
    const currentDate = new Date(startDate)
    
    for (let i = 0; i < 42; i++) {
      days.push(new Date(currentDate))
      currentDate.setDate(currentDate.getDate() + 1)
    }
    
    return days
  }

  const isCurrentMonth = (date) => {
    return date.getMonth() === currentMonth.getMonth()
  }

  const isToday = (date) => {
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  const isSelected = (date) => {
    if (!selectedDate) return false
    return date.toDateString() === selectedDate.toDateString()
  }

  const getTeamMemberColor = (memberId) => {
    const member = teamMembers.find(m => m.id === memberId)
    return member?.color || '#2563EB'
  }

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Calendar Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center space-x-4">
          <Calendar className="w-5 h-5 text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-900">Team Calendar</h3>
        </div>
        <div className="flex items-center space-x-2">
          <button 
            onClick={() => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1))}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <h4 className="text-lg font-medium min-w-[200px] text-center">
            {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
          </h4>
          <button 
            onClick={() => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1))}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Team Members Legend */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex flex-wrap gap-3">
          {teamMembers.map((member) => (
            <div key={member.id} className="flex items-center space-x-2">
              <div 
                className="w-4 h-4 rounded-full border border-gray-300"
                style={{ backgroundColor: member.color }}
              />
              <span className="text-sm font-medium text-gray-700">
                {member.first_name} {member.last_name}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="p-4">
        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {dayNames.map(day => (
            <div key={day} className="p-2 text-center text-sm font-medium text-gray-500">
              {day}
            </div>
          ))}
        </div>
        
        {/* Calendar days */}
        <div className="grid grid-cols-7 gap-1">
          {generateCalendarDays().map((date, index) => (
            <button
              key={index}
              onClick={() => onDateClick && onDateClick(date)}
              className={`p-3 text-sm rounded-lg hover:bg-gray-50 transition-colors ${
                isSelected(date) 
                  ? 'bg-blue-600 text-white hover:bg-blue-700' 
                  : isToday(date)
                    ? 'bg-blue-100 text-blue-900 font-semibold'
                    : isCurrentMonth(date) 
                      ? 'text-gray-900' 
                      : 'text-gray-400'
              }`}
            >
              <div className="flex flex-col items-center space-y-1">
                <span>{date.getDate()}</span>
                {/* Team member availability indicators */}
                <div className="flex space-x-1">
                  {teamMembers.slice(0, 3).map((member) => (
                    <div
                      key={member.id}
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: member.color }}
                      title={`${member.first_name} ${member.last_name}`}
                    />
                  ))}
                  {teamMembers.length > 3 && (
                    <div className="w-2 h-2 rounded-full bg-gray-300" title={`+${teamMembers.length - 3} more`} />
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Team Member Status */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {teamMembers.map((member) => (
            <div key={member.id} className="flex items-center space-x-3 p-3 bg-white rounded-lg border border-gray-200">
              <div 
                className="w-6 h-6 rounded-full border border-gray-300 flex-shrink-0"
                style={{ backgroundColor: member.color }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {member.first_name} {member.last_name}
                </p>
                <p className="text-xs text-gray-500">{member.role}</p>
              </div>
              <div className="flex items-center space-x-1">
                <Clock className="w-4 h-4 text-gray-400" />
                <span className="text-xs text-gray-500">
                  {member.availability ? 'Available' : 'Busy'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default TeamCalendar
