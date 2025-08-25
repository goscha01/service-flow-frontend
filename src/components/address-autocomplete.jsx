"use client"

import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Search } from 'lucide-react';

// API base URL for backend calls
const API_BASE_URL = 'https://zenbookapi.now2code.online';

const AddressAutocomplete = ({ 
  value, 
  onChange, 
  onAddressSelect, 
  placeholder = "Enter address...",
  className = ""
}) => {
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);
  const suggestionsRef = useRef(null);
  const timeoutRef = useRef(null);

  // Debounce function to limit API calls
  const debounce = (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  };

  const fetchSuggestions = async (query) => {
    if (!query || query.length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/places/autocomplete?input=${encodeURIComponent(query)}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch suggestions');
      }
      
      const data = await response.json();
      setSuggestions(data.predictions || []);
      setShowSuggestions(true);
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      setSuggestions([]);
      setShowSuggestions(false);
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestionSelect = async (suggestion) => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/places/details?place_id=${suggestion.place_id}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch place details');
      }
      
      const data = await response.json();
      const placeDetails = data.result;
      
      // Extract address components
      const addressComponents = placeDetails.address_components || [];
      const streetNumber = addressComponents.find(comp => comp.types.includes('street_number'))?.long_name || '';
      const route = addressComponents.find(comp => comp.types.includes('route'))?.long_name || '';
      const city = addressComponents.find(comp => comp.types.includes('locality'))?.long_name || '';
      const state = addressComponents.find(comp => comp.types.includes('administrative_area_level_1'))?.short_name || '';
      const zipCode = addressComponents.find(comp => comp.types.includes('postal_code'))?.long_name || '';
      
      const fullAddress = placeDetails.formatted_address || suggestion.description;
      const streetAddress = streetNumber && route ? `${streetNumber} ${route}` : '';
      
      onChange(fullAddress);
      onAddressSelect({
        fullAddress,
        streetAddress,
        city,
        state,
        zipCode,
        placeId: suggestion.place_id
      });
      
      setShowSuggestions(false);
      setSuggestions([]);
    } catch (error) {
      console.error('Error fetching place details:', error);
      // Fallback to just using the suggestion description
      onChange(suggestion.description);
      onAddressSelect({
        fullAddress: suggestion.description,
        streetAddress: '',
        city: '',
        state: '',
        zipCode: '',
        placeId: suggestion.place_id
      });
      setShowSuggestions(false);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const newValue = e.target.value;
    onChange?.(newValue);

    // Clear previous timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout for debounced API call
    timeoutRef.current = setTimeout(() => {
      fetchSuggestions(newValue);
    }, 300);
  };

  const handleFocus = () => {
    if (suggestions.length > 0) {
      setShowSuggestions(true);
    }
  };

  const handleBlur = () => {
    // Delay hiding suggestions to allow for clicks
    setTimeout(() => {
      setShowSuggestions(false);
    }, 200);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setShowSuggestions(false);
      inputRef.current?.blur();
    }
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={value || ''}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full px-4 py-3 pl-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
        />
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          {loading ? (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
          ) : (
            <Search className="h-5 w-5 text-gray-400" />
          )}
        </div>
      </div>
      
      {/* Suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto"
        >
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              onClick={() => handleSuggestionSelect(suggestion)}
              className="w-full px-4 py-3 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none transition-colors duration-150 flex items-start space-x-3"
            >
              <MapPin className="h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-gray-900 truncate">
                  {suggestion.structured_formatting?.main_text || suggestion.description}
                </div>
                  {suggestion.structured_formatting?.secondary_text && (
                  <div className="text-sm text-gray-500 truncate">
                    {suggestion.structured_formatting.secondary_text}
                  </div>
                  )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default AddressAutocomplete;
