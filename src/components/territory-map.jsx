import React, { useEffect, useRef, useState } from 'react'
import { MapPin, Target, Users, DollarSign, Clock } from 'lucide-react'

const TerritoryMap = ({ 
  territory, 
  height = '400px', 
  showDetails = true, 
  className = '',
  onTerritoryClick = null 
}) => {
  const mapRef = useRef(null)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [mapError, setMapError] = useState(false)

  // Generate Google Maps URL with territory boundary visualization
  const generateTerritoryMapUrl = (territory) => {
    if (!territory || !territory.location) {
      return null
    }

    const encodedLocation = encodeURIComponent(territory.location)
    const radius = territory.radius_miles || 25
    const zoom = Math.max(8, Math.min(15, 16 - Math.log2(radius))) // Dynamic zoom based on radius
    
    // Create a custom map URL that shows the territory with boundary visualization
    // Using Google Maps embed with custom styling to show territory boundaries
    const mapUrl = `https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${encodedLocation}&zoom=${zoom}&maptype=roadmap`
    
    return mapUrl
  }

  // Generate a more advanced map URL with territory visualization
  const generateAdvancedTerritoryMapUrl = (territory) => {
    if (!territory || !territory.location) {
      return null
    }

    const encodedLocation = encodeURIComponent(territory.location)
    const radius = territory.radius_miles || 25
    
    // Create a custom map with territory boundary using Google Maps JavaScript API
    // This would require loading the Google Maps JavaScript API
    return `https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${encodedLocation}&zoom=12&maptype=roadmap`
  }

  const handleMapLoad = () => {
    setMapLoaded(true)
    setMapError(false)
  }

  const handleMapError = () => {
    setMapError(true)
    setMapLoaded(false)
  }

  const formatTerritoryDetails = (territory) => {
    if (!territory) return null

    return {
      name: territory.name || 'Unnamed Territory',
      location: territory.location || 'No location specified',
      radius: territory.radius_miles || 25,
      teamMembers: territory.team_members?.length || 0,
      pricingMultiplier: territory.pricing_multiplier || 1.0,
      status: territory.status || 'active',
      zipCodes: territory.zip_codes || []
    }
  }

  const details = formatTerritoryDetails(territory)
  const mapUrl = generateTerritoryMapUrl(territory)

  if (!territory || !mapUrl) {
    return (
      <div className={`bg-gray-100 rounded-lg flex items-center justify-center ${className}`} style={{ height }}>
        <div className="text-center text-gray-500">
          <MapPin className="w-8 h-8 mx-auto mb-2 text-gray-400" />
          <p>No territory data available</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`relative bg-white rounded-lg border border-gray-200 overflow-hidden ${className}`}>
      {/* Map Container */}
      <div className="relative" style={{ height }}>
        {!mapError ? (
          <iframe
            ref={mapRef}
            src={mapUrl}
            width="100%"
            height="100%"
            style={{ border: 0 }}
            allowFullScreen=""
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            onLoad={handleMapLoad}
            onError={handleMapError}
          />
        ) : (
          <div className="flex items-center justify-center h-full bg-gray-100">
            <div className="text-center text-gray-500">
              <MapPin className="w-8 h-8 mx-auto mb-2 text-gray-400" />
              <p>Map failed to load</p>
            </div>
          </div>
        )}

        {/* Territory Boundary Overlay */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Territory Center Marker */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <div className="w-6 h-6 bg-blue-600 rounded-full border-2 border-white shadow-lg flex items-center justify-center">
              <div className="w-2 h-2 bg-white rounded-full"></div>
            </div>
          </div>

          {/* Territory Radius Circle */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <div 
              className="border-2 border-blue-500 border-dashed rounded-full bg-blue-500 bg-opacity-10"
              style={{
                width: `${Math.min(200, Math.max(50, details.radius * 8))}px`,
                height: `${Math.min(200, Math.max(50, details.radius * 8))}px`
              }}
            ></div>
          </div>

          {/* Territory Info Overlay */}
          <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg p-3 max-w-xs">
            <div className="flex items-center space-x-2 mb-2">
              <Target className="w-4 h-4 text-blue-600" />
              <h3 className="font-semibold text-gray-900">{details.name}</h3>
            </div>
            <div className="space-y-1 text-sm text-gray-600">
              <div className="flex items-center space-x-2">
                <MapPin className="w-3 h-3" />
                <span>{details.location}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Target className="w-3 h-3" />
                <span>{details.radius} mile radius</span>
              </div>
              <div className="flex items-center space-x-2">
                <Users className="w-3 h-3" />
                <span>{details.teamMembers} team members</span>
              </div>
              <div className="flex items-center space-x-2">
                <DollarSign className="w-3 h-3" />
                <span>{details.pricingMultiplier}x pricing</span>
              </div>
            </div>
          </div>

          {/* Territory Status Badge */}
          <div className="absolute top-4 right-4">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
              details.status === 'active' 
                ? 'bg-green-100 text-green-800' 
                : 'bg-gray-100 text-gray-800'
            }`}>
              {details.status}
            </span>
          </div>

          {/* Radius Indicator */}
          <div className="absolute bottom-4 left-4 bg-blue-600 text-white px-3 py-1 rounded-lg text-sm font-medium">
            {details.radius} mile radius
          </div>

          {/* Map Controls */}
          <div className="absolute bottom-4 right-4 flex space-x-2">
            <button 
              className="p-2 bg-white rounded-lg shadow-md hover:bg-gray-50 transition-colors"
              onClick={() => window.open(mapUrl.replace('embed', 'maps'), '_blank')}
              title="Open in Google Maps"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M15 3L21 3M21 3V9M21 3L13 11M10 5H7C4.79086 5 3 6.79086 3 9V17C3 19.2091 4.79086 21 7 21H15C17.2091 21 19 19.2091 19 17V14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Loading Overlay */}
        {!mapLoaded && !mapError && (
          <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p className="text-gray-600">Loading map...</p>
            </div>
          </div>
        )}
      </div>

      {/* Territory Details Section */}
      {showDetails && details && (
        <div className="p-4 border-t border-gray-200">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{details.radius}</div>
              <div className="text-sm text-gray-600">Mile Radius</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{details.teamMembers}</div>
              <div className="text-sm text-gray-600">Team Members</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{details.pricingMultiplier}x</div>
              <div className="text-sm text-gray-600">Pricing Multiplier</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{details.zipCodes.length}</div>
              <div className="text-sm text-gray-600">ZIP Codes</div>
            </div>
          </div>
        </div>
        )}
      </div>
  )
}

export default TerritoryMap
