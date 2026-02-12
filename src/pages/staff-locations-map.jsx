"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { MapPin, Users, Clock, RefreshCw, Map, Navigation, AlertCircle, CheckCircle, Plus, X, EyeOff } from "lucide-react"
import { staffLocationsAPI, teamAPI } from "../services/api"
import { useAuth } from "../context/AuthContext"
import Sidebar from "../components/sidebar"
import MobileBottomNav from "../components/mobile-bottom-nav"

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
  const [showLocationModal, setShowLocationModal] = useState(false)
  const [showStaffList, setShowStaffList] = useState(false) // For mobile: show/hide staff list
  const [globallyHidden, setGloballyHidden] = useState(false)
  const [locationFormData, setLocationFormData] = useState({
    teamMemberId: '',
    latitude: '',
    longitude: '',
    address: '',
    source: 'manual'
  })

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
      setGloballyHidden(data.globallyHidden === true)
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
      return `https://www.google.com/maps/embed/v1/view?key=AIzaSyC_CrJWTsTHOTBd7TSzTuXOfutywZ2AyOQ&center=39.8283,-98.5795&zoom=4&maptype=roadmap`
    }

    // Calculate center point from all locations
    const avgLat = locations.reduce((sum, loc) => sum + parseFloat(loc.latitude), 0) / locations.length
    const avgLng = locations.reduce((sum, loc) => sum + parseFloat(loc.longitude), 0) / locations.length

    // Create markers string for Google Maps
    // Note: Google Maps Embed API doesn't support custom markers directly
    // We'll use the center point and show locations in the sidebar
    const zoom = locations.length === 1 ? 15 : 12
    return `https://www.google.com/maps/embed/v1/view?key=AIzaSyC_CrJWTsTHOTBd7TSzTuXOfutywZ2AyOQ&center=${avgLat},${avgLng}&zoom=${zoom}&maptype=roadmap`
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

  const handleRecordLocation = async (e) => {
    e.preventDefault()
    if (!locationFormData.teamMemberId || !locationFormData.latitude || !locationFormData.longitude) {
      setError('Please fill in all required fields')
      return
    }

    try {
      await staffLocationsAPI.recordLocation({
        teamMemberId: parseInt(locationFormData.teamMemberId),
        latitude: parseFloat(locationFormData.latitude),
        longitude: parseFloat(locationFormData.longitude),
        address: locationFormData.address || null,
        source: locationFormData.source
      })
      setShowLocationModal(false)
      setLocationFormData({ teamMemberId: '', latitude: '', longitude: '', address: '', source: 'manual' })
      fetchLocations()
    } catch (error) {
      console.error('Error recording location:', error)
      setError(error.response?.data?.error || 'Failed to record location')
    }
  }

  // Get current location using browser geolocation
  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocationFormData({
            ...locationFormData,
            latitude: position.coords.latitude.toString(),
            longitude: position.coords.longitude.toString()
          })
        },
        (error) => {
          console.error('Error getting location:', error)
          setError('Failed to get current location. Please enter coordinates manually.')
        }
      )
    } else {
      setError('Geolocation is not supported by your browser.')
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-4" />
            {globallyHidden ? (
              <div className="text-center">
                <EyeOff className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-600 font-medium">Staff Locations Hidden</p>
                <p className="text-sm text-gray-500 mt-1">
                  Staff locations are currently hidden globally. Contact your administrator to enable them.
                </p>
              </div>
            ) : (
              <p className="text-gray-600">Loading staff locations...</p>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col lg:flex-row pb-20 lg:pb-0">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      </div>
      
      <div className="flex-1 flex flex-col overflow-hidden lg:ml-52">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-10 flex-shrink-0 px-4 py-3 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
                <button
                  onClick={() => navigate('/team')}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
                >
                  <Navigation className="w-5 h-5 text-gray-600" />
                </button>
                <div className="min-w-0">
                  <h1 className="text-lg sm:text-xl font-semibold text-gray-900 truncate">Staff Locations</h1>
                  <p className="text-xs sm:text-sm text-gray-500">Real-time location tracking</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2 flex-shrink-0">
                {/* Mobile: Show staff list toggle */}
                <button
                  onClick={() => setShowStaffList(!showStaffList)}
                  className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <Users className="w-5 h-5 text-gray-600" />
                </button>
                
                <button
                  onClick={() => setShowLocationModal(true)}
                  className="px-3 py-2 bg-green-600 text-white rounded-lg text-xs sm:text-sm font-medium hover:bg-green-700 flex items-center space-x-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">Add Location</span>
                </button>
                
                <button
                  onClick={fetchLocations}
                  className="px-3 py-2 bg-blue-600 text-white rounded-lg text-xs sm:text-sm font-medium hover:bg-blue-700 flex items-center space-x-1.5"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span className="hidden sm:inline">Refresh</span>
                </button>
                
                <label className="hidden sm:flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoRefresh}
                    onChange={(e) => setAutoRefresh(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-xs text-gray-700">Auto (30s)</span>
                </label>
              </div>
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
        <div className="flex-1 flex overflow-hidden relative">
          {/* Map Section */}
          <div className={`flex-1 relative transition-all duration-300 ${showStaffList ? 'lg:flex-1' : 'flex-1'}`}>
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
            <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg px-3 py-2 z-10">
              <div className="flex items-center space-x-2">
                <Users className="w-4 h-4 text-blue-600" />
                <span className="text-xs sm:text-sm font-medium text-gray-900">
                  {locations.length} {locations.length === 1 ? 'staff' : 'staff'}
                </span>
              </div>
            </div>
          </div>

          {/* Sidebar - Staff List - Desktop: Always visible, Mobile: Slide in/out */}
          <div className={`bg-white border-l border-gray-200 overflow-y-auto transition-all duration-300 ${
            showStaffList 
              ? 'absolute lg:relative right-0 w-full sm:w-80 z-20' 
              : 'hidden lg:block lg:w-80'
          }`}>
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
                {globallyHidden ? (
                  <>
                    <EyeOff className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-sm text-gray-500 mb-2 font-medium">Staff Locations Hidden</p>
                    <p className="text-xs text-gray-400">
                      Staff locations are currently hidden globally. Contact your administrator to enable them.
                    </p>
                  </>
                ) : (
                  <>
                    <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-sm text-gray-500 mb-2">No staff locations found</p>
                    <p className="text-xs text-gray-400">
                      Staff locations will appear here once they start sharing their location.
                    </p>
                  </>
                )}
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

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav teamMembers={teamMembers} />

      {/* Record Location Modal */}
      {showLocationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 flex-shrink-0">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900">Record Staff Location</h2>
              <button
                onClick={() => {
                  setShowLocationModal(false)
                  setLocationFormData({ teamMemberId: '', latitude: '', longitude: '', address: '', source: 'manual' })
                  setError('')
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="overflow-y-auto flex-1 p-4 sm:p-6">
              <form onSubmit={handleRecordLocation} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Team Member *
                  </label>
                  <select
                    required
                    value={locationFormData.teamMemberId}
                    onChange={(e) => setLocationFormData({ ...locationFormData, teamMemberId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select a team member...</option>
                    {teamMembers.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.first_name} {member.last_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Latitude *
                    </label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={locationFormData.latitude}
                      onChange={(e) => setLocationFormData({ ...locationFormData, latitude: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g., 40.7128"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Longitude *
                    </label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={locationFormData.longitude}
                      onChange={(e) => setLocationFormData({ ...locationFormData, longitude: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g., -74.0060"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={getCurrentLocation}
                  className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium flex items-center justify-center space-x-2"
                >
                  <MapPin className="w-4 h-4" />
                  <span>Use Current Location</span>
                </button>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Address (Optional)
                  </label>
                  <input
                    type="text"
                    value={locationFormData.address}
                    onChange={(e) => setLocationFormData({ ...locationFormData, address: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., 123 Main St, City, State"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Source
                  </label>
                  <select
                    value={locationFormData.source}
                    onChange={(e) => setLocationFormData({ ...locationFormData, source: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="manual">Manual Entry</option>
                    <option value="gps">GPS</option>
                    <option value="scheduled">Scheduled (from Job)</option>
                  </select>
                </div>

                <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 pt-4 border-t border-gray-200 mt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowLocationModal(false)
                      setLocationFormData({ teamMemberId: '', latitude: '', longitude: '', address: '', source: 'manual' })
                      setError('')
                    }}
                    className="w-full sm:w-auto px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Record Location
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Mobile: Overlay to close staff list */}
      {showStaffList && (
        <div 
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-10"
          onClick={() => setShowStaffList(false)}
        />
      )}
    </div>
  )
}

export default StaffLocationsMap

