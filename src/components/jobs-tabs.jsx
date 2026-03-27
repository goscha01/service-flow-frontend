"use client"

const JobsTabs = ({ activeTab, onTabChange }) => {
  const tabs = [
    { id: "all", label: "All Jobs" },
    { id: "upcoming", label: "Upcoming" },
    { id: "past", label: "Past" },
    { id: "complete", label: "Complete" },
    { id: "incomplete", label: "Incomplete" },
    { id: "canceled", label: "Canceled" },
    { id: "daterange", label: "Date Range" },
  ]

  return (
    <div className="border-b border-[var(--sf-border-light)] bg-white">
      <div className="px-4 lg:px-6">
        <nav className="flex space-x-8 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? "border-blue-500 text-[var(--sf-blue-500)]"
                  : "border-transparent text-[var(--sf-text-muted)] hover:text-[var(--sf-text-primary)] hover:border-[var(--sf-border-light)]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>
    </div>
  )
}

export default JobsTabs
