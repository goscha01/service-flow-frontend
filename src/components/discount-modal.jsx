import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

const DiscountModal = ({ isOpen, onClose, onSave, currentDiscount = 0, currentDiscountType = 'fixed' }) => {
  const [discountType, setDiscountType] = useState(currentDiscountType); // 'fixed' or 'percentage'
  const [discountValue, setDiscountValue] = useState(currentDiscount);

  useEffect(() => {
    if (isOpen) {
      setDiscountType(currentDiscountType);
      setDiscountValue(currentDiscount);
    }
  }, [isOpen, currentDiscount, currentDiscountType]);

  if (!isOpen) return null;

  const handleSave = () => {
    const value = parseFloat(discountValue) || 0;
    onSave(value, discountType);
    onClose();
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6" style={{ fontFamily: 'Montserrat', fontWeight: 400 }}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900" style={{ fontFamily: 'Montserrat', fontWeight: 700 }}>
            Add Discount
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 hover:bg-gray-100 p-2 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Discount Type Toggle */}
        <div className="mb-4">
          <div className="inline-flex rounded-lg border-2 border-blue-500 overflow-hidden">
            <button
              type="button"
              onClick={() => setDiscountType('fixed')}
              className={`px-6 py-2 text-base font-semibold transition-colors ${
                discountType === 'fixed'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white text-blue-500 hover:bg-blue-50'
              }`}
              style={{ fontFamily: 'Montserrat', fontWeight: 600 }}
            >
              $
            </button>
            <button
              type="button"
              onClick={() => setDiscountType('percentage')}
              className={`px-6 py-2 text-base font-semibold transition-colors ${
                discountType === 'percentage'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white text-blue-500 hover:bg-blue-50'
              }`}
              style={{ fontFamily: 'Montserrat', fontWeight: 600 }}
            >
              %
            </button>
          </div>
        </div>

        {/* Discount Input */}
        <div className="mb-6">
          <input
            type="number"
            step="0.01"
            min="0"
            max={discountType === 'percentage' ? 100 : undefined}
            value={discountValue}
            onChange={(e) => setDiscountValue(e.target.value)}
            placeholder="Enter discount"
            className="w-full px-4 py-3 text-lg border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            style={{ fontFamily: 'Montserrat', fontWeight: 400 }}
            autoFocus
          />
          {discountType === 'percentage' && discountValue > 100 && (
            <p className="text-sm text-red-600 mt-1">Percentage cannot exceed 100%</p>
          )}
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-semibold transition-colors"
            style={{ fontFamily: 'Montserrat', fontWeight: 600 }}
          >
            Save
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold transition-colors"
            style={{ fontFamily: 'Montserrat', fontWeight: 600 }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default DiscountModal;

