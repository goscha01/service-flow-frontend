"use client"

import { Users, UserX, Filter, Clock, CheckCircle, PlayCircle, XCircle, AlertCircle, Calendar, MapPin } from "lucide-react"

const ScheduleSidebar = ({ filters, onFilterChange, teamMembers }) => {
  const statusOptions = [
    { id: "all", label: "All Statuses", icon: Filter },
    { id: "pending", label: "Pending", icon: AlertCircle, color: "text-yellow-600" },
    { id: "confirmed", label: "Confirmed", icon: CheckCircle, color: "text-blue-600" },
    { id: "in_progress", label: "In Progress", icon: PlayCircle, color: "text-orange-600" },
    { id: "completed", label: "Completed", icon: CheckCircle, color: "text-green-600" },
    { id: "cancelled", label: "Cancelled", icon: XCircle, color: "text-red-600" },
  ]

  const timeRangeOptions = [
    { id: "all", label: "All Day", icon: Calendar },
    { id: "morning", label: "Morning (Before 12 PM)", icon: Clock },
    { id: "afternoon", label: "Afternoon (12 PM - 5 PM)", icon: Clock },
    { id: "evening", label: "Evening (After 5 PM)", icon: Clock },
  ]

  // Get unique territories from team members
  const getTerritories = () => {
    const territories = new Set()
    teamMembers?.forEach(member => {
      if (member.territory) {
        territories.add(member.territory)
      }
    })
    return Array.from(territories).sort()
  }

  const territoryOptions = [
    { id: "all", label: "All Territories", icon: MapPin },
    ...getTerritories().map(territory => ({
      id: territory,
      label: territory,
      icon: MapPin
    }))
  ]

  const teamMemberOptions = [
    { id: "all", label: "All Jobs", icon: Users },
    { id: "unassigned", label: "Unassigned", icon: UserX },
    ...(teamMembers || []).map(member => ({
      id: member.id,
      label: `${member.first_name?.charAt(0) || ''}${member.last_name?.charAt(0) || ''} ${member.first_name || ''} ${member.last_name || ''} ${member.territory || ''}`,
      icon: Users,
      color: member.color || "#2563EB"
    }))
  ]

  return (
    <div className="w-full lg:w-64 bg-gray-50 border-r border-gray-200 flex-shrink-0 overflow-y-auto h-full">
      <div className="p-4 space-y-6">
        {/* Status Filter */}
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">STATUS</h3>
        <nav className="space-y-1">
            {statusOptions.map((option) => {
              const isActive = filters.status === option.id
            return (
              <button
                  key={option.id}
                  onClick={() => onFilterChange('status', option.id)}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left ${
                  isActive
                    ? "bg-blue-50 text-blue-700 border border-blue-200"
                    : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                }`}
              >
                  <option.icon className={`w-4 h-4 flex-shrink-0 ${option.color || ''}`} />
                  <span>{option.label}</span>
                </button>
              )
            })}
          </nav>
                  </div>

        {/* Team Member Filter */}
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">JOBS ASSIGNED TO</h3>
          <nav className="space-y-1">
            {teamMemberOptions.map((option) => {
              const isActive = filters.teamMember === option.id
              return (
                <button
                  key={option.id}
                  onClick={() => onFilterChange('teamMember', option.id)}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left ${
                    isActive
                      ? "bg-blue-50 text-blue-700 border border-blue-200"
                      : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                  }`}
                >
                  {option.color ? (
                    <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: option.color }}></div>
                  ) : (
                    <option.icon className="w-4 h-4 flex-shrink-0" />
                  )}
                  <span className="truncate">{option.label}</span>
                </button>
              )
            })}
          </nav>
        </div>

        {/* Territory Filter */}
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">TERRITORIES</h3>
          <nav className="space-y-1">
            {territoryOptions.map((option) => {
              const isActive = filters.territory === option.id
              return (
                <button
                  key={option.id}
                  onClick={() => onFilterChange('territory', option.id)}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left ${
                    isActive
                      ? "bg-blue-50 text-blue-700 border border-blue-200"
                      : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                  }`}
                >
                  <option.icon className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">{option.label}</span>
                </button>
              )
            })}
          </nav>
        </div>

        {/* Time Range Filter */}
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">TIME RANGE</h3>
          <nav className="space-y-1">
            {timeRangeOptions.map((option) => {
              const isActive = filters.timeRange === option.id
              return (
                <button
                  key={option.id}
                  onClick={() => onFilterChange('timeRange', option.id)}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left ${
                    isActive
                      ? "bg-blue-50 text-blue-700 border border-blue-200"
                      : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                  }`}
                >
                  <option.icon className="w-4 h-4 flex-shrink-0" />
                  <span>{option.label}</span>
              </button>
            )
          })}
        </nav>
        </div>

        {/* Clear Filters */}
        {(filters.status !== 'all' || filters.teamMember !== 'all' || filters.timeRange !== 'all' || filters.territory !== 'all') && (
          <div className="pt-4 border-t border-gray-200">
            <button
              onClick={() => {
                onFilterChange('status', 'all')
                onFilterChange('teamMember', 'all')
                onFilterChange('timeRange', 'all')
                onFilterChange('territory', 'all')
              }}
              className="w-full px-3 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Clear All Filters
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default ScheduleSidebar
