import React, { useState } from 'react';
import { X, Clock, Users, Award } from 'lucide-react';

export default function EditJobDetailsModal({ 
  isOpen, 
  onClose, 
  onSave, 
  type, 
  currentValue, 
  title, 
  icon: Icon 
}) {
  const [value, setValue] = useState(currentValue);

  const handleSave = () => {
    onSave(value);
    onClose();
  };

  const handleCancel = () => {
    setValue(currentValue);
    onClose();
  };

  if (!isOpen) return null;

  const getInputType = () => {
    switch (type) {
      case 'duration':
        return {
          type: 'number',
          min: 1,
          max: 24,
          step: 0.5,
          placeholder: 'Enter duration in hours',
          suffix: 'hours'
        };
      case 'workers':
        return {
          type: 'number',
          min: 1,
          max: 10,
          step: 1,
          placeholder: 'Enter number of workers',
          suffix: 'workers'
        };
      case 'skills':
        return {
          type: 'number',
          min: 0,
          max: 10,
          step: 1,
          placeholder: 'Enter number of skills',
          suffix: 'skills required'
        };
      default:
        return {
          type: 'text',
          placeholder: 'Enter value'
        };
    }
  };

  const inputConfig = getInputType();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <Icon className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
          </div>
          <button
            onClick={handleCancel}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {title}
            </label>
            <div className="relative">
              <input
                type={inputConfig.type}
                value={value}
                onChange={(e) => setValue(parseFloat(e.target.value) || 0)}
                min={inputConfig.min}
                max={inputConfig.max}
                step={inputConfig.step}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder={inputConfig.placeholder}
              />
              {inputConfig.suffix && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">
                  {inputConfig.suffix}
                </div>
              )}
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
            Save
          </button>
        </div>
      </div>
    </div>
  );
} 