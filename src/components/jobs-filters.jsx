"use client"

import { useState, useEffect } from "react"
import { Search, ChevronDown, X, Calendar } from "lucide-react"
import { territoriesAPI } from "../services/api"
import { useAuth } from "../context/AuthContext"

const JobsFilters = ({ filters, onFilterChange, activeTab }) => {
  const [searchValue, setSearchValue] = useState(filters.search || "")
  const [showDateRange, setShowDateRange] = useState(false)
  const [territories, setTerritories] = useState([])
  const [territoryLoading, setTerritoryLoading] = useState(false)
  const { user } = useAuth();

  useEffect(() => {
    const fetchTerritories = async () => {
      if (!user?.id) return
      setTerritoryLoading(true)
      try {
        const data = await territoriesAPI.getAll(user.id)
        setTerritories(data.territories || data)
      } catch (e) {
        setTerritories([])
      } finally {
        setTerritoryLoading(false)
      }
    }
    fetchTerritories()
    // eslint-disable-next-line
  }, [user?.id])

  const handleSearchChange = (value) => {
    setSearchValue(value)
    onFilterChange({ search: value })
  }

  const handleInvoiceStatusChange = (value) => {
    onFilterChange({ invoiceStatus: value })
  }

  const handleAssignmentChange = (value) => {
    onFilterChange({ teamMember: value })
  }

  const handleSortChange = (value) => {
    const [sortBy, sortOrder] = value.split(":")
    onFilterChange({ sortBy, sortOrder })
  }

  const handleDateRangeChange = (startDate, endDate) => {
    onFilterChange({ 
      dateRange: startDate && endDate ? `${startDate}:${endDate}` : "" 
    })
  }

  const clearFilters = () => {
    setSearchValue("")
    onFilterChange({
      search: "",
      invoiceStatus: "",
      teamMember: "",
      sortBy: "scheduled_date",
      sortOrder: "ASC",
      dateRange: "",
      territoryId: ""
    })
  }

  const hasActiveFilters = filters.search || filters.invoiceStatus || filters.teamMember || 
    filters.sortBy !== "scheduled_date" || filters.sortOrder !== "ASC" || filters.dateRange || filters.territoryId

  // Parse date range if it exists
  const [startDate, endDate] = filters.dateRange ? filters.dateRange.split(":") : ["", ""]

  return (
    <div className="bg-white border-b border-gray-200 px-4 lg:px-6 py-4">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search jobs..."
            value={searchValue}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
        </div>

        {/* Date Range Picker - Show when Date Range tab is active */}
        {activeTab === "daterange" && (
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => handleDateRangeChange(e.target.value, endDate)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
            <span className="text-gray-500">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => handleDateRangeChange(startDate, e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
          {/* Territory Filter */}
          <div className="relative">
            <select
              value={filters.territoryId || ""}
              onChange={e => onFilterChange({ territoryId: e.target.value })}
              className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-8 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              disabled={territoryLoading}
            >
              <option value="">All Territories</option>
              {territories.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
          </div>

          <div className="relative">
            <select 
              value={filters.invoiceStatus || ""}
              onChange={(e) => handleInvoiceStatusChange(e.target.value)}
              className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-8 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              <option value="">Any invoice status</option>
              <option value="invoiced">Invoiced</option>
              <option value="not_invoiced">Not invoiced</option>
              <option value="paid">Paid</option>
              <option value="unpaid">Unpaid</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
          </div>

          <div className="relative">
            <select 
              value={filters.teamMember || ""}
              onChange={(e) => handleAssignmentChange(e.target.value)}
              className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-8 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              <option value="">Assigned All</option>
              <option value="assigned">Assigned to me</option>
              <option value="unassigned">Unassigned</option>
              <option value="web">Just web</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
          </div>

          <div className="relative">
            <select 
              value={`${filters.sortBy || "scheduled_date"}:${filters.sortOrder || "ASC"}`}
              onChange={(e) => handleSortChange(e.target.value)}
              className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-8 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              <option value="scheduled_date:ASC">Sort by: Soonest</option>
              <option value="scheduled_date:DESC">Sort by: Latest</option>
              <option value="customer_first_name:ASC">Sort by: Customer</option>
              <option value="service_price:DESC">Sort by: Value</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
          </div>

          {/* Clear Filters Button */}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center space-x-1 px-3 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
              <span>Clear</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default JobsFilters
