"use client"

import { Calendar } from "lucide-react"

const ScheduleContent = ({ selectedDate }) => {
  return (
    <div className="flex-1 flex flex-col lg:flex-row">
      {/* Schedule Info */}
      <div className="lg:w-1/2 p-6 bg-white">
        {/* Metrics */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="text-center">
            <div className="text-2xl lg:text-3xl font-bold text-[var(--sf-text-primary)]">0</div>
            <div className="text-sm text-[var(--sf-text-secondary)]">jobs</div>
            <div className="text-xs text-[var(--sf-text-muted)]">On the schedule</div>
          </div>
          <div className="text-center">
            <div className="text-2xl lg:text-3xl font-bold text-[var(--sf-text-primary)]">0h 0m</div>
            <div className="text-sm text-[var(--sf-text-secondary)]">Est. duration</div>
          </div>
          <div className="text-center">
            <div className="text-2xl lg:text-3xl font-bold text-[var(--sf-text-primary)]">$0</div>
            <div className="text-sm text-[var(--sf-text-secondary)]">Est. earnings</div>
          </div>
        </div>

        {/* Empty State */}
        <div className="flex flex-col items-center justify-center py-12">
          <div className="w-16 h-16 bg-[var(--sf-bg-page)] rounded-full flex items-center justify-center mb-4">
            <Calendar className="w-8 h-8 text-[var(--sf-text-muted)]" />
          </div>
          <h3 className="text-lg font-semibold text-[var(--sf-text-primary)] mb-2">No scheduled jobs</h3>
          <p className="text-[var(--sf-text-secondary)] text-center">No jobs scheduled for {selectedDate}</p>
        </div>
      </div>

      {/* Map */}
      <div className="lg:w-1/2 bg-green-100 relative min-h-64 lg:min-h-full">
        {/* Map Controls */}
        <div className="absolute top-4 left-4 bg-white rounded shadow-sm border border-[var(--sf-border-light)] z-10">
          <button className="px-3 py-2 text-sm bg-white border-r border-[var(--sf-border-light)] rounded-l">Map</button>
          <button className="px-3 py-2 text-sm text-[var(--sf-text-secondary)] rounded-r">Satellite</button>
        </div>

        {/* Map Content - Placeholder */}
        <div className="w-full h-full flex items-center justify-center">
          <div className="text-center text-[var(--sf-text-muted)]">
            <div className="text-sm mb-2">Map View</div>
            <div className="text-xs">New York Area</div>
          </div>
        </div>

        {/* Fullscreen Button */}
        <button className="absolute top-4 right-4 w-8 h-8 bg-white rounded shadow-sm border border-[var(--sf-border-light)] flex items-center justify-center hover:bg-[var(--sf-bg-page)]">
          <svg className="w-4 h-4 text-[var(--sf-text-secondary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
            />
          </svg>
        </button>
      </div>
    </div>
  )
}

export default ScheduleContent
