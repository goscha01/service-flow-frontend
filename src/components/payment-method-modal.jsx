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
            <CreditCard className="w-6 h-6 text-[var(--sf-blue-500)]" />
            <h2 className="text-xl font-semibold text-[var(--sf-text-primary)]">Payment Method</h2>
          </div>
          <button
            onClick={handleCancel}
            className="text-[var(--sf-text-muted)] hover:text-[var(--sf-text-secondary)] transition-colors"
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
                    ? 'border-blue-500 bg-[var(--sf-blue-50)]'
                    : 'border-[var(--sf-border-light)] hover:border-[var(--sf-border-light)]'
                }`}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value={method.id}
                  checked={selectedMethod === method.id}
                  onChange={(e) => setSelectedMethod(e.target.value)}
                  className="text-[var(--sf-blue-500)]"
                />
                <Icon className="w-5 h-5 text-[var(--sf-text-muted)]" />
                <div className="flex-1">
                  <div className="font-medium text-[var(--sf-text-primary)]">{method.name}</div>
                  <div className="text-sm text-[var(--sf-text-muted)]">{method.description}</div>
                </div>
              </label>
            );
          })}
        </div>

        <div className="flex space-x-3 mt-6">
          <button
            onClick={handleCancel}
            className="flex-1 px-4 py-2 border border-[var(--sf-border-light)] rounded-xl text-[var(--sf-text-primary)] hover:bg-[var(--sf-bg-page)] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!selectedMethod}
            className="flex-1 px-4 py-2 bg-[var(--sf-blue-500)] text-white rounded-xl hover:bg-[var(--sf-blue-600)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Save Method
          </button>
        </div>
      </div>
    </div>
  );
} 