import React, { useState, useEffect, useRef } from 'react';
import { X, MapPin, Search } from 'lucide-react';
import api from '../services/api';

export default function ServiceAddressModal({ 
  isOpen, 
  onClose, 
  onSave, 
  currentAddress 
}) {
  const [address, setAddress] = useState(currentAddress || {
    street: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'USA'
  });
  
  const [predictions, setPredictions] = useState([]);
  const [showPredictions, setShowPredictions] = useState(false);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  // Debounce function for API calls
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

  const fetchPredictions = async (input) => {
    if (!input || input.length < 3) {
      setPredictions([]);
      setShowPredictions(false);
      return;
    }

    try {
      setLoading(true);
      const response = await api.get(`/places/autocomplete?input=${encodeURIComponent(input)}`);
      
      if (response.data.predictions) {
        setPredictions(response.data.predictions);
        setShowPredictions(true);
      }
    } catch (error) {
      console.error('Error fetching predictions:', error);
      setPredictions([]);
    } finally {
      setLoading(false);
    }
  };

  const debouncedFetchPredictions = debounce(fetchPredictions, 300);

  const handleAddressInput = (e) => {
    const value = e.target.value;
    setAddress(prev => ({ ...prev, street: value }));
    debouncedFetchPredictions(value);
  };

  const handlePredictionSelect = async (prediction) => {
    console.log('Prediction selected:', prediction);
    
    try {
      const response = await api.get(`/places/details?place_id=${prediction.place_id}`);
      console.log('Place details response:', response.data);
      
      if (response.data.result) {
        const place = response.data.result;
        const addressComponents = {
          street: '',
          city: '',
          state: '',
          zipCode: '',
          country: 'USA'
        };

        place.address_components.forEach(component => {
          const types = component.types;
          
          if (types.includes('street_number')) {
            addressComponents.street = component.long_name + ' ';
          }
          if (types.includes('route')) {
            addressComponents.street += component.long_name;
          }
          if (types.includes('locality')) {
            addressComponents.city = component.long_name;
          }
          if (types.includes('administrative_area_level_1')) {
            addressComponents.state = component.short_name;
          }
          if (types.includes('postal_code')) {
            addressComponents.zipCode = component.long_name;
          }
          if (types.includes('country')) {
            addressComponents.country = component.long_name;
          }
        });

        console.log('Parsed address components:', addressComponents);
        setAddress(addressComponents);
      }
    } catch (error) {
      console.error('Error fetching place details:', error);
    }
    
    setShowPredictions(false);
    setPredictions([]);
  };

  // Close predictions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Don't close if clicking on the input or predictions dropdown
      if (inputRef.current && !inputRef.current.contains(event.target)) {
        // Check if clicking on a prediction item
        const isPredictionClick = event.target.closest('.prediction-item');
        if (!isPredictionClick) {
          setShowPredictions(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSave = () => {
    onSave(address);
    onClose();
  };

  const handleCancel = () => {
    setAddress(currentAddress || {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'USA'
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <MapPin className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">Service Address</h2>
          </div>
          <button
            onClick={handleCancel}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Street Address (Start typing for autocomplete)
            </label>
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                value={address.street}
                onChange={handleAddressInput}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none pr-10"
                placeholder="Start typing address..."
              />
              {loading && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                </div>
              )}
              {!loading && address.street && (
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              )}
            </div>
            
                         {/* Predictions Dropdown */}
             {showPredictions && predictions.length > 0 && (
               <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl max-h-60 overflow-y-auto prediction-item">
                 {predictions.map((prediction, index) => (
                   <button
                     key={prediction.place_id}
                     type="button"
                     onClick={() => handlePredictionSelect(prediction)}
                     className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors duration-200"
                   >
                     <div className="font-medium text-gray-900">{prediction.structured_formatting?.main_text || prediction.description}</div>
                     <div className="text-sm text-gray-500">{prediction.structured_formatting?.secondary_text}</div>
                   </button>
                 ))}
               </div>
             )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                City
              </label>
              <input
                type="text"
                value={address.city}
                onChange={(e) => setAddress(prev => ({ ...prev, city: e.target.value }))}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="City"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                State
              </label>
              <input
                type="text"
                value={address.state}
                onChange={(e) => setAddress(prev => ({ ...prev, state: e.target.value }))}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="State"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ZIP Code
              </label>
              <input
                type="text"
                value={address.zipCode}
                onChange={(e) => setAddress(prev => ({ ...prev, zipCode: e.target.value }))}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="12345"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Country
              </label>
              <select
                value={address.country}
                onChange={(e) => setAddress(prev => ({ ...prev, country: e.target.value }))}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              >
                <option value="USA">USA</option>
                <option value="Canada">Canada</option>
                <option value="UK">UK</option>
                <option value="Australia">Australia</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex space-x-3 mt-6">
          <button
            onClick={handleCancel}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
          >
            Save Address
          </button>
        </div>
      </div>
    </div>
  );
} 