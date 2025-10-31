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
  Loader2,
  ChevronDown,
  ArrowUpDown
} from "lucide-react"
import { useAuth } from "../context/AuthContext"
import { useNavigate } from "react-router-dom"
import { territoriesAPI } from "../services/api"
import CreateTerritoryModal from "../components/create-territory-modal"

const ServiceFlowTerritories = () => {
  const { user, authLoading } = useAuth()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [territories, setTerritories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [successMessage, setSuccessMessage] = useState("")
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [selectedTerritory, setSelectedTerritory] = useState(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [enforceServiceArea, setEnforceServiceArea] = useState(false)
  const [filters, setFilters] = useState({
    status: "active",
    search: "",
    sortBy: "name",
    sortOrder: "ASC"
  })

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
      case 'active': return 'bg-green-100 text-green-700'
      case 'inactive': return 'bg-gray-100 text-gray-700'
      case 'archived': return 'bg-red-100 text-red-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  const getStatusLabel = (status) => {
    switch (status) {
      case 'active': return 'Enabled'
      case 'inactive': return 'Disabled'
      case 'archived': return 'Archived'
      default: return 'Unknown'
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

  const handleEditTerritory = (e, territory) => {
    e.stopPropagation() // Prevent card click navigation
    setSelectedTerritory(territory)
    setIsEditModalOpen(true)
  }

  const handleTerritoryUpdate = () => {
    fetchTerritories()
    setIsCreateModalOpen(false)
    setIsEditModalOpen(false)
    setSelectedTerritory(null)
  }

  const handleDeleteTerritory = async (e, territory) => {
    e.stopPropagation() // Prevent card click navigation

    if (!window.confirm(`Are you sure you want to delete "${territory.name}"? This action cannot be undone.`)) {
      return
    }

    try {
      setLoading(true)
      await territoriesAPI.delete(territory.id)
      setSuccessMessage(`Territory "${territory.name}" deleted successfully`)
      setTimeout(() => setSuccessMessage(""), 3000)
      fetchTerritories()
    } catch (error) {
      console.error('Error deleting territory:', error)
      setError(`Failed to delete territory: ${error.response?.data?.error || error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleTerritoryClick = (territory) => {
    // Navigate to territory details page
    navigate(`/territories/${territory.id}`)
  }

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  const activeCount = territories.filter(t => t.status === 'active').length
  const disabledCount = territories.filter(t => t.status === 'inactive').length

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col overflow-hidden lg:ml-64 xl:ml-72">
        <MobileHeader onMenuClick={() => setSidebarOpen(true)} />

        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Header */}
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Service Territories</h1>
              <p className="text-gray-600 text-sm mb-1">
                Manage the geographic areas where you provide services and do work. You can create multiple service territories with unique hours, services, and service providers.{' '}
                <a href="#" className="text-blue-600 hover:text-blue-700">Learn more</a>
              </p>
              <p className="text-gray-600 text-sm">
                You are currently using <span className="font-medium text-gray-900">{activeCount} of 2</span> service territories available on your plan.
              </p>
            </div>

            {/* Filters Bar */}
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {/* Active/Disabled Tabs */}
                <button
                  onClick={() => handleFilterChange({ status: 'active' })}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filters.status === 'active'
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  Active <span className="ml-1">{activeCount}</span>
                </button>
                <button
                  onClick={() => handleFilterChange({ status: 'inactive' })}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filters.status === 'inactive'
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  Disabled
                </button>

                {/* Sort Dropdown */}
                <div className="relative">
                  <button className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                    Sort <ArrowUpDown className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
                  Geofence Editor
                </button>
                <button
                  onClick={handleCreateTerritory}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  New Territory
                </button>
              </div>
            </div>

            {/* Enforce Service Area Section */}
            <div className="mb-6 bg-gray-50 border border-gray-200 rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold text-gray-900 mb-1">Enforce Service Area</h3>
                  <p className="text-sm text-gray-600">
                    Prevent customers from booking jobs online at locations that are outside of your territories' service areas.
                  </p>
                </div>
                <div className="ml-6">
                  <button
                    onClick={() => setEnforceServiceArea(!enforceServiceArea)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      enforceServiceArea ? 'bg-blue-600' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        enforceServiceArea ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>

            {/* Success Message */}
            {successMessage && (
              <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm text-green-800">{successMessage}</p>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {/* Territories Grid */}
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
                    New Territory
                  </button>
                </div>
              </div>
            ) : (
              /* Grid View */
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {territories.map((territory) => (
                  <div
                    key={territory.id}
                    onClick={() => handleTerritoryClick(territory)}
                    className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                  >
                    <div className="flex flex-col sm:flex-row h-full">
                      {/* Map Section - Left Side */}
                      <div className="sm:w-1/2 h-64 sm:h-auto relative bg-gray-100">
                        <TerritoryMap
                          territory={territory}
                          height="100%"
                          showDetails={false}
                        />
                      </div>

                      {/* Details Section - Right Side */}
                      <div className="sm:w-1/2 p-6 flex flex-col">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <h3 className="text-xl font-bold text-gray-900 truncate">{territory.name}</h3>
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium whitespace-nowrap ${getStatusColor(territory.status)}`}>
                                {getStatusLabel(territory.status)}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 truncate">{territory.location}</p>
                          </div>
                        </div>

                        {/* Territory Details Grid */}
                        <div className="space-y-3 flex-1">
                          <div className="flex items-center text-sm">
                            <div className="flex items-center text-gray-500 w-36 flex-shrink-0">
                              <Target className="w-4 h-4 mr-2" />
                              <span className="font-medium text-xs">SERVICE AREA</span>
                            </div>
                            <span className="text-gray-900 text-sm">{territory.radius_miles} mile radius</span>
                          </div>

                          <div className="flex items-center text-sm">
                            <div className="flex items-center text-gray-500 w-36 flex-shrink-0">
                              <Globe className="w-4 h-4 mr-2" />
                              <span className="font-medium text-xs">TIMEZONE</span>
                            </div>
                            <span className="text-gray-900 text-sm truncate">{territory.timezone || 'America/New_York'}</span>
                          </div>

                          <div className="flex items-center text-sm">
                            <div className="flex items-center text-gray-500 w-36 flex-shrink-0">
                              <Calendar className="w-4 h-4 mr-2" />
                              <span className="font-medium text-xs">ONLINE BOOKING</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="inline-block w-2 h-2 bg-green-500 rounded-full"></span>
                              <span className="text-gray-900 text-sm">On</span>
                            </div>
                          </div>

                          <div className="flex items-center text-sm">
                            <div className="flex items-center text-gray-500 w-36 flex-shrink-0">
                              <Users className="w-4 h-4 mr-2" />
                              <span className="font-medium text-xs">PROVIDERS</span>
                            </div>
                            <div className="flex items-center gap-2">
                              {territory.team_members && territory.team_members.length > 0 ? (
                                <>
                                  <div className="flex -space-x-2">
                                    {territory.team_members.slice(0, 3).map((member, idx) => (
                                      <div key={idx} className="w-6 h-6 rounded-full bg-orange-300 border-2 border-white flex items-center justify-center text-xs font-medium text-white">
                                        {member.initials || 'JW'}
                                      </div>
                                    ))}
                                  </div>
                                  {territory.team_members.length > 3 && (
                                    <span className="text-gray-600 text-sm">+{territory.team_members.length - 3}</span>
                                  )}
                                </>
                              ) : (
                                <div className="w-6 h-6 rounded-full bg-orange-300 border-2 border-white flex items-center justify-center text-xs font-medium text-white">
                                  JW
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center text-sm">
                            <div className="flex items-center text-gray-500 w-36 flex-shrink-0">
                              <Settings className="w-4 h-4 mr-2" />
                              <span className="font-medium text-xs">SERVICES</span>
                            </div>
                            <span className="text-gray-900 text-sm">All services</span>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-2">
                          <button
                            onClick={(e) => handleEditTerritory(e, territory)}
                            className="flex-1 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center justify-center gap-2"
                          >
                            <Edit className="w-4 h-4" />
                            Edit
                          </button>
                          <button
                            onClick={(e) => handleDeleteTerritory(e, territory)}
                            className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 flex items-center justify-center gap-2"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
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
