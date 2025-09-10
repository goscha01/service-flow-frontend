import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Minus, Image as ImageIcon, Save } from 'lucide-react';

const ServiceModifiersForm = ({ modifiers = [], selectedModifiers: parentSelectedModifiers = {}, onModifiersChange, onSave, isEditable = false, isSaving = false }) => {
  // Use parent selectedModifiers directly, with fallback to internal state for user interactions
  const [internalSelectedModifiers, setInternalSelectedModifiers] = useState({});
  
  // Merge parent selections with any additional internal selections
  const selectedModifiers = useMemo(() => {
    return { ...parentSelectedModifiers, ...internalSelectedModifiers };
  }, [parentSelectedModifiers, internalSelectedModifiers]);


  const handleModifierChange = (modifierId, optionId, value) => {
    const currentModifier = selectedModifiers[modifierId] || {};
    let newValue;

    const modifierConfig = modifiers.find(m => m.id === modifierId);
    if (!modifierConfig) return;

    if (modifierConfig.selectionType === 'quantity') {
      // Handle quantity selection
      const currentQuantities = currentModifier.quantities || {};
      const currentQuantity = currentQuantities[optionId] || 0;
      const newQuantity = Math.max(0, currentQuantity + value);
      
      newValue = {
        ...currentModifier,
        quantities: {
          ...currentQuantities,
          [optionId]: newQuantity
        }
      };
    } else if (modifierConfig.selectionType === 'multi') {
      // Handle multi-selection
      const currentSelections = currentModifier.selections || [];
      if (value > 0) {
        // Add selection
        if (!currentSelections.includes(optionId)) {
          newValue = {
            ...currentModifier,
            selections: [...currentSelections, optionId]
          };
        } else {
          newValue = currentModifier;
        }
      } else {
        // Remove selection
        newValue = {
          ...currentModifier,
          selections: currentSelections.filter(id => id !== optionId)
        };
      }
    } else {
      // Handle single selection - always set the selected option
      newValue = {
        ...currentModifier,
        selection: optionId
      };
    }

    const updatedInternalModifiers = {
      ...internalSelectedModifiers,
      [modifierId]: newValue
    };

    setInternalSelectedModifiers(updatedInternalModifiers);
    
    // Send the complete merged state to parent
    const completeUpdatedModifiers = {
      ...parentSelectedModifiers,
      ...updatedInternalModifiers
    };
    onModifiersChange(completeUpdatedModifiers);
  };

  const isOptionSelected = (modifierId, optionId) => {
    const modifier = selectedModifiers[modifierId];
    if (!modifier) return false;

    const modifierConfig = modifiers.find(m => m.id === modifierId);
    if (!modifierConfig) return false;

    if (modifierConfig.selectionType === 'quantity') {
      return (modifier.quantities?.[optionId] || 0) > 0;
    } else if (modifierConfig.selectionType === 'multi') {
      return (modifier.selections || []).includes(optionId);
    } else {
      return modifier.selection === optionId;
    }
  };

  const getOptionQuantity = (modifierId, optionId) => {
    const modifier = selectedModifiers[modifierId];
    return modifier?.quantities?.[optionId] || 0;
  };

  const renderModifier = (modifier) => {
    // Safety check for modifier
    if (!modifier || !modifier.id) {
      console.warn('Invalid modifier:', modifier);
      return null;
    }
    
    return (
      <div key={modifier.id} className="mb-8">
        <div className="mb-4">
          <h3 className="text-lg font-medium text-gray-900 mb-1">
            {modifier.title}
            {modifier.required && <span className="text-red-500 ml-1">*</span>}
          </h3>
          {modifier.description && (
            <p className="text-sm text-gray-600">{modifier.description}</p>
          )}
        </div>

        <div className="space-y-3">
          {(modifier.options && Array.isArray(modifier.options) ? modifier.options : []).map((option) => {
            // Safety check for option
            if (!option || !option.id) {
              console.warn('Invalid option:', option);
              return null;
            }
            
            const isSelected = isOptionSelected(modifier.id, option.id);
            const quantity = getOptionQuantity(modifier.id, option.id);

            if (modifier.selectionType === 'quantity') {
              return (
                <div key={option.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center space-x-4">
                    {option.image ? (
                      <img
                        src={option.image}
                        alt={option.label}
                        className="w-16 h-16 object-cover rounded"
                      />
                    ) : (
                      <div className="w-16 h-16 bg-gray-100 rounded flex items-center justify-center">
                        <ImageIcon className="w-6 h-6 text-gray-400" />
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{option.label}</div>
                      {option.description && (
                        <div className="text-sm text-gray-600">{option.description}</div>
                      )}
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="text-sm font-medium text-gray-900">${option.price}</span>
                        {option.duration && (
                          <span className="text-sm text-gray-500">
                            {Math.floor(option.duration / 60)}h {option.duration % 60}m
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <button
                        type="button"
                        onClick={() => handleModifierChange(modifier.id, option.id, -1)}
                        className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100 transition-colors"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-8 text-center text-sm font-medium">{quantity}</span>
                      <button
                        type="button"
                        onClick={() => handleModifierChange(modifier.id, option.id, 1)}
                        className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100 transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            } else {
              return (
                <label key={option.id} className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                  <input
                    type={modifier.selectionType === 'multi' ? 'checkbox' : 'radio'}
                    name={modifier.id}
                    checked={isSelected}
                    onChange={(e) => {
                      if (modifier.selectionType === 'multi') {
                        handleModifierChange(modifier.id, option.id, e.target.checked ? 1 : -1);
                      } else {
                        // For single selection, always select the option
                        handleModifierChange(modifier.id, option.id, 1);
                      }
                    }}
                    required={modifier.required && modifier.selectionType === 'single'}
                    className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                  />
                  <div className="flex items-center space-x-4 ml-3 flex-1">
                    {option.image ? (
                      <img
                        src={option.image}
                        alt={option.label}
                        className="w-12 h-12 object-cover rounded"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center">
                        <ImageIcon className="w-4 h-4 text-gray-400" />
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{option.label}</div>
                      {option.description && (
                        <div className="text-sm text-gray-600">{option.description}</div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-gray-900">${option.price}</div>
                      {option.duration && (
                        <div className="text-sm text-gray-500">
                          {Math.floor(option.duration / 60)}h {option.duration % 60}m
                        </div>
                      )}
                    </div>
                  </div>
                </label>
              );
            }
          })}
        </div>
      </div>
    );
  };


  if (!modifiers || modifiers.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      {modifiers.map(renderModifier)}
      
      {isEditable && onSave && (
        <div className="flex justify-end pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={onSave}
            disabled={isSaving}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Modifiers
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default ServiceModifiersForm;
