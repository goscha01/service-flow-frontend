import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { placesAPI } from '../services/api';

const AddressAutocompleteLeads = ({ 
  value, 
  onChange, 
  onAddressSelect, 
  placeholder = "Search location",
  className = "",
  showValidationResults = true
}) => {
  const [input, setInput] = useState(value || '');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [mounted, setMounted] = useState(false);
  const inputRef = useRef(null);
  const suggestionsRef = useRef(null);

  // Delay rendering to bypass Safari autofill
  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch suggestions from backend API
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (input.length < 3) {
        setSuggestions([]);
        setShowSuggestions(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        const data = await placesAPI.autocomplete(input);
        
        if (data.predictions) {
          setSuggestions(data.predictions);
          setShowSuggestions(true);
        } else {
          setSuggestions([]);
          setShowSuggestions(false);
        }
      } catch (err) {
        console.error('Error fetching address suggestions:', err);
        setError('Failed to load address suggestions');
        setSuggestions([]);
        setShowSuggestions(false);
      } finally {
        setIsLoading(false);
      }
    };

    const debounceTimer = setTimeout(() => {
      fetchSuggestions();
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [input]);

  // Handle address selection
  const handleAddressSelect = async (suggestion) => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Get detailed place information from backend
      const data = await placesAPI.getDetails(suggestion.place_id);
      
      if (data.result) {
        const place = data.result;
        const addressData = {
          formattedAddress: place.formatted_address || suggestion.description,
          placeId: place.place_id || suggestion.place_id,
          components: {
            streetNumber: place.address_components?.find(c => c.types.includes('street_number'))?.long_name,
            route: place.address_components?.find(c => c.types.includes('route'))?.long_name,
            city: place.address_components?.find(c => c.types.includes('locality'))?.long_name,
            state: place.address_components?.find(c => c.types.includes('administrative_area_level_1'))?.short_name,
            zipCode: place.address_components?.find(c => c.types.includes('postal_code'))?.long_name,
            country: place.address_components?.find(c => c.types.includes('country'))?.long_name,
          },
          geometry: place.geometry?.location ? {
            lat: typeof place.geometry.location.lat === 'function' 
              ? place.geometry.location.lat() 
              : place.geometry.location.lat,
            lng: typeof place.geometry.location.lng === 'function' 
              ? place.geometry.location.lng() 
              : place.geometry.location.lng,
          } : null,
        };

        setSelectedAddress(addressData);
        setInput(addressData.formattedAddress);
        setShowSuggestions(false);
        setSuggestions([]);
        
        // Call onChange and onAddressSelect
        onChange(addressData.formattedAddress);
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

  // Update input when value prop changes
  useEffect(() => {
    setInput(value || '');
  }, [value]);

  const handleInputChange = (e) => {
    const newValue = e.target.value;
    setInput(newValue);
    setSelectedAddress(null);
    setError(null);
    
    // Prevent browser autocomplete from interfering
    if (inputRef.current) {
      inputRef.current.setAttribute('autocomplete', 'one-time-code');
      inputRef.current.setAttribute('name', 'loc_input_9f3k');
      inputRef.current.setAttribute('id', 'loc_input_9f3k');
      inputRef.current.removeAttribute('list');
    }
    
    // Call onChange for manual typing
    onChange(newValue);
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target) &&
          inputRef.current && !inputRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const getStatusIcon = () => {
    if (isLoading) {
      return <Loader2 className="w-4 h-4 animate-spin text-blue-500" />;
    }
    
    if (selectedAddress) {
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    }
    
    return <MapPin className="w-4 h-4 text-gray-400" />;
  };

  // Add styles to hide browser autocomplete
  useEffect(() => {
    if (inputRef.current) {
      // Aggressively disable browser autocomplete
      inputRef.current.setAttribute('autocomplete', 'one-time-code');
      inputRef.current.setAttribute('autocorrect', 'off');
      inputRef.current.setAttribute('autocapitalize', 'off');
      inputRef.current.setAttribute('spellcheck', 'false');
      inputRef.current.setAttribute('name', 'loc_input_9f3k');
      inputRef.current.setAttribute('id', 'loc_input_9f3k');
      inputRef.current.removeAttribute('list');

      // Add styles to hide browser autocomplete
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
  }, []);

  return (
    <div className={`relative ${className}`}>
      {/* Hidden dummy input to trick browser autofill - browser fills this instead */}
      <input
        type="text"
        name="address"
        autoComplete="address-line1"
        style={{ position: 'absolute', opacity: 0, height: 0, width: 0, pointerEvents: 'none' }}
        tabIndex={-1}
        readOnly
        aria-hidden="true"
      />
      {mounted && (
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={handleInputChange}
            onFocus={() => {
              if (suggestions.length > 0) {
                setShowSuggestions(true);
              }
            }}
            placeholder={placeholder}
            className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            autoComplete="one-time-code"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
            name="loc_input_9f3k"
            id="loc_input_9f3k"
          />
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            {getStatusIcon()}
          </div>
          
          {/* Suggestions Dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div
              ref={suggestionsRef}
              className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto"
            >
              {suggestions.map((suggestion, index) => (
                <div
                  key={suggestion.place_id || index}
                  onClick={() => handleAddressSelect(suggestion)}
                  className="px-4 py-3 cursor-pointer hover:bg-gray-50 border-b border-gray-100 last:border-b-0 flex items-start gap-2"
                >
                  <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900">
                      {suggestion.structured_formatting?.main_text || suggestion.description}
                    </div>
                    {suggestion.structured_formatting?.secondary_text && (
                      <div className="text-xs text-gray-500 mt-0.5">
                        {suggestion.structured_formatting.secondary_text}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
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

