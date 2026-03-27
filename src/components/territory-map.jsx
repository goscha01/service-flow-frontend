import React, { useEffect, useRef, useState } from 'react'
import { MapPin, Target, Users, DollarSign, Clock } from 'lucide-react'

const TerritoryMap = ({ 
  territory, 
  height = '400px',
  showDetails = true, 
  className = '',
  onTerritoryClick = null,
  compact = false
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
    // Adjust zoom to show territory better - lower zoom shows more area
    const zoom = Math.max(10, Math.min(13, 15 - Math.log2(radius))) // Dynamic zoom based on radius
    
    // Create a custom map URL that shows the territory with boundary visualization
    // Using Google Maps embed with custom styling to show territory boundaries
    const mapUrl = `https://www.google.com/maps/embed/v1/place?key=AIzaSyC_CrJWTsTHOTBd7TSzTuXOfutywZ2AyOQ&q=${encodedLocation}&zoom=${zoom}&maptype=roadmap`
    
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
    return `https://www.google.com/maps/embed/v1/place?key=AIzaSyC_CrJWTsTHOTBd7TSzTuXOfutywZ2AyOQ&q=${encodedLocation}&zoom=12&maptype=roadmap`
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
      <div className={`bg-[var(--sf-bg-page)] rounded-lg flex items-center justify-center ${className}`} style={{ height }}>
        <div className="text-center text-[var(--sf-text-muted)]">
          <MapPin className="w-8 h-8 mx-auto mb-2 text-[var(--sf-text-muted)]" />
          <p>No territory data available</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`relative bg-white overflow-hidden ${className || 'rounded-lg border border-[var(--sf-border-light)]'}`} style={height === '100%' ? { height: '100%' } : {}}>
      {/* Map Container */}
      <div className="relative h-full" style={height !== '100%' ? { height } : {}}>
        {!mapError ? (
          <iframe
            title="Territory Map"
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
          <div className="flex items-center justify-center h-full bg-[var(--sf-bg-page)]">
            <div className="text-center text-[var(--sf-text-muted)]">
              <MapPin className="w-8 h-8 mx-auto mb-2 text-[var(--sf-text-muted)]" />
              <p>Map failed to load</p>
            </div>
          </div>
        )}

        {/* Territory Boundary Overlay */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Territory Center Marker */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <div className={`${compact ? 'w-5 h-5' : 'w-6 h-6'} ${compact ? 'border' : 'border-2'} bg-[var(--sf-blue-500)] rounded-full border-white shadow-lg flex items-center justify-center`}>
              <div className={`${compact ? 'w-1.5 h-1.5' : 'w-2 h-2'} bg-white rounded-full`}></div>
            </div>
          </div>

          {/* Territory Radius Circle */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <div 
              className={`${compact ? 'border' : 'border-2'} border-blue-500 border-dashed rounded-full bg-[var(--sf-blue-500)] bg-opacity-10`}
              style={{
                width: `${compact ? Math.min(250, Math.max(60, details.radius * 10)) : Math.min(200, Math.max(50, details.radius * 8))}px`,
                height: `${compact ? Math.min(250, Math.max(60, details.radius * 10)) : Math.min(200, Math.max(50, details.radius * 8))}px`
              }}
            ></div>
          </div>

          {/* Territory Info Overlay */}
          {!compact && (
            <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg p-3 max-w-xs">
              <div className="flex items-center space-x-2 mb-2">
                <Target className="w-4 h-4 text-[var(--sf-blue-500)]" />
                <h3 className="font-semibold text-[var(--sf-text-primary)]">{details.name}</h3>
              </div>
              <div className="space-y-1 text-sm text-[var(--sf-text-secondary)]">
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
          )}

          {/* Compact Territory Info Overlay */}
          {compact && (
            <div className="absolute top-2 left-2 bg-white rounded-md shadow-md p-2 max-w-[140px]">
              <div className="flex items-center space-x-1 mb-1">
                <Target className="w-3 h-3 text-[var(--sf-blue-500)]" />
                <h3 className="font-medium text-[var(--sf-text-primary)] text-xs truncate">{details.name}</h3>
              </div>
              <div className="text-xs text-[var(--sf-text-secondary)]">
                <div className="flex items-center space-x-1">
                  <Target className="w-2 h-2" />
                  <span>{details.radius} mi</span>
                </div>
              </div>
            </div>
          )}

          {/* Territory Status Badge */}
          <div className={`absolute ${compact ? 'top-2 right-2' : 'top-4 right-4'}`}>
            <span className={`inline-flex items-center ${compact ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'} rounded-full font-medium ${
              details.status === 'active' 
                ? 'bg-green-100 text-green-800' 
                : 'bg-[var(--sf-bg-page)] text-[var(--sf-text-primary)]'
            }`}>
              {details.status}
            </span>
          </div>

          {/* Radius Indicator */}
          <div className={`absolute ${compact ? 'bottom-2 left-2' : 'bottom-4 left-4'} bg-[var(--sf-blue-500)] text-white ${compact ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'} rounded-lg font-medium`}>
            {details.radius} mi
          </div>

          {/* Map Controls */}
          <div className={`absolute ${compact ? 'bottom-2 right-2' : 'bottom-4 right-4'} flex space-x-2`}>
            <button 
              className={`${compact ? 'p-1.5' : 'p-2'} bg-white rounded-lg shadow-md hover:bg-[var(--sf-bg-page)] transition-colors`}
              onClick={() => window.open(mapUrl.replace('embed', 'maps'), '_blank')}
              title="Open in Google Maps"
            >
              <svg className={`${compact ? 'w-3 h-3' : 'w-4 h-4'}`} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M15 3L21 3M21 3V9M21 3L13 11M10 5H7C4.79086 5 3 6.79086 3 9V17C3 19.2091 4.79086 21 7 21H15C17.2091 21 19 19.2091 19 17V14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Loading Overlay */}
        {!mapLoaded && !mapError && (
          <div className="absolute inset-0 bg-[var(--sf-bg-page)] flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p className="text-[var(--sf-text-secondary)]">Loading map...</p>
            </div>
          </div>
        )}
      </div>

      {/* Territory Details Section */}
      {showDetails && details && (
        <div className="p-4 border-t border-[var(--sf-border-light)]">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-[var(--sf-blue-500)]">{details.radius}</div>
              <div className="text-sm text-[var(--sf-text-secondary)]">Mile Radius</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{details.teamMembers}</div>
              <div className="text-sm text-[var(--sf-text-secondary)]">Team Members</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{details.pricingMultiplier}x</div>
              <div className="text-sm text-[var(--sf-text-secondary)]">Pricing Multiplier</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{details.zipCodes.length}</div>
              <div className="text-sm text-[var(--sf-text-secondary)]">ZIP Codes</div>
            </div>
          </div>
        </div>
        )}
      </div>
  )
}

export default TerritoryMap
