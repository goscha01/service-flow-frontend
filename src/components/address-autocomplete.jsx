import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { placesAPI } from '../services/api';

const AddressAutocomplete = ({ 
  value, 
  onChange, 
  onAddressSelect,
  placeholder = "Enter address",
  className = "",
  showValidationResults = true,
  debounceMs = 300
}) => {
  const [input, setInput] = useState(value || '');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const timeoutRef = useRef(null);
  const inputRef = useRef(null);

  // Update input when value prop changes
  useEffect(() => {
    setInput(value || '');
  }, [value]);

  // Debounced autocomplete search
  useEffect(() => {
    if (!input || input.length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    // Clear previous timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout
    timeoutRef.current = setTimeout(async () => {
      await fetchSuggestions(input);
    }, debounceMs);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [input, debounceMs]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (inputRef.current && !inputRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const fetchSuggestions = async (inputValue) => {
    if (!inputValue || inputValue.length < 3) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await placesAPI.autocomplete(inputValue);
      
      if (response.predictions) {
        setSuggestions(response.predictions);
        setShowSuggestions(true);
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    } catch (err) {
      console.error('Autocomplete error:', err);
      setError('Failed to fetch address suggestions');
      setSuggestions([]);
      setShowSuggestions(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const newValue = e.target.value;
    setInput(newValue);
    onChange(newValue);
    setSelectedAddress(null);
    
    if (newValue.length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = async (suggestion) => {
    setInput(suggestion.description);
    onChange(suggestion.description);
    setShowSuggestions(false);
    setSelectedAddress(suggestion);

    // Get full address details
    if (onAddressSelect) {
      try {
        setIsLoading(true);
        const detailsResponse = await placesAPI.getDetails(suggestion.place_id);
        
        if (detailsResponse.result) {
          const place = detailsResponse.result;
          
          // Extract address components
          let city = '';
          let state = '';
          let zipCode = '';
          let country = '';
          
          if (place.address_components) {
            place.address_components.forEach(component => {
              if (component.types.includes('locality')) {
                city = component.long_name;
              }
              if (component.types.includes('administrative_area_level_1')) {
                state = component.short_name;
              }
              if (component.types.includes('postal_code')) {
                zipCode = component.long_name;
              }
              if (component.types.includes('country')) {
                country = component.long_name;
              }
            });
          }

          const addressData = {
            formattedAddress: place.formatted_address,
            placeId: suggestion.place_id,
            components: {
              city,
              state,
              zipCode,
              country
            },
            geometry: place.geometry,
            originalSuggestion: suggestion
          };

          onAddressSelect(addressData);
        }
      } catch (err) {
        console.error('Error fetching place details:', err);
        setError('Failed to get address details');
      } finally {
        setIsLoading(false);
      }
    }
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
    <div className={`relative ${className}`} ref={inputRef}>
      <div className="relative">
        <input
          type="text"
          value={input}
          onChange={handleInputChange}
          placeholder={placeholder}
          className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          {getStatusIcon()}
        </div>
      </div>

      {/* Suggestions Dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {suggestions.map((suggestion, index) => (
            <button
              key={suggestion.place_id}
              type="button"
              onClick={() => handleSuggestionClick(suggestion)}
              className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 focus:outline-none focus:bg-gray-50"
            >
              <div className="flex items-start space-x-3">
                <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900">
                    {suggestion.structured_formatting?.main_text || suggestion.description}
                  </div>
                  {suggestion.structured_formatting?.secondary_text && (
                    <div className="text-sm text-gray-500 mt-1">
                      {suggestion.structured_formatting.secondary_text}
                    </div>
                  )}
                </div>
              </div>
            </button>
          ))}
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
            <span>{selectedAddress.description}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddressAutocomplete;