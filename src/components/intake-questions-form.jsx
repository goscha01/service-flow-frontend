import React, { useState, useEffect } from 'react';
import { Plus, Minus, Upload, Image as ImageIcon, Save } from 'lucide-react';
import SimpleDropdownMultiselect from './simple-dropdown-multiselect.jsx';
import ExcelListboxMultiselect from './excel-listbox-multiselect.jsx';

const IntakeQuestionsForm = ({ questions = [], onAnswersChange, onSave, isEditable = false, isSaving = false, initialAnswers = {} }) => {

  const [answers, setAnswers] = useState(initialAnswers);
  const [imageUploading, setImageUploading] = useState({});

  // Initialize answers when questions change or when initialAnswers are provided
  useEffect(() => {
    console.log('🔄 IntakeQuestionsForm: Initializing answers', { 
      initialAnswers, 
      questions: questions?.length || 0,
      hasInitialAnswers: initialAnswers && Object.keys(initialAnswers).length > 0
    });
    
    // Priority 1: Use initialAnswers if provided
    if (initialAnswers && Object.keys(initialAnswers).length > 0) {
      console.log('✅ Using initialAnswers:', initialAnswers);
      setAnswers(initialAnswers);
      return;
    }
    
    // Priority 2: Build from questions that have answers embedded
    if (questions && questions.length > 0) {
      console.log('🔍 Building answers from questions');
      const defaultAnswers = {};
      questions.forEach(question => {
        if (question.answer !== undefined && question.answer !== null && question.answer !== '') {
          defaultAnswers[question.id] = question.answer;
          console.log(`📝 Question ${question.id} has answer:`, question.answer);
        }
      });
      console.log('📝 Default answers from questions:', defaultAnswers);
      setAnswers(defaultAnswers);
    }
  }, [questions, initialAnswers]); // Include initialAnswers but with proper handling

  // Separate effect to handle initialAnswers changes without causing loops
  useEffect(() => {
    if (initialAnswers && Object.keys(initialAnswers).length > 0) {
      setAnswers(prevAnswers => {
        // Only update if the initialAnswers are actually different
        const hasChanges = Object.keys(initialAnswers).some(key => 
          prevAnswers[key] !== initialAnswers[key]
        );
        console.log('🔄 IntakeQuestionsForm: Checking for changes', { 
          hasChanges, 
          prevAnswers, 
          initialAnswers 
        });
        return hasChanges ? initialAnswers : prevAnswers;
      });
    }
  }, [initialAnswers]);

  const handleAnswerChange = (questionId, value) => {
    const newAnswers = { ...answers, [questionId]: value };
    setAnswers(newAnswers);
    onAnswersChange(newAnswers);
  };

  const handleMultipleChoiceChange = (questionId, option, isChecked) => {
    const currentAnswers = answers[questionId] || [];
    let newAnswers;
    
    if (isChecked) {
      newAnswers = [...currentAnswers, option];
    } else {
      newAnswers = currentAnswers.filter(item => item !== option);
    }
    
    handleAnswerChange(questionId, newAnswers);
  };

  const handleQuantityChange = (questionId, optionId, change) => {
    const currentQuantities = answers[questionId] || {};
    const currentQuantity = currentQuantities[optionId] || 0;
    const newQuantity = Math.max(0, currentQuantity + change);
    
    const newQuantities = {
      ...currentQuantities,
      [optionId]: newQuantity
    };
    
    handleAnswerChange(questionId, newQuantities);
  };

  const handleImageUpload = async (questionId, file) => {
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert("Please select a valid image file.");
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert("Image file size must be less than 10MB.");
      return;
    }

    try {
      setImageUploading(prev => ({ ...prev, [questionId]: true }));

      const formData = new FormData();
      formData.append('image', file);

      // Get auth token
      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await fetch('https://service-flow-backend-production-4568.up.railway.app/api/upload-intake-image', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Upload failed with status: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.imageUrl) {
        throw new Error('No image URL received from server');
      }
      
      // Update the answer with the image URL
      handleAnswerChange(questionId, data.imageUrl);

    } catch (error) {
      console.error('Error uploading image:', error);
      alert(error.message || "Failed to upload image. Please try again.");
    } finally {
      setImageUploading(prev => ({ ...prev, [questionId]: false }));
    }
  };



  if (!questions || questions.length === 0) {
    return null;
  }

  const renderQuestion = (question) => {
    const questionId = question.id;
    const currentAnswer = answers[questionId];
    
    // Debug logging for question rendering
    console.log(`🎯 Rendering question ${questionId} (${question.questionType}):`, {
      currentAnswer,
      questionText: question.question,
      allAnswers: answers
    });


    switch (question.questionType) {
      case 'multiple_choice':
        // Multiple choice can be single or multi-select based on selectionType
        const isMultiSelect = question.selectionType === 'multi';
        
        if (isMultiSelect) {
          // Multi-select using Excel-style listbox
          return (
            <div key={questionId} className="mb-6">
              <div className="mb-3">
                <label className="block text-lg font-medium text-gray-900 mb-1">
                  {question.question}
                  {question.required && <span className="text-red-500 ml-1">*</span>}
                </label>
                {question.description && (
                  <p className="text-sm text-gray-600">{question.description}</p>
                )}
              </div>
              
              <ExcelListboxMultiselect
                options={question.options?.map(option => ({
                  value: option.text,
                  label: option.text
                })) || []}
                selectedValues={currentAnswer || []}
                onSelectionChange={(selectedValues) => {
                  handleAnswerChange(questionId, selectedValues);
                }}
                placeholder={`Select ${question.question.toLowerCase()}...`}
              />
            </div>
          );
        } else {
          // Single select using radio buttons
          return (
            <div key={questionId} className="mb-6">
              <div className="mb-3">
                <label className="block text-lg font-medium text-gray-900 mb-1">
                  {question.question}
                  {question.required && <span className="text-red-500 ml-1">*</span>}
                </label>
                {question.description && (
                  <p className="text-sm text-gray-600">{question.description}</p>
                )}
              </div>
              
              <div className="space-y-3">
                {question.options?.map((option, index) => (
                  <label key={index} className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                    <input
                      type="radio"
                      name={questionId}
                      value={option.text}
                      checked={currentAnswer === option.text}
                      onChange={(e) => handleAnswerChange(questionId, e.target.value)}
                      required={question.required}
                      className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                    />
                    <span className="ml-3 text-sm font-medium text-gray-900">{option.text}</span>
                  </label>
                ))}
              </div>
            </div>
          );
        }

      case 'dropdown':
        // Dropdown uses actual dropdown for single select, multiselect for multi
        const isDropdownMultiSelect = question.selectionType === 'multi';
        
        // Debug logging for dropdown questions
        console.log(`🔽 Dropdown question ${questionId}:`, {
          questionText: question.question,
          currentAnswer,
          isDropdownMultiSelect,
          selectionType: question.selectionType,
          options: question.options,
          answersState: answers,
          fullQuestion: question
        });
        
        // Force multi-select for debugging if question text contains "Multi-Select"
        const forceMultiSelect = question.question && question.question.toLowerCase().includes('multi');
        if (forceMultiSelect && !isDropdownMultiSelect) {
          console.log(`🔧 FORCING multi-select for question: ${question.question}`);
        }
        
        return (
          <div key={questionId} className="mb-6">
            <div className="mb-3">
              <label className="block text-lg font-medium text-gray-900 mb-1">
                {question.question}
                {question.required && <span className="text-red-500 ml-1">*</span>}
              </label>
              {question.description && (
                <p className="text-sm text-gray-600">{question.description}</p>
              )}
            </div>
            
            {(isDropdownMultiSelect || forceMultiSelect) ? (
              // Multi-select using Excel-style listbox
              <ExcelListboxMultiselect
                options={question.options?.map(option => ({
                  value: option.text,
                  label: option.text
                })) || []}
                selectedValues={currentAnswer || []}
                onSelectionChange={(selectedValues) => {
                  handleAnswerChange(questionId, selectedValues);
                }}
                placeholder={`Select ${question.question.toLowerCase()}...`}
              />
            ) : (
              // Single select using proper dropdown
              <select
                value={currentAnswer || ''}
                onChange={(e) => handleAnswerChange(questionId, e.target.value)}
                required={question.required}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select an option...</option>
                {question.options?.map((option, index) => (
                  <option key={index} value={option.text}>
                    {option.text}
                  </option>
                ))}
              </select>
            )}
          </div>
        );

      case 'picture_choice':
        return (
          <div key={questionId} className="mb-6">
            <div className="mb-3">
              <label className="block text-lg font-medium text-gray-900 mb-1">
                {question.question}
                {question.required && <span className="text-red-500 ml-1">*</span>}
              </label>
              {question.description && (
                <p className="text-sm text-gray-600">{question.description}</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              {question.options?.map((option, index) => (
                <label key={index} className="relative cursor-pointer">
                  <input
                    type={question.selectionType === 'multi' ? 'checkbox' : 'radio'}
                    name={questionId}
                    value={option.text}
                    checked={
                      question.selectionType === 'multi'
                        ? (currentAnswer || []).includes(option.text)
                        : (currentAnswer && currentAnswer.text === option.text)
                    }
                    onChange={(e) => {
                      if (question.selectionType === 'multi') {
                        handleMultipleChoiceChange(questionId, option.text, e.target.checked);
                      } else {
                        // For picture choice, save both text and image URL
                        const answerData = {
                          text: option.text,
                          image: option.image || null
                        };
                        handleAnswerChange(questionId, answerData);
                      }
                    }}
                    required={question.required}
                    className="sr-only"
                  />
                  <div className={`border-2 rounded-lg overflow-hidden transition-all ${
                    (question.selectionType === 'multi'
                      ? (currentAnswer || []).includes(option.text)
                      : (currentAnswer && currentAnswer.text === option.text))
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}>
                    {option.image ? (
                      <img
                        src={option.image}
                        alt={option.text}
                        className="w-full h-32 object-cover"
                      />
                    ) : (
                      <div className="w-full h-32 bg-gray-100 flex items-center justify-center">
                        <ImageIcon className="w-8 h-8 text-gray-400" />
                      </div>
                    )}
                    <div className="p-3 text-center">
                      <span className="text-sm font-medium text-gray-900">{option.text}</span>
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>
        );

      case 'quantity_select':
        return (
          <div key={questionId} className="mb-6">
            <div className="mb-3">
              <label className="block text-lg font-medium text-gray-900 mb-1">
                {question.question}
                {question.required && <span className="text-red-500 ml-1">*</span>}
              </label>
              {question.description && (
                <p className="text-sm text-gray-600">{question.description}</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              {question.options?.map((option, index) => {
                const currentQuantities = currentAnswer || {};
                const quantity = currentQuantities[option.id] || 0;
                
                return (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    {option.image && (
                      <img
                        src={option.image}
                        alt={option.text}
                        className="w-full h-24 object-cover rounded mb-3"
                      />
                    )}
                    <div className="text-center mb-3">
                      <div className="text-sm font-medium text-gray-900">{option.text}</div>
                      {option.price && (
                        <div className="text-sm text-gray-600">${option.price}</div>
                      )}
                    </div>
                    <div className="flex items-center justify-center space-x-3">
                      <button
                        type="button"
                        onClick={() => handleQuantityChange(questionId, option.id, -1)}
                        className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100 transition-colors"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-8 text-center text-sm font-medium">{quantity}</span>
                      <button
                        type="button"
                        onClick={() => handleQuantityChange(questionId, option.id, 1)}
                        className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100 transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );

      case 'color_choice':
        return (
          <div key={questionId} className="mb-6">
            <div className="mb-3">
              <label className="block text-lg font-medium text-gray-900 mb-1">
                {question.question}
                {question.required && <span className="text-red-500 ml-1">*</span>}
              </label>
              {question.description && (
                <p className="text-sm text-gray-600">{question.description}</p>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {question.options?.map((option, index) => (
                <label key={index} className="relative cursor-pointer group">
                  <input
                    type={question.selectionType === 'multi' ? 'checkbox' : 'radio'}
                    name={questionId}
                    value={option.text}
                    checked={
                      question.selectionType === 'multi'
                        ? (currentAnswer || []).includes(option.text)
                        : currentAnswer === option.text
                    }
                    onChange={(e) => {

                      
                      if (question.selectionType === 'multi') {
                        handleMultipleChoiceChange(questionId, option.text, e.target.checked);
                      } else {
                        handleAnswerChange(questionId, e.target.value);
                      }
                    }}
                    required={question.required}
                    className="sr-only"
                  />
                  <div className={`relative border-2 rounded-lg p-3 transition-all ${
                    (question.selectionType === 'multi'
                      ? (currentAnswer || []).includes(option.text)
                      : currentAnswer === option.text)
                      ? 'border-blue-500 bg-blue-50 shadow-md'
                      : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                  }`}>
                    {/* Color Swatch */}
                    <div 
                      className="w-full h-16 rounded-lg mb-2 shadow-inner"
                      style={{ backgroundColor: option.text }}
                    />
                    {/* Color Label */}
                    <div className="text-center">
                      <span className="text-sm font-medium text-gray-900">{option.text}</span>
                    </div>
                    {/* Selection Indicator */}
                    {(question.selectionType === 'multi'
                      ? (currentAnswer || []).includes(option.text)
                      : currentAnswer === option.text) && (
                      <div className="absolute -top-1 -right-1 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </div>
                </label>
              ))}
            </div>
          </div>
        );

      case 'short_text':
        return (
          <div key={questionId} className="mb-6">
            <div className="mb-3">
              <label className="block text-lg font-medium text-gray-900 mb-1">
              {question.question}
              {question.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            {question.description && (
                <p className="text-sm text-gray-600">{question.description}</p>
            )}
            </div>
            <input
              type="text"
              value={currentAnswer || ''}
              onChange={(e) => handleAnswerChange(questionId, e.target.value)}
              required={question.required}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter your answer"
            />
          </div>
        );

      case 'long_text':
        return (
          <div key={questionId} className="mb-6">
            <div className="mb-3">
              <label className="block text-lg font-medium text-gray-900 mb-1">
              {question.question}
              {question.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            {question.description && (
                <p className="text-sm text-gray-600">{question.description}</p>
            )}
            </div>
            <textarea
              value={currentAnswer || ''}
              onChange={(e) => handleAnswerChange(questionId, e.target.value)}
              required={question.required}
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter your answer"
            />
          </div>
        );

      case 'image_upload':
        return (
          <div key={questionId} className="mb-6">
            <div className="mb-3">
              <label className="block text-lg font-medium text-gray-900 mb-1">
                {question.question}
                {question.required && <span className="text-red-500 ml-1">*</span>}
              </label>
              {question.description && (
                <p className="text-sm text-gray-600">{question.description}</p>
              )}
            </div>
            <div className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
              imageUploading[questionId] 
                ? 'border-blue-300 bg-blue-50' 
                : 'border-gray-300 hover:border-gray-400'
            }`}>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleImageUpload(questionId, e.target.files[0])}
                required={question.required}
                disabled={imageUploading[questionId]}
                className="sr-only"
                id={`image-upload-${questionId}`}
              />
              <label 
                htmlFor={`image-upload-${questionId}`} 
                className={`cursor-pointer ${imageUploading[questionId] ? 'cursor-not-allowed' : ''}`}
              >
                {imageUploading[questionId] ? (
                  <>
                    <div className="w-8 h-8 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin mx-auto mb-2"></div>
                    <p className="text-sm text-blue-600">Uploading image...</p>
                    <p className="text-xs text-blue-500 mt-1">Please wait</p>
                  </>
                ) : currentAnswer ? (
                  <>
                    <ImageIcon className="w-8 h-8 text-green-600 mx-auto mb-2" />
                    <p className="text-sm text-green-600">Image uploaded successfully</p>
                    <p className="text-xs text-gray-500 mt-1">Click to change image</p>
                  </>
                ) : (
                  <>
                    <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">Click to upload an image</p>
                    <p className="text-xs text-gray-500 mt-1">PNG, JPG, GIF up to 10MB</p>
                  </>
                )}
              </label>
              {currentAnswer && (
                <div className="mt-4">
                  <img 
                    src={currentAnswer} 
                    alt="Uploaded" 
                    className="w-32 h-32 object-cover rounded mx-auto border border-gray-200 shadow-sm" 
                  />
                  <button
                    type="button"
                    onClick={() => handleAnswerChange(questionId, '')}
                    className="mt-2 text-xs text-red-600 hover:text-red-700"
                  >
                    Remove image
                  </button>
                </div>
              )}
            </div>
          </div>
        );

      default:
        return (
          <div key={questionId} className="mb-6">
            <div className="mb-3">
              <label className="block text-lg font-medium text-gray-900 mb-1">
              {question.question}
              {question.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            {question.description && (
                <p className="text-sm text-gray-600">{question.description}</p>
            )}
            </div>
            <input
              type="text"
              value={currentAnswer || ''}
              onChange={(e) => handleAnswerChange(questionId, e.target.value)}
              required={question.required}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter your answer"
            />
          </div>
        );
    }
  };

  return (
      <div className="space-y-6">
        {questions.map(renderQuestion)}
        
        {isEditable && onSave && (
          <div className="flex justify-end pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onSave}
              disabled={isSaving}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Answers
                </>
              )}
            </button>
          </div>
        )}
    </div>
  );
};

export default IntakeQuestionsForm;
