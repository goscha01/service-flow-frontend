"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import Sidebar from "../../components/sidebar"
import TerritoryMap from "../../components/territory-map"
import { ChevronLeft, MapPin, Check, X } from "lucide-react"
import { serviceAreasAPI } from "../../services/api"
import { useAuth } from "../../context/AuthContext"

const ServiceAreas = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const navigate = useNavigate()
  
  const [serviceAreasData, setServiceAreasData] = useState({
    enforceServiceArea: true,
    territories: []
  })
  const [editingTerritory, setEditingTerritory] = useState(null)
  const [showEditModal, setShowEditModal] = useState(false)

  // Get current user
  const { user } = useAuth()

  // Function to generate Google Maps URL for territory
  const getTerritoryMapUrl = (territory) => {
    if (!territory.location) {
      return "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d12097.433213460975!2d-73.99728968144034!3d40.69531900080547!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x89c25a47c1654a45%3A0xc49e101c2fd62ba2!2sBrooklyn%20Heights%2C%20Brooklyn%2C%20NY!5e0!3m2!1sen!2sus!4v1709665144705!5m2!1sen!2sus"
    }
    
    // Encode the location for URL
    const encodedLocation = encodeURIComponent(territory.location)
    const radius = territory.radius_miles || 25
    
    // Create a Google Maps embed URL with the territory location
    return `https://www.google.com/maps/embed/v1/place?key=AIzaSyC_CrJWTsTHOTBd7TSzTuXOfutywZ2AyOQ&q=${encodedLocation}&zoom=10`
  }

  useEffect(() => {
    if (user?.id) {
      loadServiceAreasData()
    } else if (user === null) {
      navigate('/signin')
    }
  }, [user?.id, navigate])

  const loadServiceAreasData = async () => {
    try {
      setLoading(true)
      const serviceAreas = await serviceAreasAPI.getServiceAreas(user.id)
      setServiceAreasData(serviceAreas)
    } catch (error) {
      console.error('Error loading service areas data:', error)
      setMessage({ type: 'error', text: 'Failed to load service areas settings' })
    } finally {
      setLoading(false)
    }
  }

  const handleToggleEnforceServiceArea = async () => {
    try {
      setSaving(true)
      const updatedData = {
        ...serviceAreasData,
        enforceServiceArea: !serviceAreasData.enforceServiceArea
      }
      
      await serviceAreasAPI.updateServiceAreas({
        userId: user.id,
        enforceServiceArea: updatedData.enforceServiceArea,
        territories: updatedData.territories
      })
      
      setServiceAreasData(updatedData)
      setMessage({ type: 'success', text: 'Service area settings updated successfully!' })
      setTimeout(() => setMessage({ type: '', text: '' }), 3000)
    } catch (error) {
      console.error('Error updating service areas:', error)
      setMessage({ type: 'error', text: error.response?.data?.error || 'Failed to update service areas' })
    } finally {
      setSaving(false)
    }
  }

  const handleEditTerritory = (territory) => {
    setEditingTerritory(territory)
    setShowEditModal(true)
  }

  const handleSaveTerritory = async (updatedTerritory) => {
    try {
      setSaving(true)
      
      // Update the territory in the local state
      const updatedTerritories = serviceAreasData.territories.map(territory =>
        territory.id === updatedTerritory.id ? updatedTerritory : territory
      )
      
      const updatedData = {
        ...serviceAreasData,
        territories: updatedTerritories
      }
      
      // Save to backend
      await serviceAreasAPI.updateServiceAreas({
        userId: user.id,
        enforceServiceArea: updatedData.enforceServiceArea,
        territories: updatedData.territories
      })
      
      setServiceAreasData(updatedData)
      setShowEditModal(false)
      setEditingTerritory(null)
      setMessage({ type: 'success', text: 'Territory updated successfully!' })
      setTimeout(() => setMessage({ type: '', text: '' }), 3000)
    } catch (error) {
      console.error('Error updating territory:', error)
      setMessage({ type: 'error', text: error.response?.data?.error || 'Failed to update territory' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50 overflow-hidden">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex-1 flex flex-col min-w-0 lg:ml-64 xl:ml-72">
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading service areas settings...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0 lg:ml-64 xl:ml-72">

        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate("/settings")}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
            >
              <ChevronLeft className="w-5 h-5" />
              <span className="text-sm">Settings</span>
            </button>
            <h1 className="text-2xl font-semibold text-gray-900">Service Areas</h1>
          </div>
        </div>

        {/* Message */}
        {message.text && (
          <div className={`px-6 py-3 ${message.type === 'success' ? 'bg-green-50 border-l-4 border-green-400' : 'bg-red-50 border-l-4 border-red-400'}`}>
            <div className="flex items-center">
              {message.type === 'success' ? (
                <Check className="w-5 h-5 text-green-400 mr-2" />
              ) : (
                <X className="w-5 h-5 text-red-400 mr-2" />
              )}
              <span className={`text-sm ${message.type === 'success' ? 'text-green-700' : 'text-red-700'}`}>
                {message.text}
              </span>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-auto">
          <div className="max-w-5xl mx-auto p-6">
            {/* Enforce Service Area Toggle */}
            <div className="bg-gray-50 rounded-lg p-4 mb-8">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-medium text-gray-900">Enforce Service Area</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Prevent customers from booking jobs online at locations that are outside of your territories' service areas.
                  </p>
                </div>
                <button
                  onClick={handleToggleEnforceServiceArea}
                  disabled={saving}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 ${
                    serviceAreasData.enforceServiceArea ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                  role="switch"
                  aria-checked={serviceAreasData.enforceServiceArea}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      serviceAreasData.enforceServiceArea ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Service Areas Section */}
            <div>
              <div className="mb-4">
                <h2 className="text-lg font-medium text-gray-900">Service Areas</h2>
                <p className="text-sm text-gray-600 mt-1">
                  These are the service areas for each of your territories.
                </p>
              </div>

              {serviceAreasData.territories.length === 0 ? (
                <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                  <p className="text-gray-500 mb-4">No territories configured yet</p>
                  <button 
                    onClick={() => navigate("/territories")}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700"
                  >
                    Add Territory
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {serviceAreasData.territories.map((territory) => (
                    <div key={territory.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                      {/* Territory Map with Boundaries */}
                      <TerritoryMap 
                        territory={territory}
                        height="400px"
                        showDetails={true}
                        className="rounded-t-lg"
                      />

                      {/* Territory Details */}
                      <div className="p-4">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-medium text-gray-900">{territory.name}</h3>
                          <button 
                            onClick={() => handleEditTerritory(territory)}
                            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                          >
                            Edit
                          </button>
                        </div>
                        {territory.description && (
                          <p className="text-sm text-gray-600 mb-4">{territory.description}</p>
                        )}
                        {territory.location && (
                          <p className="text-sm text-gray-600 mb-4">{territory.location}</p>
                        )}
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center space-x-2">
                            <MapPin className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-600">SERVICE AREA</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-gray-900">{territory.radius_miles} mile radius</span>
                            <button 
                              onClick={() => handleEditTerritory(territory)}
                              className="text-blue-600 hover:text-blue-700 font-medium"
                            >
                              Edit
                            </button>
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
      </div>

      {/* Edit Territory Modal */}
      {showEditModal && editingTerritory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Edit Territory</h3>
              <button
                onClick={() => {
                  setShowEditModal(false)
                  setEditingTerritory(null)
                }}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Territory Name
                  </label>
                  <input
                    type="text"
                    value={editingTerritory.name}
                    onChange={(e) => setEditingTerritory({
                      ...editingTerritory,
                      name: e.target.value
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Location
                  </label>
                  <input
                    type="text"
                    value={editingTerritory.location || ''}
                    onChange={(e) => setEditingTerritory({
                      ...editingTerritory,
                      location: e.target.value
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter address or location"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Service Radius (miles)
                  </label>
                  <input
                    type="number"
                    value={editingTerritory.radius_miles || 25}
                    onChange={(e) => setEditingTerritory({
                      ...editingTerritory,
                      radius_miles: parseInt(e.target.value) || 25
                    })}
                    min="1"
                    max="100"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description (Optional)
                  </label>
                  <textarea
                    value={editingTerritory.description || ''}
                    onChange={(e) => setEditingTerritory({
                      ...editingTerritory,
                      description: e.target.value
                    })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Describe this territory..."
                  />
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowEditModal(false)
                  setEditingTerritory(null)
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSaveTerritory(editingTerritory)}
                disabled={saving}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ServiceAreas
