"use client"

import { useState, useEffect } from "react"
import Sidebar from "../components/sidebar"
import MobileHeader from "../components/mobile-header"
import TerritoryMap from "../components/territory-map"
import { 
  Plus, 
  Search, 
  Filter, 
  MapPin, 
  Clock, 
  Users, 
  DollarSign, 
  Edit, 
  Trash2, 
  Eye, 
  Settings,
  Calendar,
  Globe,
  Target,
  Loader2
} from "lucide-react"
import { useAuth } from "../context/AuthContext"
import { territoriesAPI } from "../services/api"
import CreateTerritoryModal from "../components/create-territory-modal"

const ServiceFlowTerritories = () => {
  const { user, authLoading } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [territories, setTerritories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [selectedTerritory, setSelectedTerritory] = useState(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [filters, setFilters] = useState({
    status: "",
    search: "",
    sortBy: "name",
    sortOrder: "ASC"
  })
  const [viewMode, setViewMode] = useState("list") // "list" or "map"

  // Initial data fetch
  useEffect(() => {
    if (!authLoading && user?.id) {
      fetchTerritories()
    } else if (!authLoading && !user?.id) {
      window.location.href = '/signin'
    }
  }, [authLoading, user?.id])

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (user?.id) {
        fetchTerritories()
      }
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [filters.status, filters.search, filters.sortBy, filters.sortOrder, user?.id])

  const fetchTerritories = async () => {
    if (!user?.id) return
    
    try {
      setLoading(true)
      setError("")
      
      const response = await territoriesAPI.getAll(user.id, {
        status: filters.status,
        search: filters.search,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
        page: 1,
        limit: 50
      })
      
      setTerritories(response.territories || [])
    } catch (error) {
      console.error('Error fetching territories:', error)
      setError("Failed to load territories. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }))
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'inactive': return 'bg-gray-100 text-gray-800'
      case 'archived': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusLabel = (status) => {
    switch (status) {
      case 'active': return 'ACTIVE'
      case 'inactive': return 'INACTIVE'
      case 'archived': return 'ARCHIVED'
      default: return 'UNKNOWN'
    }
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0)
  }

  const handleCreateTerritory = () => {
    setIsCreateModalOpen(true)
  }

  const handleEditTerritory = (territory) => {
    setSelectedTerritory(territory)
    setIsEditModalOpen(true)
  }

  const handleTerritoryUpdate = () => {
    fetchTerritories()
    setIsCreateModalOpen(false)
    setIsEditModalOpen(false)
    setSelectedTerritory(null)
  }

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <div className="flex-1 flex flex-col overflow-hidden lg:ml-64 xl:ml-72">
        <MobileHeader onMenuClick={() => setSidebarOpen(true)} />
        
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Header */}
            <div className="mb-8">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Service Territories</h1>
                  <p className="mt-1 text-sm text-gray-500">
                    Manage your service areas, pricing, and team assignments
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
                  <button 
                    onClick={handleCreateTerritory}
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Territory
                  </button>
                </div>
              </div>
            </div>

            {/* View Toggle */}
            <div className="mb-6">
              <div className="flex items-center space-x-2 bg-gray-100 rounded-lg p-1 w-fit">
                <button
                  onClick={() => setViewMode("list")}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                    viewMode === "list" 
                      ? "bg-white text-gray-900 shadow-sm" 
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  List View
                </button>
                <button
                  onClick={() => setViewMode("map")}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                    viewMode === "map" 
                      ? "bg-white text-gray-900 shadow-sm" 
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  Map View
                </button>
              </div>
            </div>

            {/* Filters */}
            <div className="bg-white shadow rounded-lg mb-6">
              <div className="px-4 py-5 sm:p-6">
                <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input
                        type="text"
                        placeholder="Search territories..."
                        value={filters.search}
                        onChange={(e) => handleFilterChange({ search: e.target.value })}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <select
                      value={filters.status}
                      onChange={(e) => handleFilterChange({ status: e.target.value })}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">All Status</option>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="archived">Archived</option>
                    </select>
                    <select
                      value={filters.sortBy}
                      onChange={(e) => handleFilterChange({ sortBy: e.target.value })}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="name">Name</option>
                      <option value="created_at">Created Date</option>
                      <option value="total_jobs">Total Jobs</option>
                      <option value="total_revenue">Revenue</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {/* Territories List */}
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              </div>
            ) : territories.length === 0 ? (
              <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
                <MapPin className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No territories found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Get started by creating your first service territory.
                </p>
                <div className="mt-6">
                  <button 
                    onClick={handleCreateTerritory}
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Territory
                  </button>
                </div>
              </div>
            ) : viewMode === "map" ? (
              /* Map View */
              <div className="space-y-6">
                {territories.map((territory) => (
                  <TerritoryMap 
                    key={territory.id}
                    territory={territory}
                    height="400px"
                    showDetails={true}
                    className="shadow-lg"
                  />
                ))}
              </div>
            ) : (
              /* List View */
              <div className="bg-white shadow overflow-hidden sm:rounded-md">
                <ul className="divide-y divide-gray-200">
                  {territories.map((territory) => (
                    <li key={territory.id}>
                      <div className="px-4 py-4 sm:px-6">
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-3">
                              <div className="flex-shrink-0">
                                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                                  <MapPin className="w-5 h-5 text-blue-600" />
                                </div>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center space-x-2">
                                  <p className="text-sm font-medium text-gray-900 truncate">
                                    {territory.name}
                                  </p>
                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(territory.status)}`}>
                                    {getStatusLabel(territory.status)}
                                  </span>
                                </div>
                                <div className="mt-1 flex items-center space-x-4 text-sm text-gray-500">
                                  <div className="flex items-center space-x-1">
                                    <Globe className="w-4 h-4" />
                                    <span>{territory.location}</span>
                                  </div>
                                  <div className="flex items-center space-x-1">
                                    <Target className="w-4 h-4" />
                                    <span>{territory.radius_miles} miles</span>
                                  </div>
                                  <div className="flex items-center space-x-1">
                                    <Users className="w-4 h-4" />
                                    <span>{territory.team_members?.length || 0} team members</span>
                                  </div>
                                  <div className="flex items-center space-x-1">
                                    <DollarSign className="w-4 h-4" />
                                    <span>{territory.pricing_multiplier}x pricing</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                                                     <div className="flex items-center space-x-2">
                             <button className="p-2 text-gray-400 hover:text-gray-600">
                               <Eye className="w-4 h-4" />
                             </button>
                             <button 
                               onClick={() => handleEditTerritory(territory)}
                               className="p-2 text-gray-400 hover:text-blue-600"
                             >
                               <Edit className="w-4 h-4" />
                             </button>
                             <button className="p-2 text-gray-400 hover:text-red-600">
                               <Trash2 className="w-4 h-4" />
                             </button>
                           </div>
                        </div>
                        
                        {/* Territory Stats */}
                        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
                          <div className="text-center">
                            <p className="text-2xl font-bold text-gray-900">{territory.total_jobs || 0}</p>
                            <p className="text-xs text-gray-500">Total Jobs</p>
                          </div>
                          <div className="text-center">
                            <p className="text-2xl font-bold text-gray-900">{territory.completed_jobs || 0}</p>
                            <p className="text-xs text-gray-500">Completed</p>
                          </div>
                          <div className="text-center">
                            <p className="text-2xl font-bold text-gray-900">{formatCurrency(territory.total_revenue)}</p>
                            <p className="text-xs text-gray-500">Revenue</p>
                          </div>
                          <div className="text-center">
                            <p className="text-2xl font-bold text-gray-900">{formatCurrency(territory.avg_job_value)}</p>
                            <p className="text-xs text-gray-500">Avg Job Value</p>
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Territory Creation Modal */}
      <CreateTerritoryModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={handleTerritoryUpdate}
        userId={user?.id}
      />

      {/* Territory Edit Modal */}
      <CreateTerritoryModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSuccess={handleTerritoryUpdate}
        territory={selectedTerritory}
        isEditing={true}
        userId={user?.id}
      />
    </div>
  )
}

export default ServiceFlowTerritories
