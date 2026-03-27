"use client"

import { MessageSquare, Calendar, FileText } from "lucide-react"

const RequestsSidebar = ({ activeFilter, onFilterChange }) => {
  const requestTypes = [
    { id: "all", label: "All", icon: MessageSquare, active: true },
    { id: "booking", label: "Booking Requests", icon: Calendar },
    { id: "quote", label: "Quote Requests", icon: FileText },
  ]

  return (
    <div className="w-64 bg-[var(--sf-bg-page)] border-r border-[var(--sf-border-light)] flex-shrink-0">
      <div className="p-4">
        <h3 className="text-xs font-semibold text-[var(--sf-text-muted)] uppercase tracking-wider mb-3">REQUEST TYPE</h3>
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
                    ? "bg-[var(--sf-blue-50)] text-[var(--sf-blue-500)] border border-blue-200"
                    : "text-[var(--sf-text-primary)] hover:bg-[var(--sf-bg-hover)] hover:text-[var(--sf-text-primary)]"
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
