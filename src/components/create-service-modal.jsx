import React, { useState, useEffect, useCallback } from 'react';
import { X, ChevronRight, ChevronLeft, Plus, Tag } from 'lucide-react';
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
  const [currentStep, setCurrentStep] = useState(1); // 1: Category, 2: Basic Info, 3: Modifiers, 4: Intake Questions, 5: Review
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
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
  
  // Debug formData changes
  useEffect(() => {
    console.log('🔧 CreateServiceModal formData changed:', formData);
  }, [formData]);
  const [selectedModifiers, setSelectedModifiers] = useState({});
  
  // Modal states for modifiers and intake questions
  const [isCreateModifierGroupModalOpen, setIsCreateModifierGroupModalOpen] = useState(false);
  const [editingModifier, setEditingModifier] = useState(null);
  const [isIntakeModalOpen, setIsIntakeModalOpen] = useState(false);
  const [selectedQuestionType, setSelectedQuestionType] = useState(null);
  const [editingIntakeQuestion, setEditingIntakeQuestion] = useState(null);

  const loadCategories = useCallback(async () => {
    try {
      setLoading(true);
      const categoriesData = await servicesAPI.getServiceCategories(user.id);
      setCategories(categoriesData || []);
    } catch (error) {
      console.error('Error loading categories:', error);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id, setCategories]);

  // Load categories when modal opens
  useEffect(() => {
    if (isOpen && user?.id) {
      loadCategories();
    }
  }, [isOpen, user?.id, loadCategories]);

  // Set initial category when modal opens and categories are loaded
  useEffect(() => {
    console.log('🔧 CreateServiceModal useEffect triggered:', { isOpen, initialCategory, categoriesLength: categories.length });
    if (isOpen && initialCategory && categories.length > 0) {
      console.log('🔧 Setting initial category:', initialCategory);
      console.log('🔧 Available categories:', categories);
      
      // Check if the category exists in the loaded categories
      const categoryExists = categories.find(c => c.id === initialCategory.id || c.name === initialCategory.name);
      console.log('🔧 Category exists check:', categoryExists);
      
      if (categoryExists) {
        setFormData(prev => ({
          ...prev,
          categoryId: categoryExists.id
        }));
        console.log('🔧 Set categoryId to:', categoryExists.id, 'type:', typeof categoryExists.id);
      } else {
        console.log('🔧 Category not found in loaded categories, using initialCategory.id:', initialCategory.id, 'type:', typeof initialCategory.id);
        setFormData(prev => ({
          ...prev,
          categoryId: initialCategory.id || initialCategory
        }));
      }
    }
  }, [isOpen, initialCategory, categories]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Don't update global state when creating a service
    // The global category state should remain unchanged during service creation
  };

  const handleModifiersChange = (modifiers) => {
    setSelectedModifiers(modifiers);
  };


  // Modifier handlers
  const handleEditModifier = (modifier) => {
    setEditingModifier(modifier);
    setIsCreateModifierGroupModalOpen(true);
  };

  const handleSaveModifierGroup = async (modifierGroupData) => {
    try {
      let updatedModifiers;
      
      if (editingModifier) {
        // Update existing modifier
        updatedModifiers = formData.modifiers.map(m => 
          m.id === editingModifier.id ? {
            ...m,
            ...modifierGroupData
          } : m
        );
      } else {
        // Create new modifier
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

  // Intake question handlers
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
        // Update existing question
        updatedQuestions = formData.intakeQuestions.map(q => 
          q.id === editingIntakeQuestion.id ? {
            ...q,
            ...questionData
          } : q
        );
      } else {
        // Create new question
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
    if (currentStep < 5) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleCreateService = async () => {
    try {
      setLoading(true);
      
      const serviceData = {
        categoryId: formData.categoryId === 'uncategorized' ? null : formData.categoryId,
        category: formData.categoryId === 'uncategorized' ? 'Uncategorized' : 
                 categories.find(cat => cat.id === formData.categoryId)?.name || 'Uncategorized',
        name: formData.name,
        description: formData.description,
        price: parseFloat(formData.price),
        duration: parseInt(formData.duration),
        workers: parseInt(formData.workers),
        skills: parseInt(formData.skills),
        modifiers: JSON.stringify(formData.modifiers),
        intake_questions: JSON.stringify(formData.intakeQuestions),
        userId: user.id
      };

      const createdService = await servicesAPI.create(serviceData);
      
      // Add the created service to the job
      onServiceCreated(createdService);
      
      // Reset form and close modal
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
      onClose();
      
    } catch (error) {
      console.error('Error creating service:', error);
      alert('Error creating service. Please try again.');
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
    onClose();
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case 1: return 'Select Category';
      case 2: return 'Basic Information';
      case 3: return 'Service Modifiers';
      case 4: return 'Intake Questions';
      case 5: return 'Review & Create';
      default: return 'Create Service';
    }
  };

  const getStepDescription = () => {
    switch (currentStep) {
      case 1: return 'Choose a category for your new service';
      case 2: return 'Enter basic information about your service';
      case 3: return 'Configure service options and modifiers';
      case 4: return 'Set up customer intake questions';
      case 5: return 'Review your service details before creating';
      default: return '';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-4">
            {currentStep > 1 && (
              <button
                onClick={handleBack}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{getStepTitle()}</h2>
              <p className="text-sm text-gray-600 mt-1">{getStepDescription()}</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-500 hover:bg-gray-100 p-2 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            {[1, 2, 3, 4, 5].map((step) => (
              <React.Fragment key={step}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step <= currentStep 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 text-gray-600'
                }`}>
                  {step}
                </div>
                {step < 5 && (
                  <div className={`w-8 h-1 ${
                    step < currentStep ? 'bg-blue-600' : 'bg-gray-200'
                  }`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 flex-1 overflow-y-auto pb-8">
          {/* Step 1: Category Selection */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Service Category <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.categoryId}
                  onChange={(e) => handleInputChange('categoryId', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
              </div>
              
              {loading && (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="text-sm text-gray-600 mt-2">Loading categories...</p>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Basic Information */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Service Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="e.g., Home Cleaning, Plumbing Repair"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Describe what this service includes..."
                rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Price ($) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.price}
                    onChange={(e) => handleInputChange('price', e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Duration (minutes) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.duration}
                    onChange={(e) => handleInputChange('duration', e.target.value)}
                    placeholder="60"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
            </div>

              <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                    Workers Required
              </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.workers}
                    onChange={(e) => handleInputChange('workers', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Skills Required
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.skills}
                    onChange={(e) => handleInputChange('skills', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Service Modifiers */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
            <div>
                  <h3 className="text-lg font-medium text-gray-900">Service Modifiers</h3>
                  <p className="text-sm text-gray-600">Configure options and modifiers for your service</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCreateModifierGroupModalOpen(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>New Modifier Group</span>
                </button>
              </div>

              {formData.modifiers.length > 0 ? (
                <div className="bg-gray-50 rounded-lg p-6">
                  <ServiceModifiersForm 
                    modifiers={formData.modifiers}
                    selectedModifiers={selectedModifiers}
                    onModifiersChange={handleModifiersChange}
                    onEditModifier={handleEditModifier}
                    isEditable={true}
                  />
                </div>
              ) : (
                <div className="text-center py-8">
                  <Tag className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Modifiers Added</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Add modifier groups to give customers options for your service
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsCreateModifierGroupModalOpen(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
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
                  <h3 className="text-lg font-medium text-gray-900">Intake Questions</h3>
                  <p className="text-sm text-gray-600">Set up questions to collect additional information from customers</p>
                </div>
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => handleOpenIntakeModal('short_text')}
                    className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                  >
                    Short Text
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenIntakeModal('multiple_choice')}
                    className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                  >
                    Multiple Choice
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenIntakeModal('dropdown')}
                    className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
                  >
                    Dropdown
                  </button>
                </div>
              </div>

              {formData.intakeQuestions.length > 0 ? (
                <div className="space-y-4">
                  {formData.intakeQuestions.map((question, index) => (
                    <div key={question.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <span className="text-sm font-medium text-gray-700">
                              {question.questionType === 'short_text' && '📝'}
                              {question.questionType === 'multiple_choice' && '☑️'}
                              {question.questionType === 'dropdown' && '📋'}
                              {question.questionType === 'long_text' && '📄'}
                            </span>
                            <span className="text-sm font-medium text-gray-900">
                              {question.question}
                            </span>
                            {question.required && (
                              <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">Required</span>
                            )}
                          </div>
                          {question.description && (
                            <p className="text-sm text-gray-600">{question.description}</p>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            type="button"
                            onClick={() => handleEditIntakeQuestion(question)}
                            className="text-blue-600 hover:text-blue-700 text-sm"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteIntakeQuestion(question.id)}
                            className="text-red-600 hover:text-red-700 text-sm"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Tag className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Questions Added</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Add questions to collect additional information from customers
                  </p>
                  <div className="flex justify-center space-x-2">
                    <button
                      type="button"
                      onClick={() => handleOpenIntakeModal('short_text')}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Add Short Text Question
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenIntakeModal('multiple_choice')}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      Add Multiple Choice
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 5: Review */}
          {currentStep === 5 && (
            <div className="space-y-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Service Summary</h3>
                
                <div className="space-y-3">
                  <div>
                    <span className="font-medium text-gray-700">Name:</span>
                    <span className="ml-2">{formData.name}</span>
                  </div>
                  
                  <div>
                    <span className="font-medium text-gray-700">Category:</span>
                    <span className="ml-2">
                      {(() => {
                        console.log('🔧 Service Summary - formData.categoryId:', formData.categoryId, 'type:', typeof formData.categoryId);
                        console.log('🔧 Service Summary - categories:', categories);
                        console.log('🔧 Service Summary - categories IDs:', categories.map(c => ({ id: c.id, name: c.name, idType: typeof c.id })));
                        
                        // Try different comparison methods
                        const foundCategory = categories.find(c => c.id === formData.categoryId);
                        const foundCategoryLoose = categories.find(c => c.id == formData.categoryId); // eslint-disable-line eqeqeq
                        const foundCategoryString = categories.find(c => String(c.id) === String(formData.categoryId));
                        
                        console.log('🔧 Service Summary - foundCategory (strict):', foundCategory);
                        console.log('🔧 Service Summary - foundCategory (loose):', foundCategoryLoose);
                        console.log('🔧 Service Summary - foundCategory (string):', foundCategoryString);
                        
                        const finalCategory = foundCategory || foundCategoryLoose || foundCategoryString;
                        console.log('🔧 Service Summary - finalCategory:', finalCategory);
                        
                        return finalCategory?.name || 'Not selected';
                      })()}
                    </span>
                  </div>
                  
                  <div>
                    <span className="font-medium text-gray-700">Price:</span>
                    <span className="ml-2">${formData.price}</span>
                  </div>
                  
                  <div>
                    <span className="font-medium text-gray-700">Duration:</span>
                    <span className="ml-2">{formData.duration} minutes</span>
                  </div>
                  
                  <div>
                    <span className="font-medium text-gray-700">Workers:</span>
                    <span className="ml-2">{formData.workers}</span>
                  </div>
                  
                  {formData.description && (
                    <div>
                      <span className="font-medium text-gray-700">Description:</span>
                      <p className="ml-2 text-sm text-gray-600">{formData.description}</p>
                    </div>
                  )}
                  
                  {formData.modifiers.length > 0 && (
                    <div>
                      <span className="font-medium text-gray-700">Modifiers:</span>
                      <span className="ml-2">{formData.modifiers.length} configured</span>
                    </div>
                  )}
                  
                  {formData.intakeQuestions.length > 0 && (
                    <div>
                      <span className="font-medium text-gray-700">Intake Questions:</span>
                      <span className="ml-2">{formData.intakeQuestions.length} configured</span>
                  </div>
                )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50 flex-shrink-0">
          <div className="text-sm text-gray-600">
            Step {currentStep} of 5
            </div>

          <div className="flex space-x-3">
                <button
              onClick={handleClose}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
            
            {currentStep < 5 ? (
              <button
                onClick={handleNext}
                disabled={!formData.categoryId || (currentStep === 2 && !formData.name)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
              >
                <span>Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
                <button
                onClick={handleCreateService}
                disabled={loading}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Creating...</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                  <span>Create Service</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
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