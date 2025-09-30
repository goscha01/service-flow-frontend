import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Minus, Image as ImageIcon } from 'lucide-react';

const ServiceModifiersForm = ({ modifiers = [], selectedModifiers: parentSelectedModifiers = {}, onModifiersChange, onSave, isEditable = false, isSaving = false, editedModifierPrices = {}, onModifierPriceChange }) => {
  // Use parent selectedModifiers directly, with fallback to internal state for user interactions
  const [internalSelectedModifiers, setInternalSelectedModifiers] = useState({});
  
  // Local state for modifier prices to handle immediate updates
  const [localEditedPrices, setLocalEditedPrices] = useState({});
  
  // Merge parent edited prices with local ones
  const effectiveEditedPrices = { ...editedModifierPrices, ...localEditedPrices };
  
  // Debug log to see current state
  useEffect(() => {
    console.log('🔧 ServiceModifiersForm editedModifierPrices:', editedModifierPrices);
    console.log('🔧 ServiceModifiersForm localEditedPrices:', localEditedPrices);
    console.log('🔧 ServiceModifiersForm effectiveEditedPrices:', effectiveEditedPrices);
  }, [editedModifierPrices, localEditedPrices]);
  
  // Don't clear local edited prices when parent prices change
  // This was causing price resets when editing

  // Sync internal state with parent changes
  useEffect(() => {
    console.log('🔧 ServiceModifiersForm: Syncing with parent changes', { parentSelectedModifiers, internalSelectedModifiers });
    
    // If parent has selections that we don't have internally, update our internal state
    const hasNewParentSelections = Object.keys(parentSelectedModifiers).some(key => 
      !internalSelectedModifiers[key] && parentSelectedModifiers[key]
    );
    
    if (hasNewParentSelections) {
      console.log('🔧 ServiceModifiersForm: Updating internal state with parent selections');
      setInternalSelectedModifiers(prev => ({
        ...prev,
        ...parentSelectedModifiers
      }));
    }
  }, [parentSelectedModifiers, internalSelectedModifiers]);
  
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

    // Update internal modifiers while preserving all existing selections
    const updatedInternalModifiers = {
      ...internalSelectedModifiers,
      [modifierId]: newValue
    };

    setInternalSelectedModifiers(updatedInternalModifiers);
    
    // Send the complete merged state to parent - this includes ALL modifiers
    const completeUpdatedModifiers = {
      ...parentSelectedModifiers,
      ...updatedInternalModifiers
    };
    
    console.log('🔧 ServiceModifiersForm: Sending complete modifiers to parent:', completeUpdatedModifiers);
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
                        <div className="flex items-center space-x-1">
                          <span className="text-xs text-gray-500">$</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={(() => {
                              const priceKey = `${modifier.id}_option_${option.id}`;
                              const editedPrice = effectiveEditedPrices[priceKey];
                              console.log('🔧 RENDER VALUE for', priceKey, ':', editedPrice, 'original:', option.price);
                              return editedPrice !== undefined ? editedPrice : option.price;
                            })()}
                            onChange={(e) => {
                              const priceKey = `${modifier.id}_option_${option.id}`;
                              const value = e.target.value;
                              console.log('🔧 MODIFIER INPUT CHANGE:', priceKey, value);
                              
                              // Update local state immediately for UI responsiveness
                              setLocalEditedPrices(prev => ({
                                ...prev,
                                [priceKey]: value
                              }));
                              
                              // Call parent callback to update parent state
                              if (onModifierPriceChange) {
                                onModifierPriceChange(modifier.id, option.id, value);
                              }
                            }}
                            className="w-16 px-1 py-0.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
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
                      <div className="flex items-center justify-end space-x-1">
                        <span className="text-xs text-gray-500">$</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={(() => {
                            const priceKey = `${modifier.id}_option_${option.id}`;
                            const editedPrice = effectiveEditedPrices[priceKey];
                            console.log('🔧 RENDER VALUE (2) for', priceKey, ':', editedPrice, 'original:', option.price);
                            return editedPrice !== undefined ? editedPrice : option.price;
                          })()}
                          onChange={(e) => {
                            const priceKey = `${modifier.id}_option_${option.id}`;
                            const value = e.target.value;
                            console.log('🔧 MODIFIER INPUT CHANGE (2):', priceKey, value);
                            
                            // Update local state immediately for UI responsiveness
                            setLocalEditedPrices(prev => ({
                              ...prev,
                              [priceKey]: value
                            }));
                            
                            // Call parent callback to update parent state
                            if (onModifierPriceChange) {
                              onModifierPriceChange(modifier.id, option.id, value);
                            }
                          }}
                          className="w-16 px-1 py-0.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent text-right"
                        />
                      </div>
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
      
    </div>
  );
};

export default ServiceModifiersForm;
