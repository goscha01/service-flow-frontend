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
    <div className="border-b border-gray-200 bg-white">
      <div className="px-4 lg:px-6">
        <nav className="flex space-x-8 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
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
