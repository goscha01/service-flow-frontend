"use client"
import React, { useState, useEffect } from 'react';
import { X, ChevronDown, ChevronUp, Plus, HelpCircle, Image as ImageIcon } from 'lucide-react';

const CreateModifierGroupModal = ({ isOpen, onClose, onSave, editingModifier = null }) => {
  const [uploadingImages, setUploadingImages] = useState({});
  const [formData, setFormData] = useState({
    groupName: '',
    groupDescription: '',
    selectionType: 'single', // 'single', 'multi', 'quantity'
    required: false,
    options: [
      {
        id: 1,
        name: '',
        image: null,
        description: '',
        price: '',
        durationHours: '',
        durationMinutes: '',
        allowCustomerNotes: false,
        convertToServiceRequest: false
      }
    ]
  });

  const [expandedOption, setExpandedOption] = useState(1);
  const [isAnimating, setIsAnimating] = useState(false);

  // Animation effect with delay
  useEffect(() => {
    if (isOpen) {
      // Small delay before animation starts
      const timer = setTimeout(() => {
        setIsAnimating(true);
      }, 50);
      return () => clearTimeout(timer);
    } else {
      setIsAnimating(false);
    }
  }, [isOpen]);

  // Handle editing - populate form data when editingModifier is provided
  useEffect(() => {
    if (editingModifier) {
      setFormData({
        groupName: editingModifier.title || '',
        groupDescription: editingModifier.description || '',
        selectionType: editingModifier.selectionType || 'single',
        required: editingModifier.required || false,
        options: editingModifier.options ? editingModifier.options.map((option, index) => ({
          id: option.id || index + 1,
          name: option.label || option.name || '',
          image: option.image || null,
          description: option.description || '',
          price: option.price || '',
          durationHours: option.duration ? Math.floor(option.duration / 60) : '',
          durationMinutes: option.duration ? option.duration % 60 : '',
          allowCustomerNotes: option.allowCustomerNotes || false,
          convertToServiceRequest: option.convertToServiceRequest || false
        })) : [
          {
            id: 1,
            name: '',
            image: null,
            description: '',
            price: '',
            durationHours: '',
            durationMinutes: '',
            allowCustomerNotes: false,
            convertToServiceRequest: false
          }
        ]
      });
      setExpandedOption(1);
    } else {
      setFormData({
        groupName: '',
        groupDescription: '',
        selectionType: 'single',
        required: false,
        options: [
          {
            id: 1,
            name: '',
            image: null,
            description: '',
            price: '',
            durationHours: '',
            durationMinutes: '',
            allowCustomerNotes: false,
            convertToServiceRequest: false
          }
        ]
      });
      setExpandedOption(1);
    }
  }, [editingModifier, isOpen]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleOptionChange = (optionId, field, value) => {
    setFormData(prev => ({
      ...prev,
      options: prev.options.map(option => 
        option.id === optionId ? { ...option, [field]: value } : option
      )
    }));
  };

  const addNewOption = () => {
    const newOptionId = Math.max(...formData.options.map(o => o.id)) + 1;
    setFormData(prev => ({
      ...prev,
      options: [
        ...prev.options,
        {
          id: newOptionId,
          name: '',
          image: null,
          description: '',
          price: '',
          durationHours: '',
          durationMinutes: '',
          allowCustomerNotes: false,
          convertToServiceRequest: false
        }
      ]
    }));
    setExpandedOption(newOptionId);
  };

  const removeOption = (optionId) => {
    if (formData.options.length > 1) {
      setFormData(prev => ({
        ...prev,
        options: prev.options.filter(option => option.id !== optionId)
      }));
    }
  };

  const handleOptionImageUpload = async (optionId, file) => {
    if (!file) return;

    const isTokenExpired = (token) => {
      if (!token) return true;
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (!payload.exp) return true;
        return Date.now() >= payload.exp * 1000;
      } catch (e) {
        return true;
      }
    };

    const isTokenAboutToExpire = (token) => {
      if (!token) return true;
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (!payload.exp) return true;
        const fiveMinutesFromNow = Date.now() + (5 * 60 * 1000);
        return fiveMinutesFromNow >= payload.exp * 1000;
      } catch (e) {
        return true;
      }
    };

    try {
      setUploadingImages(prev => ({ ...prev, [optionId]: true }));
      let token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error('Authentication required');
      }
      
      if (isTokenExpired(token) || isTokenAboutToExpire(token)) {
        try {
          const refreshResponse = await fetch('https://service-flow-backend-production-4568.up.railway.app/api/auth/refresh', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });

          if (refreshResponse.ok) {
            const refreshData = await refreshResponse.json();
            const newToken = refreshData.token;
            localStorage.setItem('authToken', newToken);
            token = newToken;
          } else {
            throw new Error('Token has expired. Please log in again.');
          }
        } catch (refreshError) {
          throw new Error('Token has expired. Please log in again.');
        }
      }

      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch('https://service-flow-backend-production-4568.up.railway.app/api/upload-modifier-image', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Upload failed with status: ${response.status}`);
      }

      const result = await response.json();
      
      if (!result.imageUrl) {
        throw new Error('No image URL received from server');
      }
      
      setFormData(prev => ({
        ...prev,
        options: prev.options.map(option => 
          option.id === optionId ? { ...option, image: result.imageUrl } : option
        )
      }));
    } catch (error) {
      if (error.message.includes('Token has expired') || error.message.includes('Invalid or expired token')) {
        alert('Your session has expired. Please log in again.');
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        window.location.href = '/signin';
        return;
      }
      alert(`Failed to upload image: ${error.message}`);
    } finally {
      setUploadingImages(prev => ({ ...prev, [optionId]: false }));
    }
  };

  const handleOptionImageRemove = (optionId) => {
    setFormData(prev => ({
      ...prev,
      options: prev.options.map(option => 
        option.id === optionId ? { ...option, image: null } : option
      )
    }));
  };

  const handleSave = () => {
    onSave(formData);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 bg-black/50 z-50 flex justify-end transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`}>
      <div 
        className={`flex w-full max-w-6xl h-full relative bg-white overflow-hidden transform transition-transform duration-500 ease-out ${
          isAnimating ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header - Full Width */}
        <div className="absolute top-0 left-0 right-0 bg-white border-b border-gray-200 z-10">
          <div className="flex items-center justify-between p-6">
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
            <h2 className="text-xl font-semibold text-gray-900" style={{ fontFamily: 'Montserrat', fontWeight: 600 }}>
            {editingModifier ? 'Edit Modifier Group' : 'Create Modifier Group'}
          </h2>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium text-sm transition-colors"
              style={{ fontFamily: 'Montserrat', fontWeight: 500 }}
            >
              Done
            </button>
          </div>
        </div>

        {/* Main Modal - Right Side */}
        <div className="bg-white w-full max-w-2xl flex flex-col h-full overflow-hidden pt-20">

        {/* Content */}
        <div className="flex-1 p-6 space-y-6 overflow-y-auto">
          {/* Group name */}
            <div>
            <div className="flex items-center space-x-1 mb-2">
              <label className="text-sm font-medium text-gray-700" style={{ fontFamily: 'Montserrat', fontWeight: 500 }}>
                  Group name
                </label>
                <HelpCircle className="w-4 h-4 text-gray-400" />
              </div>
              <input
                type="text"
                value={formData.groupName}
                onChange={(e) => handleInputChange('groupName', e.target.value)}
              placeholder="Group name (ex. Lawn size)"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              style={{ fontFamily: 'Montserrat', fontWeight: 400 }}
              />
            </div>

          {/* Group description */}
            <div>
            <div className="flex items-center space-x-1 mb-2">
              <label className="text-sm font-medium text-gray-700" style={{ fontFamily: 'Montserrat', fontWeight: 500 }}>
                  Group description
                </label>
                <HelpCircle className="w-4 h-4 text-gray-400" />
              </div>
              <textarea
                rows={3}
                value={formData.groupDescription}
                onChange={(e) => handleInputChange('groupDescription', e.target.value)}
                placeholder="Add an optional description"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              style={{ fontFamily: 'Montserrat', fontWeight: 400 }}
              />
          </div>

          {/* Selection type */}
          <div>
            <div className="flex items-center space-x-1 mb-3">
              <label className="text-sm font-medium text-gray-700" style={{ fontFamily: 'Montserrat', fontWeight: 500 }}>
                Selection type
              </label>
            </div>
            <div className="flex space-x-2">
              {[
                { value: 'single', label: 'Single Select' },
                { value: 'multi', label: 'Multi-Select' },
                { value: 'quantity', label: 'Quantity Select' }
              ].map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => handleInputChange('selectionType', type.value)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-1 ${
                    formData.selectionType === type.value
                      ? 'bg-white text-gray-900 border-2 border-blue-500'
                      : 'bg-white text-gray-600 border-2 border-gray-300 hover:border-gray-400'
                  }`}
                  style={{ fontFamily: 'Montserrat', fontWeight: 500 }}
                >
                  <span>{type.label}</span>
                  <HelpCircle className="w-4 h-4 text-gray-400" />
                </button>
              ))}
            </div>
          </div>

          {/* Required Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1">
              <label className="text-sm font-medium text-gray-700" style={{ fontFamily: 'Montserrat', fontWeight: 500 }}>
                Required
              </label>
              <HelpCircle className="w-4 h-4 text-gray-400" />
            </div>
            <button
              type="button"
              onClick={() => handleInputChange('required', !formData.required)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                formData.required ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  formData.required ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Options Section */}
          <div>
            <div className="flex items-center space-x-1 mb-4">
              <h3 className="text-base font-semibold text-gray-900" style={{ fontFamily: 'Montserrat', fontWeight: 600 }}>
                OPTIONS
              </h3>
              <HelpCircle className="w-4 h-4 text-gray-400" />
            </div>

            <div className="space-y-4">
              {formData.options.map((option, index) => (
                <div key={option.id} className={`border rounded-lg ${expandedOption === option.id ? 'border-blue-200' : 'border-gray-200'}`}>
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-2 flex-1">
                        <button
                          onClick={() => setExpandedOption(expandedOption === option.id ? null : option.id)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          {expandedOption === option.id ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </button>
                        <span className="text-sm font-medium text-gray-900" style={{ fontFamily: 'Montserrat', fontWeight: 500 }}>
                          {option.name || 'New option'}
                        </span>
                    </div>
                  </div>

                  {expandedOption === option.id && (
                      <div className="space-y-4">
                        {/* Name and Image */}
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2" style={{ fontFamily: 'Montserrat', fontWeight: 500 }}>
                              Name
                            </label>
                            <input
                              type="text"
                              value={option.name}
                              onChange={(e) => handleOptionChange(option.id, 'name', e.target.value)}
                              placeholder="Option 1 name"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              style={{ fontFamily: 'Montserrat', fontWeight: 400 }}
                            />
                          </div>
                      <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2" style={{ fontFamily: 'Montserrat', fontWeight: 500 }}>
                          Image
                        </label>
                            <div className="relative">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleOptionImageUpload(option.id, e.target.files[0])}
                          className="hidden"
                          id={`image-upload-${option.id}`}
                          disabled={uploadingImages[option.id]}
                        />
                          {uploadingImages[option.id] ? (
                                <div className="w-full h-10 border border-gray-300 rounded-lg bg-gray-50 flex items-center justify-center">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                            </div>
                          ) : option.image ? (
                            <div className="relative">
                              <img
                                src={option.image}
                                alt="Option image"
                                    className="w-full h-10 object-cover rounded-lg border border-gray-200"
                              />
                              <button
                                type="button"
                                onClick={() => handleOptionImageRemove(option.id)}
                                    className="absolute top-0 right-0 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600"
                              >
                                ×
                              </button>
                            </div>
                          ) : (
                            <label
                              htmlFor={`image-upload-${option.id}`}
                                  className="flex items-center justify-center w-full h-10 border border-gray-300 rounded-lg bg-gray-50 hover:bg-gray-100 cursor-pointer"
                            >
                                  <ImageIcon className="w-5 h-5 text-gray-400" />
                            </label>
                          )}
                            </div>
                        </div>
                      </div>

                      {/* Description */}
                      <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2" style={{ fontFamily: 'Montserrat', fontWeight: 500 }}>
                          Description
                        </label>
                        <textarea
                          rows={2}
                          value={option.description}
                          onChange={(e) => handleOptionChange(option.id, 'description', e.target.value)}
                          placeholder="Add an optional description for this option..."
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                            style={{ fontFamily: 'Montserrat', fontWeight: 400 }}
                        />
                      </div>

                      {/* Price and Duration */}
                        <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2" style={{ fontFamily: 'Montserrat', fontWeight: 500 }}>
                            Price
                          </label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                            <input
                              type="number"
                              value={option.price === '' ? '' : option.price}
                              onChange={(e) => handleOptionChange(option.id, 'price', e.target.value === '' ? '' : parseFloat(e.target.value) || '')}
                              placeholder=""
                              className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                style={{ fontFamily: 'Montserrat', fontWeight: 400 }}
                            />
                          </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2" style={{ fontFamily: 'Montserrat', fontWeight: 500 }}>
                            Duration
                          </label>
                            <input
                              type="number"
                              value={option.durationHours === '' ? '' : option.durationHours}
                              onChange={(e) => handleOptionChange(option.id, 'durationHours', e.target.value === '' ? '' : parseInt(e.target.value) || '')}
                              placeholder=""
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              style={{ fontFamily: 'Montserrat', fontWeight: 400 }}
                            />
                            <span className="text-xs text-gray-500 mt-1 block">hr</span>
                          </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2" style={{ fontFamily: 'Montserrat', fontWeight: 500 }}>
                            &nbsp;
                          </label>
                            <input
                              type="number"
                              value={option.durationMinutes === '' ? '' : option.durationMinutes}
                              onChange={(e) => handleOptionChange(option.id, 'durationMinutes', e.target.value === '' ? '' : parseInt(e.target.value) || '')}
                              placeholder=""
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              style={{ fontFamily: 'Montserrat', fontWeight: 400 }}
                            />
                            <span className="text-xs text-gray-500 mt-1 block">min</span>
                        </div>
                      </div>

                    </div>
                  )}
                  </div>
                </div>
              ))}
            </div>

            {/* Add New Option Button */}
            <button
              type="button"
              onClick={addNewOption}
              className="mt-4 flex items-center space-x-2 px-4 py-2 text-gray-900 hover:text-gray-700 font-medium"
              style={{ fontFamily: 'Montserrat', fontWeight: 500 }}
            >
              <Plus className="w-4 h-4" />
              <span>New Option</span>
            </button>
          </div>
          </div>
        </div>

      {/* Preview Sidebar - Right Side */}
      <div className="bg-gray-50 w-80 border-l border-gray-200 flex flex-col pt-20 h-full">
        <div className="flex flex-col flex-1 overflow-hidden">
          <div className="px-6 pt-6 pb-4">
            <span className="text-base font-semibold text-gray-900" style={{ fontFamily: 'Montserrat', fontWeight: 600 }}>
              PREVIEW
            </span>
          </div>
          <div className="flex-1 overflow-y-auto">
            <div className="px-6 pb-6">
              {formData.groupName || formData.options.some(opt => opt.name) ? (
                <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4 w-full">
              {/* Preview of modifier group */}
              {formData.groupName && (
                <div className="space-y-3">
                  <div className="text-center">
                    <h4 className="text-base font-semibold text-gray-900 mb-1" style={{ fontFamily: 'Montserrat', fontWeight: 600 }}>
                      {formData.groupName}
                    </h4>
                    {formData.groupDescription && (
                      <p className="text-xs text-gray-600" style={{ fontFamily: 'Montserrat', fontWeight: 400 }}>
                        {formData.groupDescription}
                      </p>
                    )}
        </div>

                  {formData.selectionType === 'single' && (
                    <div className="space-y-2">
                      {formData.options.filter(opt => opt.name).map((option) => (
                        <label key={option.id} className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                          <input type="radio" name="preview-option" className="w-4 h-4 text-blue-600" />
                          <div className="flex-1 flex items-center justify-between">
                            <span className="text-sm text-gray-900" style={{ fontFamily: 'Montserrat', fontWeight: 500 }}>
                              {option.name}
                            </span>
                            <div className="flex items-center space-x-2">
                              {option.price && option.price !== '' && parseFloat(option.price) > 0 && (
                                <span className="text-sm text-gray-700" style={{ fontFamily: 'Montserrat', fontWeight: 400 }}>
                                  +${parseFloat(option.price).toFixed(2)}
                                </span>
                              )}
                              {option.image ? (
                                <img src={option.image} alt={option.name} className="w-8 h-8 object-cover rounded border border-gray-200" />
                              ) : (
                                <div className="w-8 h-8 bg-gray-100 rounded border border-gray-200 flex items-center justify-center">
                                  <ImageIcon className="w-4 h-4 text-gray-400" />
                                </div>
                              )}
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                  {formData.selectionType === 'multi' && (
                    <div className="space-y-2">
                      {formData.options.filter(opt => opt.name).map((option) => (
                        <label key={option.id} className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                          <input type="checkbox" className="w-4 h-4 text-blue-600" />
                          <div className="flex-1 flex items-center justify-between">
                            <span className="text-sm text-gray-900" style={{ fontFamily: 'Montserrat', fontWeight: 500 }}>
                              {option.name}
                            </span>
                            <div className="flex items-center space-x-2">
                              {option.price && option.price !== '' && parseFloat(option.price) > 0 && (
                                <span className="text-sm text-gray-700" style={{ fontFamily: 'Montserrat', fontWeight: 400 }}>
                                  +${parseFloat(option.price).toFixed(2)}
                                </span>
                              )}
                              {option.image ? (
                                <img src={option.image} alt={option.name} className="w-8 h-8 object-cover rounded border border-gray-200" />
                              ) : (
                                <div className="w-8 h-8 bg-gray-100 rounded border border-gray-200 flex items-center justify-center">
                                  <ImageIcon className="w-4 h-4 text-gray-400" />
                                </div>
                              )}
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                  {formData.selectionType === 'quantity' && (
                    <div className="space-y-3">
                      {formData.options.filter(opt => opt.name).map((option) => (
                        <div key={option.id} className="border border-gray-200 rounded-lg p-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3 flex-1">
                              {option.image ? (
                                <img src={option.image} alt={option.name} className="w-10 h-10 object-cover rounded border border-gray-200" />
                              ) : (
                                <div className="w-10 h-10 bg-gray-100 rounded border border-gray-200 flex items-center justify-center">
                                  <ImageIcon className="w-5 h-5 text-gray-400" />
                                </div>
                              )}
                              <div className="flex-1">
                                <div className="flex items-center space-x-2">
                                  <span className="text-sm font-medium text-gray-900" style={{ fontFamily: 'Montserrat', fontWeight: 500 }}>
                                    {option.name}
                                  </span>
                                  {option.price > 0 && (
                                    <span className="text-sm text-gray-700" style={{ fontFamily: 'Montserrat', fontWeight: 400 }}>
                                      +${option.price.toFixed(2)}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <button className="w-8 h-8 border border-gray-300 rounded-lg flex items-center justify-center hover:bg-gray-50">-</button>
                              <span className="w-8 text-center text-sm text-gray-900" style={{ fontFamily: 'Montserrat', fontWeight: 500 }}>0</span>
                              <button className="w-8 h-8 border border-gray-300 rounded-lg flex items-center justify-center hover:bg-gray-50">+</button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {/* Continue button */}
              {formData.groupName && formData.options.some(opt => opt.name) && (
                <button className="w-full bg-green-600 text-white py-2.5 px-4 rounded-lg font-medium text-sm hover:bg-green-700 transition-colors" style={{ fontFamily: 'Montserrat', fontWeight: 500 }}>
                  Continue
          </button>
              )}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400 text-sm" style={{ fontFamily: 'Montserrat', fontWeight: 400 }}>
                  Preview will appear here
                </div>
              )}
            </div>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
};

export default CreateModifierGroupModal;
