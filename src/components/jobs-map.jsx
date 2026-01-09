import { useEffect, useRef, useState } from 'react'
import { getGoogleMapsApiKey } from '../config/maps'

const JobsMap = ({ jobs, mapType = 'roadmap' }) => {
  const mapRef = useRef(null)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [mapError, setMapError] = useState(false)
  const [useEmbedAPI, setUseEmbedAPI] = useState(false) // Track if we should use Embed API
  const mapInstanceRef = useRef(null)
  const markersRef = useRef([])
  const geocodeCacheRef = useRef({}) // Cache geocoded addresses

  // Check for stored preference to use Embed API (only from script load failures)
  useEffect(() => {
    const preferEmbedAPI = localStorage.getItem('googleMapsUseEmbedAPI') === 'true'
    if (preferEmbedAPI) {
      setUseEmbedAPI(true)
    }
  }, [])

  // Listen for async Google Maps API errors (ApiNotActivatedMapError, BillingNotEnabledMapError)
  // These errors are thrown AFTER map creation, so we need to detect them globally
  useEffect(() => {
    const handleGoogleMapsError = (event) => {
      const errorMsg = event.message || event.error?.message || ''
      if (errorMsg.includes('ApiNotActivatedMapError') || 
          errorMsg.includes('BillingNotEnabledMapError')) {
        console.warn('🗺️ JobsMap: Detected Google Maps API/billing error, switching to Embed API')
        setUseEmbedAPI(true)
        localStorage.setItem('googleMapsUseEmbedAPI', 'true')
      }
    }

    // Listen for window errors
    window.addEventListener('error', handleGoogleMapsError)

    // Also intercept console.error to catch these specific errors
    const originalConsoleError = console.error
    console.error = (...args) => {
      const errorMessage = args.join(' ')
      if (errorMessage.includes('ApiNotActivatedMapError') || 
          errorMessage.includes('BillingNotEnabledMapError')) {
        // Suppress the error since we're handling it gracefully with Embed API fallback
        // Only log a warning instead
        console.warn('🗺️ JobsMap: Google Maps JavaScript API requires billing/activation. Using Embed API fallback.')
        setUseEmbedAPI(true)
        localStorage.setItem('googleMapsUseEmbedAPI', 'true')
        // Don't log the original error - it's expected and handled
        return
      }
      originalConsoleError.apply(console, args)
    }

    return () => {
      window.removeEventListener('error', handleGoogleMapsError)
      console.error = originalConsoleError
    }
  }, [])

  useEffect(() => {
    let checkInterval = null
    let timeoutId = null

    // Removed console.error hijacking - Google Maps logs warnings that do NOT break markers

    const loadMap = () => {
      // Check if Google Maps is already loaded
      if (window.google && window.google.maps) {
        // Small delay to ensure DOM is ready
        setTimeout(() => {
          initializeMap()
        }, 100)
        return
      }

      // Check if script is already being loaded
      const existingScript = document.querySelector('script[src*="maps.googleapis.com"]')
      if (existingScript) {
        // Script exists, wait for it to load
        checkInterval = setInterval(() => {
          if (window.google && window.google.maps) {
            clearInterval(checkInterval)
            setTimeout(() => {
              if (!mapInstanceRef.current) {
                initializeMap()
              }
            }, 100)
          }
        }, 100)

        // Timeout after 10 seconds
        timeoutId = setTimeout(() => {
          if (checkInterval) clearInterval(checkInterval)
          if (!window.google || !window.google.maps) {
            console.error('Google Maps API failed to load within timeout, using Embed API')
            setUseEmbedAPI(true)
          }
        }, 10000)

        return
      }

      // Load Google Maps JavaScript API
      const script = document.createElement('script')
      const apiKey = getGoogleMapsApiKey()
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry`
      script.async = true
      script.defer = true
      
      script.onload = () => {
        // Wait a bit for Google Maps to fully initialize
        setTimeout(() => {
          if (window.google && window.google.maps) {
            if (!mapInstanceRef.current) {
              initializeMap()
            }
          } else {
            console.error('Google Maps API loaded but not available, using Embed API')
            setUseEmbedAPI(true)
          }
        }, 100)
      }
      
      script.onerror = () => {
        console.error('Failed to load Google Maps API script, using Embed API fallback')
        setUseEmbedAPI(true)
      }
      
      document.head.appendChild(script)
    }

      loadMap()

      return () => {
        if (checkInterval) clearInterval(checkInterval)
        if (timeoutId) clearTimeout(timeoutId)
      }
  }, [])

  useEffect(() => {
    // Only update markers if using JavaScript API (not Embed API) and map is loaded
    if (mapLoaded && mapInstanceRef.current && !useEmbedAPI && window.google?.maps) {
      updateMarkers()
    }
  }, [jobs, mapLoaded, mapType, useEmbedAPI])

  const initializeMap = () => {
    // Fix #2: Protect against re-initialization
    if (mapInstanceRef.current) return
    
    if (!window.google?.maps) {
      console.error('Google Maps API not available')
      setUseEmbedAPI(true)
      return
    }

    // Fix #1: NEVER re-call initializeMap - just return if not ready
    if (!mapRef.current) return

    // Check if element is actually in the DOM
    if (!document.body.contains(mapRef.current)) return

    // Check if element has dimensions (required for IntersectionObserver)
    const rect = mapRef.current.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) return

    // Default center (New York)
    const defaultCenter = { lat: 40.7128, lng: -74.0060 }
    const defaultZoom = 11

    // Initialize map with error handling for IntersectionObserver issues
    try {
      const map = new window.google.maps.Map(mapRef.current, {
        center: defaultCenter,
        zoom: defaultZoom,
        mapTypeId: mapType === 'satellite' ? window.google.maps.MapTypeId.SATELLITE : window.google.maps.MapTypeId.ROADMAP,
        zoomControl: true,
        streetViewControl: false,
        fullscreenControl: true,
      })

      // Check if map actually initialized
      if (!map) {
        console.error('Map initialization returned null, using Embed API')
        setUseEmbedAPI(true)
        return
      }

      mapInstanceRef.current = map
      setMapLoaded(true)

      // Set up error detection for async Google Maps errors
      // These errors (ApiNotActivatedMapError, BillingNotEnabledMapError) 
      // are thrown AFTER map creation, so we need to detect them
      setTimeout(() => {
        // Check if map div shows error messages
        if (mapRef.current && mapRef.current.textContent) {
          const errorText = mapRef.current.textContent
          if (errorText.includes('ApiNotActivated') || 
              errorText.includes('BillingNotEnabled') ||
              errorText.includes('For development purposes only')) {
            console.warn('🗺️ JobsMap: Detected Google Maps API/billing error in map container, switching to Embed API')
            setUseEmbedAPI(true)
            localStorage.setItem('googleMapsUseEmbedAPI', 'true')
          }
        }
      }, 1000)

      // Markers will be added by updateMarkers() when mapLoaded becomes true
    } catch (error) {
      console.error('Error initializing map:', error)
      // Do not retry - just fall back to Embed API
      // Fix #1: No setTimeout retries - prevents IntersectionObserver crashes
      setUseEmbedAPI(true)
    }
  }

  const geocodeAndAddMarkers = async (jobsWithAddresses, map) => {
    if (!window.google || !window.google.maps) return

    const geocoder = new window.google.maps.Geocoder()
    const bounds = new window.google.maps.LatLngBounds()
    const markers = []

    // Markers are cleared in updateMarkers() before calling this function

    // Classic location pin SVG - proper map pin icon (not house)
    const getPinIcon = () => {
      // Classic location pin SVG path - proper pin shape
      return {
        path: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z",
        fillColor: "#3b82f6", // blue
        fillOpacity: 1,
        strokeColor: "#ffffff",
        strokeWeight: 2,
        scale: 1.5,
        anchor: new window.google.maps.Point(12, 24),
      }
    }

    // Geocode each job address and add marker (with caching)
    const geocodePromises = jobsWithAddresses.map((job, index) => {
      return new Promise((resolve) => {
        const addressKey = job.address.toLowerCase().trim()
        
        // Check cache first
        if (geocodeCacheRef.current[addressKey]) {
          const cached = geocodeCacheRef.current[addressKey]
          const position = cached.position
          
          // Get customer name from job
          const customerName = job.customer_name || 
            (job.customer_first_name && job.customer_last_name 
              ? `${job.customer_first_name} ${job.customer_last_name}` 
              : job.customer_first_name || job.customer_last_name || '') ||
            (job.customers?.first_name && job.customers?.last_name
              ? `${job.customers.first_name} ${job.customers.last_name}`
              : job.customers?.first_name || job.customers?.last_name || '')
          
          // Create marker from cached position with classic pin icon
          const marker = new window.google.maps.Marker({
            position: position,
            map: map,
            title: customerName || job.service_name || `Job ${job.id}`,
            icon: getPinIcon(),
            label: job.id ? {
              text: String(job.id),
              color: 'white',
              fontWeight: 'bold'
            } : undefined,
            animation: window.google.maps.Animation.DROP
          })

          // Create info window
          const infoWindow = new window.google.maps.InfoWindow({
            content: `
              <div style="padding: 8px; min-width: 200px;">
                <h3 style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600;">
                  ${customerName || job.service_name || `Job ${job.id}`}
                </h3>
                <p style="margin: 0 0 4px 0; font-size: 12px; color: #666;">
                  ${job.address}
                </p>
                ${job.service_name ? `<p style="margin: 4px 0 0 0; font-size: 12px; color: #333;">${job.service_name}</p>` : ''}
              </div>
            `
          })

          // Add click listener to marker
          marker.addListener('click', () => {
            // Close all other info windows
            markersRef.current.forEach(m => {
              if (m.infoWindow) {
                m.infoWindow.close()
              }
            })
            infoWindow.open(map, marker)
          })

          markers.push({
            marker,
            infoWindow,
            position
          })
          bounds.extend(position)
          resolve()
          return
        }

        // Not in cache, geocode it
        geocoder.geocode({ address: job.address }, (results, status) => {
          if (status === 'OK' && results[0]) {
            const location = results[0].geometry.location
            const position = { lat: location.lat(), lng: location.lng() }

            // Cache the result
            geocodeCacheRef.current[addressKey] = { position }

            // Get customer name from job
            const customerName = job.customer_name || 
              (job.customer_first_name && job.customer_last_name 
                ? `${job.customer_first_name} ${job.customer_last_name}` 
                : job.customer_first_name || job.customer_last_name || '') ||
              (job.customers?.first_name && job.customers?.last_name
                ? `${job.customers.first_name} ${job.customers.last_name}`
                : job.customers?.first_name || job.customers?.last_name || '')
            
            // Create marker with classic pin icon
            const marker = new window.google.maps.Marker({
              position: position,
              map: map,
              title: customerName || job.service_name || `Job ${job.id}`,
              icon: getPinIcon(),
              label: job.id ? {
                text: String(job.id),
                color: 'white',
                fontWeight: 'bold'
              } : undefined,
              animation: window.google.maps.Animation.DROP
            })

            // Create info window
            const infoWindow = new window.google.maps.InfoWindow({
              content: `
                <div style="padding: 8px; min-width: 200px;">
                  <h3 style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600;">
                    ${customerName || job.service_name || `Job ${job.id}`}
                  </h3>
                  <p style="margin: 0 0 4px 0; font-size: 12px; color: #666;">
                    ${job.address}
                  </p>
                  ${job.service_name ? `<p style="margin: 4px 0 0 0; font-size: 12px; color: #333;">${job.service_name}</p>` : ''}
                </div>
              `
            })

            // Add click listener to marker
            marker.addListener('click', () => {
              // Close all other info windows
              markersRef.current.forEach(m => {
                if (m.infoWindow) {
                  m.infoWindow.close()
                }
              })
              infoWindow.open(map, marker)
            })

            markers.push({
              marker,
              infoWindow,
              position
            })
            bounds.extend(position)
          } else {
            console.warn(`Geocoding failed for address: ${job.address}`, status)
          }
          resolve()
        })
      })
    })

    // Wait for all geocoding to complete
    await Promise.all(geocodePromises)

    // Store markers
    markersRef.current = markers

    console.log(`🗺️ JobsMap: Added ${markers.length} markers to map`)

    // Fit map bounds to show all markers with proper padding
    if (markers.length > 0) {
      if (markers.length === 1) {
        // Single marker - center and zoom
        map.setCenter(markers[0].position)
        map.setZoom(14)
      } else {
        // Multiple markers - fit bounds to show all markers
        // Ensure bounds is valid before fitting
        if (bounds.getNorthEast().lat() !== bounds.getSouthWest().lat() || 
            bounds.getNorthEast().lng() !== bounds.getSouthWest().lng()) {
          // Use fitBounds with padding to ensure all markers are visible
          map.fitBounds(bounds, {
            top: 50,
            right: 50,
            bottom: 50,
            left: 50
          })
          
          // Set a maximum zoom level to prevent zooming in too close
          // This ensures all markers stay visible
          const listener = window.google.maps.event.addListenerOnce(map, 'bounds_changed', () => {
            if (map.getZoom() > 15) {
              map.setZoom(15)
            }
          })
        } else {
          // All markers at same location, just center on it
          map.setCenter(markers[0].position)
          map.setZoom(14)
        }
      }
    } else {
      console.warn('🗺️ JobsMap: No markers were created - check addresses')
    }
  }

  const updateMarkers = () => {
    if (!mapInstanceRef.current || !window.google || !window.google.maps) return

    // Clear existing markers first
    markersRef.current.forEach(m => {
      if (m.marker) {
        m.marker.setMap(null)
      }
    })
    markersRef.current = []

    // If no jobs, just update map type and return
    if (!jobs || jobs.length === 0) {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.setMapTypeId(
          mapType === 'satellite' 
            ? window.google.maps.MapTypeId.SATELLITE 
            : window.google.maps.MapTypeId.ROADMAP
        )
      }
      return
    }

    const jobsWithAddresses = jobs
      .map(job => {
        // Build complete address from components if available
        let address = ''
        if (job.service_address_street) {
          const parts = [job.service_address_street]
          if (job.service_address_city) parts.push(job.service_address_city)
          if (job.service_address_state) parts.push(job.service_address_state)
          if (job.service_address_zip) parts.push(job.service_address_zip)
          address = parts.join(', ')
        } else {
          // Fallback to full address strings
          address = job.service_address || 
                   job.customer_address || 
                   job.address || 
                   ''
        }
        return address.trim() !== '' ? { ...job, address } : null
      })
      .filter(job => job !== null)

    if (jobsWithAddresses.length > 0) {
      console.log(`🗺️ JobsMap: Updating markers for ${jobsWithAddresses.length} jobs`)
      geocodeAndAddMarkers(jobsWithAddresses, mapInstanceRef.current).catch(error => {
        console.error('🗺️ JobsMap: Error updating markers:', error)
      })
    } else {
      console.warn('🗺️ JobsMap: No jobs with addresses to display')
    }

    // Update map type
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setMapTypeId(
        mapType === 'satellite' 
          ? window.google.maps.MapTypeId.SATELLITE 
          : window.google.maps.MapTypeId.ROADMAP
      )
    }
  }

  // Generate embed URL - this works without billing or JavaScript API activation
  const generateEmbedUrl = () => {
    const apiKey = getGoogleMapsApiKey()
    if (!jobs || jobs.length === 0) {
      return `https://www.google.com/maps/embed/v1/view?key=${apiKey}&center=40.7128,-74.0060&zoom=11&maptype=${mapType === 'satellite' ? 'satellite' : 'roadmap'}`
    }

    const jobsWithAddresses = jobs
      .map(job => {
        let address = ''
        if (job.service_address_street) {
          const parts = [job.service_address_street]
          if (job.service_address_city) parts.push(job.service_address_city)
          if (job.service_address_state) parts.push(job.service_address_state)
          if (job.service_address_zip) parts.push(job.service_address_zip)
          address = parts.join(', ')
        } else {
          address = job.service_address || job.customer_address || job.address || ''
        }
        return address.trim() !== '' ? address : null
      })
      .filter(addr => addr !== null)

    if (jobsWithAddresses.length === 0) {
      return `https://www.google.com/maps/embed/v1/view?key=${apiKey}&center=40.7128,-74.0060&zoom=11&maptype=${mapType === 'satellite' ? 'satellite' : 'roadmap'}`
    }

    if (jobsWithAddresses.length === 1) {
      return `https://www.google.com/maps/embed/v1/place?key=${apiKey}&q=${encodeURIComponent(jobsWithAddresses[0])}&zoom=14&maptype=${mapType === 'satellite' ? 'satellite' : 'roadmap'}`
    }

    // For multiple addresses, use search mode which shows all locations
    const addresses = jobsWithAddresses.join('|')
    return `https://www.google.com/maps/embed/v1/search?key=${apiKey}&q=${encodeURIComponent(addresses)}&zoom=10&maptype=${mapType === 'satellite' ? 'satellite' : 'roadmap'}`
  }

  // Fix #3: DO NOT swap DOM nodes - keep map div mounted always
  // Overlay iframe on top if using Embed API, but never unmount the map container
  return (
    <div className="w-full h-full relative" style={{ minHeight: '256px' }}>
      {/* Map container - always mounted, never unmounted */}
      <div 
        ref={mapRef} 
        className="w-full h-full" 
        style={{ display: 'block' }}
      />
      
      {/* Embed API fallback - overlay iframe on top if needed */}
      {useEmbedAPI && (
        <iframe
          className="absolute inset-0 w-full h-full"
          frameBorder="0"
          style={{ border: 0, zIndex: 1 }}
          src={generateEmbedUrl()}
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          title="Jobs Map"
        />
      )}
    </div>
  )
}

export default JobsMap

