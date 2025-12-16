"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { MapPin, Users, Clock, RefreshCw, Map, Navigation, AlertCircle, CheckCircle } from "lucide-react"
import { staffLocationsAPI, teamAPI } from "../services/api"
import { useAuth } from "../context/AuthContext"
import Sidebar from "../components/sidebar"

const StaffLocationsMap = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [locations, setLocations] = useState([])
  const [teamMembers, setTeamMembers] = useState([])
  const [selectedMember, setSelectedMember] = useState(null)
  const [error, setError] = useState("")
  const [lastUpdated, setLastUpdated] = useState(null)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [refreshInterval, setRefreshInterval] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    if (user?.id) {
      fetchData()
    }
    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval)
      }
    }
  }, [user?.id])

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        fetchLocations()
      }, 30000) // Refresh every 30 seconds
      setRefreshInterval(interval)
      return () => clearInterval(interval)
    } else {
      if (refreshInterval) {
        clearInterval(refreshInterval)
        setRefreshInterval(null)
      }
    }
  }, [autoRefresh])

  const fetchData = async () => {
    if (!user?.id) return

    try {
      setLoading(true)
      setError("")
      await Promise.all([fetchLocations(), fetchTeamMembers()])
    } catch (error) {
      console.error('Error fetching data:', error)
      setError(error.response?.data?.error || 'Failed to load staff locations')
    } finally {
      setLoading(false)
    }
  }

  const fetchLocations = async () => {
    try {
      const data = await staffLocationsAPI.getLocations()
      setLocations(data.locations || [])
      setLastUpdated(new Date())
    } catch (error) {
      console.error('Error fetching locations:', error)
      if (!loading) {
        setError(error.response?.data?.error || 'Failed to load locations')
      }
    }
  }

  const fetchTeamMembers = async () => {
    try {
      const data = await teamAPI.getAll(user.id, { status: 'active' })
      setTeamMembers(data.teamMembers || [])
    } catch (error) {
      console.error('Error fetching team members:', error)
    }
  }

  // Generate Google Maps URL with markers for all staff locations
  const generateMapUrl = () => {
    if (locations.length === 0) {
      // Default to US center if no locations
      return `https://www.google.com/maps/embed/v1/view?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&center=39.8283,-98.5795&zoom=4&maptype=roadmap`
    }

    // Calculate center point from all locations
    const avgLat = locations.reduce((sum, loc) => sum + parseFloat(loc.latitude), 0) / locations.length
    const avgLng = locations.reduce((sum, loc) => sum + parseFloat(loc.longitude), 0) / locations.length

    // Create markers string for Google Maps
    // Note: Google Maps Embed API doesn't support custom markers directly
    // We'll use the center point and show locations in the sidebar
    const zoom = locations.length === 1 ? 15 : 12
    return `https://www.google.com/maps/embed/v1/view?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&center=${avgLat},${avgLng}&zoom=${zoom}&maptype=roadmap`
  }

  const formatTime = (dateString) => {
    if (!dateString) return 'Never'
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)
    
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
    const diffDays = Math.floor(diffHours / 24)
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
  }

  const openInGoogleMaps = (latitude, longitude, address) => {
    const query = address || `${latitude},${longitude}`
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`, '_blank')
  }

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Loading staff locations...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-4 py-4 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => navigate('/team')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Navigation className="w-5 h-5 text-gray-600" />
              </button>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Staff Locations</h1>
                <p className="text-sm text-gray-500">Real-time location tracking</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={fetchLocations}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center space-x-2"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Refresh</span>
              </button>
              
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Auto-refresh (30s)</span>
              </label>
            </div>
          </div>

          {lastUpdated && (
            <div className="mt-2 text-xs text-gray-500 flex items-center space-x-1">
              <Clock className="w-3 h-3" />
              <span>Last updated: {formatTime(lastUpdated)}</span>
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="mx-4 mt-4 bg-red-50 border-l-4 border-red-400 p-4 rounded">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-red-400 mr-2" />
              <span className="text-sm text-red-700">{error}</span>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Map Section */}
          <div className="flex-1 relative">
            <iframe
              title="Staff Locations Map"
              width="100%"
              height="100%"
              style={{ border: 0 }}
              loading="lazy"
              allowFullScreen
              referrerPolicy="no-referrer-when-downgrade"
              src={generateMapUrl()}
            />
            
            {/* Location Count Badge */}
            <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg px-4 py-2">
              <div className="flex items-center space-x-2">
                <Users className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-gray-900">
                  {locations.length} {locations.length === 1 ? 'staff' : 'staff'} on map
                </span>
              </div>
            </div>
          </div>

          {/* Sidebar - Staff List */}
          <div className="w-80 bg-white border-l border-gray-200 overflow-y-auto">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Staff Locations</h2>
              <p className="text-xs text-gray-500 mt-1">
                {locations.length === 0 
                  ? 'No staff locations available'
                  : `${locations.length} ${locations.length === 1 ? 'location' : 'locations'} found`
                }
              </p>
            </div>

            {locations.length === 0 ? (
              <div className="p-8 text-center">
                <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-sm text-gray-500 mb-2">No staff locations found</p>
                <p className="text-xs text-gray-400">
                  Staff locations will appear here once they start sharing their location.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {locations.map((location) => {
                  const member = location.team_members
                  const memberName = member ? `${member.first_name} ${member.last_name}` : 'Unknown'
                  const initials = memberName.split(' ').map(n => n[0]).join('').toUpperCase()
                  
                  return (
                    <div
                      key={location.id}
                      className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                        selectedMember === location.team_member_id ? 'bg-blue-50 border-l-4 border-blue-600' : ''
                      }`}
                      onClick={() => {
                        setSelectedMember(location.team_member_id)
                        openInGoogleMaps(location.latitude, location.longitude, location.address)
                      }}
                    >
                      <div className="flex items-start space-x-3">
                        {/* Avatar */}
                        <div className="flex-shrink-0">
                          {member?.profile_picture ? (
                            <img
                              src={member.profile_picture}
                              alt={memberName}
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                              <span className="text-blue-600 font-semibold text-sm">{initials}</span>
                            </div>
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h3 className="text-sm font-medium text-gray-900 truncate">
                              {memberName}
                            </h3>
                            <span className="text-xs text-gray-400">
                              {formatTime(location.recorded_at)}
                            </span>
                          </div>
                          
                          {location.address && (
                            <p className="text-xs text-gray-500 mt-1 truncate">
                              {location.address}
                            </p>
                          )}
                          
                          <div className="flex items-center space-x-2 mt-2">
                            <span className="text-xs text-gray-400">
                              {parseFloat(location.latitude).toFixed(6)}, {parseFloat(location.longitude).toFixed(6)}
                            </span>
                            {location.source && (
                              <span className={`text-xs px-2 py-0.5 rounded ${
                                location.source === 'gps' 
                                  ? 'bg-green-100 text-green-700'
                                  : location.source === 'scheduled'
                                    ? 'bg-blue-100 text-blue-700'
                                    : 'bg-gray-100 text-gray-700'
                              }`}>
                                {location.source}
                              </span>
                            )}
                          </div>

                          {location.jobs && location.jobs.length > 0 && (
                            <div className="mt-2 text-xs text-gray-500">
                              <span className="font-medium">Job:</span> {location.jobs[0].service_name || 'N/A'}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default StaffLocationsMap

