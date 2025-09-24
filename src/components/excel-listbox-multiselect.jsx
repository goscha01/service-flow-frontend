import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

const ExcelListboxMultiselect = ({
  options = [],
  selectedValues = [],
  onSelectionChange,
  placeholder = "Select options...",
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [tempSelections, setTempSelections] = useState([]);
  const dropdownRef = useRef(null);

  // Initialize temp selections when dropdown opens
  useEffect(() => {
    if (isOpen) {
      setTempSelections([...selectedValues]);
    }
  }, [isOpen, selectedValues]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggleOption = (value) => {
    const newSelections = tempSelections.includes(value)
      ? tempSelections.filter(v => v !== value)
      : [...tempSelections, value];
    
    setTempSelections(newSelections);
  };

  const handleOK = () => {
    onSelectionChange(tempSelections);
    setIsOpen(false);
  };

  const handleCancel = () => {
    setTempSelections([...selectedValues]);
    setIsOpen(false);
  };

  const getDisplayText = () => {
    if (selectedValues.length === 0) {
      return placeholder;
    }
    
    if (selectedValues.length === 1) {
      const option = options.find(opt => opt.value === selectedValues[0]);
      return option ? option.label : selectedValues[0];
    }
    
    return `${selectedValues.length} items selected`;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Main Dropdown Button - Excel style */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          w-full px-3 py-2 text-left border border-gray-300 rounded-lg shadow-sm
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
          ${disabled ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'bg-white hover:bg-gray-50 cursor-pointer'}
          ${isOpen ? 'ring-2 ring-blue-500 border-blue-500' : ''}
        `}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <span className={selectedValues.length > 0 ? 'text-gray-900' : 'text-gray-500'}>
              {getDisplayText()}
            </span>
          </div>
          
          <ChevronDown 
            className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
          />
        </div>
      </button>

      {/* Excel-style Popup Listbox */}
      {isOpen && (
        <div className="absolute z-[9999] w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg">
          {/* Header */}
          <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 rounded-t-lg">
            <h3 className="text-sm font-medium text-gray-900">Select Items to Add</h3>
          </div>
          
          {/* Listbox with checkboxes - Excel style */}
          <div className="max-h-60 overflow-y-auto">
            {options.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-500">
                No options available
              </div>
            ) : (
              options.map((option) => {
                const isSelected = tempSelections.includes(option.value);
                return (
                  <label
                    key={option.value}
                    className="flex items-center px-3 py-2 hover:bg-gray-100 cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleOption(option.value)}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="ml-3 text-sm text-gray-900 flex-1">
                      {option.label}
                    </span>
                    {isSelected && (
                      <Check className="w-4 h-4 text-blue-600" />
                    )}
                  </label>
                );
              })
            )}
          </div>
          
          {/* Footer with OK/Cancel buttons - Excel style */}
          <div className="px-3 py-2 bg-gray-50 border-t border-gray-200 rounded-b-lg flex justify-end space-x-2">
            <button
              type="button"
              onClick={handleCancel}
              className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleOK}
              className="px-3 py-1 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded transition-colors"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExcelListboxMultiselect;
