import React, { useState, useEffect, useRef } from 'react';
import { MapPin, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { addressValidationAPI, placesAPI } from '../services/api';

const AddressValidation = ({ 
  value, 
  onChange, 
  onValidation, 
  placeholder = "Enter address",
  className = "",
  showValidationResults = true,
  autoValidate = true,
  validationDelay = 1000
}) => {
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [error, setError] = useState(null);
  const timeoutRef = useRef(null);

  // Debounced validation
  useEffect(() => {
    if (!autoValidate || !value || value.length < 5) {
      setValidationResult(null);
      return;
    }

    // Clear previous timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout
    timeoutRef.current = setTimeout(async () => {
      await validateAddress(value);
    }, validationDelay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [value, autoValidate, validationDelay]);

  const validateAddress = async (address) => {
    if (!address || address.length < 5) {
      setValidationResult(null);
      return;
    }

    setIsValidating(true);
    setError(null);

    try {
      // Try backend endpoint first
      const response = await addressValidationAPI.validate(address);
      
      if (response.success && response.result) {
        setValidationResult(response.result);
        if (onValidation) {
          onValidation(response.result);
        }
      } else {
        setValidationResult(null);
      }
    } catch (err) {
      console.error('Address validation error:', err);
      
      // Fallback: Use Google Places API directly for basic validation
      if (err.response?.status === 404 || err.response?.data?.error === 'Endpoint not found') {
        console.log('Backend endpoint not available, using fallback validation');
        console.log('Error details:', err.response?.data);
        setError('Using basic validation (backend endpoint not deployed yet)');
        await validateWithFallback(address);
      } else if (err.response?.status === 400) {
        console.log('Address validation API failed, using geocoding fallback');
        console.log('Error details:', err.response?.data);
        setError('Using basic validation (address validation API failed)');
        await validateWithFallback(address);
      } else {
        console.error('Unexpected validation error:', err);
        setError('Address validation failed');
        setValidationResult(null);
      }
    } finally {
      setIsValidating(false);
    }
  };

  const validateWithFallback = async (address) => {
    try {
      // Use backend geocoding proxy to avoid CORS issues
      const response = await addressValidationAPI.geocode(address);
      
      if (response.success && response.result) {
        setValidationResult(response.result);
        setError(null); // Clear any previous error messages
        if (onValidation) {
          onValidation(response.result);
        }
      } else {
        setValidationResult({
          isValid: false,
          confidence: 'LOW',
          formattedAddress: null,
          components: {},
          geocode: null,
          suggestions: [],
          issues: ['Address not found']
        });
      }
    } catch (fallbackErr) {
      console.error('Fallback validation error:', fallbackErr);
      setError('Address validation service unavailable');
      setValidationResult(null);
    }
  };

  const handleManualValidation = async () => {
    if (value && value.length >= 5) {
      await validateAddress(value);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    if (suggestion.formattedAddress) {
      onChange(suggestion.formattedAddress);
      setShowSuggestions(false);
    }
  };

  const getValidationIcon = () => {
    if (isValidating) {
      return <Loader2 className="w-4 h-4 animate-spin text-blue-500" />;
    }
    
    if (validationResult) {
      if (validationResult.isValid) {
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      } else {
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      }
    }
    
    return <MapPin className="w-4 h-4 text-gray-400" />;
  };

  const getValidationMessage = () => {
    if (!validationResult) return null;

    if (validationResult.isValid) {
      return (
        <div className="text-sm text-green-600 flex items-center gap-1">
          <CheckCircle className="w-4 h-4" />
          Address is valid
        </div>
      );
    } else {
      return (
        <div className="text-sm text-yellow-600 flex items-center gap-1">
          <AlertCircle className="w-4 h-4" />
          Address may need correction
        </div>
      );
    }
  };

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          {getValidationIcon()}
        </div>
      </div>

      {showValidationResults && validationResult && (
        <div className="mt-2 p-3 bg-gray-50 rounded-lg border">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              {getValidationMessage()}
              
              {validationResult.formattedAddress && (
                <div className="mt-2">
                  <p className="text-sm font-medium text-gray-700">Suggested address:</p>
                  <p className="text-sm text-gray-600">{validationResult.formattedAddress}</p>
                </div>
              )}

              {validationResult.components && (
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                  {validationResult.components.streetNumber && (
                    <div>
                      <span className="font-medium">Street:</span> {validationResult.components.streetNumber} {validationResult.components.route}
                    </div>
                  )}
                  {validationResult.components.locality && (
                    <div>
                      <span className="font-medium">City:</span> {validationResult.components.locality}
                    </div>
                  )}
                  {validationResult.components.administrativeArea && (
                    <div>
                      <span className="font-medium">State:</span> {validationResult.components.administrativeArea}
                    </div>
                  )}
                  {validationResult.components.postalCode && (
                    <div>
                      <span className="font-medium">ZIP:</span> {validationResult.components.postalCode}
                    </div>
                  )}
                </div>
              )}

              {validationResult.issues && validationResult.issues.length > 0 && (
                <div className="mt-2">
                  <p className="text-sm font-medium text-yellow-700">Issues found:</p>
                  <ul className="text-xs text-yellow-600 list-disc list-inside">
                    {validationResult.issues.map((issue, index) => (
                      <li key={index}>{issue.type}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {validationResult.formattedAddress && validationResult.formattedAddress !== value && (
              <button
                type="button"
                onClick={() => onChange(validationResult.formattedAddress)}
                className="ml-2 px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Use Suggested
              </button>
            )}
          </div>
        </div>
      )}

      {error && (
        <div className="mt-2 text-sm text-red-600 flex items-center gap-1">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {!autoValidate && (
        <button
          type="button"
          onClick={handleManualValidation}
          disabled={!value || value.length < 5 || isValidating}
          className="mt-2 px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isValidating ? 'Validating...' : 'Validate Address'}
        </button>
      )}
    </div>
  );
};

export default AddressValidation;
