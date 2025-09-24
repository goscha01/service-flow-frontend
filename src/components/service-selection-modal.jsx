import React, { useState, useEffect } from 'react';
import { X, ChevronRight, ChevronLeft, Clock, DollarSign, Users, Tag } from 'lucide-react';
import { servicesAPI } from '../services/api';
import ServiceModifiersForm from './service-modifiers-form';
import IntakeQuestionsForm from './intake-questions-form';
import { useCategory } from '../context/CategoryContext';
import useServiceSettings from './use-service-settings';

const ServiceSelectionModal = ({ 
  isOpen, 
  onClose, 
  onServiceSelect, 
  selectedServices = [],
  user 
}) => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentView, setCurrentView] = useState('categories'); // 'categories', 'services', 'customize'
  const [selectedCategory, setSelectedCategory] = useState(null);
  
  // Use global category state
  const { 
    selectedCategoryId, 
    selectedCategoryName, 
    categories, 
    setCategories, 
    selectCategory 
  } = useCategory();
  
  // Check if categories are enabled in service settings
  const { 
    settings: { categoriesEnabled } 
  } = useServiceSettings({ categoriesEnabled: false });
  const [selectedService, setSelectedService] = useState(null);
  const [selectedModifiers, setSelectedModifiers] = useState({});
  const [intakeQuestionAnswers, setIntakeQuestionAnswers] = useState({});
  const [editedServicePrice, setEditedServicePrice] = useState(null);
  const [editedModifierPrices, setEditedModifierPrices] = useState({});

  // Function to calculate dynamic price based on service and modifiers
  const calculateDynamicPrice = (service, modifiers = {}) => {
    // Use edited service price if available, otherwise use original
    let totalPrice = editedServicePrice !== null ? parseFloat(editedServicePrice) : parseFloat(service.price) || 0;
    console.log('🔧 CALC START: Base price =', totalPrice, '(edited:', editedServicePrice, ', original:', service.price, ')');
    
    // Add modifier prices
    if (service.parsedModifiers && Array.isArray(service.parsedModifiers)) {
      service.parsedModifiers.forEach(modifier => {
        const modifierSelection = modifiers[modifier.id];
        if (!modifierSelection) return;
        
        if (modifier.selectionType === 'quantity' && modifierSelection.quantities) {
          // Handle quantity-based modifiers
          Object.entries(modifierSelection.quantities).forEach(([optionId, quantity]) => {
            const option = modifier.options?.find(opt => opt.id == optionId);
            if (option && quantity > 0) {
              // Use edited option price if available
              const optionPriceKey = `${modifier.id}_option_${optionId}`;
              const optionPrice = editedModifierPrices[optionPriceKey] !== undefined
                ? parseFloat(editedModifierPrices[optionPriceKey])
                : parseFloat(option.price) || 0;
              totalPrice += optionPrice * quantity;
            }
          });
        } else if (modifier.selectionType === 'multi' && modifierSelection.selections) {
          // Handle multi-select modifiers
          modifierSelection.selections.forEach(optionId => {
            const option = modifier.options?.find(opt => opt.id == optionId);
            if (option) {
              // Use edited option price if available
              const optionPriceKey = `${modifier.id}_option_${optionId}`;
              const optionPrice = editedModifierPrices[optionPriceKey] !== undefined
                ? parseFloat(editedModifierPrices[optionPriceKey])
                : parseFloat(option.price) || 0;
              totalPrice += optionPrice;
            }
          });
        } else if (modifier.selectionType === 'single' && modifierSelection.selection) {
          // Handle single-select modifiers
          const option = modifier.options?.find(opt => opt.id == modifierSelection.selection);
          if (option) {
            // Use edited option price if available
            const optionPriceKey = `${modifier.id}_option_${modifierSelection.selection}`;
            const optionPrice = editedModifierPrices[optionPriceKey] !== undefined
              ? parseFloat(editedModifierPrices[optionPriceKey])
              : parseFloat(option.price) || 0;
            totalPrice += optionPrice;
          }
        }
      });
    }
    
    return totalPrice;
  };

  // Load categories and services
  useEffect(() => {
    if (isOpen && user?.id) {
      console.log('🔄 Loading data for user:', user.id);
      console.log('🔄 Categories enabled:', categoriesEnabled);
      
      if (categoriesEnabled) {
        loadCategories();
        loadServices();
      } else {
        // When categories are disabled, skip categories and load all services directly
        loadServices();
        setCurrentView('services'); // Skip categories view
      }
    } else if (isOpen) {
      console.warn('⚠️ Modal opened but no user ID available:', user);
    }
  }, [isOpen, user?.id, categoriesEnabled]);

  // Auto-select globally selected category when modal opens (only when categories are enabled)
  useEffect(() => {
    if (isOpen && categoriesEnabled && selectedCategoryId && categories.length > 0) {
      const globalCategory = categories.find(cat => cat.id === selectedCategoryId);
      if (globalCategory) {
        setSelectedCategory(globalCategory);
        setCurrentView('services');
        loadServices(globalCategory.id);
      }
    }
  }, [isOpen, categoriesEnabled, selectedCategoryId, categories]);

  // Debug services data
  useEffect(() => {
    console.log('🔧 Services state updated:', services);
    console.log('🔧 Services length:', services.length);
    if (services.length > 0) {
      console.log('🔧 First service sample:', services[0]);
    }
  }, [services]);

  // Debug categories data
  useEffect(() => {
    console.log('📋 Categories state updated:', categories);
    console.log('📋 Categories length:', categories.length);
    if (categories.length > 0) {
      console.log('📋 First category sample:', categories[0]);
    }
  }, [categories]);

  const loadCategories = async () => {
    if (!user?.id) {
      console.error('❌ Cannot load categories: No user ID available');
      setCategories([]);
      return;
    }

    try {
      setLoading(true);
      console.log('🔄 Loading categories for user:', user.id);
      const categoriesData = await servicesAPI.getServiceCategories(user.id);
      console.log('📋 Categories loaded:', categoriesData);
      setCategories(categoriesData || []);
    } catch (error) {
      console.error('❌ Error loading categories:', error);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  const loadServices = async () => {
    if (!user?.id) {
      console.error('❌ Cannot load services: No user ID available');
      setServices([]);
      return;
    }

    try {
      setLoading(true);
      console.log('🔄 Loading services for user:', user.id);
      const response = await servicesAPI.getAll(user.id);
      console.log('🔧 Full API response:', response);
      console.log('🔧 Response type:', typeof response);
      console.log('🔧 Response keys:', Object.keys(response));
      console.log('🔧 Response services:', response.services);
      console.log('🔧 Response pagination:', response.pagination);
      
      // servicesAPI.getAll returns response.data directly, which is {services: [...], pagination: {...}}
      let servicesArray = [];
      if (response.services && Array.isArray(response.services)) {
        servicesArray = response.services;
        console.log('✅ Found services array with', servicesArray.length, 'services');
      } else if (Array.isArray(response)) {
        servicesArray = response;
        console.log('✅ Response is direct array with', servicesArray.length, 'services');
      } else {
        console.warn('⚠️ Unexpected response structure:', response);
        servicesArray = [];
      }
      
      console.log('🔧 Final services array:', servicesArray);
      setServices(servicesArray);
    } catch (error) {
      console.error('❌ Error loading services:', error);
      setServices([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCategorySelect = (category) => {
    setSelectedCategory(category);
    // Update global category state
    selectCategory(category.id, category.name);
    setCurrentView('services');
  };

  const handleServiceSelect = (service) => {
    setSelectedService(service);
    
    // Reset price editing when selecting a new service
    setEditedServicePrice(null);
    setEditedModifierPrices({});
    
    // Check if service has modifiers or intake questions
    const hasModifiers = service.modifiers && (
      (typeof service.modifiers === 'string' && service.modifiers !== '[]' && service.modifiers !== 'null') ||
      (Array.isArray(service.modifiers) && service.modifiers.length > 0)
    );
    
    const hasIntakeQuestions = service.intake_questions || service.intakeQuestions;
    
    if (hasModifiers || hasIntakeQuestions) {
      // Show customization view
      setCurrentView('customize');
      // Parse modifiers and intake questions
      parseServiceCustomization(service);
    } else {
      // Add service instantly with empty customization
      const serviceWithCustomization = {
        ...service,
        selectedModifiers: {},
        intakeQuestionAnswers: {}
      };
      onServiceSelect(serviceWithCustomization);
      handleClose();
    }
  };

  const parseServiceCustomization = (service) => {
    // Parse modifiers
    let serviceModifiers = [];
    if (service.modifiers) {
      try {
        if (typeof service.modifiers === 'string') {
          serviceModifiers = JSON.parse(service.modifiers);
        } else if (Array.isArray(service.modifiers)) {
          serviceModifiers = service.modifiers;
        }
      } catch (error) {
        console.error('Error parsing modifiers:', error);
      }
    }

    // Parse intake questions
    let serviceIntakeQuestions = [];
    const intakeQuestionsData = service.intake_questions || service.intakeQuestions;
    if (intakeQuestionsData) {
      try {
        if (typeof intakeQuestionsData === 'string') {
          serviceIntakeQuestions = JSON.parse(intakeQuestionsData);
        } else if (Array.isArray(intakeQuestionsData)) {
          serviceIntakeQuestions = intakeQuestionsData;
        }
      } catch (error) {
        console.error('Error parsing intake questions:', error);
      }
    }

    // Set the parsed data for customization
    setSelectedService({
      ...service,
      parsedModifiers: serviceModifiers,
      parsedIntakeQuestions: serviceIntakeQuestions
    });

    // Reset modifiers and answers for this service (start fresh each time)
    setSelectedModifiers({});
    setIntakeQuestionAnswers({});
  };


  const validateCustomization = () => {
    if (!selectedService) return false;

    // Check required modifiers
    if (selectedService.parsedModifiers) {
      for (const modifier of selectedService.parsedModifiers) {
        if (modifier.required) {
          const modifierSelection = selectedModifiers[modifier.id];
          if (!modifierSelection) return false;
          
          if (modifier.selectionType === 'quantity') {
            const quantities = modifierSelection.quantities || {};
            const hasSelection = Object.values(quantities).some(qty => qty > 0);
            if (!hasSelection) return false;
          } else if (modifier.selectionType === 'multi') {
            const selections = modifierSelection.selections || [];
            if (selections.length === 0) return false;
          } else {
            if (!modifierSelection.selection) return false;
          }
        }
      }
    }

    // Check required intake questions
    if (selectedService.parsedIntakeQuestions) {
      for (const question of selectedService.parsedIntakeQuestions) {
        if (question.required) {
          const answer = intakeQuestionAnswers[question.id];
          if (!answer || (typeof answer === 'string' && answer.trim() === '')) {
            return false;
          }
        }
      }
    }

    return true;
  };

  const handleAddService = async () => {
    // Validate required fields
    if (!validateCustomization()) {
      alert('Please fill in all required fields before continuing.');
      return;
    }

    console.log('🔧 Adding service with customization data:');
    console.log('🔧 Selected modifiers:', selectedModifiers);
    console.log('🔧 Intake question answers:', intakeQuestionAnswers);
    console.log('🔧 Selected service:', selectedService);

    // Calculate the final dynamic price
    const dynamicPrice = calculateDynamicPrice(selectedService, selectedModifiers);
    console.log('🔧 SERVICE MODAL: Base price:', selectedService.price);
    console.log('🔧 SERVICE MODAL: Dynamic price calculated:', dynamicPrice);
    console.log('🔧 SERVICE MODAL: Selected modifiers:', selectedModifiers);
    
    // Create service with proper customization data
    const serviceWithCustomization = {
      ...selectedService,
      selectedModifiers: selectedModifiers,
      intakeQuestionAnswers: intakeQuestionAnswers,
      // Update price with dynamic calculation
      price: dynamicPrice,
      originalPrice: selectedService.price, // Keep original for reference
      // Include edited prices
      editedServicePrice: editedServicePrice,
      editedModifierPrices: editedModifierPrices,
      // Ensure modifiers and intake questions are available in the job form
      serviceModifiers: selectedService.parsedModifiers || [],
      serviceIntakeQuestions: selectedService.parsedIntakeQuestions || []
    };
    
    console.log('🔧 SERVICE MODAL: Final service price being passed:', serviceWithCustomization.price);

    console.log('🔧 Final service data being passed:', serviceWithCustomization);

    // Save customizations back to the service if any were made
    const hasCustomizations = Object.keys(selectedModifiers).length > 0 || 
                             Object.keys(intakeQuestionAnswers).length > 0 ||
                             editedServicePrice !== null ||
                             Object.keys(editedModifierPrices).length > 0;
    
    if (hasCustomizations) {
      try {
        // Update the original service with the customizations
        const updatedServiceData = {
          ...selectedService,
          // Save modifier selections as default selections
          defaultModifierSelections: selectedModifiers,
          // Save intake question answers as default answers  
          defaultIntakeAnswers: intakeQuestionAnswers,
          // Update price if edited
          price: editedServicePrice !== null ? parseFloat(editedServicePrice) : selectedService.price,
          // Update modifier prices if edited
          modifiers: selectedService.parsedModifiers?.map(modifier => ({
            ...modifier,
            options: modifier.options?.map(option => ({
              ...option,
              price: editedModifierPrices[`${modifier.id}_option_${option.id}`] !== undefined
                ? parseFloat(editedModifierPrices[`${modifier.id}_option_${option.id}`])
                : option.price
            }))
          }))
        };

        console.log('🔄 Updating service with customizations:', updatedServiceData);
        
        // Save to backend
        await servicesAPI.update(selectedService.id, {
          name: updatedServiceData.name,
          description: updatedServiceData.description,
          price: updatedServiceData.price,
          duration: updatedServiceData.duration,
          category: updatedServiceData.category,
          category_id: updatedServiceData.category_id,
          image: updatedServiceData.image,
          modifiers: JSON.stringify(updatedServiceData.modifiers || []),
          intake_questions: JSON.stringify(selectedService.parsedIntakeQuestions || []),
          // Store default selections for future use
          default_modifier_selections: JSON.stringify(selectedModifiers),
          default_intake_answers: JSON.stringify(intakeQuestionAnswers)
        });
        
        console.log('✅ Service updated successfully with customizations');
      } catch (error) {
        console.error('❌ Failed to update service with customizations:', error);
        console.error('❌ Error details:', error.message);
        console.error('❌ Service ID:', selectedService.id);
        console.error('❌ Selected modifiers:', selectedModifiers);
        console.error('❌ Intake answers:', intakeQuestionAnswers);
        console.error('❌ Edited service price:', editedServicePrice);
        console.error('❌ Edited modifier prices:', editedModifierPrices);
        // Don't block the flow if saving fails
        alert('Warning: Failed to save customizations to service. Your selections will only apply to this job.');
      }
    }

    // Add service with customization data
    onServiceSelect(serviceWithCustomization);
    handleClose();
  };

  const handleClose = () => {
    setCurrentView('categories');
    setSelectedCategory(null);
    setSelectedService(null);
    // Reset modifiers and answers for clean state on next open
    setSelectedModifiers({});
    setIntakeQuestionAnswers({});
    setEditedServicePrice(null);
    setEditedModifierPrices({});
    setSearchTerm('');
    onClose();
  };

  const handleBack = () => {
    if (currentView === 'services') {
      setCurrentView('categories');
      setSelectedCategory(null);
    } else if (currentView === 'customize') {
      setCurrentView('services');
      setSelectedService(null);
      // Don't reset modifiers and answers when going back - preserve them
    }
  };

  const getFilteredServices = () => {
    // When categories are disabled, show all services
    if (!categoriesEnabled) {
      console.log('🔍 Categories disabled - showing all services:', services);
      let filtered = services;
      
      // Apply search filter
      if (searchTerm) {
        filtered = filtered.filter(service => 
          service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (service.description && service.description.toLowerCase().includes(searchTerm.toLowerCase()))
        );
      }
      
      return filtered;
    }
    
    // When categories are enabled, filter by selected category
    if (!selectedCategory) return [];
    
    console.log('🔍 Filtering services for category:', selectedCategory);
    console.log('🔍 All services:', services);
    
    let filtered;
    
    // Handle "All Services" category
    if (selectedCategory.id === 'all') {
      filtered = services;
    } else {
      filtered = services.filter(service => {
        const matchesId = service.category_id === selectedCategory.id;
        const matchesName = service.category === selectedCategory.name;
        console.log(`🔍 Service "${service.name}": category_id=${service.category_id}, category=${service.category}, matchesId=${matchesId}, matchesName=${matchesName}`);
        return matchesId || matchesName;
      });
    }

    console.log('🔍 Filtered services:', filtered);

    if (searchTerm) {
      filtered = filtered.filter(service =>
        service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        service.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return filtered;
  };

  // Helper function to count services per category
  const getServiceCountForCategory = (category) => {
    if (category.id === 'all') {
      return services.length;
    }
    
    const count = services.filter(service => {
      const matchesId = service.category_id === category.id;
      const matchesName = service.category === category.name;
      return matchesId || matchesName;
    }).length;
    
    console.log(`📊 Service count for category "${category.name}":`, count);
    return count;
  };

  const getFilteredCategories = () => {
    if (!searchTerm) return categories;
    
    return categories.filter(category =>
      category.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const isServiceSelected = (service) => {
    return selectedServices.some(selected => selected.id === service.id);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-4">
            {currentView !== 'categories' && categoriesEnabled && (
              <button
                onClick={handleBack}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {currentView === 'categories' && 'Select Service Category'}
                {currentView === 'services' && (categoriesEnabled ? `Services in ${selectedCategory?.name}` : 'All Services')}
                {currentView === 'customize' && `Customize ${selectedService?.name}`}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {currentView === 'categories' && 'Choose a category to see available services'}
                {currentView === 'services' && (categoriesEnabled ? 'Select a service to add to your job' : 'Select a service to add to your job')}
                {currentView === 'customize' && 'Configure options and provide additional information'}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-500 hover:bg-gray-100 p-2 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="p-6 border-b border-gray-200">
          <div className="relative">
            <input
              type="text"
              placeholder={
                currentView === 'categories' 
                  ? 'Search categories...' 
                  : 'Search services...'
              }
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <>
              {/* Categories View - Only show when categories are enabled */}
              {currentView === 'categories' && categoriesEnabled && (
                <div>
                  {categories.length === 0 && services.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="text-gray-400 mb-2">
                        <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 mb-1">No Services Available</h3>
                      <p className="text-sm text-gray-600">
                        You haven't created any services yet. Create your first service to get started.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {/* All Services Category */}
                      <button
                        onClick={() => handleCategorySelect({ id: 'all', name: 'All Services' })}
                        className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors text-left"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-medium text-gray-900">All Services</h3>
                            <p className="text-sm text-gray-600 mt-1">
                              {getServiceCountForCategory({ id: 'all' })} services
                            </p>
                          </div>
                          <ChevronRight className="w-5 h-5 text-gray-400" />
                        </div>
                      </button>
                      
                      {/* Regular Categories */}
                      {getFilteredCategories().map((category) => (
                        <button
                          key={category.id}
                          onClick={() => handleCategorySelect(category)}
                          className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors text-left"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="font-medium text-gray-900">{category.name}</h3>
                              <p className="text-sm text-gray-600 mt-1">
                                {getServiceCountForCategory(category)} services
                              </p>
                            </div>
                            <ChevronRight className="w-5 h-5 text-gray-400" />
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Services View - Show all services when categories are disabled, or filtered services when categories are enabled */}
              {currentView === 'services' && (
                <div className="space-y-4">
                  {getFilteredServices().length === 0 ? (
                    <div className="text-center py-8">
                      <div className="text-gray-400 mb-2">
                        <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 mb-1">No Services Found</h3>
                      <p className="text-sm text-gray-600">
                        {searchTerm ? 'No services match your search criteria.' : 'You haven\'t created any services yet.'}
                      </p>
                    </div>
                  ) : (
                    getFilteredServices().map((service) => (
                    <button
                      key={service.id}
                      onClick={() => handleServiceSelect(service)}
                      disabled={isServiceSelected(service)}
                      className={`w-full p-4 border rounded-lg text-left transition-colors ${
                        isServiceSelected(service)
                          ? 'border-green-300 bg-green-50 cursor-not-allowed'
                          : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <h3 className="font-medium text-gray-900">{service.name}</h3>
                            {isServiceSelected(service) && (
                              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                                Selected
                              </span>
                            )}
                          </div>
                          {service.description && (
                            <p className="text-sm text-gray-600 mt-1">{service.description}</p>
                          )}
                          <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                            {service.duration && (
                              <div className="flex items-center space-x-1">
                                <Clock className="w-4 h-4" />
                                <span>{Math.floor(service.duration / 60)}h {service.duration % 60}m</span>
                              </div>
                            )}
                            {service.price && (
                              <div className="flex items-center space-x-1">
                                <DollarSign className="w-4 h-4" />
                                <span>${calculateDynamicPrice(service).toFixed(2)}</span>
                                {calculateDynamicPrice(service) !== parseFloat(service.price) && (
                                  <span className="text-xs text-gray-400 line-through">${service.price}</span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-400" />
                      </div>
                    </button>
                    ))
                  )}
                </div>
              )}

              {/* Customize View */}
              {currentView === 'customize' && selectedService && (
                <div className="space-y-6">
                  {/* Service Info */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-medium text-gray-900">{selectedService.name}</h3>
                    {selectedService.description && (
                      <p className="text-sm text-gray-600 mt-1">{selectedService.description}</p>
                    )}
                    <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                      {selectedService.duration && (
                        <div className="flex items-center space-x-1">
                          <Clock className="w-4 h-4" />
                          <span>{Math.floor(selectedService.duration / 60)}h {selectedService.duration % 60}m</span>
                        </div>
                      )}
                      {selectedService.price && (
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <DollarSign className="w-4 h-4" />
                            <label className="text-sm font-medium text-gray-700">Base Price:</label>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={editedServicePrice !== null ? editedServicePrice : selectedService.price}
                              onChange={(e) => setEditedServicePrice(e.target.value)}
                              className="w-20 px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>
                          <div className="flex items-center space-x-1">
                            <span className="text-xs text-gray-500">Total with options:</span>
                            <span className="font-semibold text-blue-600">${calculateDynamicPrice(selectedService, selectedModifiers).toFixed(2)}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Modifiers */}
                  {selectedService.parsedModifiers && selectedService.parsedModifiers.length > 0 && (
                    <div>
                      <h4 className="text-lg font-medium text-gray-900 mb-4">Service Options</h4>
                      <ServiceModifiersForm
                        modifiers={selectedService.parsedModifiers}
                        selectedModifiers={selectedModifiers}
                        onModifiersChange={setSelectedModifiers}
                        editedModifierPrices={editedModifierPrices}
                        onModifierPriceChange={(priceKey, value) => {
                          console.log('🔧 MODIFIER PRICE CHANGE:', priceKey, '=', value);
                          setEditedModifierPrices(prev => {
                            const updated = {
                              ...prev,
                              [priceKey]: value
                            };
                            console.log('🔧 UPDATED MODIFIER PRICES:', updated);
                            return updated;
                          });
                        }}
                      />
                    </div>
                  )}

                  {/* Intake Questions */}
                  {selectedService.parsedIntakeQuestions && selectedService.parsedIntakeQuestions.length > 0 && (
                    <div>
                      <h4 className="text-lg font-medium text-gray-900 mb-4">Additional Information</h4>
                      <IntakeQuestionsForm
                        questions={selectedService.parsedIntakeQuestions}
                        initialAnswers={intakeQuestionAnswers}
                        onAnswersChange={setIntakeQuestionAnswers}
                      />
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Price Summary */}
        {currentView === 'customize' && selectedService && (
          <div className="px-6 py-4 border-t border-gray-200 bg-blue-50">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                <div>Base Price: ${editedServicePrice !== null ? parseFloat(editedServicePrice).toFixed(2) : selectedService.price}</div>
                {calculateDynamicPrice(selectedService, selectedModifiers) !== (editedServicePrice !== null ? parseFloat(editedServicePrice) : parseFloat(selectedService.price)) && (
                  <div>Options: +${(calculateDynamicPrice(selectedService, selectedModifiers) - (editedServicePrice !== null ? parseFloat(editedServicePrice) : parseFloat(selectedService.price))).toFixed(2)}</div>
                )}
              </div>
              <div className="text-lg font-semibold text-blue-600">
                Total: ${calculateDynamicPrice(selectedService, selectedModifiers).toFixed(2)}
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        {currentView === 'customize' && (
          <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50 flex-shrink-0">
            <button
              type="button"
              onClick={handleBack}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleAddService}
              disabled={!validateCustomization()}
              className={`px-6 py-2 text-sm font-medium border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors ${
                validateCustomization()
                  ? 'text-white bg-blue-600 hover:bg-blue-700'
                  : 'text-gray-400 bg-gray-200 cursor-not-allowed'
              }`}
            >
              Continue & Add Service
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ServiceSelectionModal;
