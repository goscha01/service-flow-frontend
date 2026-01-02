"use client"

import { useState, useEffect } from "react"
import Sidebar from "../components/sidebar"
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
import MobileHeader from "../components/mobile-header"

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
      case 'active': return 'bg-green-500 text-white'
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
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Header */}
        <MobileHeader pageTitle="Territories" />

        <main className="flex-1 overflow-y-auto">
          <div className="px-5 lg:px-40 xl:px-44 2xl:px-48 py-4 sm:py-6 lg:py-8">
            {/* Header */}
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-gray-900 mb-2" style={{ fontFamily: 'Montserrat', fontWeight: 700 }}>Service Territories</h1>
              <p className="text-gray-600 text-sm mb-1" style={{ fontFamily: 'Montserrat', fontWeight: 400 }}>
                Manage the geographic areas where you provide services and do work. You can create multiple service territories with unique hours, services, and service providers.{' '}
                <a href="#" className="text-blue-600 hover:text-blue-700 underline">Learn more</a>
              </p>
              <p className="text-gray-600 text-sm" style={{ fontFamily: 'Montserrat', fontWeight: 400 }}>
                You are currently using <span className="font-medium text-gray-900" style={{ fontFamily: 'Montserrat', fontWeight: 500 }}>{activeCount} of 2</span> service territories available on your plan.
              </p>
            </div>

            {/* Controls Bar */}
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {/* Active/Disabled Tabs */}
                <button
                  onClick={() => handleFilterChange({ status: 'active' })}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filters.status === 'active'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                  }`}
                  style={{ fontFamily: 'Montserrat', fontWeight: 500 }}
                >
                  Active <span className="ml-1">{activeCount}</span>
                </button>
                <button
                  onClick={() => handleFilterChange({ status: 'inactive' })}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filters.status === 'inactive'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                  }`}
                  style={{ fontFamily: 'Montserrat', fontWeight: 500 }}
                >
                  Disabled
                </button>

                {/* Sort Dropdown */}
                <div className="relative">
                  <button className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2" style={{ fontFamily: 'Montserrat', fontWeight: 500 }}>
                    Sort <ArrowUpDown className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50" style={{ fontFamily: 'Montserrat', fontWeight: 500 }}>
                  Geofence Editor
                </button>
                <button
                  onClick={handleCreateTerritory}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-2"
                  style={{ fontFamily: 'Montserrat', fontWeight: 500 }}
                >
                  <Plus className="w-4 h-4" />
                  New Territory
                </button>
              </div>
            </div>

            {/* Main Content Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column - Enforce Service Area */}
              <div className="lg:col-span-1">
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-base font-semibold text-gray-900 mb-2" style={{ fontFamily: 'Montserrat', fontWeight: 600 }}>Enforce Service Area</h3>
                      <p className="text-sm text-gray-600 leading-relaxed" style={{ fontFamily: 'Montserrat', fontWeight: 400 }}>
                        Prevent customers from booking jobs online at locations that are outside of your territories' service areas.
                      </p>
                    </div>
                    <div className="ml-4 flex-shrink-0">
                      <button
                        onClick={() => setEnforceServiceArea(!enforceServiceArea)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                          enforceServiceArea ? 'bg-green-500' : 'bg-gray-300'
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
              </div>

              {/* Right Column - Map and Territory Details */}
              <div className="lg:col-span-2">

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

                {/* Territories List */}
                {loading ? (
                  <div className="flex items-center justify-center py-12 bg-white border border-gray-200 rounded-lg">
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
                        className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        New Territory
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {territories.map((territory) => (
                      <div
                        key={territory.id}
                        className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow"
                      >
                        {/* Map Section - Reduced Height */}
                        <div className="w-full relative" style={{ height: '200px' }}>
                          <TerritoryMap
                            territory={territory}
                            height="100%"
                            showDetails={false}
                          />
                          {/* Action Buttons Overlay */}
                          <div className="absolute top-2 right-2 flex gap-2 z-10">
                            <button
                              onClick={(e) => handleEditTerritory(e, territory)}
                              className="p-2 bg-white rounded-lg shadow-md hover:bg-gray-50 transition-colors"
                              title="Edit territory"
                            >
                              <Edit className="w-4 h-4 text-gray-700" />
                            </button>
                            <button
                              onClick={(e) => handleDeleteTerritory(e, territory)}
                              className="p-2 bg-white rounded-lg shadow-md hover:bg-red-50 transition-colors"
                              title="Delete territory"
                            >
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </button>
                          </div>
                        </div>

                        {/* Territory Details - Compact Layout */}
                        <div className="p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <h3 
                                className="text-lg font-bold text-gray-900 cursor-pointer hover:text-blue-600 transition-colors" 
                                style={{ fontFamily: 'Montserrat', fontWeight: 700 }}
                                onClick={() => handleTerritoryClick(territory)}
                              >
                                {territory.name}
                              </h3>
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(territory.status)}`} style={{ fontFamily: 'Montserrat', fontWeight: 500 }}>
                              {getStatusLabel(territory.status)}
                            </span>
                            </div>
                          </div>
                          <p className="text-xs text-gray-600 mb-4" style={{ fontFamily: 'Montserrat', fontWeight: 400 }}>{territory.location || `${territory.name}`}</p>

                          {/* Territory Attributes - Compact Grid */}
                          <div className="grid grid-cols-2 gap-3">
                            <div className="flex items-center gap-2">
                              <MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                              <div className="min-w-0">
                                <div className="text-xs text-gray-500 uppercase" style={{ fontFamily: 'Montserrat', fontWeight: 600 }}>Area</div>
                                <div className="text-sm text-gray-900 truncate" style={{ fontFamily: 'Montserrat', fontWeight: 400 }}>{territory.radius_miles || 30} mi</div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <Globe className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                              <div className="min-w-0">
                                <div className="text-xs text-gray-500 uppercase" style={{ fontFamily: 'Montserrat', fontWeight: 600 }}>Timezone</div>
                                <div className="text-sm text-gray-900 truncate" style={{ fontFamily: 'Montserrat', fontWeight: 400 }}>{territory.timezone?.split('/').pop() || 'Default'}</div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <Calendar className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                              <div className="min-w-0">
                                <div className="text-xs text-gray-500 uppercase" style={{ fontFamily: 'Montserrat', fontWeight: 600 }}>Booking</div>
                                <div className="flex items-center gap-1.5">
                                  <span className="inline-block w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                                  <span className="text-sm text-gray-900" style={{ fontFamily: 'Montserrat', fontWeight: 400 }}>On</span>
                              </div>
                              </div>
                            </div>

                              <div className="flex items-center gap-2">
                              <Users className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                              <div className="min-w-0">
                                <div className="text-xs text-gray-500 uppercase" style={{ fontFamily: 'Montserrat', fontWeight: 600 }}>Providers</div>
                                <div className="flex items-center gap-1.5">
                                {territory.team_members && territory.team_members.length > 0 ? (
                                  <>
                                      <div className="flex -space-x-1.5">
                                      {territory.team_members.slice(0, 3).map((member, idx) => (
                                          <div key={idx} className="w-5 h-5 rounded-full bg-green-300 border-2 border-white flex items-center justify-center text-xs font-medium text-gray-700" style={{ fontFamily: 'Montserrat', fontWeight: 500 }}>
                                          {member.initials || member.first_name?.[0] || 'A'}
                                        </div>
                                      ))}
                                    </div>
                                    {territory.team_members.length > 3 && (
                                        <span className="text-xs text-gray-600" style={{ fontFamily: 'Montserrat', fontWeight: 400 }}>+{territory.team_members.length - 3}</span>
                                    )}
                                  </>
                                ) : (
                                    <span className="text-sm text-gray-500" style={{ fontFamily: 'Montserrat', fontWeight: 400 }}>0</span>
                                )}
                              </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
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
