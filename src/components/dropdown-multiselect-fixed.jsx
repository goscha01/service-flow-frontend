import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, X } from 'lucide-react';

const DropdownMultiselectFixed = ({
  options = [],
  selectedValues = [],
  onSelectionChange,
  placeholder = "Select options...",
  maxDisplayItems = 3,
  disabled = false,
  className = "",
  searchable = false,
  clearable = true
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter options based on search term
  const filteredOptions = searchable 
    ? options.filter(option => 
        option.label.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : options;

  const handleToggleOption = (value) => {
    const newSelection = selectedValues.includes(value)
      ? selectedValues.filter(v => v !== value)
      : [...selectedValues, value];
    
    onSelectionChange(newSelection);
  };

  const handleClearAll = (e) => {
    e.stopPropagation();
    onSelectionChange([]);
  };

  const handleRemoveItem = (value, e) => {
    e.stopPropagation();
    handleToggleOption(value);
  };

  const getDisplayText = () => {
    if (selectedValues.length === 0) {
      return placeholder;
    }
    
    if (selectedValues.length <= maxDisplayItems) {
      return selectedValues
        .map(value => options.find(opt => opt.value === value)?.label || value)
        .join(', ');
    }
    
    return `${selectedValues.length} items selected`;
  };

  const selectedOptions = options.filter(option => selectedValues.includes(option.value));

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Main Dropdown Button */}
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
            <div className="flex flex-wrap gap-1">
              {selectedValues.length > 0 && selectedValues.length <= maxDisplayItems ? (
                selectedOptions.map((option) => (
                  <span
                    key={option.value}
                    className="inline-flex items-center px-2 py-1 rounded-md text-sm bg-blue-100 text-blue-800"
                  >
                    {option.label}
                    <button
                      type="button"
                      onClick={(e) => handleRemoveItem(option.value, e)}
                      className="ml-1 text-blue-600 hover:text-blue-800"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))
              ) : (
                <span className={selectedValues.length > 0 ? 'text-gray-900' : 'text-gray-500'}>
                  {getDisplayText()}
                </span>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-2 ml-2">
            {clearable && selectedValues.length > 0 && (
              <button
                type="button"
                onClick={handleClearAll}
                className="text-gray-400 hover:text-gray-600"
                title="Clear all"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <ChevronDown 
              className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
            />
          </div>
        </div>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-[9999] w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-hidden">
          {/* Search Input (if searchable) */}
          {searchable && (
            <div className="p-2 border-b border-gray-200">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search options..."
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                autoFocus
              />
            </div>
          )}

          {/* Options List */}
          <div className="max-h-48 overflow-y-auto">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-500">
                {searchable && searchTerm ? 'No options found' : 'No options available'}
              </div>
            ) : (
              filteredOptions.map((option) => {
                const isSelected = selectedValues.includes(option.value);
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleToggleOption(option.value);
                    }}
                    className={`
                      w-full px-3 py-2 text-left text-sm hover:bg-gray-100 focus:bg-gray-100 focus:outline-none transition-colors
                      ${isSelected ? 'bg-blue-600 text-white' : 'text-gray-900'}
                    `}
                  >
                    <span className="flex-1">{option.label}</span>
                    {isSelected && (
                      <span className="ml-2 text-xs bg-white bg-opacity-20 px-2 py-1 rounded">
                        Selected
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Footer with selection count */}
          {selectedValues.length > 0 && (
            <div className="px-3 py-2 border-t border-gray-200 bg-gray-50 text-sm text-gray-600">
              {selectedValues.length} of {options.length} selected
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DropdownMultiselectFixed;
