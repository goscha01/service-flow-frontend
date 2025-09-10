import React, { useState } from "react";
import { X } from "lucide-react";
import { servicesAPI } from "../services/api";

export default function ServiceModal({ isOpen, onClose, onSave }) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    duration: 30, // Default to 30 minutes
    category: "",
    require_payment_method: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Reset form when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setFormData({
        name: "",
        description: "",
        price: "",
        duration: 30, // Default to 30 minutes
        category: "",
        require_payment_method: false,
      });
      setError("");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async () => {
    setError("");
    
    console.log('Form data before validation:', formData);
    console.log('Auth token exists:', !!localStorage.getItem('authToken'));
    console.log('User from localStorage:', localStorage.getItem('user'));
    
    if (!formData.name || formData.name.trim() === '') {
      console.error('Validation failed: Service name is empty or undefined');
      setError("Service name is required.");
      return;
    }
    
    setLoading(true);
    try {
      const user = JSON.parse(localStorage.getItem("user"));
      const userId = user?.id;
      
      console.log('User object:', user);
      console.log('User ID:', userId);
      
      if (!userId) {
        throw new Error('User ID not found in localStorage');
      }
      
      const payload = {
        ...formData,
        userId,
        name: formData.name.trim(),
        price: formData.price ? parseFloat(formData.price) : null,
        duration: formData.duration ? parseInt(formData.duration, 10) : null,
      };
      
      console.log('Service creation payload:', payload);
      console.log('Payload validation:');
      console.log('- Name:', payload.name, '(length:', payload.name.length, ')');
      console.log('- UserId:', payload.userId);
      console.log('- Duration:', payload.duration);
      console.log('- Price:', payload.price);
      
      const response = await servicesAPI.create(payload);
      console.log('Service creation response:', response);
      onSave(response);
      
      // Reset form after successful creation
      setFormData({
        name: "",
        description: "",
        price: "",
        duration: 30,
        category: "",
        require_payment_method: false,
      });
      
      onClose();
    } catch (err) {
      console.error('Service creation error:', err);
      console.error('Error response:', err?.response?.data);
      console.error('Error status:', err?.response?.status);
      console.error('Error message:', err?.message);
      setError(
        err?.response?.data?.error || err?.message || "Failed to create service. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-8 relative animate-fadeIn">
        <button
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-700"
          onClick={onClose}
        >
          <X className="w-5 h-5" />
        </button>
        <h2 className="text-2xl font-bold mb-2 text-gray-900">Create Service</h2>
        <p className="text-gray-600 mb-6">Add a new service to your offerings</p>
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-red-700 text-sm">{error}</div>
        )}
        {/* Debug info - remove in production */}
        {process.env.NODE_ENV === 'development' && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-4 text-xs text-gray-600">
            <strong>Debug:</strong> Name: "{formData.name}", Duration: {formData.duration}, Price: "{formData.price}"
          </div>
        )}
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Price ($)</label>
              <input
                type="number"
                name="price"
                value={formData.price}
                onChange={handleChange}
                onFocus={(e) => {
                  e.target.select()
                  // Clear default values when focusing
                  if (e.target.value === '0' || e.target.value === '0.00') {
                    e.target.value = ''
                  }
                }}
                min="0"
                step="0.01"
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Duration</label>
              <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-1">
                  <input
                    type="number"
                    value={Math.floor((formData.duration || 0) / 60)}
                    onChange={(e) => {
                      const hours = parseInt(e.target.value) || 0
                      const minutes = (formData.duration || 0) % 60
                      handleChange({ target: { name: 'duration', value: hours * 60 + minutes } })
                    }}
                    onFocus={(e) => {
                      e.target.select()
                      // Clear default values when focusing
                      if (e.target.value === '0') {
                        e.target.value = ''
                      }
                    }}
                    min="0"
                    className="w-16 border border-gray-300 rounded-lg px-2 py-2 text-center focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                    placeholder="0"
                  />
                  <span className="text-sm text-gray-600">hr</span>
                </div>
                <div className="flex items-center space-x-1">
              <input
                type="number"
                    value={(formData.duration || 0) % 60}
                    onChange={(e) => {
                      const hours = Math.floor((formData.duration || 0) / 60)
                      const minutes = parseInt(e.target.value) || 0
                      handleChange({ target: { name: 'duration', value: hours * 60 + minutes } })
                    }}
                    onFocus={(e) => {
                      e.target.select()
                      // Clear default values when focusing
                      if (e.target.value === '0' || e.target.value === '30') {
                        e.target.value = ''
                      }
                    }}
                    min="0"
                    max="59"
                    className="w-16 border border-gray-300 rounded-lg px-2 py-2 text-center focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                placeholder="30"
              />
                  <span className="text-sm text-gray-600">min</span>
                </div>
              </div>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <input
              type="text"
              name="category"
              value={formData.category}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
            />
          </div>
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              name="require_payment_method"
              checked={formData.require_payment_method}
              onChange={handleChange}
              id="require_payment_method"
              className="h-4 w-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
            />
            <label htmlFor="require_payment_method" className="text-sm text-gray-700">
              Require payment method
            </label>
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="px-6 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
            >
              {loading ? "Creating..." : "Create Service"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
