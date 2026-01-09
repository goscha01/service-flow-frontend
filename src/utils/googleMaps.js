// Google Maps utility functions for frontend-based Places API

let googleMapsLoaded = false;
let googleMapsLoading = false;
const loadingCallbacks = [];

// Load Google Maps JavaScript API with Places API (New)
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

    // Create script element - using loading=importmap for PlaceAutocompleteElement support
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&loading=async`;
    script.async = true;
    script.defer = true;
    
    script.onload = () => {
      // Wait for the library to fully initialize
      const checkLoaded = setInterval(() => {
        if (window.google && window.google.maps && window.google.maps.places) {
          clearInterval(checkLoaded);
          googleMapsLoaded = true;
          googleMapsLoading = false;
          
          // Resolve all pending callbacks
          loadingCallbacks.forEach(callback => callback.resolve());
          loadingCallbacks.length = 0;
        }
      }, 100);

      // Timeout after 5 seconds
      setTimeout(() => {
        clearInterval(checkLoaded);
        if (!googleMapsLoaded) {
          googleMapsLoading = false;
          const error = new Error('Google Maps API failed to load within timeout');
          loadingCallbacks.forEach(callback => callback.reject(error));
          loadingCallbacks.length = 0;
        }
      }, 5000);
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

// Initialize Google Places Autocomplete using PlaceAutocompleteElement (new API)
export const initializePlacesAutocomplete = (inputElement, options = {}) => {
  if (!window.google || !window.google.maps || !window.google.maps.places) {
    throw new Error('Google Maps Places API not loaded');
  }

  // Check if PlaceAutocompleteElement is available (new API)
  if (window.google.maps.places.PlaceAutocompleteElement) {
    // Create a wrapper div to replace the input
    const wrapper = document.createElement('div');
    wrapper.style.position = 'relative';
    wrapper.style.width = '100%';
    
    // Get computed styles from original input
    const computedStyle = window.getComputedStyle(inputElement);
    const inputRect = inputElement.getBoundingClientRect();
    
    // Replace the input with wrapper
    inputElement.parentNode.replaceChild(wrapper, inputElement);
    
    // Create the PlaceAutocompleteElement
    const autocompleteElement = new window.google.maps.places.PlaceAutocompleteElement({
      componentRestrictions: options.componentRestrictions || { country: 'us' }
    });
    
    // Style the element to match the original input
    autocompleteElement.style.width = '100%';
    autocompleteElement.style.height = `${inputRect.height}px`;
    autocompleteElement.style.padding = computedStyle.padding;
    autocompleteElement.style.border = computedStyle.border;
    autocompleteElement.style.borderRadius = computedStyle.borderRadius;
    autocompleteElement.style.fontSize = computedStyle.fontSize;
    autocompleteElement.style.fontFamily = computedStyle.fontFamily;
    autocompleteElement.style.backgroundColor = computedStyle.backgroundColor;
    autocompleteElement.style.color = computedStyle.color;
    
    // Copy placeholder
    if (inputElement.placeholder) {
      autocompleteElement.setAttribute('placeholder', inputElement.placeholder);
    }
    
    // Copy value
    if (inputElement.value) {
      autocompleteElement.value = inputElement.value;
    }
    
    // Append to wrapper
    wrapper.appendChild(autocompleteElement);
    
    // Store references
    autocompleteElement._wrapper = wrapper;
    autocompleteElement._originalInput = inputElement;
    autocompleteElement._isPlaceAutocompleteElement = true;
    
    return autocompleteElement;
  } else {
    // Fallback to legacy Autocomplete if PlaceAutocompleteElement is not available
    console.warn('PlaceAutocompleteElement not available, using legacy Autocomplete');
    const autocomplete = new window.google.maps.places.Autocomplete(inputElement, {
      types: ['address'],
      componentRestrictions: { country: 'us' },
      ...options
    });
    autocomplete._isPlaceAutocompleteElement = false;
    return autocomplete;
  }
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
