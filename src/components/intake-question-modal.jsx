"use client"
import React, { useState, useEffect } from 'react';
import { X, ChevronDown, Plus, HelpCircle, Minus, Upload, Image as ImageIcon, FileText, Type, List, CheckSquare, ImageIcon as PictureIcon, Palette, FileUp } from 'lucide-react';

const IntakeQuestionModal = ({ isOpen, onClose, selectedQuestionType, onSave, editingQuestion }) => {
  const [formData, setFormData] = useState({
    questionType: selectedQuestionType || 'dropdown',
    question: '',
    description: '',
    placeholder: '',
    selectionType: 'single', // 'single' or 'multi'
    required: false,
    options: [
      {
        id: 1,
        text: '',
        image: ''
      }
    ]
  });

  const [showQuestionTypeDropdown, setShowQuestionTypeDropdown] = useState(false);
  const [imageUploading, setImageUploading] = useState({});
  const [isAnimating, setIsAnimating] = useState(false);

  const questionTypes = [
    { value: 'dropdown', label: 'Dropdown', icon: List },
    { value: 'multiple_choice', label: 'Multiple Choice', icon: CheckSquare },
    { value: 'picture_choice', label: 'Picture Choice', icon: PictureIcon },
    { value: 'short_text', label: 'Short Text Answer', icon: Type },
    { value: 'long_text', label: 'Long Text Answer', icon: FileText },
    { value: 'color_choice', label: 'Color Choice', icon: Palette },
    { value: 'image_upload', label: 'Image Upload', icon: FileUp },
  ];

  const needsOptions = ['dropdown', 'multiple_choice', 'picture_choice', 'color_choice'].includes(formData.questionType);

  // Predefined colors for color choice questions
  const predefinedColors = [
    '#FF0000', '#FF4500', '#FFA500', '#FFD700', '#FFFF00', // Reds, Oranges, Yellows
    '#00FF00', '#32CD32', '#008000', '#006400', '#228B22', // Greens
    '#0000FF', '#4169E1', '#1E90FF', '#00BFFF', '#87CEEB', // Blues
    '#8A2BE2', '#9370DB', '#9932CC', '#BA55D3', '#DDA0DD', // Purples
    '#FF69B4', '#FF1493', '#DC143C', '#FF6347', '#FF7F50', // Pinks, Reds
    '#F5F5DC', '#F5DEB3', '#DEB887', '#D2B48C', '#BC8F8F', // Browns, Beiges
    '#FFFFFF', '#F0F0F0', '#D3D3D3', '#A9A9A9', '#696969', // Grays, Whites
    '#000000', '#2F4F4F', '#708090', '#778899', '#B0C4DE'  // Blacks, Dark Grays
  ];

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

  // Initialize form data when editing
  useEffect(() => {
    if (editingQuestion) {
      setFormData({
        id: editingQuestion.id,
        questionType: editingQuestion.questionType || 'dropdown',
        question: editingQuestion.question || '',
        description: editingQuestion.description || '',
        placeholder: editingQuestion.placeholder || '',
        selectionType: editingQuestion.selectionType || 'single',
        required: editingQuestion.required || false,
        options: editingQuestion.options && editingQuestion.options.length > 0 
          ? editingQuestion.options.map((option, index) => ({
              id: option.id || index + 1,
              text: option.text || '',
              image: option.image || ''
            }))
          : [{ id: 1, text: '', image: '' }]
      });
    } else if (selectedQuestionType) {
      setFormData(prev => ({
        ...prev,
        questionType: selectedQuestionType
      }));
    } else {
      // Reset form when opening new
      setFormData({
        questionType: 'dropdown',
        question: '',
        description: '',
        placeholder: '',
        selectionType: 'single',
        required: false,
        options: [{ id: 1, text: '', image: '' }]
      });
    }
  }, [editingQuestion, selectedQuestionType, isOpen]);

  const addColorOption = (color) => {
    const newOptionId = Math.max(...formData.options.map(o => o.id), 0) + 1;
    setFormData(prev => ({
      ...prev,
      options: [
        ...prev.options,
        {
          id: newOptionId,
          text: color,
          image: ''
        }
      ]
    }));
  };

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

  const addOption = () => {
    const newOptionId = Math.max(...formData.options.map(o => o.id), 0) + 1;
    setFormData(prev => ({
      ...prev,
      options: [
        ...prev.options,
        {
          id: newOptionId,
          text: '',
          image: ''
        }
      ]
    }));
  };

  const removeOption = (optionId) => {
    if (formData.options.length > 1) {
      setFormData(prev => ({
        ...prev,
        options: prev.options.filter(option => option.id !== optionId)
      }));
    }
  };

  const handleImageUpload = async (optionId, file) => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert("Please select a valid image file.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("Image file size must be less than 5MB.");
      return;
    }

    try {
      setImageUploading(prev => ({ ...prev, [optionId]: true }));

      const formDataUpload = new FormData();
      formDataUpload.append('image', file);

      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await fetch('https://service-flow-backend-production-4568.up.railway.app/api/upload-modifier-image', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formDataUpload,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Upload failed with status: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.imageUrl) {
        throw new Error('No image URL received from server');
      }
      
      handleOptionChange(optionId, 'image', data.imageUrl);

    } catch (error) {
      console.error('Error uploading image:', error);
      alert(error.message || "Failed to upload image. Please try again.");
    } finally {
      setImageUploading(prev => ({ ...prev, [optionId]: false }));
    }
  };

  const handleSave = () => {
    onSave(formData);
    onClose();
  };

  const getQuestionTypeIcon = (type) => {
    const questionType = questionTypes.find(t => t.value === type);
    const IconComponent = questionType ? questionType.icon : List;
    return <IconComponent className="w-4 h-4" />;
  };

  const getQuestionTypeLabel = (type) => {
    const questionType = questionTypes.find(t => t.value === type);
    return questionType ? questionType.label : 'Dropdown';
  };

  const renderPreview = () => {
    if (!formData.question) {
      return (
        <div className="flex items-center justify-center h-full text-gray-400 text-sm" style={{ fontFamily: 'Montserrat', fontWeight: 400 }}>
          Preview will appear here
        </div>
      );
    }

    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4 w-full">
        {/* Question */}
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-2" style={{ fontFamily: 'Montserrat', fontWeight: 500 }}>
            {formData.question}
          </label>
          {formData.description && (
            <p className="text-xs text-gray-600 mb-3" style={{ fontFamily: 'Montserrat', fontWeight: 400 }}>
              {formData.description}
            </p>
          )}

          {/* Render based on question type */}
          {formData.questionType === 'short_text' && (
            <input
              type="text"
              placeholder={formData.placeholder || "Enter your answer..."}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled
            />
          )}

          {formData.questionType === 'long_text' && (
            <textarea
              placeholder={formData.placeholder || "Enter your answer..."}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              disabled
            />
          )}

          {formData.questionType === 'dropdown' && (
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled
            >
              <option value="">{formData.placeholder || "Select an option..."}</option>
              {formData.options.filter(opt => opt.text).map((option) => (
                <option key={option.id} value={option.text}>{option.text}</option>
              ))}
            </select>
          )}

          {formData.questionType === 'multiple_choice' && (
            <div className="space-y-2">
              {formData.options.filter(opt => opt.text).map((option) => (
                <label key={option.id} className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                  <input 
                    type={formData.selectionType === 'single' ? 'radio' : 'checkbox'} 
                    name="preview-option" 
                    className="w-4 h-4 text-blue-600" 
                    disabled
                  />
                  <span className="text-sm text-gray-900" style={{ fontFamily: 'Montserrat', fontWeight: 400 }}>
                    {option.text}
                  </span>
                </label>
              ))}
            </div>
          )}

          {formData.questionType === 'picture_choice' && (
            <div className="grid grid-cols-2 gap-3">
              {formData.options.filter(opt => opt.text || opt.image).map((option) => (
                <label key={option.id} className="relative border border-gray-200 rounded-lg overflow-hidden cursor-pointer hover:border-blue-500">
                  <input 
                    type={formData.selectionType === 'single' ? 'radio' : 'checkbox'} 
                    name="preview-picture" 
                    className="sr-only" 
                    disabled
                  />
                  {option.image ? (
                    <img src={option.image} alt={option.text} className="w-full h-32 object-cover" />
                  ) : (
                    <div className="w-full h-32 bg-gray-100 flex items-center justify-center">
                      <ImageIcon className="w-8 h-8 text-gray-400" />
                    </div>
                  )}
                  {option.text && (
                    <div className="p-2 bg-white border-t border-gray-200">
                      <span className="text-xs text-gray-900" style={{ fontFamily: 'Montserrat', fontWeight: 400 }}>
                        {option.text}
                      </span>
                    </div>
                  )}
                </label>
              ))}
            </div>
          )}

          {formData.questionType === 'color_choice' && (
            <div className="flex flex-wrap gap-2">
              {formData.options.filter(opt => opt.text).map((option) => (
                <label key={option.id} className="relative">
                  <input 
                    type={formData.selectionType === 'single' ? 'radio' : 'checkbox'} 
                    name="preview-color" 
                    className="sr-only" 
                    disabled
                  />
                  <div 
                    className="w-12 h-12 rounded-lg border-2 border-gray-300 cursor-pointer hover:border-blue-500 transition-colors"
                    style={{ backgroundColor: option.text }}
                    title={option.text}
                  />
                </label>
              ))}
            </div>
          )}

          {formData.questionType === 'image_upload' && (
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600" style={{ fontFamily: 'Montserrat', fontWeight: 400 }}>
                Click to upload or drag and drop
              </p>
              <p className="text-xs text-gray-500 mt-1" style={{ fontFamily: 'Montserrat', fontWeight: 400 }}>
                PNG, JPG, GIF up to 10MB
              </p>
            </div>
          )}
        </div>

        {/* Continue Button */}
        <button 
          className="w-full bg-green-600 text-white py-2.5 px-4 rounded-lg font-medium text-sm hover:bg-green-700 transition-colors" 
          style={{ fontFamily: 'Montserrat', fontWeight: 500 }}
          disabled
        >
          Continue
        </button>
      </div>
    );
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
              {editingQuestion ? 'Edit Intake Question' : 'Create Intake Question'}
            </h2>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-gray-100 hover:bg-blue-600 hover:text-white text-gray-900 rounded-lg font-medium text-sm transition-colors"
              style={{ fontFamily: 'Montserrat', fontWeight: 500 }}
            >
              Save
            </button>
          </div>
        </div>

        {/* Main Modal - Left Side */}
        <div className="bg-white w-full max-w-2xl flex flex-col h-full overflow-hidden pt-20">
          {/* Content */}
          <div className="flex-1 p-6 space-y-6 overflow-y-auto">
            {/* Question Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2" style={{ fontFamily: 'Montserrat', fontWeight: 500 }}>
                Question type
              </label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowQuestionTypeDropdown(!showQuestionTypeDropdown)}
                  className="w-full flex items-center justify-between px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                  style={{ fontFamily: 'Montserrat', fontWeight: 400 }}
                >
                  <div className="flex items-center space-x-2">
                    {getQuestionTypeIcon(formData.questionType)}
                    <span className="text-sm text-gray-900">{getQuestionTypeLabel(formData.questionType)}</span>
                  </div>
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                </button>
                
                {showQuestionTypeDropdown && (
                  <>
                    <div 
                      className="fixed inset-0" 
                      onClick={() => setShowQuestionTypeDropdown(false)}
                    />
                    <div className="absolute left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                      {questionTypes.map((type) => {
                        const IconComponent = type.icon;
                        return (
                          <button
                            key={type.value}
                            onClick={() => {
                              handleInputChange('questionType', type.value);
                              setShowQuestionTypeDropdown(false);
                            }}
                            className={`w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center space-x-2 ${
                              formData.questionType === type.value ? 'bg-blue-50' : ''
                            }`}
                          >
                            <IconComponent className="w-4 h-4 text-gray-600" />
                            <span className="text-sm text-gray-900" style={{ fontFamily: 'Montserrat', fontWeight: 400 }}>
                              {type.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Question */}
            <div>
              <div className="flex items-center space-x-1 mb-2">
                <label className="text-sm font-medium text-gray-700" style={{ fontFamily: 'Montserrat', fontWeight: 500 }}>
                  Question
                </label>
                <HelpCircle className="w-4 h-4 text-gray-400" />
              </div>
              <input
                type="text"
                value={formData.question}
                onChange={(e) => handleInputChange('question', e.target.value)}
                placeholder="ex. Describe the issue"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                style={{ fontFamily: 'Montserrat', fontWeight: 400 }}
              />
            </div>

            {/* Description */}
            <div>
              <div className="flex items-center space-x-1 mb-2">
                <label className="text-sm font-medium text-gray-700" style={{ fontFamily: 'Montserrat', fontWeight: 500 }}>
                  Description
                </label>
                <HelpCircle className="w-4 h-4 text-gray-400" />
              </div>
              <textarea
                rows={3}
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Add an optional description"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                style={{ fontFamily: 'Montserrat', fontWeight: 400 }}
              />
            </div>

            {/* Placeholder */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2" style={{ fontFamily: 'Montserrat', fontWeight: 500 }}>
                Placeholder
              </label>
              <input
                type="text"
                value={formData.placeholder}
                onChange={(e) => handleInputChange('placeholder', e.target.value)}
                placeholder="Optional"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                style={{ fontFamily: 'Montserrat', fontWeight: 400 }}
              />
            </div>

            {/* Selection Type - Only show for question types that need options */}
            {needsOptions && (
              <div>
                <div className="flex items-center space-x-1 mb-3">
                  <label className="block text-sm font-medium text-gray-700" style={{ fontFamily: 'Montserrat', fontWeight: 500 }}>
                    Selection type
                  </label>
                  <HelpCircle className="w-4 h-4 text-gray-400" />
                </div>
                <div className="flex space-x-2">
                  {[
                    { value: 'single', label: 'Single Select' },
                    { value: 'multi', label: 'Multi-Select' }
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
                    </button>
                  ))}
                </div>
              </div>
            )}

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

            {/* Options Section - Only show for question types that need options */}
            {needsOptions && (
              <div>
                <div className="flex items-center space-x-1 mb-4">
                  <h3 className="text-base font-semibold text-gray-900" style={{ fontFamily: 'Montserrat', fontWeight: 600 }}>
                    OPTIONS
                  </h3>
                  <HelpCircle className="w-4 h-4 text-gray-400" />
                </div>

                <div className="space-y-3">
                  {formData.options.map((option, index) => (
                    <div key={option.id}>
                      <label className="block text-sm font-medium text-gray-700 mb-2" style={{ fontFamily: 'Montserrat', fontWeight: 500 }}>
                        Option {index + 1}
                      </label>
                      <div className="flex items-center space-x-2">
                        <input
                          type="text"
                          value={option.text}
                          onChange={(e) => handleOptionChange(option.id, 'text', e.target.value)}
                          placeholder="Enter an option..."
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          style={{ fontFamily: 'Montserrat', fontWeight: 400 }}
                        />
                        {/* Color preview for color choice questions */}
                        {formData.questionType === 'color_choice' && option.text && (
                          <div 
                            className="w-10 h-10 rounded border border-gray-300"
                            style={{ backgroundColor: option.text }}
                            title={option.text}
                          />
                        )}
                        {/* Image upload for picture choice questions */}
                        {formData.questionType === 'picture_choice' && (
                          <div className="relative">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleImageUpload(option.id, e.target.files[0])}
                              disabled={imageUploading[option.id]}
                              className="hidden"
                              id={`image-upload-${option.id}`}
                            />
                            
                            {option.image ? (
                              <div className="flex items-center space-x-2">
                                <img
                                  src={option.image}
                                  alt={option.text || 'Option image'}
                                  className="w-10 h-10 object-cover rounded-lg border border-gray-200"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleOptionChange(option.id, 'image', '')}
                                  className="p-1 text-red-400 hover:text-red-600"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ) : (
                              <label
                                htmlFor={`image-upload-${option.id}`}
                                className={`flex items-center justify-center w-10 h-10 border-2 border-dashed rounded-lg cursor-pointer transition-all ${
                                  imageUploading[option.id] 
                                    ? 'border-gray-300 bg-gray-50 cursor-not-allowed' 
                                    : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
                                }`}
                              >
                                {imageUploading[option.id] ? (
                                  <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
                                ) : (
                                  <Upload className="w-4 h-4 text-gray-400" />
                                )}
                              </label>
                            )}
                          </div>
                        )}
                        {/* Color picker for color choice questions */}
                        {formData.questionType === 'color_choice' && (
                          <input
                            type="color"
                            value={option.text.startsWith('#') ? option.text : '#000000'}
                            onChange={(e) => handleOptionChange(option.id, 'text', e.target.value)}
                            className="w-10 h-10 border border-gray-300 rounded cursor-pointer"
                            title="Choose color"
                          />
                        )}
                        {formData.options.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeOption(option.id)}
                            className="p-1 text-red-400 hover:text-red-600"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add Option Button */}
                <button
                  type="button"
                  onClick={addOption}
                  className="mt-4 flex items-center space-x-2 px-4 py-2 text-gray-900 hover:text-gray-700 font-medium"
                  style={{ fontFamily: 'Montserrat', fontWeight: 500 }}
                >
                  <Plus className="w-4 h-4" />
                  <span>Add option</span>
                </button>

                {/* Color Palette for Color Choice Questions */}
                {formData.questionType === 'color_choice' && (
                  <div className="mt-6">
                    <div className="flex items-center space-x-1 mb-3">
                      <h4 className="text-sm font-medium text-gray-700" style={{ fontFamily: 'Montserrat', fontWeight: 500 }}>
                        Quick Add Colors
                      </h4>
                      <HelpCircle className="w-4 h-4 text-gray-400" />
                    </div>
                    <div className="grid grid-cols-8 gap-2">
                      {predefinedColors.map((color, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => addColorOption(color)}
                          className="w-8 h-8 rounded border border-gray-300 hover:scale-110 transition-transform"
                          style={{ backgroundColor: color }}
                          title={color}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
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
                {renderPreview()}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IntakeQuestionModal;
