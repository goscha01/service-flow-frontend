import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, X } from 'lucide-react';

const SimpleDropdownMultiselect = ({
  options = [],
  selectedValues = [],
  onSelectionChange,
  placeholder = "Select options...",
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

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
    const newSelection = selectedValues.includes(value)
      ? selectedValues.filter(v => v !== value)
      : [...selectedValues, value];
    
    onSelectionChange(newSelection);
  };

  const handleRemoveItem = (value, e) => {
    e.stopPropagation();
    handleToggleOption(value);
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
      {/* Main Dropdown Button */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          w-full px-3 py-2 text-left border border-[var(--sf-border-light)] rounded-lg shadow-sm
          focus:outline-none focus:ring-2 focus:ring-[var(--sf-blue-500)] focus:border-[var(--sf-blue-500)]
          ${disabled ? 'bg-[var(--sf-bg-page)] text-[var(--sf-text-muted)] cursor-not-allowed' : 'bg-white hover:bg-[var(--sf-bg-page)] cursor-pointer'}
          ${isOpen ? 'ring-2 ring-blue-500 border-blue-500' : ''}
        `}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap gap-1">
              {selectedValues.length > 0 && selectedValues.length <= 2 ? (
                selectedValues.map((value) => {
                  const option = options.find(opt => opt.value === value);
                  return (
                    <span
                      key={value}
                      className="inline-flex items-center px-2 py-1 rounded-md text-sm bg-blue-100 text-blue-800"
                    >
                      {option ? option.label : value}
                      <button
                        type="button"
                        onClick={(e) => handleRemoveItem(value, e)}
                        className="ml-1 text-[var(--sf-blue-500)] hover:text-blue-800"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  );
                })
              ) : (
                <span className={selectedValues.length > 0 ? 'text-[var(--sf-text-primary)]' : 'text-[var(--sf-text-muted)]'}>
                  {getDisplayText()}
                </span>
              )}
            </div>
          </div>
          
          <ChevronDown 
            className={`w-4 h-4 text-[var(--sf-text-muted)] transition-transform ${isOpen ? 'rotate-180' : ''}`} 
          />
        </div>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-[9999] w-full mt-1 bg-white border border-[var(--sf-border-light)] rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {options.length === 0 ? (
            <div className="px-3 py-2 text-sm text-[var(--sf-text-muted)]">
              No options available
            </div>
          ) : (
            options.map((option) => {
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
                    w-full px-3 py-2 text-left text-sm hover:bg-[var(--sf-bg-hover)] focus:bg-[var(--sf-bg-page)] focus:outline-none transition-colors
                    ${isSelected ? 'bg-[var(--sf-blue-500)] text-white' : 'text-[var(--sf-text-primary)]'}
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
      )}
    </div>
  );
};

export default SimpleDropdownMultiselect;
