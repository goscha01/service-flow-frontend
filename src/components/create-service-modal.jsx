import React, { useState, useEffect, useCallback } from 'react';
import { X, ChevronRight, ChevronLeft, Plus, Tag, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import { servicesAPI } from '../services/api';
import ServiceModifiersForm from './service-modifiers-form';
import CreateModifierGroupModal from './create-modifier-group-modal';
import IntakeQuestionModal from './intake-question-modal';

const CreateServiceModal = ({ 
  isOpen, 
  onClose, 
  onServiceCreated,
  user,
  initialCategory = null
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [validationErrors, setValidationErrors] = useState({});
  const [formData, setFormData] = useState({
    categoryId: '',
    name: '',
    description: '',
    price: '',
    duration: '',
    workers: 1,
    skills: 0,
    modifiers: [],
    intakeQuestions: []
  });
  
  const [selectedModifiers, setSelectedModifiers] = useState({});
  const [isCreateModifierGroupModalOpen, setIsCreateModifierGroupModalOpen] = useState(false);
  const [editingModifier, setEditingModifier] = useState(null);
  const [isIntakeModalOpen, setIsIntakeModalOpen] = useState(false);
  const [selectedQuestionType, setSelectedQuestionType] = useState(null);
  const [editingIntakeQuestion, setEditingIntakeQuestion] = useState(null);
  const [categoriesLoading, setCategoriesLoading] = useState(false);

  const loadCategories = useCallback(async () => {
    try {
      setCategoriesLoading(true);
      const categoriesData = await servicesAPI.getServiceCategories(user.id);
      setCategories(categoriesData || []);
    } catch (error) {
      console.error('Error loading categories:', error);
      setCategories([]);
    } finally {
      setCategoriesLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (isOpen && user?.id) {
      loadCategories();
    }
  }, [isOpen, user?.id, loadCategories]);

  useEffect(() => {
    if (isOpen && initialCategory && categories.length > 0) {
      const categoryExists = categories.find(c => c.id === initialCategory.id || c.name === initialCategory.name);
      if (categoryExists) {
        setFormData(prev => ({
          ...prev,
          categoryId: categoryExists.id
        }));
      }
    }
  }, [isOpen, initialCategory, categories]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    // Clear validation errors when user types
    if (validationErrors[field]) {
      setValidationErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
    setError('');
  };

  const validateStep = () => {
    const errors = {};
    
    if (currentStep === 1) {
      if (!formData.categoryId || formData.categoryId === '') {
        errors.categoryId = 'Please select a category';
      }
    } else if (currentStep === 2) {
      if (!formData.name || formData.name.trim() === '') {
        errors.name = 'Service name is required';
      }
      if (!formData.price || parseFloat(formData.price) < 0) {
        errors.price = 'Price must be a positive number';
      }
      if (!formData.duration || parseInt(formData.duration) < 1) {
        errors.duration = 'Duration must be at least 1 minute';
      }
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleModifiersChange = (modifiers) => {
    setSelectedModifiers(modifiers);
  };

  const handleEditModifier = (modifier) => {
    setEditingModifier(modifier);
    setIsCreateModifierGroupModalOpen(true);
  };

  const handleSaveModifierGroup = async (modifierGroupData) => {
    try {
      let updatedModifiers;
      
      if (editingModifier) {
        updatedModifiers = formData.modifiers.map(m => 
          m.id === editingModifier.id ? {
            ...m,
            ...modifierGroupData
          } : m
        );
      } else {
        const maxId = formData.modifiers.length > 0 
          ? Math.max(...formData.modifiers.map(m => m.id || 0))
          : 0;
        
        const newModifier = {
          id: maxId + 1,
          ...modifierGroupData
        };
        
        updatedModifiers = [...formData.modifiers, newModifier];
      }
      
      setFormData(prev => ({
        ...prev,
        modifiers: updatedModifiers
      }));
      
      setIsCreateModifierGroupModalOpen(false);
      setEditingModifier(null);
    } catch (error) {
      console.error('Error saving modifier group:', error);
    }
  };

  const handleOpenIntakeModal = (questionType) => {
    setSelectedQuestionType(questionType);
    setIsIntakeModalOpen(true);
  };

  const handleCloseIntakeModal = () => {
    setIsIntakeModalOpen(false);
    setSelectedQuestionType(null);
    setEditingIntakeQuestion(null);
  };

  const handleSaveIntakeQuestion = async (questionData) => {
    try {
      let updatedQuestions;
      
      if (editingIntakeQuestion) {
        updatedQuestions = formData.intakeQuestions.map(q => 
          q.id === editingIntakeQuestion.id ? {
            ...q,
            ...questionData
          } : q
        );
      } else {
        const maxId = formData.intakeQuestions.length > 0 
          ? Math.max(...formData.intakeQuestions.map(q => q.id || 0))
          : 0;
        
        const newQuestion = {
          id: maxId + 1,
          ...questionData
        };
        
        updatedQuestions = [...formData.intakeQuestions, newQuestion];
      }
      
      setFormData(prev => ({
        ...prev,
        intakeQuestions: updatedQuestions
      }));
      
      setIsIntakeModalOpen(false);
      setSelectedQuestionType(null);
      setEditingIntakeQuestion(null);
    } catch (error) {
      console.error('Error saving intake question:', error);
    }
  };

  const handleEditIntakeQuestion = (question) => {
    setEditingIntakeQuestion(question);
    setIsIntakeModalOpen(true);
  };

  const handleDeleteIntakeQuestion = (questionId) => {
    setFormData(prev => ({
      ...prev,
      intakeQuestions: prev.intakeQuestions.filter(q => q.id !== questionId)
    }));
  };

  const handleNext = () => {
    if (!validateStep()) {
      return;
    }
    if (currentStep < 5) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      setValidationErrors({});
    }
  };

  const handleCreateService = async () => {
    setError('');
    setValidationErrors({});
    
    // Final validation
    if (!validateStep() || !formData.categoryId || !formData.name || !formData.price || !formData.duration) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      // Get category name
      const selectedCategory = categories.find(cat => 
        cat.id === formData.categoryId || 
        cat.id?.toString() === formData.categoryId?.toString()
      );
      const categoryName = formData.categoryId === 'uncategorized' || !selectedCategory
        ? 'Uncategorized' 
        : selectedCategory.name;
      
      // Prepare service data - backend expects category as string, not categoryId
      // userId comes from auth token, not from body
      const serviceData = {
        name: formData.name.trim(),
        description: formData.description || '',
        price: parseFloat(formData.price) || 0,
        duration: parseInt(formData.duration) || 60,
        category: categoryName,
        modifiers: formData.modifiers && formData.modifiers.length > 0 
          ? JSON.stringify(formData.modifiers) 
          : JSON.stringify([]),
        intake_questions: formData.intakeQuestions && formData.intakeQuestions.length > 0
          ? JSON.stringify(formData.intakeQuestions)
          : null
      };

      console.log('Creating service with data:', serviceData);
      const response = await servicesAPI.create(serviceData);
      console.log('Service created successfully:', response);
      
      // Extract service from response
      const createdService = response.service || response;
      
      if (!createdService) {
        throw new Error('Service creation failed - no service returned');
      }
      
      // Call callback with created service
      onServiceCreated(createdService);
      
      // Reset form
      setFormData({
        categoryId: '',
        name: '',
        description: '',
        price: '',
        duration: '',
        workers: 1,
        skills: 0,
        modifiers: [],
        intakeQuestions: []
      });
      setCurrentStep(1);
      setSelectedModifiers({});
      setValidationErrors({});
      setError('');
      onClose();
      
    } catch (error) {
      console.error('Error creating service:', error);
      const errorMessage = error.response?.data?.error || 
                          error.message || 
                          'Failed to create service. Please try again.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setCurrentStep(1);
    setFormData({
      categoryId: '',
      name: '',
      description: '',
      price: '',
      duration: '',
      workers: 1,
      skills: 0,
      modifiers: [],
      intakeQuestions: []
    });
    setSelectedModifiers({});
    setValidationErrors({});
    setError('');
    onClose();
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case 1: return 'Select Category';
      case 2: return 'Service Details';
      case 3: return 'Service Options';
      case 4: return 'Intake Questions';
      case 5: return 'Review';
      default: return 'Create Service';
    }
  };

  const getStepDescription = () => {
    switch (currentStep) {
      case 1: return 'Choose a category for your service';
      case 2: return 'Enter basic information about your service';
      case 3: return 'Configure modifiers and options (optional)';
      case 4: return 'Set up customer intake questions (optional)';
      case 5: return 'Review your service before creating';
      default: return '';
    }
  };

  if (!isOpen) return null;

  const selectedCategory = categories.find(cat => 
    cat.id === formData.categoryId || 
    cat.id?.toString() === formData.categoryId?.toString()
  );

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" style={{ fontFamily: 'Montserrat' }}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <div className="flex items-center gap-4">
            {currentStep > 1 && (
              <button
                onClick={handleBack}
                className="p-2 hover:bg-gray-50 rounded-lg transition-colors"
                type="button"
              >
                <ChevronLeft className="w-5 h-5 text-gray-600" />
              </button>
            )}
            <div>
              <h2 className="text-xl font-bold text-gray-900" style={{ fontFamily: 'Montserrat', fontWeight: 700 }}>
                {getStepTitle()}
              </h2>
              <p className="text-sm text-gray-500 mt-0.5" style={{ fontFamily: 'Montserrat', fontWeight: 400 }}>
                {getStepDescription()}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-50 rounded-lg transition-colors text-gray-400 hover:text-gray-600"
            type="button"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Indicator */}
        <div className="px-6 py-4 bg-gray-50/50 border-b border-gray-100">
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5].map((step) => (
              <React.Fragment key={step}>
                <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-all ${
                  step < currentStep 
                    ? 'bg-blue-600 text-white' 
                    : step === currentStep
                    ? 'bg-blue-600 text-white ring-2 ring-blue-600 ring-offset-2'
                    : 'bg-gray-200 text-gray-500'
                }`}>
                  {step < currentStep ? <CheckCircle2 className="w-4 h-4" /> : step}
                </div>
                {step < 5 && (
                  <div className={`h-0.5 flex-1 transition-all ${
                    step < currentStep ? 'bg-blue-600' : 'bg-gray-200'
                  }`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Content */}
        <div className="p-6 flex-1 overflow-y-auto">
          {/* Step 1: Category Selection */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2" style={{ fontFamily: 'Montserrat', fontWeight: 600 }}>
                  Service Category <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.categoryId}
                  onChange={(e) => handleInputChange('categoryId', e.target.value)}
                  className={`w-full px-4 py-3 bg-gray-50 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                    validationErrors.categoryId ? 'border-red-300 bg-red-50' : 'border-gray-200'
                  }`}
                  style={{ fontFamily: 'Montserrat', fontWeight: 400 }}
                  required
                >
                  <option value="">Select a category...</option>
                  <option value="uncategorized">Uncategorized</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
                {validationErrors.categoryId && (
                  <p className="text-sm text-red-600 mt-1">{validationErrors.categoryId}</p>
                )}
              </div>
              
              {categoriesLoading && (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="text-sm text-gray-600 mt-2">Loading categories...</p>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Basic Information */}
          {currentStep === 2 && (
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2" style={{ fontFamily: 'Montserrat', fontWeight: 600 }}>
                  Service Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="e.g., Home Cleaning, Plumbing Repair"
                  className={`w-full px-4 py-3 bg-gray-50 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                    validationErrors.name ? 'border-red-300 bg-red-50' : 'border-gray-200'
                  }`}
                  style={{ fontFamily: 'Montserrat', fontWeight: 400 }}
                  required
                />
                {validationErrors.name && (
                  <p className="text-sm text-red-600 mt-1">{validationErrors.name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2" style={{ fontFamily: 'Montserrat', fontWeight: 600 }}>
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Describe what this service includes..."
                  rows={3}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none"
                  style={{ fontFamily: 'Montserrat', fontWeight: 400 }}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2" style={{ fontFamily: 'Montserrat', fontWeight: 600 }}>
                    Price ($) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.price}
                    onChange={(e) => handleInputChange('price', e.target.value)}
                    placeholder="0.00"
                    className={`w-full px-4 py-3 bg-gray-50 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                      validationErrors.price ? 'border-red-300 bg-red-50' : 'border-gray-200'
                    }`}
                    style={{ fontFamily: 'Montserrat', fontWeight: 400 }}
                    required
                  />
                  {validationErrors.price && (
                    <p className="text-sm text-red-600 mt-1">{validationErrors.price}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2" style={{ fontFamily: 'Montserrat', fontWeight: 600 }}>
                    Duration (minutes) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.duration}
                    onChange={(e) => handleInputChange('duration', e.target.value)}
                    placeholder="60"
                    className={`w-full px-4 py-3 bg-gray-50 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                      validationErrors.duration ? 'border-red-300 bg-red-50' : 'border-gray-200'
                    }`}
                    style={{ fontFamily: 'Montserrat', fontWeight: 400 }}
                    required
                  />
                  {validationErrors.duration && (
                    <p className="text-sm text-red-600 mt-1">{validationErrors.duration}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Service Modifiers */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900" style={{ fontFamily: 'Montserrat', fontWeight: 600 }}>Service Modifiers</h3>
                  <p className="text-sm text-gray-500 mt-0.5">Configure options and modifiers for your service (optional)</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCreateModifierGroupModalOpen(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm font-medium"
                  style={{ fontFamily: 'Montserrat', fontWeight: 500 }}
                >
                  <Plus className="w-4 h-4" />
                  Add Modifier
                </button>
              </div>

              {formData.modifiers.length > 0 ? (
                <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                  <ServiceModifiersForm 
                    modifiers={formData.modifiers}
                    selectedModifiers={selectedModifiers}
                    onModifiersChange={handleModifiersChange}
                    onEditModifier={handleEditModifier}
                    isEditable={true}
                  />
                </div>
              ) : (
                <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-lg bg-gray-50/50">
                  <Sparkles className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <h3 className="text-base font-medium text-gray-900 mb-1" style={{ fontFamily: 'Montserrat', fontWeight: 600 }}>No Modifiers Added</h3>
                  <p className="text-sm text-gray-500 mb-4">
                    Add modifier groups to give customers options
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsCreateModifierGroupModalOpen(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                    style={{ fontFamily: 'Montserrat', fontWeight: 500 }}
                  >
                    Add Your First Modifier
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Intake Questions */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900" style={{ fontFamily: 'Montserrat', fontWeight: 600 }}>Intake Questions</h3>
                  <p className="text-sm text-gray-500 mt-0.5">Set up questions to collect additional information (optional)</p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpenIntakeModal('short_text')}
                    className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                    style={{ fontFamily: 'Montserrat', fontWeight: 500 }}
                  >
                    Short Text
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenIntakeModal('multiple_choice')}
                    className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                    style={{ fontFamily: 'Montserrat', fontWeight: 500 }}
                  >
                    Multiple Choice
                  </button>
                </div>
              </div>

              {formData.intakeQuestions.length > 0 ? (
                <div className="space-y-3">
                  {formData.intakeQuestions.map((question) => (
                    <div key={question.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm">{question.questionType === 'short_text' && '📝'}{question.questionType === 'multiple_choice' && '☑️'}{question.questionType === 'dropdown' && '📋'}</span>
                            <span className="text-sm font-medium text-gray-900" style={{ fontFamily: 'Montserrat', fontWeight: 600 }}>
                              {question.question}
                            </span>
                            {question.required && (
                              <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">Required</span>
                            )}
                          </div>
                          {question.description && (
                            <p className="text-sm text-gray-600 ml-6">{question.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleEditIntakeQuestion(question)}
                            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                            style={{ fontFamily: 'Montserrat', fontWeight: 500 }}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteIntakeQuestion(question.id)}
                            className="text-red-600 hover:text-red-700 text-sm font-medium"
                            style={{ fontFamily: 'Montserrat', fontWeight: 500 }}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-lg bg-gray-50/50">
                  <Tag className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <h3 className="text-base font-medium text-gray-900 mb-1" style={{ fontFamily: 'Montserrat', fontWeight: 600 }}>No Questions Added</h3>
                  <p className="text-sm text-gray-500 mb-4">
                    Add questions to collect additional information from customers
                  </p>
                  <button
                    type="button"
                    onClick={() => handleOpenIntakeModal('short_text')}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                    style={{ fontFamily: 'Montserrat', fontWeight: 500 }}
                  >
                    Add Question
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Step 5: Review */}
          {currentStep === 5 && (
            <div className="space-y-6">
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-blue-600 rounded-lg">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900" style={{ fontFamily: 'Montserrat', fontWeight: 700 }}>Service Summary</h3>
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between py-2 border-b border-blue-100">
                    <span className="font-medium text-gray-700" style={{ fontFamily: 'Montserrat', fontWeight: 600 }}>Name:</span>
                    <span className="text-gray-900" style={{ fontFamily: 'Montserrat', fontWeight: 500 }}>{formData.name}</span>
                  </div>
                  
                  <div className="flex justify-between py-2 border-b border-blue-100">
                    <span className="font-medium text-gray-700" style={{ fontFamily: 'Montserrat', fontWeight: 600 }}>Category:</span>
                    <span className="text-gray-900" style={{ fontFamily: 'Montserrat', fontWeight: 500 }}>
                      {selectedCategory?.name || formData.categoryId === 'uncategorized' ? 'Uncategorized' : 'Not selected'}
                    </span>
                  </div>
                  
                  <div className="flex justify-between py-2 border-b border-blue-100">
                    <span className="font-medium text-gray-700" style={{ fontFamily: 'Montserrat', fontWeight: 600 }}>Price:</span>
                    <span className="text-gray-900 font-semibold" style={{ fontFamily: 'Montserrat', fontWeight: 600 }}>${parseFloat(formData.price || 0).toFixed(2)}</span>
                  </div>
                  
                  <div className="flex justify-between py-2 border-b border-blue-100">
                    <span className="font-medium text-gray-700" style={{ fontFamily: 'Montserrat', fontWeight: 600 }}>Duration:</span>
                    <span className="text-gray-900" style={{ fontFamily: 'Montserrat', fontWeight: 500 }}>{formData.duration} minutes</span>
                  </div>
                  
                  {formData.description && (
                    <div className="pt-2">
                      <span className="font-medium text-gray-700 block mb-1" style={{ fontFamily: 'Montserrat', fontWeight: 600 }}>Description:</span>
                      <p className="text-sm text-gray-600">{formData.description}</p>
                    </div>
                  )}
                  
                  {formData.modifiers.length > 0 && (
                    <div className="flex justify-between py-2">
                      <span className="font-medium text-gray-700" style={{ fontFamily: 'Montserrat', fontWeight: 600 }}>Modifiers:</span>
                      <span className="text-gray-900" style={{ fontFamily: 'Montserrat', fontWeight: 500 }}>{formData.modifiers.length} configured</span>
                    </div>
                  )}
                  
                  {formData.intakeQuestions.length > 0 && (
                    <div className="flex justify-between py-2">
                      <span className="font-medium text-gray-700" style={{ fontFamily: 'Montserrat', fontWeight: 600 }}>Intake Questions:</span>
                      <span className="text-gray-900" style={{ fontFamily: 'Montserrat', fontWeight: 500 }}>{formData.intakeQuestions.length} configured</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex-shrink-0">
          <div className="text-sm text-gray-500" style={{ fontFamily: 'Montserrat', fontWeight: 400 }}>
            Step {currentStep} of 5
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleClose}
              className="px-5 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm"
              style={{ fontFamily: 'Montserrat', fontWeight: 500 }}
              type="button"
            >
              Cancel
            </button>
            
            {currentStep < 5 ? (
              <button
                onClick={handleNext}
                disabled={!formData.categoryId || (currentStep === 2 && !formData.name)}
                className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 font-medium text-sm"
                style={{ fontFamily: 'Montserrat', fontWeight: 500 }}
                type="button"
              >
                <span>Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleCreateService}
                disabled={loading}
                className="px-5 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 font-medium text-sm"
                style={{ fontFamily: 'Montserrat', fontWeight: 500 }}
                type="button"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Creating...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Create Service</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Nested Modals */}
      <CreateModifierGroupModal
        isOpen={isCreateModifierGroupModalOpen}
        onClose={() => {
          setIsCreateModifierGroupModalOpen(false);
          setEditingModifier(null);
        }}
        onSave={handleSaveModifierGroup}
        editingModifier={editingModifier}
      />

      <IntakeQuestionModal
        isOpen={isIntakeModalOpen}
        onClose={handleCloseIntakeModal}
        selectedQuestionType={selectedQuestionType}
        onSave={handleSaveIntakeQuestion}
        editingQuestion={editingIntakeQuestion}
      />
    </div>
  );
};

export default CreateServiceModal;