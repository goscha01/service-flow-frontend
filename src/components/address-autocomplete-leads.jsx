import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { loadGoogleMapsScript, initializePlacesAutocomplete, getPlaceDetails, isGoogleMapsLoaded } from '../utils/googleMaps';

const AddressAutocompleteLeads = ({ 
  value, 
  onChange, 
  onAddressSelect, 
  placeholder = "Enter address",
  className = "",
  showValidationResults = true,
  apiKey = "AIzaSyC_CrJWTsTHOTBd7TSzTuXOfutywZ2AyOQ"
}) => {
  const [input, setInput] = useState(value || '');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [googleMapsReady, setGoogleMapsReady] = useState(false);
  const [isProgrammaticUpdate, setIsProgrammaticUpdate] = useState(false);
  const inputRef = useRef(null);
  const autocompleteRef = useRef(null);

  // Load Google Maps script on component mount
  useEffect(() => {
    const loadMaps = async () => {
      try {
        await loadGoogleMapsScript(apiKey);
        setGoogleMapsReady(true);
      } catch (err) {
        console.error('Failed to load Google Maps:', err);
        setError('Failed to load Google Maps API');
      }
    };

    if (!isGoogleMapsLoaded()) {
      loadMaps();
    } else {
      setGoogleMapsReady(true);
    }
  }, [apiKey]);

  // Initialize autocomplete when Google Maps is ready
  useEffect(() => {
    if (googleMapsReady && inputRef.current && !autocompleteRef.current) {
      try {
        // Aggressively disable browser autocomplete
        if (inputRef.current) {
          inputRef.current.setAttribute('autocomplete', 'one-time-code');
          inputRef.current.setAttribute('autocorrect', 'off');
          inputRef.current.setAttribute('autocapitalize', 'off');
          inputRef.current.setAttribute('spellcheck', 'false');
          inputRef.current.setAttribute('name', 'addr_input_xyz');
          inputRef.current.setAttribute('id', 'addr_input_xyz');
          // Remove any datalist that might be attached
          inputRef.current.removeAttribute('list');
        }

        const autocomplete = initializePlacesAutocomplete(inputRef.current, {
          types: ['address'],
          componentRestrictions: { country: 'us' },
          fields: ['place_id', 'formatted_address', 'address_components', 'geometry']
        });

        // Listen for place selection
        autocomplete.addListener('place_changed', () => {
          const place = autocomplete.getPlace();
          if (place && place.place_id) {
            // Handle place selection inline to avoid dependency warning
            (async () => {
              try {
                setIsLoading(true);
                setError(null);

                // Get detailed place information
                const placeDetails = await getPlaceDetails(place.place_id);
                
                if (placeDetails) {
                  const addressData = {
                    formattedAddress: placeDetails.formatted_address,
                    placeId: placeDetails.place_id,
                    components: {
                      streetNumber: placeDetails.address_components?.find(c => c.types.includes('street_number'))?.long_name,
                      route: placeDetails.address_components?.find(c => c.types.includes('route'))?.long_name,
                      city: placeDetails.address_components?.find(c => c.types.includes('locality'))?.long_name,
                      state: placeDetails.address_components?.find(c => c.types.includes('administrative_area_level_1'))?.short_name,
                      zipCode: placeDetails.address_components?.find(c => c.types.includes('postal_code'))?.long_name,
                      country: placeDetails.address_components?.find(c => c.types.includes('country'))?.long_name,
                    },
                    geometry: placeDetails.geometry?.location,
                  };

                  setSelectedAddress(addressData);
                  setIsProgrammaticUpdate(true);
                  
                  // Use setTimeout to ensure the flag is set before input change
                  setTimeout(() => {
                    setInput(placeDetails.formatted_address);
                  }, 0);
                  
                  // Only call onAddressSelect when a place is selected, not onChange
                  if (onAddressSelect) {
                    onAddressSelect(addressData);
                  }
                }
              } catch (err) {
                console.error('Error getting place details:', err);
                setError('Failed to get address details');
              } finally {
                setIsLoading(false);
              }
            })();
          }
        });

        autocompleteRef.current = autocomplete;
      } catch (err) {
        console.error('Failed to initialize autocomplete:', err);
        setError('Failed to initialize address autocomplete');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [googleMapsReady, onAddressSelect]);

  // Update input when value prop changes
  useEffect(() => {
    setInput(value || '');
  }, [value]);

  const handleInputChange = (e) => {
    const newValue = e.target.value;
    setInput(newValue);
    
    // Prevent browser autocomplete from interfering
    if (inputRef.current) {
      inputRef.current.setAttribute('autocomplete', 'one-time-code');
      inputRef.current.removeAttribute('list');
    }
    
    // Only call onChange if this is manual typing, not programmatic setting
    if (!isProgrammaticUpdate) {
      onChange(newValue);
    }
    
    // Reset flags
    setIsProgrammaticUpdate(false);
    setSelectedAddress(null);
    setError(null);
  };

  const getStatusIcon = () => {
    if (isLoading) {
      return <Loader2 className="w-4 h-4 animate-spin text-blue-500" />;
    }
    
    if (selectedAddress) {
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    }
    
    return <MapPin className="w-4 h-4 text-gray-400" />;
  };

  // Add styles for Google Places Autocomplete dropdown and hide browser autocomplete
  useEffect(() => {
    if (googleMapsReady && inputRef.current) {
      // Aggressively disable browser autocomplete
      if (inputRef.current) {
        inputRef.current.setAttribute('autocomplete', 'one-time-code');
        inputRef.current.setAttribute('autocorrect', 'off');
        inputRef.current.setAttribute('autocapitalize', 'off');
        inputRef.current.setAttribute('spellcheck', 'false');
        inputRef.current.setAttribute('name', 'addr_input_xyz');
        inputRef.current.setAttribute('id', 'addr_input_xyz');
        inputRef.current.removeAttribute('list');
      }

      // Ensure Google Places Autocomplete dropdown is visible and hide browser autocomplete
      const style = document.createElement('style');
      style.id = 'address-autocomplete-leads-styles';
      style.textContent = `
        /* Hide browser autocomplete dropdown completely */
        input[autocomplete="one-time-code"]::-webkit-contacts-auto-fill-button,
        input[autocomplete="one-time-code"]::-webkit-credentials-auto-fill-button {
          display: none !important;
          visibility: hidden !important;
          opacity: 0 !important;
          pointer-events: none !important;
        }
        
        /* Hide any datalist suggestions */
        input[list]::-webkit-calendar-picker-indicator {
          display: none !important;
        }
        
        /* Hide browser's autocomplete dropdown */
        input:-webkit-autofill {
          -webkit-box-shadow: 0 0 0 1000px white inset !important;
        }
        
        .pac-container {
          z-index: 9999 !important;
          border-radius: 8px !important;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06) !important;
          border: 1px solid #e5e7eb !important;
          margin-top: 4px !important;
        }
        .pac-item {
          padding: 12px !important;
          cursor: pointer !important;
          border-bottom: 1px solid #f3f4f6 !important;
        }
        .pac-item:hover {
          background-color: #f9fafb !important;
        }
        .pac-item-selected {
          background-color: #eff6ff !important;
        }
        .pac-icon {
          margin-right: 8px !important;
        }
      `;
      
      // Only add style if it doesn't exist
      if (!document.getElementById('address-autocomplete-leads-styles')) {
        document.head.appendChild(style);
      }
      
      return () => {
        const existingStyle = document.getElementById('address-autocomplete-leads-styles');
        if (existingStyle && document.head.contains(existingStyle)) {
          document.head.removeChild(existingStyle);
        }
      };
    }
  }, [googleMapsReady]);

  return (
    <div className={`relative ${className}`}>
      {/* Hidden dummy input to trick browser autofill */}
      <input
        type="text"
        name="fake-address"
        autoComplete="address-line1"
        style={{ position: 'absolute', left: '-9999px', opacity: 0, pointerEvents: 'none', height: 0, width: 0 }}
        tabIndex={-1}
        readOnly
        aria-hidden="true"
      />
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={handleInputChange}
          placeholder={placeholder}
          className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          disabled={!googleMapsReady}
          autoComplete="one-time-code"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck="false"
          name="addr_input_xyz"
          id="addr_input_xyz"
        />
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          {getStatusIcon()}
        </div>
      </div>
      
      {/* Loading State */}
      {!googleMapsReady && (
        <div className="mt-2 text-sm text-gray-500 flex items-center gap-1">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading Google Maps...
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mt-2 text-sm text-red-600 flex items-center gap-1">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* Selected Address Info */}
      {selectedAddress && showValidationResults && (
        <div className="mt-2 p-3 bg-green-50 rounded-lg border border-green-200">
          <div className="flex items-center gap-2 text-sm text-green-700">
            <CheckCircle className="w-4 h-4" />
            <span className="font-medium">Address selected:</span>
            <span>{selectedAddress.formattedAddress}</span>
          </div>
          {selectedAddress.components.city && (
            <div className="mt-1 text-xs text-green-600">
              {selectedAddress.components.city}, {selectedAddress.components.state} {selectedAddress.components.zipCode}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AddressAutocompleteLeads;

