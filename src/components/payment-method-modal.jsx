import React, { useState } from 'react';
import { X, DollarSign, CreditCard, FileText, Plus } from 'lucide-react';

export default function PaymentMethodModal({ 
  isOpen, 
  onClose, 
  onSave, 
  currentMethod 
}) {
  const [selectedMethod, setSelectedMethod] = useState(currentMethod || '');

  const handleSave = () => {
    onSave(selectedMethod);
    onClose();
  };

  const handleCancel = () => {
    setSelectedMethod(currentMethod || '');
    onClose();
  };

  if (!isOpen) return null;

  const paymentMethods = [
    {
      id: 'cash',
      name: 'Cash',
      icon: DollarSign,
      description: 'Payment in cash upon completion'
    },
    {
      id: 'card',
      name: 'Credit/Debit Card',
      icon: CreditCard,
      description: 'Payment via credit or debit card'
    },
    {
      id: 'check',
      name: 'Check',
      icon: FileText,
      description: 'Payment via check'
    }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <CreditCard className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">Payment Method</h2>
          </div>
          <button
            onClick={handleCancel}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-3">
          {paymentMethods.map((method) => {
            const Icon = method.icon;
            return (
              <label
                key={method.id}
                className={`flex items-center space-x-3 p-4 border rounded-xl cursor-pointer transition-colors ${
                  selectedMethod === method.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value={method.id}
                  checked={selectedMethod === method.id}
                  onChange={(e) => setSelectedMethod(e.target.value)}
                  className="text-blue-600"
                />
                <Icon className="w-5 h-5 text-gray-500" />
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{method.name}</div>
                  <div className="text-sm text-gray-500">{method.description}</div>
                </div>
              </label>
            );
          })}
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
            disabled={!selectedMethod}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Save Method
          </button>
        </div>
      </div>
    </div>
  );
} 