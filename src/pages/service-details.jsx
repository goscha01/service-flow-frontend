"use client"

import { useState, useEffect } from "react"
import { useNavigate, useParams } from "react-router-dom"
import Sidebar from "../components/sidebar"
import MobileHeader from "../components/mobile-header"
import CreateRecurringOptionModal from "../components/create-recurring-option-modal"
import TerritoryAdjustmentModal from "../components/territory-adjustment-modal"

import CreateModifierGroupModal from "../components/create-modifier-group-modal"
import IntakeQuestionModal from "../components/intake-question-modal"
import IntakeQuestionsForm from "../components/intake-questions-form"
import ServiceModifiersForm from "../components/service-modifiers-form"
import { servicesAPI, serviceAvailabilityAPI } from "../services/api"
import { useAuth } from "../context/AuthContext"
import { 
  ChevronLeft,
  ChevronRight,
  Settings,
  Sliders,
  ListChecks,
  Clock,
  ClipboardList,
  RefreshCw,
  ArrowUpDown,
  CreditCard,
  FileText,
  Globe,
  ExternalLink,
  ChevronDown,
  Camera,
  Info,
  HelpCircle,
  MapPin,
  Loader2,
  AlertCircle,
  Copy,
  CheckCircle
} from "lucide-react"

const ServiceDetails = () => {
  const navigate = useNavigate()
  const { serviceId } = useParams()
  const { user } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [expandedSection, setExpandedSection] = useState(null)
  const [editingModifier, setEditingModifier] = useState(null)
  const [isCreateModifierGroupModalOpen, setIsCreateModifierGroupModalOpen] = useState(false)
  const [isIntakeDropdownOpen, setIsIntakeDropdownOpen] = useState(false)
  const [isIntakeModalOpen, setIsIntakeModalOpen] = useState(false)
  const [selectedQuestionType, setSelectedQuestionType] = useState(null)
  const [editingIntakeQuestion, setEditingIntakeQuestion] = useState(null)
  const [isSkillTagModalOpen, setIsSkillTagModalOpen] = useState(false)
  const [isRecurringModalOpen, setIsRecurringModalOpen] = useState(false)
  const [isTerritoryModalOpen, setIsTerritoryModalOpen] = useState(false)
  const [recurringOptions, setRecurringOptions] = useState([])
  const [territoryRules, setTerritoryRules] = useState([])
  const [copiedModifier, setCopiedModifier] = useState(null)
  
  // Availability State
  const [availabilityData, setAvailabilityData] = useState({
    availabilityType: 'default',
    businessHoursOverride: null,
    timeslotTemplateId: null,
    minimumBookingNotice: 0,
    maximumBookingAdvance: 525600,
    bookingInterval: 30,
    schedulingRules: [],
    timeslotTemplates: []
  })
  const [availabilityLoading, setAvailabilityLoading] = useState(false)
  const [availabilitySaving, setAvailabilitySaving] = useState(false)
  const [imageUploading, setImageUploading] = useState(false)
  
  // API State
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [successMessage, setSuccessMessage] = useState("")
  
  // Save state for modifiers and intake questions
  const [savingModifiers, setSavingModifiers] = useState(false)
  const [savingIntakeQuestions, setSavingIntakeQuestions] = useState(false)
  const [modifiersChanged, setModifiersChanged] = useState(false)
  const [intakeQuestionsChanged, setIntakeQuestionsChanged] = useState(false)
  
  // Interactive preview state
  const [previewAnswers, setPreviewAnswers] = useState({})
  const [previewQuantities, setPreviewQuantities] = useState({})
  
  // Default selections from service customizations
  const [defaultModifierSelections, setDefaultModifierSelections] = useState({})
  const [defaultIntakeAnswers, setDefaultIntakeAnswers] = useState({})
  
  // Editable modifier prices state
  const [editedModifierPrices, setEditedModifierPrices] = useState({})
  
  // Hidden sections state - not needed when sections are commented out
  // const [hiddenSections, setHiddenSections] = useState([])
  
  const [serviceData, setServiceData] = useState({
    name: "",
    description: "",
    price: 0,
    duration: 0,
    category: "",
    category_id: null,
    isFree: false,
    bookingType: "bookable",
    displayPrefix: "Estimated Total",
    isTaxable: false,
    hidePrice: false,
    modifiers: [],
    intakeQuestions: [],
    require_payment_method: false,
    image: null
  })

  // Add categories state
  const [categories, setCategories] = useState([])
  const [categoriesLoading, setCategoriesLoading] = useState(false)
  
  // Load service data on component mount
  useEffect(() => {
    console.log('ServiceDetails useEffect - serviceId:', serviceId, 'user:', user?.id)
    console.log('Current URL:', window.location.href)
    
    if (!user?.id) {
      console.log('No user found, redirecting to signin')
      navigate('/signin')
      return
    }
    
    if (!serviceId) {
      console.log('No service ID found, redirecting to services')
      navigate('/services')
      return
    }
    
    console.log('Starting to load service data...')
    loadServiceData()
  }, [serviceId, user?.id])

  // Warn user about unsaved changes when navigating away
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (modifiersChanged || intakeQuestionsChanged) {
        e.preventDefault()
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?'
        return 'You have unsaved changes. Are you sure you want to leave?'
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [modifiersChanged, intakeQuestionsChanged])

  // Debug serviceData changes
  useEffect(() => {
    console.log('🔄 serviceData changed:', {
      name: serviceData.name,
      modifiers: serviceData.modifiers,
      modifiersType: typeof serviceData.modifiers,
      modifiersIsArray: Array.isArray(serviceData.modifiers),
      modifiersLength: Array.isArray(serviceData.modifiers) ? serviceData.modifiers.length : 'not an array'
    })
  }, [serviceData])

  const loadServiceData = async () => {
    try {
      console.log('Loading service data for ID:', serviceId)
      setLoading(true)
      setError("")
      
      if (!serviceId) {
        console.error('No service ID provided')
        setError("No service ID provided")
        setLoading(false)
        return
      }
      
      // First check if backend is running
      try {
        const healthResponse = await fetch('https://service-flow-backend-production.up.railway.app/api/health')
        if (!healthResponse.ok) {
          throw new Error('Backend not responding')
        }
        console.log('Backend is running')
      } catch (healthError) {
        console.error('Backend health check failed:', healthError)
        setError("Backend server is not running. Please start the server and try again.")
        setLoading(false)
        return
      }
      
      // Add timeout to prevent infinite loading
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), 10000)
      )
      
      const servicePromise = servicesAPI.getById(serviceId)
      const service = await Promise.race([servicePromise, timeoutPromise])
      
      console.log('Service data received:', service)
      console.log('Service data type:', typeof service)
      console.log('Service data keys:', service ? Object.keys(service) : 'No service data')
      console.log('Service ID:', service?.id)
      console.log('Service name:', service?.name)
      console.log('Service category:', service?.category)
      console.log('Service modifiers from backend:', service.modifiers)
      console.log('Service modifiers type:', typeof service.modifiers)
      console.log('Service modifiers is null?', service.modifiers === null)
      console.log('Service modifiers is undefined?', service.modifiers === undefined)
      console.log('Service modifiers raw value:', JSON.stringify(service.modifiers))
      console.log('Service modifiers length:', service.modifiers ? service.modifiers.length : 'null/undefined')
      
      // Test the parsing logic step by step
      if (service.modifiers) {
        console.log('🔍 Testing modifiers parsing step by step:');
        console.log('🔍 Step 1 - Raw modifiers:', service.modifiers);
        console.log('🔍 Step 1 - Type:', typeof service.modifiers);
        
        try {
          // Step 2 - First parse attempt
          let firstParse;
          try {
            firstParse = JSON.parse(service.modifiers);
            console.log('🔍 Step 2 - First parse successful:', firstParse);
            console.log('🔍 Step 2 - First parse type:', typeof firstParse);
            console.log('🔍 Step 2 - Is array?', Array.isArray(firstParse));
          } catch (firstError) {
            console.log('🔍 Step 2 - First parse failed:', firstError.message);
            
            // Step 3 - Second parse attempt (double-escaped)
            try {
              firstParse = JSON.parse(JSON.parse(service.modifiers));
              console.log('🔍 Step 3 - Double parse successful:', firstParse);
              console.log('🔍 Step 3 - Double parse type:', typeof firstParse);
              console.log('🔍 Step 3 - Is array?', Array.isArray(firstParse));
            } catch (secondError) {
              console.log('🔍 Step 3 - Double parse failed:', secondError.message);
              throw secondError;
            }
          }
          
          console.log('🔍 Final parsed modifiers:', firstParse);
          console.log('🔍 Final modifiers is array?', Array.isArray(firstParse));
          console.log('🔍 Final modifiers length:', Array.isArray(firstParse) ? firstParse.length : 'not an array');
          
        } catch (error) {
          console.error('🔍 Error in step-by-step parsing:', error);
        }
      } else {
        console.log('No modifiers data from backend')
      }
      
      if (!service) {
        console.error('No service found')
        setError("Service not found")
        setLoading(false)
        return
      }
      
      // Convert backend data to frontend format
      const hours = Math.floor(service.duration / 60)
      const minutes = service.duration % 60
      
      const newServiceData = {
        id: service.id,
        name: service.name,
        description: service.description || "",
        price: service.price || 0,
        duration: service.duration || 0,
        category: service.category || "",
        category_id: service.category_id || null,
        image: service.image || null,
        isFree: service.price === 0,
        bookingType: "bookable",
        displayPrefix: "Estimated Total",
        isTaxable: false,
        hidePrice: false,
        modifiers: (() => {
          console.log('🔍 Starting modifiers parsing function...');
          console.log('🔍 Input service.modifiers:', service.modifiers);
          console.log('🔍 Input type:', typeof service.modifiers);
          
          try {
            if (!service.modifiers) {
              console.log('🔍 No modifiers, returning empty array');
              return [];
            }
            if (typeof service.modifiers === 'string') {
              console.log('🔍 Modifiers is string, attempting to parse...');
              
              // Try to parse as regular JSON first
              try {
                const firstParse = JSON.parse(service.modifiers);
                console.log('🔍 First parse result:', firstParse);
                console.log('🔍 First parse type:', typeof firstParse);
                console.log('🔍 First parse is array?', Array.isArray(firstParse));
                
                // If first parse is still a string, it's double-encoded
                if (typeof firstParse === 'string') {
                  console.log('🔍 First parse is still string, attempting second parse...');
                  const secondParse = JSON.parse(firstParse);
                  console.log('🔍 Second parse result:', secondParse);
                  console.log('🔍 Second parse type:', typeof secondParse);
                  console.log('🔍 Second parse is array?', Array.isArray(secondParse));
                  
                  const result = Array.isArray(secondParse) ? secondParse : [];
                  console.log('🔍 Returning result from double parse:', result);
                  return result;
                } else {
                  // First parse was successful and returned an object/array
                  const result = Array.isArray(firstParse) ? firstParse : [];
                  console.log('🔍 Returning result from single parse:', result);
                  return result;
                }
              } catch (firstError) {
                console.log('🔍 First parse failed:', firstError.message);
                return [];
              }
            }
            console.log('🔍 Modifiers is not string, checking if array...');
            const result = Array.isArray(service.modifiers) ? service.modifiers : [];
            console.log('🔍 Returning result:', result);
            return result;
          } catch (error) {
            console.error('🔍 Error in modifiers parsing function:', error);
            console.log('🔍 Returning empty array due to error');
            return [];
          }
        })(),
        intakeQuestions: (() => {
          try {
            if (!service.intake_questions) return [];
            if (typeof service.intake_questions === 'string') {
              // Try to parse as regular JSON first
              try {
              const parsed = JSON.parse(service.intake_questions);
              return Array.isArray(parsed) ? parsed : [];
              } catch (firstError) {
                // If first parse fails, try parsing again (double-escaped)
                try {
                  const parsed = JSON.parse(JSON.parse(service.intake_questions));
                  return Array.isArray(parsed) ? parsed : [];
                } catch (secondError) {
                  console.error('Both parse attempts failed for intake questions:', { firstError, secondError });
                  return [];
                }
              }
            }
            return Array.isArray(service.intake_questions) ? service.intake_questions : [];
          } catch (error) {
            console.error('Error parsing intake questions:', error);
            return [];
          }
        })(),
        require_payment_method: !!service.require_payment_method
      }
      
      console.log('Setting service data to:', newServiceData)
      console.log('Final modifiers in serviceData:', newServiceData.modifiers)
      console.log('Final modifiers type:', typeof newServiceData.modifiers)
      console.log('Final modifiers is array?', Array.isArray(newServiceData.modifiers))
      console.log('Final modifiers length:', Array.isArray(newServiceData.modifiers) ? newServiceData.modifiers.length : 'not an array')
      setServiceData(newServiceData)
      
      console.log('Parsed modifiers:', (() => {
        try {
          if (!service.modifiers) return [];
          if (typeof service.modifiers === 'string') {
            const parsed = JSON.parse(service.modifiers);
            return Array.isArray(parsed) ? parsed : [];
          }
          return Array.isArray(service.modifiers) ? service.modifiers : [];
        } catch (error) {
          console.error('Error parsing modifiers for logging:', error);
          return [];
        }
      })())
      
      console.log('Service data set successfully')
      
      // Load default selections if they exist
      try {
        console.log('📋 Checking for default selections in service:', {
          default_modifier_selections: service.default_modifier_selections,
          default_intake_answers: service.default_intake_answers
        });
        
        if (service.default_modifier_selections) {
          const defaultSelections = JSON.parse(service.default_modifier_selections);
          setDefaultModifierSelections(defaultSelections);
          console.log('📋 Loaded default modifier selections:', defaultSelections);
        } else {
          console.log('📋 No default modifier selections found');
        }
        
        if (service.default_intake_answers) {
          const defaultAnswers = JSON.parse(service.default_intake_answers);
          setDefaultIntakeAnswers(defaultAnswers);
          setPreviewAnswers(defaultAnswers); // Also set preview answers
          console.log('📋 Loaded default intake answers:', defaultAnswers);
        } else {
          console.log('📋 No default intake answers found');
        }
      } catch (error) {
        console.error('Error parsing default selections:', error);
      }
      
      // Load categories
      await loadCategories()
      
      // Load availability data
      await loadAvailabilityData()
    } catch (error) {
      console.error('Error loading service:', error)
      
      if (error.message === 'Request timeout') {
        setError("Request timed out. Please check your connection and try again.")
      } else if (error.response) {
        const { status, data } = error.response
        switch (status) {
          case 404:
            setError("Service not found. Please check the URL and try again.")
            break
          case 500:
            setError("Server error. Please try again later.")
            break
          default:
            setError(data?.error || "Failed to load service data. Please try again.")
        }
      } else if (error.request) {
        setError("Network error. Please check your connection and try again.")
      } else {
        setError("Failed to load service data. Please try again.")
      }
    } finally {
      setLoading(false)
    }
  }

  const loadAvailabilityData = async () => {
    try {
      setAvailabilityLoading(true)
      const availability = await serviceAvailabilityAPI.getAvailability(serviceId)
      setAvailabilityData(availability)
    } catch (error) {
      console.error('Error loading availability:', error)
      // Don't show error for availability, just use defaults
    } finally {
      setAvailabilityLoading(false)
    }
  }

  const loadCategories = async () => {
    try {
      console.log('🔄 Loading categories for user:', user.id)
      setCategoriesLoading(true)
      const categoriesData = await servicesAPI.getServiceCategories(user.id)
      console.log('📋 Categories data received:', categoriesData)
      console.log('📋 Categories data type:', typeof categoriesData)
      console.log('📋 Is array?', Array.isArray(categoriesData))
      
      // Ensure categoriesData is always an array
      const categoriesArray = Array.isArray(categoriesData) ? categoriesData : []
      console.log('📋 Setting categories array:', categoriesArray)
      console.log('📋 Categories array length:', categoriesArray.length)
      
      if (categoriesArray.length > 0) {
        console.log('📋 First category:', categoriesArray[0])
      }
      
      setCategories(categoriesArray)
    } catch (error) {
      console.error('❌ Error loading categories:', error)
      // Don't show error for categories, just use empty array
      setCategories([])
    } finally {
      setCategoriesLoading(false)
    }
  }

  const handleSaveAvailability = async () => {
    try {
      setAvailabilitySaving(true)
      await serviceAvailabilityAPI.updateAvailability(serviceId, availabilityData)
      setSuccessMessage("Availability settings updated successfully!")
      setTimeout(() => setSuccessMessage(""), 3000)
    } catch (error) {
      console.error('Error saving availability:', error)
      setError("Failed to save availability settings. Please try again.")
    } finally {
      setAvailabilitySaving(false)
    }
  }

  const handleSaveService = async (dataToSave = null) => {
    try {
      console.log('💾 Current serviceData state:', serviceData);
      console.log('💾 dataToSave parameter:', dataToSave);
      
      // Check if service data is loaded
      if (loading) {
        console.error('💾 Service data still loading');
        setError("Service data is still loading. Please wait and try again.");
        return;
      }
      
      if (!serviceData.id) {
        console.error('💾 Service data not loaded yet');
        setError("Service data is still loading. Please wait and try again.");
        return;
      }
      
      const data = dataToSave || serviceData;
      console.log('💾 Final data to save:', data);
      setSaving(true)
      setError("")
      setSuccessMessage("")
      
      const updateData = {
        name: data.name,
        description: data.description,
        price: data.isFree ? 0 : data.price,
        duration: data.duration,
        category: data.category,
        image: data.image,
        modifiers: JSON.stringify(data.modifiers),
        intake_questions: JSON.stringify(data.intakeQuestions || []),
        require_payment_method: !!data.require_payment_method
      }
      
      console.log('💾 Update data being sent to backend:', updateData);
      console.log('💾 Category being sent:', data.category);
      console.log('💾 Category type:', typeof data.category);
      console.log('💾 Modifiers JSON:', JSON.stringify(serviceData.modifiers));
      
      await servicesAPI.update(serviceData.id, updateData)
      
      // Show success message
      setSuccessMessage("Service updated successfully!")
      setTimeout(() => setSuccessMessage(""), 3000)
    } catch (error) {
      console.error('Error updating service:', error)
      setError("Failed to update service. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  const toggleSection = (sectionId) => {
    setExpandedSection(expandedSection === sectionId ? null : sectionId)
  }

  // Section visibility functions - not needed when sections are commented out
  // const toggleSectionVisibility = (sectionId) => {
  //   setHiddenSections(prev => 
  //     prev.includes(sectionId) 
  //       ? prev.filter(id => id !== sectionId)
  //       : [...prev, sectionId]
  //   )
  // }

  // const isSectionHidden = (sectionId) => {
  //   return hiddenSections.includes(sectionId)
  // }

  const handleEditModifier = (modifier) => {
    setEditingModifier(modifier)
    setIsCreateModifierGroupModalOpen(true)
  }



  const handleSaveModifierGroup = async (modifierGroupData) => {
    try {
      console.log('🔄 Saving modifier group:', modifierGroupData);
      console.log('🔄 Editing modifier:', editingModifier);
      
      let updatedModifiers
      const currentModifiers = serviceData.modifiers || []
      
      // Convert the new format to the existing format for compatibility
      const convertedModifier = {
        id: editingModifier ? editingModifier.id : Date.now(),
        title: modifierGroupData.groupName,
        description: modifierGroupData.groupDescription,
        selectionType: modifierGroupData.selectionType,
        required: modifierGroupData.required,
        options: modifierGroupData.options.map(option => ({
          id: option.id,
          label: option.name,
          price: option.price,
          duration: option.durationHours * 60 + option.durationMinutes, // Convert to minutes
          description: option.description,
          image: option.image,
          allowCustomerNotes: option.allowCustomerNotes,
          convertToServiceRequest: option.convertToServiceRequest
        }))
      }
      
      console.log('🔄 Converted modifier:', convertedModifier);
      
      if (editingModifier) {
        // Update existing modifier
        console.log('🔄 Updating existing modifier with ID:', editingModifier.id);
        updatedModifiers = currentModifiers.map(mod => 
          mod.id === editingModifier.id ? convertedModifier : mod
        )
        console.log('🔄 Updated modifiers array:', updatedModifiers);
      } else {
        // Add new modifier
        console.log('🔄 Adding new modifier');
        updatedModifiers = [...currentModifiers, convertedModifier]
      }
      
      console.log('🔄 Setting service data with updated modifiers');
      
      // Update the service data immediately
      const updatedServiceData = {
        ...serviceData,
        modifiers: updatedModifiers
      };
      
      setServiceData(updatedServiceData);
      setModifiersChanged(true);
      
      setIsCreateModifierGroupModalOpen(false)
      setEditingModifier(null)
      setSuccessMessage(editingModifier ? "Modifier group updated! Click 'Save Modifiers' to save changes." : "Modifier group created! Click 'Save Modifiers' to save changes.")
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(""), 3000)
      
    } catch (error) {
      console.error('Error saving modifier group:', error)
      setError("Failed to save modifier group. Please try again.")
    }
  }

  const handleDeleteModifier = async (modifierId) => {
    if (window.confirm("Are you sure you want to delete this modifier?")) {
      try {
        const currentModifiers = serviceData.modifiers || []
        const updatedModifiers = currentModifiers.filter(mod => mod.id !== modifierId)
        
        // Update service data immediately
        const updatedServiceData = {
          ...serviceData,
          modifiers: updatedModifiers
        };
        
        setServiceData(updatedServiceData);
        setModifiersChanged(true);
        
        setSuccessMessage("Modifier deleted! Click 'Save Modifiers' to save changes.")
        setTimeout(() => setSuccessMessage(""), 3000)
      } catch (error) {
        console.error('Error deleting modifier:', error)
        setError("Failed to delete modifier. Please try again.")
      }
    }
  }

  const handleSaveIntakeQuestion = async (questionData) => {
    try {
      let updatedServiceData;
      
      if (editingIntakeQuestion) {
        // Update existing question
        const currentQuestions = serviceData.intakeQuestions || [];
        const updatedQuestions = currentQuestions.map(q => 
          q.id === editingIntakeQuestion.id ? {
            ...q,
            questionType: questionData.questionType,
            question: questionData.question,
            description: questionData.description,
            selectionType: questionData.selectionType,
            required: questionData.required,
            options: questionData.options || []
          } : q
        );
        
        updatedServiceData = {
          ...serviceData,
          intakeQuestions: updatedQuestions
        };
        
        setSuccessMessage("Intake question updated successfully!")
      } else {
        // Create new question
        const currentQuestions = serviceData.intakeQuestions || [];
        const maxId = currentQuestions.length > 0 
          ? Math.max(...currentQuestions.map(q => typeof q.id === 'number' ? q.id : parseInt(q.id) || 0))
          : 0;
        
        const newIntakeQuestion = {
          id: maxId + 1, // Use sequential numeric IDs
          questionType: questionData.questionType,
          question: questionData.question,
          description: questionData.description,
          selectionType: questionData.selectionType,
          required: questionData.required,
          options: questionData.options || []
        }
        
        updatedServiceData = {
          ...serviceData,
          intakeQuestions: [...(serviceData.intakeQuestions || []), newIntakeQuestion]
        };
        
        setSuccessMessage("Intake question created successfully!")
      }
      
      // Update state
      setServiceData(updatedServiceData)
      setIntakeQuestionsChanged(true);
      
      setIsIntakeModalOpen(false)
      setSelectedQuestionType(null)
      setEditingIntakeQuestion(null) // Clear editing state
      
      setSuccessMessage(editingIntakeQuestion ? "Intake question updated! Click 'Save Answers' to save changes." : "Intake question created! Click 'Save Answers' to save changes.")
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(""), 3000)
      
    } catch (error) {
      console.error('Error saving intake question:', error)
      setError("Failed to save intake question. Please try again.")
    }
  }

  const handleSaveModifiers = async () => {
    try {
      setSavingModifiers(true)
      setError("")
      
      // Apply edited modifier prices to the service data
      let updatedServiceData = { ...serviceData };
      
      if (Object.keys(editedModifierPrices).length > 0) {
        console.log('🔧 Applying edited modifier prices:', editedModifierPrices);
        
        // Update modifier prices in the service data
        updatedServiceData.modifiers = serviceData.modifiers?.map(modifier => ({
          ...modifier,
          options: modifier.options?.map(option => {
            const priceKey = `${modifier.id}_option_${option.id}`;
            const editedPrice = editedModifierPrices[priceKey];
            
            if (editedPrice !== undefined) {
              console.log(`🔧 Updating ${priceKey} price from ${option.price} to ${editedPrice}`);
              return {
                ...option,
                price: parseFloat(editedPrice)
              };
            }
            return option;
          })
        }));
        
        // Update the service data state
        setServiceData(updatedServiceData);
      }
      
      await handleSaveService(updatedServiceData)
      
      setModifiersChanged(false)
      setSuccessMessage("Modifiers saved successfully!")
      setTimeout(() => setSuccessMessage(""), 3000)
    } catch (error) {
      console.error('Error saving modifiers:', error)
      setError("Failed to save modifiers. Please try again.")
    } finally {
      setSavingModifiers(false)
    }
  }

  const handleSaveIntakeQuestions = async () => {
    try {
      setSavingIntakeQuestions(true)
      setError("")
      
      await handleSaveService(serviceData)
      
      setIntakeQuestionsChanged(false)
      setSuccessMessage("Intake questions saved successfully!")
      setTimeout(() => setSuccessMessage(""), 3000)
    } catch (error) {
      console.error('Error saving intake questions:', error)
      setError("Failed to save intake questions. Please try again.")
    } finally {
      setSavingIntakeQuestions(false)
    }
  }

  const handleModifiersChange = (selectedModifiers) => {
    // selectedModifiers is the user's selections, not the modifier definitions
    // We don't need to update serviceData.modifiers here since that contains the definitions
    // We just need to track that there are unsaved changes
    console.log('🔄 Modifiers selection changed:', selectedModifiers);
    setModifiersChanged(true)
  }

  const handleIntakeQuestionsChange = (newAnswers) => {
    // This function should not be called in service details context
    // IntakeQuestionsForm is being used incorrectly here
    console.warn('handleIntakeQuestionsChange called in service details - this should not happen');
  }

  // Interactive preview handlers
  const handlePreviewAnswerChange = (questionId, value) => {
    setPreviewAnswers(prev => ({
      ...prev,
      [questionId]: value
    }));
  };

  const handlePreviewQuantityChange = (questionId, delta) => {
    setPreviewQuantities(prev => {
      const current = prev[questionId] || 0;
      const newValue = Math.max(0, current + delta);
      return {
        ...prev,
        [questionId]: newValue
      };
    });
  };

  const handleDeleteIntakeQuestion = async (questionId) => {
    if (window.confirm("Are you sure you want to delete this intake question?")) {
      try {
        const currentQuestions = serviceData.intakeQuestions || []
        const updatedQuestions = currentQuestions.filter(q => q.id !== questionId)
        
        // Update service data
        const updatedServiceData = {
          ...serviceData,
          intakeQuestions: updatedQuestions
        }
        
        // Update state
        setServiceData(updatedServiceData)
        setIntakeQuestionsChanged(true);
        
        setSuccessMessage("Intake question deleted! Click 'Save Answers' to save changes.")
        setTimeout(() => setSuccessMessage(""), 3000)
        setTimeout(() => setSuccessMessage(""), 3000)
      } catch (error) {
        console.error('Error deleting intake question:', error)
        setError("Failed to delete intake question. Please try again.")
      }
    }
  }

  const handleEditIntakeQuestion = (question) => {
    setEditingIntakeQuestion(question)
    setIsIntakeModalOpen(true)
  }

  const handleCloseIntakeModal = () => {
    setIsIntakeModalOpen(false)
    setSelectedQuestionType(null)
    setEditingIntakeQuestion(null)
  }

  const handleCopyIntakeQuestion = async (question) => {
    try {
      const copiedQuestion = {
        ...question,
        id: Date.now().toString(), // Generate new ID
        question: `${question.question} (Copy)`
      }
      
      const updatedServiceData = {
        ...serviceData,
        intakeQuestions: [...(serviceData.intakeQuestions || []), copiedQuestion]
      }
      
      setServiceData(updatedServiceData)
      
      const updateData = {
        name: updatedServiceData.name,
        description: updatedServiceData.description,
        price: updatedServiceData.isFree ? 0 : updatedServiceData.price,
        duration: updatedServiceData.duration,
        category: updatedServiceData.category,
        modifiers: JSON.stringify(updatedServiceData.modifiers),
        intake_questions: JSON.stringify(updatedServiceData.intakeQuestions),
        require_payment_method: !!updatedServiceData.require_payment_method
      }
      
      await servicesAPI.update(updatedServiceData.id, updateData)
      
      setSuccessMessage("Intake question copied successfully!")
      setTimeout(() => setSuccessMessage(""), 3000)
    } catch (error) {
      console.error('Error copying intake question:', error)
      setError("Failed to copy intake question. Please try again.")
    }
  }

  const handleCopyModifier = async (modifier) => {
    try {
      const copiedModifier = {
        ...modifier,
        id: Date.now().toString(), // Generate new ID
        title: `${modifier.title} (Copy)`
      }
      
      const updatedServiceData = {
        ...serviceData,
        modifiers: [...(serviceData.modifiers || []), copiedModifier]
      }
      
      setServiceData(updatedServiceData)
      
      const updateData = {
        name: updatedServiceData.name,
        description: updatedServiceData.description,
        price: updatedServiceData.isFree ? 0 : updatedServiceData.price,
        duration: updatedServiceData.duration,
        category: updatedServiceData.category,
        modifiers: JSON.stringify(updatedServiceData.modifiers),
        intake_questions: JSON.stringify(updatedServiceData.intakeQuestions),
        require_payment_method: !!updatedServiceData.require_payment_method
      }
      
      await servicesAPI.update(updatedServiceData.id, updateData)
      
      // Show visual feedback
      setCopiedModifier(modifier.id)
      setTimeout(() => setCopiedModifier(null), 2000)
      
      setSuccessMessage("Modifier copied successfully!")
      setTimeout(() => setSuccessMessage(""), 3000)
    } catch (error) {
      console.error('Error copying modifier:', error)
      setError("Failed to copy modifier. Please try again.")
    }
  }

  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError("Please select a valid image file.");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError("Image file size must be less than 5MB.");
      return;
    }

    try {
      setImageUploading(true);
      setError("");

      const formData = new FormData();
      formData.append('image', file);
      formData.append('serviceId', serviceId);

      // Get auth token
      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await fetch('https://service-flow-backend-production.up.railway.app/api/upload-service-image', {
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
      
      console.log('Image upload response:', data);
      
      if (!data.imageUrl) {
        throw new Error('No image URL received from server');
      }
      
      // Update service data with new image URL
      const updatedServiceData = {
        ...serviceData,
        image: data.imageUrl
      };
      
      setServiceData(updatedServiceData);
      
      // Update service in backend with the new image URL
      const updateData = {
        name: updatedServiceData.name,
        description: updatedServiceData.description,
        price: updatedServiceData.isFree ? 0 : updatedServiceData.price,
        duration: updatedServiceData.duration,
        category: updatedServiceData.category,
        category_id: updatedServiceData.category_id,
        modifiers: JSON.stringify(updatedServiceData.modifiers),
        intake_questions: JSON.stringify(updatedServiceData.intakeQuestions),
        require_payment_method: !!updatedServiceData.require_payment_method,
        image: data.imageUrl
      };
      
      await servicesAPI.update(serviceId, updateData);

      setSuccessMessage("Image uploaded successfully!");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (error) {
      console.error('Error uploading image:', error);
      setError(error.message || "Failed to upload image. Please try again.");
    } finally {
      setImageUploading(false);
    }
  };

  const handleRemoveImage = async () => {
    try {
      setSaving(true);
      setError("");

      const updatedServiceData = {
        ...serviceData,
        image: null
      };
      
      setServiceData(updatedServiceData);
      
      // Update service in backend
      await servicesAPI.update(serviceId, {
        ...serviceData,
        image: null
      });

      setSuccessMessage("Image removed successfully!");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (error) {
      console.error('Error removing image:', error);
      setError("Failed to remove image. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const IntakeQuestionDropdown = () => {
    const questionTypes = [
      { icon: "⬇️", label: "Dropdown", value: "dropdown" },
      { icon: "☑️", label: "Multiple Choice", value: "multiple_choice" },
      { icon: "🖼️", label: "Picture Choice", value: "picture_choice" },
      { icon: "📝", label: "Short Text Answer", value: "short_text" },
      { icon: "📄", label: "Long Text Answer", value: "long_text" },
      { icon: "🎨", label: "Color Choice", value: "color_choice" },
      { icon: "📸", label: "Image Upload", value: "image_upload" }
    ]

    const handleQuestionTypeSelect = (type) => {
      console.log('🔄 Intake question type selected:', type);
      setSelectedQuestionType(type)
      setEditingIntakeQuestion(null) // Clear editing state when creating new
      setIsIntakeModalOpen(true)
      setIsIntakeDropdownOpen(false)
    }

    // Handle clicks outside the dropdown
    useEffect(() => {
      const handleClickOutside = (event) => {
        const dropdownContainer = document.getElementById('intake-dropdown-container');
        const dropdownButton = document.getElementById('intake-dropdown-button');
        
        if (isIntakeDropdownOpen && 
            dropdownContainer && 
            !dropdownContainer.contains(event.target) &&
            dropdownButton &&
            !dropdownButton.contains(event.target)) {
          setIsIntakeDropdownOpen(false);
        }
      };

      if (isIntakeDropdownOpen) {
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
      }
    }, [isIntakeDropdownOpen]);

    return (
      <div className="relative">
        <button
          id="intake-dropdown-button"
          onClick={() => {
            console.log('🔄 Intake dropdown button clicked, current state:', isIntakeDropdownOpen);
            setIsIntakeDropdownOpen(!isIntakeDropdownOpen);
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          New Intake Question
        </button>
        
        {isIntakeDropdownOpen && (
          <div 
            id="intake-dropdown-container"
            className="absolute left-0 bottom-full mb-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50 max-h-60 overflow-y-auto"
          >
            {questionTypes.map((type) => (
              <button
                key={type.value}
                onClick={() => handleQuestionTypeSelect(type.value)}
                className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center space-x-3 transition-colors"
              >
                <span className="text-xl">{type.icon}</span>
                <span className="text-sm text-gray-900">{type.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  const SkillTagModal = () => {
    const [skillTagName, setSkillTagName] = useState("")

    const handleClose = () => {
      setIsSkillTagModalOpen(false)
      setSkillTagName("")
    }

    const handleSave = () => {
      // Handle saving the skill tag
      console.log("Saving skill tag:", skillTagName)
      handleClose()
    }

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg w-full max-w-md">
          <div className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Create a skill tag</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Skill tag name
                </label>
                <input
                  type="text"
                  value={skillTagName}
                  onChange={(e) => setSkillTagName(e.target.value)}
                  placeholder="Ex: Cleaner, HVAC Tech"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
            </div>

            <div className="flex items-center space-x-3 mt-8">
              <button
                onClick={handleSave}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
              >
                Save Skill Tag
              </button>
              <button
                onClick={handleClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const renderSectionContent = (section) => {
    switch (section.id) {
      case "intake":
        return (
          <div className="p-4 space-y-6">
            <div className="flex items-start space-x-2">
              <p className="text-sm text-gray-600 flex-1">
                Intake questions allow you to collect extra information from your customers during the booking process using custom fields.
              </p>
              <a href="#" className="text-sm text-blue-600 hover:text-blue-700 flex items-center whitespace-nowrap">
                <Info className="w-4 h-4 mr-1" />
                Learn more about intake questions
              </a>
            </div>

            <div className="space-y-4">
              {serviceData.intakeQuestions && serviceData.intakeQuestions.length > 0 ? (
                serviceData.intakeQuestions.map((question, index) => (
                  <div key={question.id} className="border border-gray-200 rounded-lg">
                    <div className="flex items-center justify-between p-4">
                      <div className="flex items-center space-x-3">
                        <span className="text-gray-400">{index + 1}.</span>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-medium">{question.question}</span>
                            {question.required && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                                Required
                              </span>
                            )}
                          </div>
                          {/* Field Description */}
                          {question.description && (
                            <p className="text-sm text-gray-500 mt-1">{question.description}</p>
                          )}
                          {/* Question Type and Selection Type */}
                          <div className="flex items-center space-x-2 mt-1">
                            <span className="text-sm text-gray-500">
                              {question.questionType === 'dropdown' && 'Dropdown'}
                              {question.questionType === 'multiple_choice' && 'Multiple Choice'}
                              {question.questionType === 'picture_choice' && 'Picture Choice'}
                              {question.questionType === 'short_text' && 'Short Text Answer'}
                              {question.questionType === 'long_text' && 'Long Text Answer'}
                              {question.questionType === 'color_choice' && 'Color Choice'}
                              {question.questionType === 'image_upload' && 'Image Upload'}
                              {question.questionType === 'quantity_select' && 'Quantity Select'}
                            </span>
                            {question.selectionType && ['dropdown', 'multiple_choice', 'picture_choice', 'color_choice'].includes(question.questionType) && (
                              <span className="text-sm text-gray-500">
                                {question.selectionType === 'single' ? 'Single Select' : 'Multi-Select'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button 
                          onClick={() => handleEditIntakeQuestion(question)}
                          className="text-sm text-blue-600 hover:text-blue-800"
                        >
                          Edit
                        </button>
                        <button 
                          onClick={() => handleCopyIntakeQuestion(question)}
                          className="text-sm text-green-600 hover:text-green-800"
                        >
                          Copy
                        </button>
                        <button 
                          onClick={() => handleDeleteIntakeQuestion(question.id)}
                          className="text-sm text-red-600 hover:text-red-800"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    {/* Show options only for question types that have options */}
                    {question.options && question.options.length > 0 && ['dropdown', 'multiple_choice', 'picture_choice', 'color_choice', 'quantity_select'].includes(question.questionType) && (
                      <div className="px-4 pb-4">
                        <div className="flex flex-wrap gap-2">
                          {question.options.map((option, optionIndex) => (
                            <div key={optionIndex} className="bg-gray-100 rounded-full px-3 py-1 text-sm">
                              {option.text}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>No intake questions added yet.</p>
                  <p className="text-sm mt-1">Click "New Intake Question" to add your first question.</p>
                </div>
              )}
            </div>

            {/* Customer Preview Section */}
            {serviceData.intakeQuestions && serviceData.intakeQuestions.length > 0 && (
              <div className="border-t border-gray-200 pt-6">
                <div className="mb-4">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Customer Preview</h3>
                  <p className="text-sm text-gray-600">This is how your intake questions will appear to customers during booking.</p>
                  <div className="mt-2 flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-xs text-green-600 font-medium">INTERACTIVE PREVIEW - Test your questions</span>
                  </div>
                </div>
                
                <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm relative">
                  <div className="space-y-6">
                    {serviceData.intakeQuestions.map((question, index) => (
                      <div key={index} className="space-y-3">
                        <div>
                          <label className="block text-lg font-medium text-gray-900 mb-1">
                            {question.question}
                            {question.required && <span className="text-red-500 ml-1">*</span>}
                          </label>
                          {question.description && (
                            <p className="text-sm text-gray-600 mb-3">{question.description}</p>
                          )}
                        </div>
                        
                        {/* Preview based on question type */}
                        {question.questionType === 'multiple_choice' && (
                          <div className="space-y-2">
                            {question.options?.map((option, optionIndex) => (
                              <label key={optionIndex} className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                                <input
                                  type={question.selectionType === 'multi' ? 'checkbox' : 'radio'}
                                  name={`question-${question.id}`}
                                  value={option.id}
                                  checked={question.selectionType === 'multi' 
                                    ? (previewAnswers[question.id] || []).includes(option.id)
                                    : previewAnswers[question.id] === option.id
                                  }
                                  onChange={(e) => {
                                    if (question.selectionType === 'multi') {
                                      const currentValues = previewAnswers[question.id] || [];
                                      const newValues = e.target.checked
                                        ? [...currentValues, option.id]
                                        : currentValues.filter(id => id !== option.id);
                                      handlePreviewAnswerChange(question.id, newValues);
                                    } else {
                                      handlePreviewAnswerChange(question.id, e.target.checked ? option.id : null);
                                    }
                                  }}
                                  className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                                />
                                <span className="ml-3 text-sm text-gray-700">{option.text}</span>
                              </label>
                            ))}
                          </div>
                        )}

                        {question.questionType === 'dropdown' && (
                          <div className="relative">
                            <select
                              value={previewAnswers[question.id] || ""}
                              onChange={(e) => handlePreviewAnswerChange(question.id, e.target.value)}
                              className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-700 appearance-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                              <option value="">Select an option</option>
                              {question.options?.map((option, optionIndex) => (
                                <option key={optionIndex} value={option.id}>
                                  {option.text}
                                </option>
                              ))}
                            </select>
                            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                              <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </div>
                          </div>
                        )}

                        {question.questionType === 'short_text' && (
                          <input
                            type="text"
                            value={previewAnswers[question.id] || ""}
                            onChange={(e) => handlePreviewAnswerChange(question.id, e.target.value)}
                            placeholder="Type your answer here"
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        )}

                        {question.questionType === 'long_text' && (
                          <textarea
                            value={previewAnswers[question.id] || ""}
                            onChange={(e) => handlePreviewAnswerChange(question.id, e.target.value)}
                            placeholder="Type your answer here"
                            rows={3}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                          />
                        )}

                        {question.questionType === 'picture_choice' && (
                          <div className="grid grid-cols-2 gap-3">
                            {question.options?.map((option, optionIndex) => (
                              <div key={optionIndex} className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 cursor-pointer">
                                <div className="flex items-center space-x-2">
                                  <input
                                    type={question.selectionType === 'multi' ? 'checkbox' : 'radio'}
                                    name={`question-${question.id}`}
                                    value={option.id}
                                    checked={question.selectionType === 'multi' 
                                      ? (previewAnswers[question.id] || []).includes(option.id)
                                      : previewAnswers[question.id] === option.id
                                    }
                                    onChange={(e) => {
                                      if (question.selectionType === 'multi') {
                                        const currentValues = previewAnswers[question.id] || [];
                                        const newValues = e.target.checked
                                          ? [...currentValues, option.id]
                                          : currentValues.filter(id => id !== option.id);
                                        handlePreviewAnswerChange(question.id, newValues);
                                      } else {
                                        handlePreviewAnswerChange(question.id, e.target.checked ? option.id : null);
                                      }
                                    }}
                                    className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                                  />
                                  <span className="text-sm text-gray-700">{option.text}</span>
                                </div>
                                {option.image && (
                                  <div className="mt-2 w-full h-24 bg-gray-100 rounded overflow-hidden">
                                    <img
                                      src={option.image}
                                      alt={option.text}
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {question.questionType === 'color_choice' && (
                          <div className="flex flex-wrap gap-3">
                            {question.options?.map((option, optionIndex) => (
                              <div key={optionIndex} className="flex items-center space-x-2 p-2 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                                <input
                                  type={question.selectionType === 'multi' ? 'checkbox' : 'radio'}
                                  name={`question-${question.id}`}
                                  value={option.id}
                                  checked={question.selectionType === 'multi' 
                                    ? (previewAnswers[question.id] || []).includes(option.id)
                                    : previewAnswers[question.id] === option.id
                                  }
                                  onChange={(e) => {
                                    if (question.selectionType === 'multi') {
                                      const currentValues = previewAnswers[question.id] || [];
                                      const newValues = e.target.checked
                                        ? [...currentValues, option.id]
                                        : currentValues.filter(id => id !== option.id);
                                      handlePreviewAnswerChange(question.id, newValues);
                                    } else {
                                      handlePreviewAnswerChange(question.id, e.target.checked ? option.id : null);
                                    }
                                  }}
                                  className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                                />
                                <div className="w-6 h-6 rounded-full border border-gray-300" style={{ backgroundColor: option.color || '#ccc' }}></div>
                                <span className="text-sm text-gray-700">{option.text}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {question.questionType === 'image_upload' && (
                          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:bg-gray-50 cursor-pointer transition-colors">
                            <div className="flex flex-col items-center">
                              <svg className="w-8 h-8 text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                              </svg>
                              <p className="text-sm text-gray-500">Click to upload an image</p>
                            </div>
                          </div>
                        )}

                        {question.questionType === 'quantity_select' && (
                          <div className="space-y-3">
                            {question.options?.[0]?.image && (
                              <div className="w-full h-24 bg-gray-100 rounded overflow-hidden">
                                <img
                                  src={question.options[0].image}
                                  alt={question.options[0].text}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            )}
                            <div className="flex items-center space-x-3">
                              <button
                                onClick={() => handlePreviewQuantityChange(question.id, -1)}
                                className="w-8 h-8 border border-gray-300 rounded-full flex items-center justify-center text-gray-600 bg-white hover:bg-gray-50 transition-colors"
                              >
                                -
                              </button>
                              <span className="text-lg font-medium text-gray-700">{previewQuantities[question.id] || 0}</span>
                              <button
                                onClick={() => handlePreviewQuantityChange(question.id, 1)}
                                className="w-8 h-8 border border-gray-300 rounded-full flex items-center justify-center text-gray-600 bg-white hover:bg-gray-50 transition-colors"
                              >
                                +
                              </button>
                              <span className="text-sm text-gray-500 ml-2">of {question.options?.[0]?.text || 'items'}</span>
                            </div>
                          </div>
                        )}

                        {!['multiple_choice', 'dropdown', 'short_text', 'long_text', 'picture_choice', 'color_choice', 'image_upload', 'quantity_select'].includes(question.questionType) && (
                          <div className="text-sm text-gray-500 italic p-3 bg-gray-50 rounded-lg">
                            Preview for {question.questionType} question type
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="bg-gray-50 rounded-lg p-6 flex flex-col items-center justify-center text-center">
              <IntakeQuestionDropdown />
              
              {/* Save button for intake questions */}
              {intakeQuestionsChanged && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <button
                    onClick={handleSaveIntakeQuestions}
                    disabled={savingIntakeQuestions}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                  >
                    {savingIntakeQuestions ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <span>Save Intake Questions</span>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        )

      case "availability":
        return (
          <div className="p-4 space-y-6">
            <p className="text-sm text-gray-600">
              You can override your default business hours and availability settings, and offer custom timeslots for this service using a timeslot template.
            </p>

            {availabilityLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <span className="ml-3 text-gray-600">Loading availability settings...</span>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Availability Type */}
            <div className="space-y-4">
                  <h3 className="text-sm font-medium text-gray-900">Availability Type</h3>
                  <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <input
                  type="radio"
                        id="default-availability"
                        name="availability-type"
                        checked={availabilityData.availabilityType === 'default'}
                        onChange={() => setAvailabilityData(prev => ({ ...prev, availabilityType: 'default' }))}
                  className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                />
                      <label htmlFor="default-availability" className="text-sm text-gray-900">
                        Use default business hours and availability settings
                </label>
              </div>

              <div className="flex items-center space-x-3">
                <input
                  type="radio"
                        id="custom-availability"
                        name="availability-type"
                        checked={availabilityData.availabilityType === 'custom'}
                        onChange={() => setAvailabilityData(prev => ({ ...prev, availabilityType: 'custom' }))}
                  className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                />
                      <label htmlFor="custom-availability" className="text-sm text-gray-900">
                        Use custom availability settings for this service
                </label>
                    </div>
                  </div>
              </div>

                {/* Custom Availability Settings */}
                {availabilityData.availabilityType === 'custom' && (
                  <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                    <h4 className="text-sm font-medium text-gray-900">Custom Availability Settings</h4>
                    
                    {/* Minimum Booking Notice */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Minimum Booking Notice (hours)
                      </label>
                  <input
                        type="number"
                        value={Math.floor(availabilityData.minimumBookingNotice / 60)}
                        onChange={(e) => setAvailabilityData(prev => ({ 
                          ...prev, 
                          minimumBookingNotice: parseInt(e.target.value) * 60 
                        }))}
                        min="0"
                        className="w-32 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    {/* Maximum Booking Advance */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Maximum Booking Advance (days)
                  </label>
                      <input
                        type="number"
                        value={Math.floor(availabilityData.maximumBookingAdvance / 1440)}
                        onChange={(e) => setAvailabilityData(prev => ({ 
                          ...prev, 
                          maximumBookingAdvance: parseInt(e.target.value) * 1440 
                        }))}
                        min="1"
                        max="365"
                        className="w-32 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                </div>

                    {/* Booking Interval */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Booking Interval (minutes)
                      </label>
                      <select
                        value={availabilityData.bookingInterval}
                        onChange={(e) => setAvailabilityData(prev => ({ 
                          ...prev, 
                          bookingInterval: parseInt(e.target.value) 
                        }))}
                        className="w-32 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value={15}>15 minutes</option>
                        <option value={30}>30 minutes</option>
                        <option value={60}>1 hour</option>
                        <option value={90}>1.5 hours</option>
                        <option value={120}>2 hours</option>
                      </select>
              </div>
            </div>
                )}

                {/* Save Button */}
                <div className="flex justify-end pt-4 border-t border-gray-200">
                  <button
                    onClick={handleSaveAvailability}
                    disabled={availabilitySaving}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                  >
                    {availabilitySaving ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Saving...</span>
                      </>
                    ) : (
                      <span>Save Availability Settings</span>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        )

      case "team":
        return (
          <div className="p-4 space-y-6">
            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-900">Required skills</h3>
                  <a href="#" className="text-sm text-blue-600 hover:text-blue-700">
                    Learn more
                  </a>
                </div>
                <p className="text-sm text-gray-600 mb-4">
                  Add required skill tags to make sure jobs booked for this service are assigned to the right team members.
                </p>
                <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 text-center">
                  <p className="text-sm text-gray-500 mb-2">No skill tags available</p>
                  <button 
                    onClick={() => setIsSkillTagModalOpen(true)}
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    + Create new skill tag
                  </button>
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  No skills tags required. Any service provider can be assigned to jobs for this service.
                </p>
              </div>

              <div className="pt-6 border-t border-gray-200">
                <h3 className="text-sm font-medium text-gray-900 mb-3">Minimum crew size</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Select the number of service providers needed to complete this type of service
                </p>
                <div className="flex items-center space-x-2">
                  <select className="border border-gray-300 rounded-md text-sm p-2">
                    <option>1</option>
                    <option>2</option>
                    <option>3</option>
                    <option>4</option>
                  </select>
                  <span className="text-sm text-gray-600">service provider</span>
                </div>
              </div>

              <div className="pt-6 border-t border-gray-200">
                <h3 className="text-sm font-medium text-gray-900 mb-3">Assignment & job offers</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Control how providers are assigned when this service is booked
                </p>
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <input
                      type="radio"
                      id="manual-assign"
                      name="assignment"
                      className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500 mt-1"
                      defaultChecked
                    />
                    <div>
                      <label htmlFor="manual-assign" className="text-sm font-medium text-gray-900 block">
                        Manual
                      </label>
                      <p className="text-sm text-gray-500">
                        Jobs for this service will not be automatically assigned or offered
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <input
                      type="radio"
                      id="auto-assign"
                      name="assignment"
                      className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500 mt-1"
                    />
                    <div>
                      <label htmlFor="auto-assign" className="text-sm font-medium text-gray-900 block">
                        Automatically assign
                      </label>
                      <p className="text-sm text-gray-500">
                        Assigns the required number of available providers who possess the necessary skill tags to jobs for this service
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <input
                      type="radio"
                      id="auto-offer"
                      name="assignment"
                      className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500 mt-1"
                    />
                    <div>
                      <label htmlFor="auto-offer" className="text-sm font-medium text-gray-900 block">
                        Automatically offer
                      </label>
                      <p className="text-sm text-gray-500">
                        Offers jobs for this service to all available providers who possess the necessary skill tags until the required number of providers needed accept
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )

      case "recurring":
        return (
          <div className="p-4 space-y-6">
            {recurringOptions.length === 0 ? (
              <div className="bg-white rounded-lg p-6 text-center space-y-4">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                  <RefreshCw className="w-8 h-8 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Recurring options</h3>
                  <p className="text-sm text-gray-600 mt-2">
                    Let customers schedule this service as a recurring booking by adding recurring frequencies that customers will be able to choose from. You can also offer discounts for certain frequencies.
                  </p>
                </div>
                <button 
                  onClick={() => setIsRecurringModalOpen(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Create a Recurring Option
                </button>
                <a href="#" className="text-sm text-blue-600 hover:text-blue-700 block">
                  Learn more
                </a>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900">Recurring Options</h3>
                  <button 
                    onClick={() => setIsRecurringModalOpen(true)}
                    className="bg-blue-600 text-white px-3 py-1.5 text-sm rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Add Option
                  </button>
                </div>
                <div className="space-y-3">
                  {recurringOptions.map((option, index) => (
                    <div key={index} className="bg-white border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-gray-900">{option.name}</h4>
                          <p className="text-sm text-gray-600">
                            Every {option.interval} {option.frequency.toLowerCase()}{option.interval > 1 ? 's' : ''}
                            {option.discount !== 'None' && ` • ${option.discount} discount`}
                          </p>
                        </div>
                        <button className="text-red-600 text-sm hover:text-red-700">Delete</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )

      case "territory":
        return (
          <div className="p-4 space-y-6">
            <p className="text-sm text-gray-600">
              Territory adjustments allow you to dynamically increase or decrease this service's price for specific territories
            </p>

            <div className="border border-gray-200 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-900">Service territory price rules</h3>
                {territoryRules.length > 0 && (
                  <button 
                    onClick={() => setIsTerritoryModalOpen(true)}
                    className="bg-blue-600 text-white px-3 py-1.5 text-sm rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Add Rule
                  </button>
                )}
              </div>
              
              {territoryRules.length === 0 ? (
                <div>
                  <div className="bg-gray-50 rounded-lg p-4 mb-4">
                    <div className="flex items-center space-x-2">
                      <MapPin className="w-5 h-5 text-gray-400" />
                      <p className="text-sm text-gray-600">
                        No territory adjustment rules set up yet. Add rules to customize pricing for specific territories.
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setIsTerritoryModalOpen(true)}
                    className="w-full border border-gray-300 rounded-lg p-3 text-center text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Add Rule
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {territoryRules.map((rule, index) => (
                    <div key={index} className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-gray-900">{rule.territory}</h4>
                          <p className="text-sm text-gray-600">
                            {rule.operation === 'increase' ? 'Increase' : 'Decrease'} price by{' '}
                            {rule.type === 'percentage' ? `${rule.value}%` : `$${rule.value}`}
                          </p>
                        </div>
                        <button className="text-red-600 text-sm hover:text-red-700">Delete</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )

      case "payments":
        return (
          <div className="p-4 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-900">Require payment method</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Require customers provide a valid payment method when booking this service online?
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">No</span>
                <button
                  onClick={() => setServiceData(prev => ({ ...prev, require_payment_method: !prev.require_payment_method }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${serviceData.require_payment_method ? "bg-blue-600" : "bg-gray-200"}`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${serviceData.require_payment_method ? "translate-x-6" : "translate-x-1"}`}
                  />
                </button>
                <span className="text-sm text-gray-600">Yes</span>
              </div>
            </div>
          </div>
        )

      case "howItWorks":
        return (
          <div className="p-4 space-y-6">
            <p className="text-sm text-gray-600">
              Highlight the features of this service or your business, answer common questions customers might have, and showcase reviews from other customers.
            </p>

            <div className="space-y-6">
              <div className="border border-gray-200 rounded-lg p-6">
                <h3 className="text-sm font-medium text-gray-900 mb-4">Frequently asked questions</h3>
                <p className="text-sm text-gray-600 mb-4">Add questions and answers customers might have about this service.</p>
                <div className="space-y-4">
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-900">What's included in the TV mounting service?</h4>
                    <p className="text-sm text-gray-600 mt-2">
                      Our service includes securely mounting your TV to the wall using your mount or one we offer. We can also select wall stud locations and ensure your TV is level and mounted at the right height. You can also add wire concealment and device setup during booking.
                    </p>
                  </div>
                  <button className="text-sm text-blue-600 hover:text-blue-700">+ Add another question</button>
                </div>
              </div>

              <div className="border border-gray-200 rounded-lg p-6">
                <h3 className="text-sm font-medium text-gray-900 mb-4">How it works</h3>
                <p className="text-sm text-gray-600 mb-4">Walk customers through how this service works, including what happens next after booking.</p>
                <div className="space-y-4">
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                      1
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">Select your options</h4>
                      <p className="text-sm text-gray-600 mt-1">
                        Choose your TV size, wall mount type, and any additional services like wire concealment or device setup.
                      </p>
                    </div>
                  </div>
                  <button className="text-sm text-blue-600 hover:text-blue-700">+ Add another step</button>
                </div>
              </div>

              <div className="border border-gray-200 rounded-lg p-6">
                <h3 className="text-sm font-medium text-gray-900 mb-4">Highlights</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Emphasize important features of this service or your business to customers.
                </p>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                      ✓
                    </div>
                    <span className="text-sm text-gray-900">Fast Service</span>
                  </div>
                  <button className="text-sm text-blue-600 hover:text-blue-700">+ Add</button>
                </div>
              </div>

              <div className="border border-gray-200 rounded-lg p-6">
                <h3 className="text-sm font-medium text-gray-900 mb-4">Testimonials</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Show reviews and testimonials from your satisfied past customers.
                </p>
                <button className="text-sm text-blue-600 hover:text-blue-700">+ Add</button>
              </div>
            </div>
          </div>
        )

      case "bookingPage":
        return (
          <div className="p-4 space-y-6">
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-2">Visibility</h3>
              <p className="text-sm text-gray-600 mb-4">
                If you hide this service from your booking page, customers will only be able to book it if you link directly to it or embed it
              </p>
              <div className="space-y-3">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="visibility"
                    className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                    defaultChecked
                  />
                  <span className="ml-3 text-sm text-gray-900">Show service on booking page</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="visibility"
                    className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                  />
                  <span className="ml-3 text-sm text-gray-900">Hide service on booking page</span>
                </label>
              </div>
            </div>

            <div className="pt-6 border-t border-gray-200">
              <h3 className="text-sm font-medium text-gray-900 mb-2">Confirmation page</h3>
              <p className="text-sm text-gray-600 mb-4">
                Customize what should happen after a customer books this service from your booking page
              </p>
              <div className="space-y-3">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="confirmation"
                    className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                    defaultChecked
                  />
                  <span className="ml-3 text-sm text-gray-900">Display default confirmation message</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="confirmation"
                    className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                  />
                  <span className="ml-3 text-sm text-gray-900">Display custom confirmation message</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="confirmation"
                    className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                  />
                  <span className="ml-3 text-sm text-gray-900">Redirect to external site</span>
                </label>
              </div>
            </div>
          </div>
        )

      case "bookingLink":
        return (
          <div className="p-4 space-y-6">
            <p className="text-sm text-gray-600">
              Customers can book this service from your booking page. You can also link directly to this service or embed it inside a widget.
            </p>

            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-2">Direct link to book this service</h3>
                <p className="text-sm text-gray-600 mb-4">
                  You can copy and paste this link to share this service's booking form with your customers.
                </p>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value="https://widget.serviceflow.com/book/justwebagency?preselected=1"
                    readOnly
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-600 bg-gray-50"
                  />
                  <button className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50">
                    Copy
                  </button>
                  <button className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50">
                    View
                  </button>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-2">Embed this service</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Embed the booking page for this service on your website. Choose from four different embed widgets.
                </p>
                <button className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50">
                  Embed Service
                </button>
              </div>
            </div>
          </div>
        )

      case "details":
        return (
          <div className="p-4 space-y-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={serviceData.name}
                  onChange={(e) => setServiceData({ ...serviceData, name: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={serviceData.description}
                  onChange={(e) => setServiceData({ ...serviceData, description: e.target.value })}
                  placeholder="Optional"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 h-24"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <div className="relative">
                  <select
                    value={serviceData.category_id || ""}
                    onChange={(e) => {
                      const selectedCategoryId = e.target.value;
                      console.log('🔄 Category dropdown changed:', selectedCategoryId);
                      console.log('🔄 Available categories:', categories);
                      const selectedCategory = categories.find(cat => cat.id == selectedCategoryId);
                      console.log('🔄 Selected category object:', selectedCategory);
                      setServiceData({ 
                        ...serviceData, 
                        category: selectedCategory ? selectedCategory.name : "",
                        category_id: selectedCategoryId || null
                      });
                      console.log('🔄 Updated serviceData.category:', selectedCategory ? selectedCategory.name : "");
                    }}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    disabled={categoriesLoading}
                  >
                    <option value="">Select a category</option>
                    {Array.isArray(categories) && categories.length > 0 ? (
                      categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))
                    ) : (
                      <option value="" disabled>
                        {categoriesLoading ? 'Loading categories...' : 'No categories available'}
                      </option>
                    )}
                  </select>
                  {categoriesLoading && (
                    <div className="absolute right-3 top-2.5">
                      <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                    </div>
                  )}
                </div>
                {/* Category display/input */}
                <div className="mt-2">
                  {serviceData.category ? (
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={serviceData.category}
                        onChange={(e) => setServiceData({ 
                          ...serviceData, 
                          category: e.target.value,
                          category_id: null // Clear category_id when typing new category
                        })}
                        placeholder="Category name"
                        className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm"
                      />
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        {serviceData.category_id ? 'From dropdown' : 'Custom'}
                      </span>
                    </div>
                  ) : (
                    <input
                      type="text"
                      value={serviceData.category}
                      onChange={(e) => setServiceData({ 
                        ...serviceData, 
                        category: e.target.value,
                        category_id: null // Clear category_id when typing new category
                      })}
                      placeholder="Type a new category name"
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    />
                  )}
                </div>
              </div>

              <div className="flex gap-4 items-start">
                <div className="flex-1">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">Base Price and Duration</label>
                    <div className="flex gap-4 mb-3">
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Base duration <HelpCircle className="inline-block w-4 h-4 text-gray-400" /></label>
                        <div className="flex gap-2">
                          <input
                            type="number"
                            value={Math.floor(serviceData.duration / 60)}
                            onChange={(e) => {
                              const hours = parseInt(e.target.value) || 0
                              const minutes = serviceData.duration % 60
                              setServiceData({ ...serviceData, duration: hours * 60 + minutes })
                            }}
                            onFocus={(e) => {
                              e.target.select()
                              // Clear default values when focusing
                              if (e.target.value === '0') {
                                e.target.value = ''
                              }
                            }}
                            className="w-20 border border-gray-300 rounded-md px-2 py-1"
                          />
                          <span className="text-sm text-gray-600 py-1">hours</span>
                          <input
                            type="number"
                            value={serviceData.duration % 60}
                            onChange={(e) => {
                              const hours = Math.floor(serviceData.duration / 60)
                              const minutes = parseInt(e.target.value) || 0
                              setServiceData({ ...serviceData, duration: hours * 60 + minutes })
                            }}
                            onFocus={(e) => {
                              e.target.select()
                              // Clear default values when focusing
                              if (e.target.value === '0' || e.target.value === '30') {
                                e.target.value = ''
                              }
                            }}
                            className="w-20 border border-gray-300 rounded-md px-2 py-1"
                          />
                          <span className="text-sm text-gray-600 py-1">minutes</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Base price <HelpCircle className="inline-block w-4 h-4 text-gray-400" /></label>
                        <div className="flex gap-2">
                          <span className="text-sm text-gray-600 py-1">$</span>
                          <input
                            type="number"
                            value={serviceData.price}
                            onChange={(e) => setServiceData({ ...serviceData, price: parseFloat(e.target.value) || 0 })}
                            onFocus={(e) => {
                              e.target.select()
                              // Clear default values when focusing
                              if (e.target.value === '0' || e.target.value === '0.00') {
                                e.target.value = ''
                              }
                            }}
                            className="w-20 border border-gray-300 rounded-md px-2 py-1"
                            disabled={serviceData.isFree}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="mt-3">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={serviceData.isFree}
                          onChange={(e) => setServiceData({ ...serviceData, isFree: e.target.checked })}
                          className="rounded border-gray-300 text-blue-600"
                        />
                        <span className="ml-2 text-sm text-gray-600">This service is free</span>
                      </label>
                    </div>
                  </div>

                  <div className="mt-6">
                    <label className="block text-sm font-medium text-gray-700 mb-3">Booking page behavior</label>
                    <div className="grid grid-cols-3 gap-4">
                      <div className={`border rounded-lg p-4 cursor-pointer ${serviceData.bookingType === 'bookable' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}
                        onClick={() => setServiceData({ ...serviceData, bookingType: 'bookable' })}>
                        <div className="flex justify-center mb-2">📅</div>
                        <h3 className="text-sm font-medium text-center mb-1">Bookable</h3>
                        <p className="text-xs text-gray-500 text-center">Customers can directly book available times for this service.</p>
                      </div>
                      <div className={`border rounded-lg p-4 cursor-pointer ${serviceData.bookingType === 'request' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}
                        onClick={() => setServiceData({ ...serviceData, bookingType: 'request' })}>
                        <div className="flex justify-center mb-2">🗓️</div>
                        <h3 className="text-sm font-medium text-center mb-1">Booking Request</h3>
                        <p className="text-xs text-gray-500 text-center">Customers propose multiple times, and you confirm one.</p>
                      </div>
                      <div className={`border rounded-lg p-4 cursor-pointer ${serviceData.bookingType === 'quote' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}
                        onClick={() => setServiceData({ ...serviceData, bookingType: 'quote' })}>
                        <div className="flex justify-center mb-2">💰</div>
                        <h3 className="text-sm font-medium text-center mb-1">Quote Request</h3>
                        <p className="text-xs text-gray-500 text-center">Customers provide details, and you send them a custom price quote.</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6">
                    <label className="block text-sm font-medium text-gray-700 mb-3">Price display options</label>
                    <p className="text-sm text-gray-500 mb-3">Control how pricing should be displayed to customers.</p>
                    
                    <div className="mb-3">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={serviceData.hidePrice}
                          onChange={(e) => setServiceData({ ...serviceData, hidePrice: e.target.checked })}
                          className="rounded border-gray-300 text-blue-600"
                        />
                        <span className="ml-2 text-sm text-gray-600">Don't show price when booking online</span>
                      </label>
                    </div>

                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Display prefix <HelpCircle className="inline-block w-4 h-4 text-gray-400" /></label>
                      <input
                        type="text"
                        value={serviceData.displayPrefix}
                        onChange={(e) => setServiceData({ ...serviceData, displayPrefix: e.target.value })}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 mb-1"
                      />
                      <p className="text-sm text-gray-500">${serviceData.price}</p>
                    </div>
                  </div>

                  <div className="mt-6">
                    <label className="block text-sm font-medium text-gray-700 mb-3">Taxes</label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={serviceData.isTaxable}
                        onChange={(e) => setServiceData({ ...serviceData, isTaxable: e.target.checked })}
                        className="rounded border-gray-300 text-blue-600"
                      />
                      <span className="ml-2 text-sm text-gray-600">This service is taxable</span>
                    </label>
                  </div>

                  {/* Save Button */}
                  <div className="mt-8 pt-6 border-t border-gray-200">
                    <button
                      onClick={() => handleSaveService()}
                      disabled={saving}
                      className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                    >
                      {saving ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Saving...</span>
                        </>
                      ) : (
                        <span>Save Changes</span>
                      )}
                    </button>
                  </div>
                </div>

                <div className="w-48">
                  <div className={`border border-dashed border-gray-300 rounded-lg p-6 text-center relative ${imageUploading ? 'opacity-50 pointer-events-none' : ''}`}>
                    {imageUploading && (
                      <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center rounded-lg z-10">
                        <div className="text-center">
                          <Loader2 className="w-6 h-6 animate-spin text-blue-600 mx-auto mb-2" />
                          <p className="text-sm text-gray-600">Uploading...</p>
                        </div>
                      </div>
                    )}
                    {serviceData.image ? (
                      <div className="relative">
                        <img 
                          src={serviceData.image} 
                          alt={serviceData.name}
                          className="w-full h-32 object-cover rounded-lg mb-2"
                        />
                        <button
                          onClick={() => handleRemoveImage()}
                          disabled={imageUploading}
                          className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          ×
                        </button>
                      </div>
                    ) : (
                      <>
                        <Camera className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <label className={`text-sm text-blue-600 font-medium cursor-pointer ${imageUploading ? 'pointer-events-none' : ''}`}>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleImageUpload}
                            disabled={imageUploading}
                            className="hidden"
                          />
                          {imageUploading ? 'Uploading...' : 'Add an image'}
                        </label>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )

      case "modifiers":
        console.log('🔍 Rendering modifiers section')
        console.log('🔍 serviceData.modifiers:', serviceData.modifiers)
        console.log('🔍 serviceData.modifiers type:', typeof serviceData.modifiers)
        console.log('🔍 serviceData.modifiers is array?', Array.isArray(serviceData.modifiers))
        console.log('🔍 serviceData.modifiers length:', Array.isArray(serviceData.modifiers) ? serviceData.modifiers.length : 'not an array')
        console.log('🔍 serviceData:', serviceData)
        return (
          <div className="p-4 space-y-6">
            <p className="text-sm text-gray-600">Service modifiers are groups of options that can adjust this service's price and duration when selected.</p>
            <a href="#" className="text-sm text-blue-600 hover:text-blue-700 flex items-center">
              <Info className="w-4 h-4 mr-1" />
              Learn more about service modifiers
            </a>

            <div className="space-y-4">
              {(() => {
                const hasModifiers = serviceData.modifiers && Array.isArray(serviceData.modifiers) && serviceData.modifiers.length > 0;
                console.log('🔍 Modifiers condition check:', {
                  hasModifiers,
                  modifiers: serviceData.modifiers,
                  isArray: Array.isArray(serviceData.modifiers),
                  length: Array.isArray(serviceData.modifiers) ? serviceData.modifiers.length : 'not an array'
                });
                return hasModifiers;
              })() ? (
                serviceData.modifiers.filter(modifier => modifier && modifier.id).map((modifier, index) => (
                <div key={modifier.id} className="border border-gray-200 rounded-lg">
                  <div className="flex items-center justify-between p-4">
                    <div className="flex items-center space-x-3">
                      <span className="text-gray-400">⋮⋮</span>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">{modifier.title}</span>
                          {modifier.required && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                              Required
                            </span>
                          )}
                        </div>
                        {modifier.selectionType && (
                          <p className="text-sm text-gray-500 mt-1">
                            {modifier.selectionType === 'single' ? 'Single Select' : 
                             modifier.selectionType === 'multi' ? 'Multi-Select' : 
                             modifier.selectionType === 'quantity' ? 'Quantity Select' : 'Select'}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleCopyModifier(modifier)}
                        className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                        title="Copy modifier"
                      >
                        {copiedModifier === modifier.id ? (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                      <button 
                        onClick={() => handleEditModifier(modifier)}
                        className="text-sm text-gray-600 hover:text-gray-800"
                      >
                        Edit
                      </button>
                      <button 
                        onClick={() => handleDeleteModifier(modifier.id)}
                        className="text-sm text-gray-600 hover:text-gray-800"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  <div className="px-4 pb-4">
                    <div className="flex flex-wrap gap-2">
                        {(modifier.options && Array.isArray(modifier.options) ? modifier.options : []).map((option, optionIndex) => (
                        <div key={optionIndex} className="bg-gray-100 rounded-full px-3 py-1 text-sm flex items-center space-x-2">
                          {option.image && (
                            <img
                              src={option.image}
                              alt={option.label}
                              className="w-4 h-4 object-cover rounded-full"
                            />
                          )}
                          <span>{option.label}</span>
                          {option.price && <span className="text-gray-500 ml-1">${option.price}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>No modifiers added yet.</p>
                  <p className="text-sm mt-1">Click "New Modifier Group" to add your first modifier.</p>
                </div>
              )}
            </div>

            {/* Customer Preview Section */}
            {serviceData.modifiers && Array.isArray(serviceData.modifiers) && serviceData.modifiers.length > 0 && (
              <div className="border-t border-gray-200 pt-6">
                <div className="mb-4">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Customer Preview</h3>
                  <p className="text-sm text-gray-600">This is how your modifiers will appear to customers during booking.</p>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-6">
                  <ServiceModifiersForm 
                    modifiers={serviceData.modifiers}
                    selectedModifiers={defaultModifierSelections}
                    onModifiersChange={handleModifiersChange}
                    onSave={handleSaveModifiers}
                    isEditable={true}
                    isSaving={savingModifiers}
                    editedModifierPrices={editedModifierPrices}
                    onModifierPriceChange={(priceKey, value) => {
                      console.log('🔧 SERVICE DETAILS: Modifier price change:', priceKey, '=', value);
                      setEditedModifierPrices(prev => ({
                        ...prev,
                        [priceKey]: value
                      }));
                    }}
                  />
                </div>
              </div>
            )}

            <button 
              onClick={() => {
                setEditingModifier(null)
                setIsCreateModifierGroupModalOpen(true)
              }}
              className="w-full border border-gray-300 rounded-lg p-3 text-center text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              New Modifier Group
            </button>
          </div>
        )

      default:
        return null
    }
  }

  const handleSaveRecurringOption = (recurringOption) => {
    setRecurringOptions(prev => [...prev, recurringOption])
  }

  const handleSaveTerritoryRule = (rule) => {
    setTerritoryRules(prev => [...prev, rule])
  }

  const allSections = [
    {
      id: "details",
      icon: Settings,
      title: "Service Details",
      description: "Name, description, duration, and price",
    },
    {
      id: "modifiers",
      icon: Sliders,
      title: "Service Modifiers",
      description: "Add selectable options that can adjust this service's price and duration",
      badge: modifiersChanged ? "Unsaved Changes" : `${(serviceData.modifiers && Array.isArray(serviceData.modifiers) ? serviceData.modifiers.length : 0)} Modifier Group${(serviceData.modifiers && Array.isArray(serviceData.modifiers) ? serviceData.modifiers.length : 0) !== 1 ? 's' : ''}`
    },
    {
      id: "intake",
      icon: ListChecks,
      title: "Intake Questions",
      description: "Add custom form fields to collect additional info",
      badge: intakeQuestionsChanged ? "Unsaved Changes" : `${(serviceData.intakeQuestions && Array.isArray(serviceData.intakeQuestions) ? serviceData.intakeQuestions.length : 0)} Question${(serviceData.intakeQuestions && Array.isArray(serviceData.intakeQuestions) ? serviceData.intakeQuestions.length : 0) !== 1 ? 's' : ''}`
    },
    // TODO: Integrate availability functionality
    // {
    //   id: "availability",
    //   icon: Clock,
    //   title: "Availability",
    //   description: "Use your business's default hours, or show custom timeslots for this service"
    // },
    // TODO: Integrate team requirements functionality
    // {
    //   id: "team",
    //   icon: ClipboardList,
    //   title: "Team Requirements & Assignment Options",
    //   description: "Add required skills and customize how jobs should be assigned for this service"
    // },
    // TODO: Integrate recurring options functionality
    // {
    //   id: "recurring",
    //   icon: RefreshCw,
    //   title: "Recurring Options",
    //   description: "Give customers the option to book this service as a recurring appointment"
    // },
    // TODO: Integrate territory adjustments functionality
    // {
    //   id: "territory",
    //   icon: ArrowUpDown,
    //   title: "Territory Adjustments",
    //   description: "Customize pricing for this service based on which territory it's booked in"
    // },
    // TODO: Integrate payments functionality
    // {
    //   id: "payments",
    //   icon: CreditCard,
    //   title: "Payments",
    //   description: "No payment method required"
    // },
    // TODO: Integrate how it works, FAQ, testimonials functionality
    // {
    //   id: "howItWorks",
    //   icon: FileText,
    //   title: "How it Works, FAQ, Testimonials, & Highlights",
    //   description: "Showcase attributes about this service or your business when customers book online"
    // },
    // TODO: Integrate booking page functionality
    // {
    //   id: "bookingPage",
    //   icon: Globe,
    //   title: "Booking Page",
    //   description: "Hidden on booking page • Default confirmation message"
    // },
    // TODO: Integrate booking link & widgets functionality
    // {
    //   id: "bookingLink",
    //   icon: ExternalLink,
    //   title: "Booking Link & Widgets",
    //   description: "Embed this service in a booking widget or link directly to it"
    // }
  ]

  // Filter out hidden sections - not needed when sections are commented out
  // const sections = allSections.filter(section => !isSectionHidden(section.id))
  const sections = allSections

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Image Upload Loading Overlay */}
      {imageUploading && (
        <div className="fixed inset-0 bg-black bg-opacity-25 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 shadow-lg">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
              <p className="text-lg font-medium text-gray-900 mb-2">Uploading Image</p>
              <p className="text-sm text-gray-600">Please wait while we upload your image...</p>
            </div>
          </div>
        </div>
      )}

      {/* Main Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} activePage="services" />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header */}
        <MobileHeader onMenuClick={() => setSidebarOpen(true)} />

        {/* Header */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="py-4">
              <button
                onClick={() => navigate("/services")}
                className="flex items-center text-sm text-gray-500 hover:text-gray-700"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Services
              </button>
              <h1 className="text-2xl font-semibold text-gray-900 mt-2">
                {serviceData.name}
              </h1>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {/* Error Display */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="w-5 h-5 text-red-500" />
                  <p className="text-red-700">{error}</p>
                </div>
                <button
                  onClick={loadServiceData}
                  className="mt-2 text-red-600 hover:text-red-700 text-sm font-medium"
                >
                  Try again
                </button>
              </div>
            )}

            {/* Success Display */}
            {successMessage && (
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center space-x-2">
                  <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <p className="text-green-700">{successMessage}</p>
                </div>
              </div>
            )}

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
                  <p className="text-gray-600">Loading service details...</p>
                </div>
              </div>
            ) : error && error.includes("not found") ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Service Not Found</h3>
                  <p className="text-gray-500 mb-4">The service you're looking for doesn't exist or has been deleted.</p>
                  <button
                    onClick={() => navigate('/services')}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Back to Services
                  </button>
                </div>
              </div>
            ) : (
            <div className="space-y-4">
              {sections.map((section) => (
                <div key={section.id} className="bg-white rounded-lg border border-gray-200">
                  <button
                    onClick={() => toggleSection(section.id)}
                    className="w-full p-4 text-left group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <section.icon className="w-5 h-5 text-gray-400 group-hover:text-gray-500" />
                        <div>
                          <h2 className="text-sm font-medium text-gray-900 flex items-center space-x-2">
                            <span>{section.title}</span>
                            {section.badge && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                {section.badge}
                              </span>
                            )}
                          </h2>
                          <p className="text-sm text-gray-500 mt-0.5">{section.description}</p>
                        </div>
                      </div>
                      <ChevronDown
                        className={`w-5 h-5 text-gray-400 group-hover:text-gray-500 transition-transform ${
                          expandedSection === section.id ? "transform rotate-180" : ""
                        }`}
                      />
                    </div>
                  </button>
                  {expandedSection === section.id && renderSectionContent(section)}
                </div>
              ))}
            </div>
            )}
          </div>
        </div>
      </div>

      <CreateModifierGroupModal
        isOpen={isCreateModifierGroupModalOpen}
        onClose={() => {
          setIsCreateModifierGroupModalOpen(false)
          setEditingModifier(null)
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
      {isSkillTagModalOpen && <SkillTagModal />}
      <CreateRecurringOptionModal
        isOpen={isRecurringModalOpen}
        onClose={() => setIsRecurringModalOpen(false)}
        onSave={handleSaveRecurringOption}
      />
      <TerritoryAdjustmentModal
        isOpen={isTerritoryModalOpen}
        onClose={() => setIsTerritoryModalOpen(false)}
        onSave={handleSaveTerritoryRule}
      />
    </div>
  )
}

export default ServiceDetails 