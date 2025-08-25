"use client"

import { MessageSquare, Calendar, FileText } from "lucide-react"

const RequestsSidebar = ({ activeFilter, onFilterChange }) => {
  const requestTypes = [
    { id: "all", label: "All", icon: MessageSquare, active: true },
    { id: "booking", label: "Booking Requests", icon: Calendar },
    { id: "quote", label: "Quote Requests", icon: FileText },
  ]

  return (
    <div className="w-64 bg-gray-50 border-r border-gray-200 flex-shrink-0">
      <div className="p-4">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">REQUEST TYPE</h3>
        <nav className="space-y-1">
          {requestTypes.map((type) => {
            const Icon = type.icon
            const isActive = activeFilter === type.id
            return (
              <button
                key={type.id}
                onClick={() => onFilterChange(type.id)}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left ${
                  isActive
                    ? "bg-blue-50 text-blue-700 border border-blue-200"
                    : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                }`}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span>{type.label}</span>
              </button>
            )
          })}
        </nav>
      </div>
    </div>
  )
}

export default RequestsSidebar
