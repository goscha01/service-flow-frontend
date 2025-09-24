import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { loadGoogleMapsScript, initializePlacesAutocomplete, getPlaceDetails, isGoogleMapsLoaded } from '../utils/googleMaps';

const AddressAutocomplete = ({ 
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
        const autocomplete = initializePlacesAutocomplete(inputRef.current, {
          types: ['address'],
          componentRestrictions: { country: 'us' }
        });

        // Listen for place selection
        autocomplete.addListener('place_changed', () => {
          const place = autocomplete.getPlace();
          if (place && place.place_id) {
            handlePlaceSelection(place);
          }
        });

        autocompleteRef.current = autocomplete;
      } catch (err) {
        console.error('Failed to initialize autocomplete:', err);
        setError('Failed to initialize address autocomplete');
      }
    }
  }, [googleMapsReady]);

  // Update input when value prop changes
  useEffect(() => {
    setInput(value || '');
  }, [value]);

  const handlePlaceSelection = async (place) => {
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
        setInput(placeDetails.formatted_address);
        onChange(placeDetails.formatted_address);
        
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
  };

  const handleInputChange = (e) => {
    const newValue = e.target.value;
    setInput(newValue);
    onChange(newValue);
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

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={handleInputChange}
          placeholder={placeholder}
          className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          disabled={!googleMapsReady}
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

export default AddressAutocomplete;