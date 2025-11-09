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
          <h3 className="text-base font-bold text-gray-900 mb-1" style={{ fontFamily: 'ProximaNova-Bold' }}>
            {modifier.name || modifier.title}
            {modifier.required && <span className="text-red-500 ml-1">*</span>}
          </h3>
          {modifier.description && (
            <p className="text-sm text-gray-600" style={{ fontFamily: 'ProximaNova-Regular' }}>{modifier.description}</p>
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
                    <h4 className="font-semibold text-gray-900 text-base mb-2" style={{ fontFamily: 'ProximaNova-Semibold' }}>
                      {option.label || option.name}
                    </h4>
                    <div className="text-base text-gray-600 mb-3" style={{ fontFamily: 'ProximaNova-Regular' }}>
                      ${(() => {
                        const priceKey = `${modifier.id}_option_${option.id}`;
                        const editedPrice = effectiveEditedPrices[priceKey];
                        return editedPrice !== undefined ? parseFloat(editedPrice).toFixed(2) : parseFloat(option.price || 0).toFixed(2);
                      })()}
                    </div>
                    {option.description && (
                      <p className="text-xs text-gray-500 mb-4 px-2" style={{ fontFamily: 'ProximaNova-Regular' }}>
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
                      <span className="text-xl font-semibold text-gray-900 w-10 text-center" style={{ fontFamily: 'ProximaNova-Semibold' }}>
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
              return (
                <div key={option.id} className={`flex items-center gap-4 p-4 border-2 rounded-lg transition-all ${
                  isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                }`}>
                  <label className="flex items-center gap-4 flex-1 cursor-pointer">
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
                      className="w-5 h-5 text-blue-600 border-gray-300 focus:ring-blue-500 flex-shrink-0"
                    />
                    
                    {option.image ? (
                      <img
                        src={option.image}
                        alt={option.label || option.name}
                        className="w-12 h-12 object-cover rounded border border-gray-200 flex-shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center border border-gray-200 flex-shrink-0">
                        <ImageIcon className="w-5 h-5 text-gray-400" />
                      </div>
                    )}
                    
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 truncate" style={{ fontFamily: 'ProximaNova-Medium' }}>
                        {option.label || option.name || 'Unnamed option'}
                      </div>
                      {option.description && (
                        <div className="text-sm text-gray-600 mt-0.5 truncate" style={{ fontFamily: 'ProximaNova-Regular' }}>{option.description}</div>
                      )}
                    </div>
                  </label>
                  
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <div className="flex items-center gap-1">
                      <span className="text-sm text-gray-600" style={{ fontFamily: 'ProximaNova-Regular' }}>$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={(() => {
                          const priceKey = `${modifier.id}_option_${option.id}`;
                          const editedPrice = effectiveEditedPrices[priceKey];
                          return editedPrice !== undefined ? editedPrice : (option.price || 0);
                        })()}
                        onChange={(e) => {
                          const priceKey = `${modifier.id}_option_${option.id}`;
                          const value = e.target.value;
                          
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
                        onClick={(e) => e.stopPropagation()}
                        className="w-20 px-2 py-1.5 text-base text-right border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        style={{ fontFamily: 'ProximaNova-Regular' }}
                      />
                    </div>
                    {option.duration && (
                      <div className="text-xs text-gray-500" style={{ fontFamily: 'ProximaNova-Regular' }}>
                        {Math.floor(option.duration / 60)}h {option.duration % 60}m
                      </div>
                    )}
                  </div>
                </div>
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
