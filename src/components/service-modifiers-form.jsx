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
      <div key={modifier.id} className="mb-6">
        <div className="mb-4">
          <h3 className="text-base font-bold text-gray-900 mb-1" style={{ fontFamily: 'Montserrat', fontWeight: 700 }}>
            {modifier.name || modifier.title}
            {modifier.required && <span className="text-red-500 ml-1">*</span>}
          </h3>
          {modifier.description && (
            <p className="text-sm text-gray-600" style={{ fontFamily: 'Montserrat', fontWeight: 400 }}>{modifier.description}</p>
          )}
        </div>

        <div className={modifier.selectionType === 'quantity' ? 'grid grid-cols-2 gap-4' : 'space-y-2'}>
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
                <div key={option.id} className={`border-2 rounded-lg p-5 transition-all ${
                  quantity > 0 ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
                }`}>
                  <div className="text-center">
                    <h4 className="font-semibold text-gray-900 text-base mb-2" style={{ fontFamily: 'Montserrat', fontWeight: 600 }}>
                      {option.label || option.name}
                    </h4>
                    <div className="text-base text-gray-600 mb-3" style={{ fontFamily: 'Montserrat', fontWeight: 400 }}>
                      ${(() => {
                        const priceKey = `${modifier.id}_option_${option.id}`;
                        const editedPrice = effectiveEditedPrices[priceKey];
                        return editedPrice !== undefined ? parseFloat(editedPrice).toFixed(2) : parseFloat(option.price || 0).toFixed(2);
                      })()}
                    </div>
                    {option.description && (
                      <p className="text-xs text-gray-500 mb-4 px-2" style={{ fontFamily: 'Montserrat', fontWeight: 400 }}>
                        {option.description}
                      </p>
                    )}
                    <div className="flex items-center justify-center gap-3">
                      <button
                        type="button"
                        onClick={() => handleModifierChange(modifier.id, option.id, -1)}
                        className="w-9 h-9 flex items-center justify-center border border-gray-400 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        disabled={quantity === 0}
                      >
                        <Minus className="w-4 h-4 text-gray-700" />
                      </button>
                      <span className="text-xl font-semibold text-gray-900 w-10 text-center" style={{ fontFamily: 'Montserrat', fontWeight: 600 }}>
                        {quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleModifierChange(modifier.id, option.id, 1)}
                        className="w-9 h-9 flex items-center justify-center border border-gray-400 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <Plus className="w-4 h-4 text-gray-700" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            } else {
              // Check if this is a single/multi select with images (like TV mounting bracket type)
              const hasImage = option.image;
              const optionPrice = (() => {
                const priceKey = `${modifier.id}_option_${option.id}`;
                const editedPrice = effectiveEditedPrices[priceKey];
                return editedPrice !== undefined ? parseFloat(editedPrice) : parseFloat(option.price || 0);
              })();
              
              if (hasImage) {
                // Render as card with image (like TV mounting example)
                return (
                  <div key={option.id} className="relative">
                    <label className={`block cursor-pointer ${isSelected ? '' : ''}`}>
                      <div className={`border-2 rounded-lg p-4 transition-all ${
                        isSelected ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}>
                        {option.image && (
                          <div className="mb-3">
                            <img
                              src={option.image}
                              alt={option.label || option.name}
                              className="w-full h-32 object-cover rounded border border-gray-200"
                            />
                          </div>
                        )}
                        <div className="text-center">
                          <div className="font-semibold text-gray-900 mb-1" style={{ fontFamily: 'Montserrat', fontWeight: 600 }}>
                            {option.label || option.name}
                          </div>
                          <div className="text-sm font-medium text-gray-700">
                            {optionPrice > 0 ? `+$${optionPrice.toFixed(2)}` : 'Free'}
                          </div>
                        </div>
                      </div>
                      <input
                        type={modifier.selectionType === 'multi' ? 'checkbox' : 'radio'}
                        name={modifier.id}
                        checked={isSelected}
                        onChange={(e) => {
                          if (modifier.selectionType === 'multi') {
                            handleModifierChange(modifier.id, option.id, e.target.checked ? 1 : -1);
                          } else {
                            handleModifierChange(modifier.id, option.id, 1);
                          }
                        }}
                        required={modifier.required && modifier.selectionType === 'single'}
                        className="sr-only"
                      />
                    </label>
                  </div>
                );
              } else {
                // Render as button-style option (like Number of Bathrooms)
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => {
                      if (modifier.selectionType === 'multi') {
                        handleModifierChange(modifier.id, option.id, isSelected ? -1 : 1);
                      } else {
                        handleModifierChange(modifier.id, option.id, 1);
                      }
                    }}
                    className={`px-4 py-2.5 rounded-lg font-medium text-sm transition-all ${
                      isSelected 
                        ? 'bg-green-600 text-white border-2 border-green-600 hover:bg-green-700' 
                        : 'bg-white text-gray-900 border-2 border-gray-300 hover:border-gray-400'
                    }`}
                    style={{ fontFamily: 'Montserrat', fontWeight: 500 }}
                  >
                    {option.label || option.name}
                    {optionPrice > 0 && (
                      <span className={`ml-2 ${isSelected ? 'text-white' : 'text-gray-600'}`}>
                        +${optionPrice.toFixed(2)}
                      </span>
                    )}
                  </button>
                );
              }
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
