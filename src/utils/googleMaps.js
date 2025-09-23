// Google Maps utility functions for frontend-based Places API

let googleMapsLoaded = false;
let googleMapsLoading = false;
const loadingCallbacks = [];

// Load Google Maps JavaScript API
export const loadGoogleMapsScript = (apiKey) => {
  return new Promise((resolve, reject) => {
    // If already loaded, resolve immediately
    if (googleMapsLoaded && window.google && window.google.maps && window.google.maps.places) {
      resolve();
      return;
    }

    // If currently loading, add to callback queue
    if (googleMapsLoading) {
      loadingCallbacks.push({ resolve, reject });
      return;
    }

    // Start loading
    googleMapsLoading = true;
    loadingCallbacks.push({ resolve, reject });

    // Check if script already exists
    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existingScript) {
      existingScript.remove();
    }

    // Create script element
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    
    script.onload = () => {
      googleMapsLoaded = true;
      googleMapsLoading = false;
      
      // Resolve all pending callbacks
      loadingCallbacks.forEach(callback => callback.resolve());
      loadingCallbacks.length = 0;
    };
    
    script.onerror = (error) => {
      googleMapsLoading = false;
      console.error('Failed to load Google Maps script:', error);
      
      // Reject all pending callbacks
      loadingCallbacks.forEach(callback => callback.reject(error));
      loadingCallbacks.length = 0;
    };

    // Add script to document
    document.head.appendChild(script);
  });
};

// Initialize Google Places Autocomplete
export const initializePlacesAutocomplete = (inputElement, options = {}) => {
  if (!window.google || !window.google.maps || !window.google.maps.places) {
    throw new Error('Google Maps Places API not loaded');
  }

  const autocomplete = new window.google.maps.places.Autocomplete(inputElement, {
    types: ['address'],
    componentRestrictions: { country: 'us' },
    ...options
  });

  return autocomplete;
};

// Get place details
export const getPlaceDetails = (placeId) => {
  return new Promise((resolve, reject) => {
    if (!window.google || !window.google.maps || !window.google.maps.places) {
      reject(new Error('Google Maps Places API not loaded'));
      return;
    }

    const service = new window.google.maps.places.PlacesService(document.createElement('div'));
    
    service.getDetails({
      placeId: placeId,
      fields: ['formatted_address', 'address_components', 'geometry', 'name']
    }, (place, status) => {
      if (status === window.google.maps.places.PlacesServiceStatus.OK) {
        resolve(place);
      } else {
        reject(new Error(`Places service error: ${status}`));
      }
    });
  });
};

// Search for places (alternative to autocomplete)
export const searchPlaces = (query, options = {}) => {
  return new Promise((resolve, reject) => {
    if (!window.google || !window.google.maps || !window.google.maps.places) {
      reject(new Error('Google Maps Places API not loaded'));
      return;
    }

    const service = new window.google.maps.places.PlacesService(document.createElement('div'));
    
    service.textSearch({
      query: query,
      type: 'address',
      ...options
    }, (results, status) => {
      if (status === window.google.maps.places.PlacesServiceStatus.OK) {
        resolve(results);
      } else {
        reject(new Error(`Places search error: ${status}`));
      }
    });
  });
};

// Check if Google Maps is loaded
export const isGoogleMapsLoaded = () => {
  return googleMapsLoaded && window.google && window.google.maps && window.google.maps.places;
};
