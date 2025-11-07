"use client"

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Search, 
  Plus, 
  X, 
  Calendar, 
  Clock, 
  MapPin, 
  Users, 
  ChevronDown, 
  ChevronUp,
  ChevronRight,
  User,
  Briefcase,
  FileText,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  Edit,
  DollarSign,
  Calculator,
  Phone,
  Mail,
  Home,
  CreditCard,
  Bell,
  UserCheck,
  Settings,
  Info,
  Trash2,
  MessageSquare,
  Paperclip,
  Award,
  Tag,
  Star,
  Zap,
  Shield,
  Target,
  Navigation,
  Package,
  Tool,
  Wrench,
  Paintbrush,
  Leaf,
  Sparkles,
  MoreVertical,
  ExternalLink,
  Printer,
  Send,
  Edit3,
  Copy,
  Menu,
  Building,
  Truck,
  Clipboard
} from 'lucide-react';
import CustomerModal from "../components/customer-modal";
import ServiceModal from "../components/service-modal";
import ServiceAddressModal from "../components/service-address-modal";
import PaymentMethodModal from "../components/payment-method-modal";
import TerritorySelectionModal from "../components/territory-selection-modal";
import AddressAutocomplete from "../components/address-autocomplete";
import IntakeQuestionsForm from "../components/intake-questions-form";
import ServiceModifiersForm from "../components/service-modifiers-form";
import ServiceCustomizationPopup from "../components/service-customization-popup";
import ServiceSelectionModal from "../components/service-selection-modal";
import CreateServiceModal from "../components/create-service-modal";
import CalendarPicker from "../components/CalendarPicker";
import { useNavigate } from 'react-router-dom';
import { jobsAPI, customersAPI, servicesAPI, teamAPI, territoriesAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useCategory } from '../context/CategoryContext';
import { getImageUrl, handleImageError } from '../utils/imageUtils';
import { formatDateLocal, formatDateDisplay, parseLocalDate } from '../utils/dateUtils';
import { formatPhoneNumber } from '../utils/phoneFormatter';


export default function CreateJobPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { selectedCategoryId, selectedCategoryName } = useCategory();
  const [jobselected, setJobselected] = useState(false);
  const [serviceSelected, setServiceSelected] = useState(false);
  // Debug category context
  console.log('🔧 CreateJob - selectedCategoryId:', selectedCategoryId);
  console.log('🔧 CreateJob - selectedCategoryName:', selectedCategoryName);
  console.log('🔧 CreateJob - localStorage selectedCategoryId:', localStorage.getItem('selectedCategoryId'));
  console.log('🔧 CreateJob - localStorage selectedCategoryName:', localStorage.getItem('selectedCategoryName'));
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showTerritoryModal, setShowTerritoryModal] = useState(false);
  const [showServiceCustomizationPopup, setShowServiceCustomizationPopup] = useState(false);
  const [showServiceSelectionModal, setShowServiceSelectionModal] = useState(false);
  const [showCreateServiceModal, setShowCreateServiceModal] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Form data
  const [formData, setFormData] = useState({
    customerId: "",
    serviceId: "",
    teamMemberId: "",
    scheduledDate: "",
    scheduledTime: "09:00",
    notes: "",
    status: "pending",
    duration: 360, // Default 6 hours in minutes
    workers: 0,
    skillsRequired: 0,
    price: 0,
    discount: 0,
    additionalFees: 0,
    taxes: 0,
    total: 0,
    paymentMethod: "",
    territory: "",
    recurringJob: false,
    scheduleType: "one-time",
    letCustomerSchedule: false,
    offerToProviders: false,
    internalNotes: "",
    serviceAddress: {
      street: "",
      city: "",
      state: "",
      zipCode: "",
      country: "USA"
    },
    contactInfo: {
      phone: "",
      email: "",
      emailNotifications: true,
      textNotifications: false
    },
    // Additional fields for comprehensive job creation
    serviceName: "",
    invoiceStatus: "draft",
    paymentStatus: "pending",
    priority: "normal",
    estimatedDuration: 0,
    skills: [],
    specialInstructions: "",
    customerNotes: "",
    internalNotes: "",
    tags: [],
    attachments: [],
    recurringFrequency: "weekly",
    recurringEndDate: "",
    autoInvoice: true,
    autoReminders: true,
    customerSignature: false,
    photosRequired: false,
    qualityCheck: true,
    // Service modifiers and intake questions
    serviceModifiers: [],
    serviceIntakeQuestions: [],
    intakeQuestionIdMapping: {}
  });

  // Data lists
  const [customers, setCustomers] = useState([]);
  const [services, setServices] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [filteredServices, setFilteredServices] = useState([]);

  // UI state
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const customerDropdownRef = useRef(null);
  const [showTeamDropdown, setShowTeamDropdown] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");
  const [serviceSearch, setServiceSearch] = useState("");

  // Selected items
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [selectedServices, setSelectedServices] = useState([]); // Multiple services
  const [selectedService, setSelectedService] = useState(null); // Keep for backward compatibility
  const [selectedTeamMember, setSelectedTeamMember] = useState(null);
  const [selectedTeamMembers, setSelectedTeamMembers] = useState([]); // Multiple team members
  const [detectedTerritory, setDetectedTerritory] = useState(null);
  const [territories, setTerritories] = useState([]);
  const [territoriesLoading, setTerritoriesLoading] = useState(false);
  const [addressAutoPopulated, setAddressAutoPopulated] = useState(false);
  
  // Service modifiers and intake questions state
  const [selectedModifiers, setSelectedModifiers] = useState({}); // { modifierId: selectedOptions[] }
  const [intakeQuestionAnswers, setIntakeQuestionAnswers] = useState({}); // { questionId: answer }
  const [calculationTrigger, setCalculationTrigger] = useState(0); // Trigger for recalculations
  const [editedModifierPrices, setEditedModifierPrices] = useState({}); // { modifierId_optionId: price }

  // Expandable sections
  const [expandedSections, setExpandedSections] = useState({
    basicInfo: true,
    serviceDetails: true,
    pricing: true,
    team: false,
    contact: false,
    address: false,
    notes: false,
    advanced: false,
    notifications: false
  });

  // Status options
  const statusOptions = [
    { key: 'pending', label: 'Pending', color: 'bg-yellow-400' },
    { key: 'confirmed', label: 'Confirmed', color: 'bg-blue-400' },
    { key: 'in-progress', label: 'In Progress', color: 'bg-orange-400' },
    { key: 'completed', label: 'Completed', color: 'bg-green-400' },
    { key: 'cancelled', label: 'Cancelled', color: 'bg-red-400' }
  ];

  // Priority options
  const priorityOptions = [
    { key: 'low', label: 'Low', color: 'bg-gray-400' },
    { key: 'normal', label: 'Normal', color: 'bg-blue-400' },
    { key: 'high', label: 'High', color: 'bg-orange-400' },
    { key: 'urgent', label: 'Urgent', color: 'bg-red-400' }
  ];

  // Recurring frequency options
  const recurringOptions = [
    { key: 'weekly', label: 'Weekly' },
    { key: 'bi-weekly', label: 'Bi-weekly' },
    { key: 'monthly', label: 'Monthly' },
    { key: 'quarterly', label: 'Quarterly' },
    { key: 'yearly', label: 'Yearly' }
  ];

  useEffect(() => {
    if (user?.id) {
      loadData();
    }
  }, [user?.id]);

  useEffect(() => {
    // Filter customers based on search
    if (customerSearch) {
      const filtered = (customers || []).filter(customer =>
        `${customer.first_name} ${customer.last_name}`.toLowerCase().includes(customerSearch.toLowerCase()) ||
        customer.email?.toLowerCase().includes(customerSearch.toLowerCase())
      );
      setFilteredCustomers(filtered);
      // Show dropdown when there's a search term
      if (filtered.length > 0) {
        setShowCustomerDropdown(true);
      }
    } else {
      setFilteredCustomers(customers || []);
      setShowCustomerDropdown(false);
    }
  }, [customerSearch, customers]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (customerDropdownRef.current && !customerDropdownRef.current.contains(event.target)) {
        setShowCustomerDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    // Filter services based on search
    if (serviceSearch) {
      const filtered = (services || []).filter(service =>
        service.name?.toLowerCase().includes(serviceSearch.toLowerCase()) ||
        service.description?.toLowerCase().includes(serviceSearch.toLowerCase())
      );
      setFilteredServices(filtered);
    } else {
      setFilteredServices(services || []);
    }
  }, [serviceSearch, services]);


  // Calculate total price including modifiers
  const calculateTotalPrice = useCallback(() => {
    try {
      let basePrice = 0;
      
      // Calculate base price from all selected services
      selectedServices.forEach(service => {
        basePrice += parseFloat(service.price) || 0;
      });
      
      let modifierPrice = 0;
      
      console.log('🔧 CALC: Starting - Base:', basePrice);
      console.log('🔧 CALC: selectedModifiers:', selectedModifiers);
      console.log('🔧 CALC: selectedModifiers keys:', Object.keys(selectedModifiers));
      console.log('🔧 CALC: selectedModifiers values:', Object.values(selectedModifiers));
      console.log('🔧 CALC: editedModifierPrices:', editedModifierPrices);
      console.log('🔧 CALC: formData.serviceModifiers:', formData.serviceModifiers);
      
      // Add prices from selected modifiers
      console.log('🔧 CALC: Processing', Object.keys(selectedModifiers).length, 'modifiers');
      Object.entries(selectedModifiers).forEach(([modifierId, modifierData]) => {
        console.log('🔧 CALC: Processing modifier', modifierId, 'with data:', modifierData);
        
        // ✅ FIX 3: Standardize modifier data access with string comparison
        const modifier = formData.serviceModifiers?.find(m => 
          String(m.id) === String(modifierId)  // String comparison for safety
        );
        
        if (!modifier) {
          console.log('🔧 CALC: Modifier not found:', modifierId);
          return;
        }
        
        console.log('🔧 CALC: Found modifier:', modifier.title, 'type:', modifier.selectionType);
        
        if (modifier.selectionType === 'quantity') {
          // ✅ FIX 4: Handle both data structures
          const quantities = modifierData.quantities || modifierData;
          
          Object.entries(quantities).forEach(([optionId, quantity]) => {
            const option = modifier.options?.find(o => 
              String(o.id) === String(optionId)
            );
            
            if (option && quantity > 0) {
              // ✅ FIX 5: Always check editedModifierPrices first
              const priceKey = `${modifierId}_option_${optionId}`;
              const price = editedModifierPrices[priceKey] !== undefined 
                ? editedModifierPrices[priceKey] 
                : (parseFloat(option.price) || 0);
              
              const total = price * quantity;
              modifierPrice += total;
              
              console.log(`🔧 CALC: ${option.title} - Price: $${price} x ${quantity} = $${total}`);
            }
          });
        } else if (modifier.selectionType === 'multi') {
          const selections = modifierData.selections || 
                            (Array.isArray(modifierData) ? modifierData : [modifierData]);
          
          selections.forEach(optionId => {
            const option = modifier.options?.find(o => 
              String(o.id) === String(optionId)
            );
            
            if (option) {
              const priceKey = `${modifierId}_option_${optionId}`;
              const price = editedModifierPrices[priceKey] !== undefined 
                ? editedModifierPrices[priceKey] 
                : (parseFloat(option.price) || 0);
              
              modifierPrice += price;
              console.log(`🔧 CALC: ${option.title} - Price: $${price}`);
            }
          });
        } else {
          // Single selection
          const selectedOptionId = modifierData.selection || modifierData;
          const option = modifier.options?.find(o => 
            String(o.id) === String(selectedOptionId)
          );
          
          if (option) {
            const priceKey = `${modifierId}_option_${selectedOptionId}`;
            const price = editedModifierPrices[priceKey] !== undefined 
              ? editedModifierPrices[priceKey] 
              : (parseFloat(option.price) || 0);
            
            modifierPrice += price;
            console.log(`🔧 CALC: ${option.title} - Price: $${price}`);
          }
        }
      });
      
      const totalPrice = basePrice + modifierPrice;
      console.log('🔧 CALC: Final - Base:', basePrice, 'Modifiers:', modifierPrice, 'Total:', totalPrice);
      return totalPrice;
    } catch (error) {
      console.error('Error calculating total price:', error);
      return 0;
    }
  }, [selectedServices, selectedModifiers, editedModifierPrices, formData.serviceModifiers]);

  // ✅ FIX 6: Update effect to recalculate on all relevant changes
  useEffect(() => {
    if (selectedServices.length > 0) {
      const newTotalPrice = calculateTotalPrice();
      const discount = parseFloat(formData.discount) || 0;
      const additionalFees = parseFloat(formData.additionalFees) || 0;
      const taxes = parseFloat(formData.taxes) || 0;
      
      const subtotal = newTotalPrice - discount + additionalFees;
      const total = subtotal + taxes;
      
      console.log('🔧 EFFECT: Updating prices - Price:', newTotalPrice, 'Total:', total);
      
      setFormData(prev => ({
        ...prev,
        price: newTotalPrice,
        total: total
      }));
    } else {
      // Reset when no services are selected
      setFormData(prev => ({ 
        ...prev, 
        price: 0,
        total: 0,
        serviceName: '',
        duration: 0,
        estimatedDuration: 0
      }));
    }
  }, [
    selectedServices, 
    selectedModifiers, 
    editedModifierPrices, 
    formData.discount, 
    formData.additionalFees, 
    formData.taxes,
    formData.serviceModifiers,
    calculateTotalPrice
  ]);

  // Sync modifiers and intake questions when services change
  useEffect(() => {
    if (selectedServices.length === 0) {
      // No services selected, clear everything
      setFormData(prev => ({
        ...prev,
        serviceModifiers: [],
        serviceIntakeQuestions: []
      }));
      setSelectedModifiers({});
      setIntakeQuestionAnswers({});
      return;
    }
    
    // Combine modifiers and intake questions from all selected services
    let allModifiers = [];
    let allIntakeQuestions = [];
    
    selectedServices.forEach(service => {
      // Process modifiers
      if (service.modifiers) {
        try {
          let serviceModifiers = [];
          if (typeof service.modifiers === 'string') {
            serviceModifiers = JSON.parse(service.modifiers);
          } else if (Array.isArray(service.modifiers)) {
            serviceModifiers = service.modifiers;
          }
          
          // Add service ID to each modifier for identification
          const modifiersWithServiceId = serviceModifiers.map(modifier => ({
            ...modifier,
            serviceId: service.id
          }));
          
          allModifiers = [...allModifiers, ...modifiersWithServiceId];
        } catch (error) {
          console.error(`Error parsing modifiers for service ${service.name}:`, error);
        }
      }
      
      // Process intake questions - check both field names
      const intakeQuestionsData = service.intake_questions || service.intakeQuestions;
      if (intakeQuestionsData) {
        try {
          let serviceIntakeQuestions = [];
          if (typeof intakeQuestionsData === 'string') {
            serviceIntakeQuestions = JSON.parse(intakeQuestionsData);
          } else if (Array.isArray(intakeQuestionsData)) {
            serviceIntakeQuestions = intakeQuestionsData;
          }
          
          // Add service ID to each question for identification
          const questionsWithServiceId = serviceIntakeQuestions.map((question, index) => ({
            ...question,
            id: index + 1, // Normalize ID
            serviceId: service.id
          }));
          
          allIntakeQuestions = [...allIntakeQuestions, ...questionsWithServiceId];
        } catch (error) {
          console.error(`Error parsing intake questions for service ${service.name}:`, error);
        }
      }
    });
    
    // Update form data with combined modifiers and questions
    setFormData(prev => ({
      ...prev,
      serviceModifiers: allModifiers,
      serviceIntakeQuestions: allIntakeQuestions
    }));
    
    // Clear any selected modifiers that don't belong to current services
    setSelectedModifiers(prev => {
      const validModifierIds = allModifiers.map(m => m.id);
      const filteredModifiers = {};
      
      Object.entries(prev).forEach(([modifierId, modifierData]) => {
        if (validModifierIds.includes(parseInt(modifierId))) {
          filteredModifiers[modifierId] = modifierData;
        }
      });
      
      return filteredModifiers;
    });
    
    // Clear any intake answers that don't belong to current services
    setIntakeQuestionAnswers(prev => {
      const validQuestionIds = allIntakeQuestions.map(q => q.id);
      const filteredAnswers = {};
      
      Object.entries(prev).forEach(([questionId, answer]) => {
        if (validQuestionIds.includes(parseInt(questionId))) {
          filteredAnswers[questionId] = answer;
        }
      });
      
      return filteredAnswers;
    });
    
  }, [selectedServices]);





  const loadData = async () => {
    if (!user?.id) return;
    
    try {
      setDataLoading(true);
      const [customersData, servicesData, teamData, territoriesData] = await Promise.all([
        customersAPI.getAll(user.id),
        servicesAPI.getAll(user.id),
        teamAPI.getAll(user.id),
        territoriesAPI.getAll(user.id)
      ]);
      
      const services = servicesData.services || servicesData;
      
      
      setCustomers(customersData.customers || customersData);
      setServices(services);
      setTeamMembers(teamData.teamMembers || teamData);
      setTerritories(territoriesData.territories || territoriesData);
      setFilteredCustomers(customersData.customers || customersData);
      setFilteredServices(services);
    } catch (error) {
      console.error('Error loading data:', error);
      setError('Failed to load data. Please refresh the page.');
    } finally {
      setDataLoading(false);
    }
  };

  const handleCustomerSelect = async (customer) => {
    setSelectedCustomer(customer);
    setJobselected(true); // Show the form when customer is selected
    
    console.log('Customer selected:', customer);
    console.log('Customer address fields:', {
      address: customer.address,
      city: customer.city,
      state: customer.state,
      zip_code: customer.zip_code
    });
    
    // Helper function to validate that a string is not an email
    const isNotEmail = (str) => {
      if (!str) return true;
      // Email regex pattern
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return !emailPattern.test(str.trim());
    };
    
    // Helper function to validate that a string is not a phone number
    const isNotPhone = (str) => {
      if (!str) return true;
      // Phone regex pattern (matches various phone formats)
      const phonePattern = /^[\d\s()\-+]+$/;
      const digitsOnly = str.replace(/\D/g, '');
      // If it's all digits and has 10+ digits, it's likely a phone
      if (digitsOnly.length >= 10 && phonePattern.test(str)) {
        return false;
      }
      return true;
    };
    
    // Use separate address fields if available, otherwise parse the address string
    let parsedAddress = {
      street: "",
      city: "",
      state: "",
      zipCode: "",
      country: "USA"
    };
    
    let hasAddress = false;
    
    // Only use address fields - NEVER use email or phone
    // Check if we have valid address data (not email/phone)
    const validAddress = customer.address && isNotEmail(customer.address) && isNotPhone(customer.address);
    const validCity = customer.city && isNotEmail(customer.city) && isNotPhone(customer.city);
    const validState = customer.state && isNotEmail(customer.state) && isNotPhone(customer.state);
    const validZip = customer.zip_code && isNotEmail(customer.zip_code) && isNotPhone(customer.zip_code);
    
    if (validAddress || validCity || validState || validZip) {
      hasAddress = true;
      console.log('Valid address data found, parsing...');
      
      // Use separate fields if available
      if (validCity && validState && validZip) {
        console.log('Using separate address fields');
        parsedAddress.street = validAddress ? customer.address : "";
        parsedAddress.city = customer.city;
        parsedAddress.state = customer.state;
        parsedAddress.zipCode = customer.zip_code;
      } else if (validAddress) {
        console.log('Parsing address string:', customer.address);
        // Fallback to parsing address string if separate fields aren't available
        const addressParts = customer.address.split(',').map(part => part.trim());
        
        // Filter out any parts that look like emails or phone numbers
        const validAddressParts = addressParts.filter(part => 
          isNotEmail(part) && isNotPhone(part)
        );
        
        console.log('Valid address parts (filtered):', validAddressParts);
        
        if (validAddressParts.length >= 1) {
          parsedAddress.street = validAddressParts[0];
        }
        
        if (validAddressParts.length >= 2) {
          parsedAddress.city = validAddressParts[1];
        }
        
        if (validAddressParts.length >= 3) {
          // Handle state and zip code which might be together like "State 12345"
          const stateZipPart = validAddressParts[2];
          const stateZipMatch = stateZipPart.match(/^([A-Za-z\s]+)\s+(\d{5}(?:-\d{4})?)$/);
          
          if (stateZipMatch) {
            parsedAddress.state = stateZipMatch[1].trim();
            parsedAddress.zipCode = stateZipMatch[2];
          } else {
            // Check if it's just a zip code (all digits)
            if (/^\d{5}(-\d{4})?$/.test(stateZipPart)) {
              parsedAddress.zipCode = stateZipPart;
            } else if (isNotEmail(stateZipPart) && isNotPhone(stateZipPart)) {
              // If no zip code pattern, assume it's just state (only if not email/phone)
            parsedAddress.state = stateZipPart;
            }
          }
        }
      }
      
      // Only set address if we have at least a street or city
      if (!parsedAddress.street && !parsedAddress.city) {
        hasAddress = false;
        console.log('No valid address components found, skipping address auto-population');
      }
      
      console.log('Parsed address:', parsedAddress);
    }
    
    console.log('Final hasAddress:', hasAddress);
    console.log('Final parsedAddress:', parsedAddress);
    console.log('Setting service address to:', hasAddress ? parsedAddress : 'keeping previous');
    
    setFormData(prev => ({
      ...prev,
      customerId: customer.id,
      contactInfo: {
        phone: customer.phone || "",
        email: customer.email || "",
        emailNotifications: true,
        textNotifications: false
      },
      // Autopopulate service address from customer address if available (ONLY valid address fields)
      serviceAddress: hasAddress ? parsedAddress : prev.serviceAddress
    }));
    
    // Set flag to show address was auto-populated
    setAddressAutoPopulated(hasAddress);
    
    // Clear the flag after 3 seconds
    if (hasAddress) {
      setTimeout(() => setAddressAutoPopulated(false), 3000);
    }
    
    setShowCustomerDropdown(false);
    setCustomerSearch("");
  };

  const handleServiceSelect = (service) => {
    console.log('🔧 HANDLESERVICESELECT: Function called with service:', service.name);
    console.log('🔧 HANDLESERVICESELECT: Service price:', service.price);
    console.log('🔧 HANDLESERVICESELECT: Service originalPrice:', service.originalPrice);
    console.log('🔧 HANDLESERVICESELECT: Service selectedModifiers:', service.selectedModifiers);
    console.log('🔧 HANDLESERVICESELECT: Service intakeQuestionAnswers:', service.intakeQuestionAnswers);
    
    // Check if service is already selected
    const isAlreadySelected = selectedServices.some(s => s.id === service.id);
    if (isAlreadySelected) {
      return;
    }
    
    // Add service to selected services array
    console.log('🔧 HANDLESERVICESELECT: Adding service to selectedServices with price:', service.price);
    setSelectedServices(prev => {
      const updated = [...prev, service];
      console.log('🔧 HANDLESERVICESELECT: Updated selectedServices:', updated.map(s => ({ name: s.name, price: s.price, originalPrice: s.originalPrice })));
      return updated;
    });
    
    // Keep selectedService for backward compatibility (use the first selected service)
    setSelectedService(service);
    setServiceSelected(true); // Show the schedule section when service is selected
    
    // ✅ FIX 1: Properly handle edited modifier prices from modal
    if (service.editedModifierPrices) {
      console.log('🔧 SYNC: Adding editedModifierPrices from service:', service.editedModifierPrices);
      setEditedModifierPrices(prev => ({
        ...prev,
        ...service.editedModifierPrices  // Merge edited prices from modal
      }));
    }
    
    // Handle customized modifiers and intake questions from ServiceSelectionModal
    if (service.selectedModifiers) {
      console.log('🔧 HANDLESERVICESELECT: Updating selectedModifiers state:', service.selectedModifiers);
      console.log('🔧 HANDLESERVICESELECT: Current selectedModifiers before update:', selectedModifiers);
      setSelectedModifiers(prev => {
        const updated = {
          ...prev,
          ...service.selectedModifiers
        };
        console.log('🔧 HANDLESERVICESELECT: Updated selectedModifiers:', updated);
        return updated;
      });
    }
    
    // ✅ FIX 2: Trigger recalculation after adding service
    setCalculationTrigger(prev => prev + 1);
    
    if (service.intakeQuestionAnswers) {
      console.log('🔧 HANDLESERVICESELECT: Updating intakeQuestionAnswers state:', service.intakeQuestionAnswers);
      setIntakeQuestionAnswers(prev => ({
        ...prev,
        ...service.intakeQuestionAnswers
      }));
    }
    
    // Handle duration properly - services store duration in MINUTES
    let durationInMinutes = 60; // Default 1 hour
    if (service.duration) {
      if (typeof service.duration === 'object' && service.duration.hours !== undefined) {
        // New format: { hours: X, minutes: Y }
        durationInMinutes = (service.duration.hours * 60) + service.duration.minutes;
      } else if (typeof service.duration === 'number') {
        // Service duration is already in minutes
        durationInMinutes = service.duration;
      }
    }
    
    // Parse modifiers and intake questions if they exist
    let serviceModifiers = [];
    let serviceIntakeQuestions = [];
    
    if (service.modifiers) {
      try {
        let parsedModifiers;
        
        if (typeof service.modifiers === 'string') {
          // Try to parse as regular JSON first
          try {
            const firstParse = JSON.parse(service.modifiers);
            
            // If first parse is still a string, it's double-encoded
            if (typeof firstParse === 'string') {
              const secondParse = JSON.parse(firstParse);
              parsedModifiers = Array.isArray(secondParse) ? secondParse : [];
            } else {
              // First parse was successful and returned an object/array
              parsedModifiers = Array.isArray(firstParse) ? firstParse : [];
            }
          } catch (firstError) {
            parsedModifiers = [];
          }
        } else {
          parsedModifiers = service.modifiers;
        }
        
        serviceModifiers = parsedModifiers;
        
        // Ensure serviceModifiers is an array
        if (!Array.isArray(serviceModifiers)) {
          serviceModifiers = [];
        }
      } catch (error) {
        console.error('Error parsing service modifiers:', error);
        serviceModifiers = [];
      }
    }
    
    if (service.intakeQuestions || service.intake_questions) {
      try {
        let parsedQuestions;
        
        const intakeQuestionsData = service.intakeQuestions || service.intake_questions;
        if (typeof intakeQuestionsData === 'string') {
          // Try to parse as regular JSON first
                      try {
              parsedQuestions = JSON.parse(intakeQuestionsData);
            } catch (firstError) {
              // If first parse fails, try parsing again (double-escaped)
              try {
                parsedQuestions = JSON.parse(JSON.parse(intakeQuestionsData));
              } catch (secondError) {
                throw secondError;
              }
            }
        } else {
          parsedQuestions = intakeQuestionsData;
        }
        
        const originalQuestions = parsedQuestions;
        
        // Ensure originalQuestions is an array
        if (!Array.isArray(originalQuestions)) {
          serviceIntakeQuestions = [];
        } else {
          // Create a mapping from normalized IDs to original IDs
          const idMapping = {};
          serviceIntakeQuestions = originalQuestions.map((question, index) => {
            const normalizedId = index + 1;
            idMapping[normalizedId] = question.id; // Map normalized ID to original ID
            return {
              ...question,
              id: normalizedId // Use normalized ID for frontend
            };
          });
          
          // Store the ID mapping for later use when sending to backend
          setFormData(prev => ({ ...prev, intakeQuestionIdMapping: idMapping }));
        }
      } catch (error) {
        console.error('Error parsing service intake questions:', error);
        serviceIntakeQuestions = [];
      }
    }
    
    // Check if we have modifier definitions from the modal
    console.log('🔧 HANDLESERVICESELECT: Checking for modifier definitions:');
    console.log('🔧 service.serviceModifiers:', service.serviceModifiers);
    console.log('🔧 service.parsedModifiers:', service.parsedModifiers);
    console.log('🔧 serviceModifiers array:', serviceModifiers);
    
    setFormData(prev => ({
      ...prev,
      serviceId: service.id,
      price: service.price || 0,
      duration: durationInMinutes, // Store in minutes
      workers: selectedTeamMembers.length > 0 ? selectedTeamMembers.length : (service.workers || 0),
      skillsRequired: service.skills || 0,
      serviceName: service.name,
      estimatedDuration: service.duration || 0,
      // Keep existing time or default to 9 AM if no time set
      scheduledTime: prev.scheduledTime && prev.scheduledTime.trim() !== "" ? prev.scheduledTime : "09:00",
      // Add modifier definitions from modal if available
      serviceModifiers: service.serviceModifiers || service.parsedModifiers || serviceModifiers || prev.serviceModifiers || [],
      serviceIntakeQuestions: service.serviceIntakeQuestions || service.parsedIntakeQuestions || serviceIntakeQuestions || prev.serviceIntakeQuestions || []
    }));
    
    // Note: serviceModifiers and serviceIntakeQuestions are now handled by the useEffect
    // that syncs when selectedServices changes
  };

  const handleTeamMemberSelect = (member) => {
    setSelectedTeamMember(member);
    setFormData(prev => ({ ...prev, teamMemberId: member.id }));
  };

  const handleMultipleTeamMemberSelect = (member) => {
    setSelectedTeamMembers(prev => {
      const isSelected = prev.find(m => m.id === member.id);
      let newSelectedMembers;
      
      if (isSelected) {
        // Remove if already selected
        newSelectedMembers = prev.filter(m => m.id !== member.id);
      } else {
        // Add if not selected
        newSelectedMembers = [...prev, member];
      }
      
      // Update workers field based on number of selected team members
      setFormData(formData => ({
        ...formData,
        workers: newSelectedMembers.length
      }));
      
      return newSelectedMembers;
    });
  };

  const removeTeamMember = (memberId) => {
    setSelectedTeamMembers(prev => {
      const newSelectedMembers = prev.filter(m => m.id !== memberId);
      
      // Update workers field based on number of selected team members
      setFormData(formData => ({
        ...formData,
        workers: newSelectedMembers.length
      }));
      
      return newSelectedMembers;
    });
  };

  const clearAllTeamMembers = () => {
    setSelectedTeamMembers([]);
    // Reset worker count to 0 when clearing all team members
    setFormData(prev => ({ ...prev, workers: 0 }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('Form submitted');
    console.log('Form data:', formData);
    console.log('User:', user);
    console.log('Submit button clicked - checking validation...');
    
    if (!user?.id) {
      setError('User not available. Please try logging in again.');
      return;
    }
    
    console.log('Form data before validation:', {
      customerId: formData.customerId,
      serviceId: formData.serviceId,
      scheduledDate: formData.scheduledDate,
      scheduledTime: formData.scheduledTime,
      scheduledTimeType: typeof formData.scheduledTime,
      scheduledTimeLength: formData.scheduledTime ? formData.scheduledTime.length : 'null/undefined'
    });
    
    // Validate time format
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    const isValidTime = formData.scheduledTime && timeRegex.test(formData.scheduledTime);
    
    if (!formData.customerId || !formData.serviceId || !formData.scheduledDate || !formData.scheduledTime || !isValidTime) {
      console.log('Validation failed:', {
        customerId: formData.customerId,
        serviceId: formData.serviceId,
        scheduledDate: formData.scheduledDate,
        scheduledTime: formData.scheduledTime
      });
      
      const missingFields = [];
      if (!formData.customerId) missingFields.push('Customer');
      if (!formData.serviceId) missingFields.push('Service');
      if (!formData.scheduledDate) missingFields.push('Date');
      if (!formData.scheduledTime) missingFields.push('Time');
      if (!isValidTime) missingFields.push('Valid Time');
      
      setError(`Please fill in the following required fields: ${missingFields.join(', ')}`);
      // Prevent any input from being focused
      if (document.activeElement) {
        document.activeElement.blur();
      }
      // Scroll to top to show error message
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (!selectedCustomer) {
      setError('Please select a customer.');
      // Prevent any input from being focused
      if (document.activeElement) {
        document.activeElement.blur();
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (selectedServices.length === 0) {
      setError('Please select at least one service.');
      // Prevent any input from being focused
      if (document.activeElement) {
        document.activeElement.blur();
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    try {
      setLoading(true);
      setError("");
      
      // Prepare job data with proper field mapping
      const jobData = {
        userId: user.id,
        customerId: formData.customerId,
        serviceIds: selectedServices.map(service => service.id), // Multiple service IDs
        serviceId: selectedServices.length > 0 ? selectedServices[0].id : null, // Keep for backward compatibility
        teamMemberId: selectedTeamMembers.length > 0 ? selectedTeamMembers[0].id : formData.teamMemberId, // Primary team member
        teamMemberIds: selectedTeamMembers.map(member => member.id), // All selected team members
        scheduledDate: formData.scheduledDate,
        scheduledTime: formData.scheduledTime,
        notes: formData.notes,
        internalNotes: formData.internalNotes,
        status: formData.status,
        duration: parseInt(calculateTotalDuration() || 0) || 360, // Duration already in minutes
        workers: parseInt(formData.workers) || 0,
        skillsRequired: parseInt(formData.skillsRequired) || 0,
        price: parseFloat(calculateTotalPrice() || 0),
        discount: parseFloat(formData.discount) || 0,
        additionalFees: parseFloat(formData.additionalFees) || 0,
        taxes: parseFloat(formData.taxes) || 0,
        total: parseFloat(calculateTotalPrice() || 0),
        paymentMethod: formData.paymentMethod,
        territory: formData.territory,
        territoryId: formData.territoryId || detectedTerritory?.id || null,
        recurringJob: Boolean(formData.recurringJob),
        scheduleType: formData.scheduleType || 'one-time',
        letCustomerSchedule: Boolean(formData.letCustomerSchedule),
        offerToProviders: Boolean(formData.offerToProviders),
        contactInfo: formData.contactInfo,
        serviceAddress: formData.serviceAddress,
        // Additional comprehensive fields
        serviceName: formData.serviceName,
        invoiceStatus: formData.invoiceStatus,
        paymentStatus: formData.paymentStatus,
        priority: formData.priority,
        estimatedDuration: formData.estimatedDuration,
        skills: formData.skills,
        specialInstructions: formData.specialInstructions,
        customerNotes: formData.customerNotes,
        tags: formData.tags,
        recurringFrequency: formData.recurringFrequency,
        recurringEndDate: formData.recurringEndDate,
        autoInvoice: formData.autoInvoice,
        autoReminders: formData.autoReminders,
        customerSignature: formData.customerSignature,
        photosRequired: formData.photosRequired,
        qualityCheck: formData.qualityCheck,
        // Service modifiers and intake questions
        serviceModifiers: formData.serviceModifiers,
        serviceIntakeQuestions: formData.serviceIntakeQuestions,
        selectedModifiers: selectedModifiers,
        intakeQuestionAnswers: intakeQuestionAnswers, // Send original answers as-is
        originalIntakeQuestionIds: (() => {
          // Send the original question IDs so backend can match them with answers
          const idMapping = formData.intakeQuestionIdMapping || {};
          return Object.values(idMapping); // Return array of original IDs
        })(),
        totalPrice: calculateTotalPrice()
      };

      const result = await jobsAPI.create(jobData);
      
      console.log('Job creation result:', result);
      console.log('Job ID from result:', result.job?.id || result.id || result.job_id);
      
      // Debug modifier data being sent
      console.log('🔧 Frontend: Modifier data being sent to backend:');
      console.log('🔧 serviceModifiers:', formData.serviceModifiers);
      console.log('🔧 selectedModifiers:', selectedModifiers);
      console.log('🔧 selectedModifiers keys:', Object.keys(selectedModifiers));
      
      setSuccessMessage('Job created successfully!');
      setTimeout(() => {
        // Navigate to the specific job details page
        // Backend returns: { message: 'Job created successfully', job: { id: ... } }
        const jobId = result.job?.id || result.id || result.job_id;
        console.log('Attempting to navigate to job ID:', jobId);
        if (jobId) {
          console.log('Navigating to job details page:', `/job/${jobId}`);
          // Use window.location.href for full page reload to ensure clean state
          window.location.href = `/job/${jobId}`;
        } else {
          console.log('No job ID found, navigating to jobs page');
          // If no job ID returned, navigate to jobs page
          window.location.href = '/jobs';
        }
      }, 2000); // Increased delay to ensure job is fully created
    } catch (error) {
      console.error('Error creating job:', error);
      setError(error.response?.data?.error || 'Failed to create job. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCustomerSave = async (customerData) => {
    if (!user?.id) return
    
    try {
      console.log("Saving customer:", customerData)
      let savedCustomer;
      
      // If editing an existing customer, update it; otherwise create new
      if (editingCustomer && editingCustomer.id) {
        console.log("Updating existing customer:", editingCustomer.id)
        const response = await customersAPI.update(editingCustomer.id, customerData)
        savedCustomer = response.customer || response
        // Update the customer in the list
        setCustomers(prev => prev.map(c => c.id === editingCustomer.id ? savedCustomer : c));
      } else {
        console.log("Creating new customer")
      const response = await customersAPI.create(customerData)
        savedCustomer = response.customer || response
        // Add new customer to the list
        setCustomers(prev => [...prev, savedCustomer]);
      }
      
      console.log('Customer saved successfully:', savedCustomer)
      handleCustomerSelect(savedCustomer);
      setEditingCustomer(null); // Clear editing state
      
      return savedCustomer
    } catch (error) {
      console.error('Error saving customer:', error)
      throw error // Re-throw to prevent modal from closing
    }
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleAddressSave = (serviceAddress) => {
    setFormData(prev => ({ ...prev, serviceAddress }));
    setShowAddressModal(false);
  };

  const copyCustomerAddressToService = () => {
    if (!selectedCustomer) return;
    
    // Helper function to validate that a string is not an email
    const isNotEmail = (str) => {
      if (!str) return true;
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return !emailPattern.test(str.trim());
    };
    
    // Helper function to validate that a string is not a phone number
    const isNotPhone = (str) => {
      if (!str) return true;
      const phonePattern = /^[\d\s()\-+]+$/;
      const digitsOnly = str.replace(/\D/g, '');
      if (digitsOnly.length >= 10 && phonePattern.test(str)) {
        return false;
      }
      return true;
    };
    
    let parsedAddress = {
      street: "",
      city: "",
      state: "",
      zipCode: "",
      country: "USA"
    };
    
    // Only use address fields - NEVER use email or phone
    const validAddress = selectedCustomer.address && isNotEmail(selectedCustomer.address) && isNotPhone(selectedCustomer.address);
    const validCity = selectedCustomer.city && isNotEmail(selectedCustomer.city) && isNotPhone(selectedCustomer.city);
    const validState = selectedCustomer.state && isNotEmail(selectedCustomer.state) && isNotPhone(selectedCustomer.state);
    const validZip = selectedCustomer.zip_code && isNotEmail(selectedCustomer.zip_code) && isNotPhone(selectedCustomer.zip_code);
    
    if (validAddress || validCity || validState || validZip) {
      // Use separate fields if available
      if (validCity && validState && validZip) {
        parsedAddress.street = validAddress ? selectedCustomer.address : "";
        parsedAddress.city = selectedCustomer.city;
        parsedAddress.state = selectedCustomer.state;
        parsedAddress.zipCode = selectedCustomer.zip_code;
      } else if (validAddress) {
        // Fallback to parsing address string if separate fields aren't available
        const addressParts = selectedCustomer.address.split(',').map(part => part.trim());
        
        // Filter out any parts that look like emails or phone numbers
        const validAddressParts = addressParts.filter(part => 
          isNotEmail(part) && isNotPhone(part)
        );
        
        if (validAddressParts.length >= 1) {
          parsedAddress.street = validAddressParts[0];
        }
        
        if (validAddressParts.length >= 2) {
          parsedAddress.city = validAddressParts[1];
        }
        
        if (validAddressParts.length >= 3) {
          // Handle state and zip code which might be together like "State 12345"
          const stateZipPart = validAddressParts[2];
          const stateZipMatch = stateZipPart.match(/^([A-Za-z\s]+)\s+(\d{5}(?:-\d{4})?)$/);
          
          if (stateZipMatch) {
            parsedAddress.state = stateZipMatch[1].trim();
            parsedAddress.zipCode = stateZipMatch[2];
          } else {
            // Check if it's just a zip code (all digits)
            if (/^\d{5}(-\d{4})?$/.test(stateZipPart)) {
              parsedAddress.zipCode = stateZipPart;
            } else if (isNotEmail(stateZipPart) && isNotPhone(stateZipPart)) {
            parsedAddress.state = stateZipPart;
            }
          }
        }
      }
      
      // Only set address if we have at least a street or city
      if (parsedAddress.street || parsedAddress.city) {
      setFormData(prev => ({
        ...prev,
        serviceAddress: parsedAddress
      }));
      
      // Show feedback
      setAddressAutoPopulated(true);
      setTimeout(() => setAddressAutoPopulated(false), 3000);
      }
    }
  };

  const clearServiceAddress = () => {
    setFormData(prev => ({
      ...prev,
      serviceAddress: {
        street: "",
        city: "",
        state: "",
        zipCode: "",
        country: "USA"
      }
    }));
  };

  const removeService = (serviceId) => {
    setSelectedServices(prev => {
      const newServices = prev.filter(service => service.id !== serviceId);
      return newServices;
    });
    
    // Update selectedService if the removed service was the current one
    if (selectedService && selectedService.id === serviceId) {
      const remainingServices = selectedServices.filter(service => service.id !== serviceId);
      setSelectedService(remainingServices.length > 0 ? remainingServices[0] : null);
    }
    
    // Clear modifiers and intake questions for the removed service
    setSelectedModifiers(prev => {
      const newModifiers = { ...prev };
      // Remove any modifiers that belong to the removed service
      // We'll handle this in the useEffect that syncs form data
      return newModifiers;
    });
    
    setIntakeQuestionAnswers(prev => {
      const newAnswers = { ...prev };
      // Remove any intake answers that belong to the removed service
      // We'll handle this in the useEffect that syncs form data
      return newAnswers;
    });
  };

  const clearAllServices = () => {
    setSelectedServices([]);
    setSelectedService(null);
    
    // Clear all modifiers and intake questions
    setSelectedModifiers({});
    setIntakeQuestionAnswers({});
    
    // Reset form data related to services
    setFormData(prev => ({
      ...prev,
      serviceModifiers: [],
      serviceIntakeQuestions: [],
      price: 0,
      total: 0,
      serviceName: '',
      duration: 0,
      estimatedDuration: 0
    }));
  };

  const handlePaymentMethodSave = (paymentMethod) => {
    setFormData(prev => ({ ...prev, paymentMethod }));
    setShowPaymentModal(false);
  };

  const handleTerritorySelect = (territory) => {
    setDetectedTerritory(territory);
    setFormData(prev => ({ ...prev, territory: territory.name, territoryId: territory.id }));
    setShowTerritoryModal(false);
  };

  // Service customization popup handlers
  const handleOpenServiceCustomization = () => {
    setShowServiceCustomizationPopup(true);
  };

  const handleCloseServiceCustomization = () => {
    setShowServiceCustomizationPopup(false);
  };

  const handleSaveServiceCustomization = () => {
    setShowServiceCustomizationPopup(false);
    // The modifiers and intake questions are already saved in state
    // via the existing handlers
  };

  // Service selection modal handlers
  const handleOpenServiceSelection = () => {
    if (authLoading) {
      console.log('⏳ Auth still loading, waiting...');
      return;
    }
    
    if (!user?.id) {
      console.error('❌ Cannot open service selection: No user ID available');
      setError('Please log in to select services');
      return;
    }
    
    console.log('🔄 Opening service selection modal for user:', user.id);
    setShowServiceSelectionModal(true);
  };

  const handleCloseServiceSelection = () => {
    setShowServiceSelectionModal(false);
  };

  const handleServiceCreated = (service) => {
    console.log('🔧 Service created:', service);
    
    // Extract service data from response (handle different response structures)
    const serviceData = service.service || service;
    console.log('🔧 Extracted service data:', serviceData);
    
    // Add the created service to selected services
    setSelectedServices(prev => [...prev, serviceData]);
    setSelectedService(serviceData);
    setServiceSelected(true); // Show the schedule section when service is created
    
    // Update form data with proper service information
    setFormData(prev => ({
      ...prev,
      serviceId: serviceData.id,
      serviceName: serviceData.name,
      price: parseFloat(serviceData.price) || 0,
      total: parseFloat(serviceData.price) || 0
    }));
    
    // Close the create service modal
    setShowCreateServiceModal(false);
    
    console.log('🔧 Service added to job successfully');
  };

  const handleServiceSelectFromModal = (service) => {
    // Handle service selection from the modal
    console.log('🔧 Service selected from modal:', service);
    console.log('🔧 Selected modifiers:', service.selectedModifiers);
    console.log('🔧 Intake question answers:', service.intakeQuestionAnswers);
    
    // Check if service is already selected
    const isAlreadySelected = selectedServices.some(s => s.id === service.id);
    if (isAlreadySelected) {
      return;
    }
    
    // Parse modifiers and intake questions from the service
    let serviceModifiers = [];
    let serviceIntakeQuestions = [];
    
    if (service.modifiers) {
      try {
        let parsedModifiers;
        if (typeof service.modifiers === 'string') {
          parsedModifiers = JSON.parse(service.modifiers);
        } else if (Array.isArray(service.modifiers)) {
          parsedModifiers = service.modifiers;
        }
        serviceModifiers = Array.isArray(parsedModifiers) ? parsedModifiers : [];
      } catch (error) {
        console.error('Error parsing service modifiers:', error);
        serviceModifiers = [];
      }
    }
    
    if (service.intake_questions || service.intakeQuestions) {
      try {
        const intakeQuestionsData = service.intake_questions || service.intakeQuestions;
        let parsedQuestions;
        if (typeof intakeQuestionsData === 'string') {
          parsedQuestions = JSON.parse(intakeQuestionsData);
        } else if (Array.isArray(intakeQuestionsData)) {
          parsedQuestions = intakeQuestionsData;
        }
        serviceIntakeQuestions = Array.isArray(parsedQuestions) ? parsedQuestions : [];
      } catch (error) {
        console.error('Error parsing service intake questions:', error);
        serviceIntakeQuestions = [];
      }
    }
    
    // Add service ID to each modifier and question for identification
    const modifiersWithServiceId = serviceModifiers.map(modifier => ({
      ...modifier,
      serviceId: service.id
    }));
    
    const questionsWithServiceId = serviceIntakeQuestions.map((question, index) => ({
      ...question,
      id: index + 1, // Normalize ID
      serviceId: service.id
    }));
    
    // Update form data with the parsed modifiers and questions
    setFormData(prev => ({
      ...prev,
      serviceModifiers: modifiersWithServiceId,
      serviceIntakeQuestions: questionsWithServiceId,
      serviceId: service.id,
      serviceName: service.name,
      price: service.price || 0,
      total: service.price || 0
    }));
    
    // Add service to selected services array with customization data
    setSelectedServices(prev => [...prev, service]);
    
    // Keep selectedService for backward compatibility (use the first selected service)
    setSelectedService(service);
    setServiceSelected(true); // Show the schedule section when service is selected from modal
    
    // Update modifiers and intake questions if they exist
    if (service.selectedModifiers) {
      console.log('🔧 Setting selected modifiers:', service.selectedModifiers);
      console.log('🔧 Current selected modifiers before update:', selectedModifiers);
      setSelectedModifiers(prev => {
        const updated = {
          ...prev,
          ...service.selectedModifiers
        };
        console.log('🔧 Updated selected modifiers:', updated);
        return updated;
      });
    } else {
      console.log('🔧 No selectedModifiers found in service:', service.name);
      console.log('🔧 Service keys:', Object.keys(service));
    }
    if (service.intakeQuestionAnswers) {
      console.log('🔧 Setting intake question answers:', service.intakeQuestionAnswers);
      setIntakeQuestionAnswers(prev => ({
        ...prev,
        ...service.intakeQuestionAnswers
      }));
    }

    // Update formData with service modifiers and intake questions for UI display
    console.log('🔧 Checking service data for modifiers/intake questions:');
    console.log('🔧 service.serviceModifiers:', service.serviceModifiers);
    console.log('🔧 service.serviceIntakeQuestions:', service.serviceIntakeQuestions);
    console.log('🔧 service.parsedModifiers:', service.parsedModifiers);
    console.log('🔧 service.parsedIntakeQuestions:', service.parsedIntakeQuestions);
    
    // Use parsedModifiers and parsedIntakeQuestions if serviceModifiers/serviceIntakeQuestions are not available
    const modifiersToUse = service.serviceModifiers || service.parsedModifiers || [];
    const intakeQuestionsToUse = service.serviceIntakeQuestions || service.parsedIntakeQuestions || [];
    
    if (modifiersToUse.length > 0 || intakeQuestionsToUse.length > 0) {
      setFormData(prev => ({
        ...prev,
        serviceModifiers: modifiersToUse,
        serviceIntakeQuestions: intakeQuestionsToUse
      }));
      console.log('🔧 Updated formData with modifiers:', modifiersToUse);
      console.log('🔧 Updated formData with intake questions:', intakeQuestionsToUse);
    } else {
      console.log('🔧 No modifiers or intake questions found in service data');
    }
    
    // Service selected successfully - no UI updates needed since we use the big modal now
  };

  // Handle modifier selections
  const handleModifierSelection = (modifierId, optionId, isSelected) => {
    setSelectedModifiers(prev => {
      const currentSelections = prev[modifierId] || [];
      let newSelections;
      
      if (isSelected) {
        newSelections = [...currentSelections, optionId];
      } else {
        newSelections = currentSelections.filter(id => id !== optionId);
      }
      
      const updatedSelections = {
        ...prev,
        [modifierId]: newSelections
      };
      
      return updatedSelections;
    });
  };

  // Handle modifiers change from the new component
  const handleModifiersChange = (modifiers) => {
    console.log('🔧 handleModifiersChange called with:', modifiers);
    console.log('🔧 Current selectedModifiers before update:', selectedModifiers);
    
    // Keep the new format - no conversion needed
    console.log('🔧 Keeping new format modifiers:', modifiers);
    
    // Merge with existing selections to preserve other modifiers
    setSelectedModifiers(prev => {
      console.log('🔧 Frontend: Merging modifiers. Previous:', prev, 'New:', modifiers);
      const updated = {
        ...prev,
        ...modifiers
      };
      console.log('🔧 Final updated selectedModifiers:', updated);
      console.log('🔧 Updated selectedModifiers keys:', Object.keys(updated));
      console.log('🔧 Updated selectedModifiers values:', Object.values(updated));
      
      // Test the calculation immediately
      console.log('🔧 TESTING: Calling calculateTotalPrice with updated modifiers');
      const testPrice = calculateTotalPrice();
      console.log('🔧 TESTING: calculateTotalPrice result:', testPrice);
      
      return updated;
    });
    
    setCalculationTrigger(prev => prev + 1); // Trigger recalculation
  };

  // Handle intake question answers
  const handleIntakeQuestionAnswer = (questionId, answer) => {
    setIntakeQuestionAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
  };

  // Handle intake questions change from the new component
  const handleIntakeQuestionsChange = (answers) => {
setIntakeQuestionAnswers(answers);
  };

  // Handle modifier price changes
  const handleModifierPriceChange = (modifierId, optionId, price) => {
    const priceKey = `${modifierId}_option_${optionId}`;
    const newPrice = parseFloat(price) || 0;
    
    console.log('🔧 handleModifierPriceChange called:', {
      modifierId,
      optionId,
      price,
      priceKey,
      newPrice
    });
    
    setEditedModifierPrices(prev => {
      const updated = {
        ...prev,
        [priceKey]: newPrice
      };
      console.log('🔧 Updated editedModifierPrices:', updated);
      return updated;
    });
    setCalculationTrigger(prev => {
      const newTrigger = prev + 1;
      console.log('🔧 Calculation trigger updated:', newTrigger);
      return newTrigger;
    }); // Trigger recalculation
  };


  // Recalculate total price when modifier prices change
  useEffect(() => {
    console.log('🔧 Recalculation useEffect triggered:', {
      calculationTrigger,
      editedModifierPrices,
      selectedModifiers
    });
    
    if (calculationTrigger > 0) {
      console.log('🔧 Recalculating total price due to modifier price change');
      const newTotalPrice = calculateTotalPrice();
      console.log('🔧 New calculated total price:', newTotalPrice);
      console.log('🔧 Previous formData.total:', formData.total);
      
      setFormData(prev => {
        const updated = {
          ...prev,
          total: newTotalPrice
        };
        console.log('🔧 Updated formData:', updated);
        return updated;
      });
    }
  }, [calculationTrigger, editedModifierPrices, selectedModifiers, calculateTotalPrice]);

  // Calculate total duration including modifiers
  const calculateTotalDuration = () => {
    try {
      // Ensure baseDuration is a number (stored in minutes)
      let baseDuration = parseFloat(formData.duration) || 0;
      let modifierDuration = 0;
      
      // Add duration from selected modifiers
      Object.entries(selectedModifiers).forEach(([modifierId, modifierData]) => {
        const modifier = formData.serviceModifiers?.find(m => m.id === modifierId);
        if (!modifier) return;
        
        if (modifier.selectionType === 'quantity') {
          // Handle quantity selection - modifierData can be { optionId: quantity } or { quantities: { optionId: quantity } }
          let quantities = {};
          if (modifierData.quantities) {
            quantities = modifierData.quantities;
          } else if (typeof modifierData === 'object' && !Array.isArray(modifierData)) {
            quantities = modifierData;
          }
          
          Object.entries(quantities).forEach(([optionId, quantity]) => {
            const option = modifier.options?.find(o => o.id === optionId);
            if (option && option.duration && quantity > 0) {
              // Modifier durations are stored in minutes
              const optionDurationInMinutes = parseFloat(option.duration) || 0;
              
              modifierDuration += optionDurationInMinutes * quantity;
            }
          });
        } else if (modifier.selectionType === 'multi') {
          // Handle multi selection - modifierData can be array of optionIds or { selections: [optionIds] }
          let selectedOptionIds = [];
          if (modifierData.selections) {
            selectedOptionIds = modifierData.selections;
          } else if (Array.isArray(modifierData)) {
            selectedOptionIds = modifierData;
          } else if (modifierData) {
            selectedOptionIds = [modifierData];
          }
          
          selectedOptionIds.forEach(optionId => {
            const option = modifier.options?.find(o => o.id === optionId);
            if (option && option.duration) {
              // Modifier durations are stored in minutes
              const optionDurationInMinutes = parseFloat(option.duration) || 0;
              
              modifierDuration += optionDurationInMinutes;
            }
          });
        } else {
          // Handle single selection - modifierData can be optionId or { selection: optionId }
          let selectedOptionId = null;
          if (modifierData.selection) {
            selectedOptionId = modifierData.selection;
          } else if (modifierData) {
            selectedOptionId = modifierData;
          }
          
          if (selectedOptionId) {
            const option = modifier.options?.find(o => o.id === selectedOptionId);
            if (option && option.duration) {
              // Modifier durations are stored in minutes
              const optionDurationInMinutes = parseFloat(option.duration) || 0;
              
              modifierDuration += optionDurationInMinutes;
            }
          }
        }
      });
      
      const totalDurationInMinutes = baseDuration + modifierDuration;
      return totalDurationInMinutes; // Return in minutes for backend
    } catch (error) {
      console.error('Error calculating total duration:', error);
      return 0;
    }
  };

  // Show loading if user is not available or still loading
  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200  sm:px-32 py-4 px-40">
          <div className="flex items-center justify-between">
            <h1 style={{fontFamily: 'ProximaNova-bold'}} className="text-lg sm:text-xl font-semibold text-gray-900">Create Job</h1>
            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={() => navigate('/jobs')}
                style={{fontFamily: 'ProximaNova-medium'}}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="create-job-form"
                style={{fontFamily: 'ProximaNova-medium'}}
                disabled={loading || !selectedCustomer || selectedServices.length === 0}
                className={`px-4 py-2 rounded-lg font-medium ${
                  loading || !selectedCustomer || selectedServices.length === 0
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {loading ? 'Scheduling...' : 'Schedule Job'}
              </button>
            </div>
          </div>
        </div>

        {/* Success/Error Messages */}
        {successMessage && (
          <div className="mx-4 sm:mx-6 mt-4 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center space-x-3">
            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
            <p className="text-green-700 font-medium">{successMessage}</p>
          </div>
        )}

        {error && (
          <div className="mx-4 sm:mx-6 mt-4 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center space-x-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="text-red-700 font-medium">{error}</p>
          </div>
        )}

        {/* Main Content */}
        <div className="p-4 sm:p-6 mx-56">
          {!jobselected && (
            <div className="max-w-5xl mx-auto space-y-4">
              {/* Customer Section */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 style={{fontFamily: 'ProximaNova-medium'}} className="text-lg font-semibold text-gray-900">Customer</h2>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingCustomer(null); // Clear editing state for new customer
                      setIsCustomerModalOpen(true);
                    }}
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    New Customer
                  </button>
                  </div>
                <div className="relative" ref={customerDropdownRef}>
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={customerSearch}
                    onChange={(e) => {
                      setCustomerSearch(e.target.value);
                      if (e.target.value) {
                        setShowCustomerDropdown(true);
                      }
                    }}
                    onFocus={() => {
                      if (customerSearch && filteredCustomers.length > 0) {
                        setShowCustomerDropdown(true);
                      }
                    }}
                    placeholder="Search customers"
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                  {showCustomerDropdown && filteredCustomers.length > 0 && (
                      <>
                        <div 
                          className="fixed inset-0 z-40" 
                          onClick={() => setShowCustomerDropdown(false)}
                        />
                      <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        {filteredCustomers.map(customer => (
                          <button
                            key={customer.id}
                            type="button"
                            onClick={() => {
                              // Directly select the customer
                              handleCustomerSelect(customer);
                              setShowCustomerDropdown(false);
                              setCustomerSearch('');
                            }}
                            className="w-full text-left px-4 py-2 hover:bg-gray-100 border-b border-gray-100 last:border-b-0"
                          >
                            <p className="font-medium text-gray-900">{customer.first_name} {customer.last_name}</p>
                            <p className="text-sm text-gray-600">{customer.email || 'No email address'}</p>
                          </button>
                        ))}
                      </div>
                      </>
                    )}
                  </div>
              </div>

              {/* Services Section */}
              <div className="bg-gray-100 rounded-lg p-4 flex ">
                <p  style={{fontFamily: 'ProximaNova-bold'}} className="text-gray-600 text-left text-lg ">Services</p>
              </div>

              {/* Schedule Section */}
              <div className="bg-gray-100 rounded-lg p-4 flex ">
                <p  style={{fontFamily: 'ProximaNova-bold'}} className="text-gray-600 text-left text-lg ">Schedule</p>
              </div>
            </div>
          )}
         {jobselected &&
          <form id="create-job-form" onSubmit={handleSubmit} className="max-w-7xl mx-auto" noValidate>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column - Services and Schedule */}
              <div className="lg:col-span-2 space-y-6">
                {/* Services Section */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                  <div className="p-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                      <h2 className="text-base font-semibold text-gray-900">Services</h2>
                  <button
                    type="button"
                        onClick={() => setShowCreateServiceModal(true)}
                        className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                        Add Custom Service or Item
                  </button>
                </div>
                  </div>
                  <div className="p-4 bg-gray-50 space-y-3">
                    {/* Service Search */}
                    <div className="flex flex-row items-center justify-between">
                  <div className="relative w-8/12 space-x-2">
                      <Search className="absolute left-5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                        placeholder="Search services"
                        value={serviceSearch}
                        onChange={(e) => setServiceSearch(e.target.value)}
                        className="w-full text-xs pl-10 pr-2 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                      <button
                        type="button"
                      onClick={() => setShowServiceSelectionModal(true)}
                      className="w-3/12 px-2 py-2 bg-white border text-xs border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 font-medium"
                      >
                      Browse Services
                      </button>
                    </div>
                    {/* Selected Services List */}
                    
                    {selectedServices.length > 0 && (
                      <div className="space-y-0 pt-2">
                        {/* Service List Header */}
                        <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200">
                          <span className="text-xs font-semibold text-gray-700 uppercase">SERVICE</span>
                          <span className="text-xs font-semibold text-gray-700 uppercase">PRICE</span>
                        </div>
                        
                        {/* Service Items */}
                        {selectedServices.map((service) => (
                          <div key={service.id} className="bg-white border-b border-gray-200 px-3 py-3">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedService(service);
                                    setShowServiceCustomizationPopup(true);
                                  }}
                                  className="text-left"
                                >
                                  <div className="text-sm font-semibold text-blue-600 hover:text-blue-700 mb-1">
                                    {service.name}
                                  </div>
                                  <div className="text-xs text-gray-500 hover:text-gray-700">
                                    Show details &gt;
                                  </div>
                                </button>
                              </div>
                              <div className="flex items-center space-x-2">
                                <div className="relative">
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={parseFloat(service.price) || 0}
                                    onChange={(e) => {
                                      const newPrice = parseFloat(e.target.value) || 0;
                                      setSelectedServices(prev => prev.map(s => 
                                        s.id === service.id ? { ...s, price: newPrice } : s
                                      ));
                                    }}
                                    className="w-24 px-2 py-1 text-sm text-right border-0 border-b-2 border-dotted border-gray-400 focus:border-blue-500 focus:outline-none focus:ring-0 bg-transparent"
                                  />
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedService(service);
                                    setShowServiceCustomizationPopup(true);
                                  }}
                                  className="text-gray-400 hover:text-gray-600"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => removeService(service.id)}
                                  className="text-gray-400 hover:text-red-600"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                        
                        {/* Pricing Summary */}
                        <div className="bg-white border-t border-gray-200 px-3 py-3 space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Subtotal</span>
                            <span className="font-medium text-gray-900">${(calculateTotalPrice() || 0).toFixed(2)}</span>
                          </div>
                          <div className="flex justify-start">
                            <button
                              type="button"
                              onClick={() => {/* Add discount modal */}}
                              className="text-sm text-blue-600 hover:text-blue-700"
                            >
                              Add Discount
                            </button>
                          </div>
                          <div className="flex justify-start">
                            <button
                              type="button"
                              onClick={() => {/* Add fee modal */}}
                              className="text-sm text-blue-600 hover:text-blue-700"
                            >
                              Add Fee
                            </button>
                          </div>
                          <div className="flex justify-between items-center text-sm">
                            <div className="flex items-center space-x-1">
                              <span className="text-gray-600">Taxes</span>
                              <Info className="w-3 h-3 text-gray-400" />
                            </div>
                            <span className="font-medium text-gray-900">${(formData.taxes || 0).toFixed(2)}</span>
                          </div>
                          <div className="border-t border-gray-200 pt-2 flex justify-between">
                            <span className="font-semibold text-gray-900">Total</span>
                            <span className="font-semibold text-gray-900">${(formData.total || 0).toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
            </div>

                {/* Schedule Section */}
                {serviceSelected && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                  <div className="p-4 border-b border-gray-200">
                    <h2 className="text-base font-semibold text-gray-900">Schedule</h2>
                    </div>
                  <div className="p-4 bg-gray-50 space-y-4">
                    {/* Duration/Workers/Skills Dropdowns */}
                    <div className="grid grid-cols-3 gap-2">
                      <select
                        value={(() => {
                            const totalMinutes = calculateTotalDuration() || 0;
                            const hours = Math.floor(totalMinutes / 60);
                            const mins = totalMinutes % 60;
                          return `${hours}h ${mins}m`;
                          })()}
                        onChange={(e) => {
                          // Parse duration from dropdown
                          const match = e.target.value.match(/(\d+)h\s*(\d+)?m?/);
                          if (match) {
                            const hours = parseInt(match[1]) || 0;
                            const mins = parseInt(match[2]) || 0;
                            setFormData(prev => ({ ...prev, duration: hours * 60 + mins }));
                          }
                        }}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      >
                        <option value="1h 0m">1 hr 10 min</option>
                        <option value="2h 0m">2 hrs</option>
                        <option value="3h 0m">3 hrs</option>
                        <option value="4h 0m">4 hrs</option>
                      </select>
                      <select
                        value={formData.workers || 1}
                        onChange={(e) => setFormData(prev => ({ ...prev, workers: parseInt(e.target.value) }))}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      >
                        <option value="1">1 worker</option>
                        <option value="2">2 workers</option>
                        <option value="3">3 workers</option>
                        <option value="4">4 workers</option>
                      </select>
                      <select
                        value={formData.skillsRequired || 0}
                        onChange={(e) => setFormData(prev => ({ ...prev, skillsRequired: parseInt(e.target.value) }))}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      >
                        <option value="0">0 skills required</option>
                        <option value="1">1 skill required</option>
                        <option value="2">2 skills required</option>
                      </select>
                      </div>
                      
                    {/* Job Type Tabs */}
                    <div className="flex space-x-2">
                        <button
                          type="button"
                        onClick={() => setFormData(prev => ({ ...prev, scheduleType: 'one-time' }))}
                        className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium ${
                          formData.scheduleType === 'one-time'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        One Time
                        </button>
                          <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, scheduleType: 'recurring' }))}
                        className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium ${
                          formData.scheduleType === 'recurring'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        Recurring Job
                          </button>
                      </div>
                      
                    {/* Scheduling Options */}
                    <div className="space-y-3">
                      <div className="flex items-start space-x-3">
                        <input
                          type="radio"
                          id="schedule-now"
                          name="scheduling-option"
                          checked={!formData.letCustomerSchedule}
                          onChange={() => setFormData(prev => ({ ...prev, letCustomerSchedule: false }))}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <label htmlFor="schedule-now" className="block text-sm font-medium text-gray-900 mb-2">
                            Schedule Now
                          </label>
                          <div className="grid grid-cols-2 gap-2 mb-2">
                            <div className="relative">
                              <input
                                type="text"
                                placeholder="Select date"
                                value={formData.scheduledDate ? formatDateDisplay(formData.scheduledDate) : ''}
                                onClick={() => setShowDatePicker(true)}
                                readOnly
                                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer text-sm"
                              />
                              <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                      </div>
                            <div className="relative">
                            <input
                                type="time"
                                value={formData.scheduledTime || '09:00'}
                                onChange={(e) => setFormData(prev => ({ ...prev, scheduledTime: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                step="1800"
                              />
                              <Clock className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                          </div>
                        </div>
                            <button
                              type="button"
                            onClick={() => setShowDatePicker(true)}
                            className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium"
                            >
                            Find a Time
                            </button>
                          </div>
                        </div>
                        
                      <div className="flex items-start space-x-3">
                            <input
                          type="radio"
                          id="let-customer-schedule"
                          name="scheduling-option"
                          checked={formData.letCustomerSchedule}
                          onChange={() => setFormData(prev => ({ ...prev, letCustomerSchedule: true }))}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <label htmlFor="let-customer-schedule" className="block text-sm font-medium text-gray-900">
                            Let Customer Schedule
                            <span className="ml-2 px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded">Upgrade</span>
                          </label>
                          <p className="text-xs text-gray-600 mt-1">
                            Send a bookable estimate to your customer, allowing them to choose a convenient time for the service.
                          </p>
                          </div>
                        </div>
                        </div>

                    {/* Assignment */}
                    <div className="space-y-2">
                        <button
                          type="button"
                          onClick={() => setShowTeamDropdown(!showTeamDropdown)}
                        className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium text-left"
                        >
                          {selectedTeamMembers.length > 0 
                          ? `${selectedTeamMembers.length} team member(s) assigned`
                          : '+ Assign'}
                        </button>
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={formData.offerToProviders}
                          onChange={(e) => setFormData(prev => ({ ...prev, offerToProviders: e.target.checked }))}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">Offer job to service providers</span>
                      </label>
                                      </div>
                                    </div>
                            </div>
                        )}
                      </div>
                      
              {/* Right Column - Customer, Address, etc */}
              <div className="lg:col-span-1 space-y-6">
                {/* Customer Section */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                  <div className="p-4 border-b border-gray-200">
                          <div className="flex items-center justify-between">
                      <h2 className="text-base font-semibold text-gray-900">Customer</h2>
                      {selectedCustomer && (
                            <button
                              type="button"
                          onClick={() => setShowCustomerDropdown(true)}
                          className="text-sm text-blue-600 hover:text-blue-700"
                            >
                          Change
                            </button>
                      )}
                          </div>
                  </div>
                  {selectedCustomer ? (
                    <div className="p-4 space-y-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                          {selectedCustomer.first_name?.[0]}{selectedCustomer.last_name?.[0]}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium text-gray-900">
                              {selectedCustomer.first_name} {selectedCustomer.last_name}
                            </span>
                                <button
                                  type="button"
                              onClick={() => setIsCustomerModalOpen(true)}
                              className="text-sm text-blue-600 hover:text-blue-700"
                                >
                              Edit
                                </button>
                              </div>
                          </div>
                    </div>

                      {/* Contact Information Display */}
                      <div className="space-y-3 pt-2 border-t border-gray-200">
                        {selectedCustomer.email && (
                          <div className="flex items-center space-x-2">
                            <Mail className="w-4 h-4 text-gray-400" />
                            <span className="text-sm text-gray-900">{selectedCustomer.email}</span>
                    </div>
                        )}
                        {selectedCustomer.phone && (
                          <div className="flex items-center space-x-2">
                            <Phone className="w-4 h-4 text-gray-400" />
                            <span className="text-sm text-gray-900">{formatPhoneNumber(selectedCustomer.phone)}</span>
                </div>
              )}
                        {!selectedCustomer.email && !selectedCustomer.phone && (
                          <p className="text-xs text-gray-500">No contact information available</p>
              )}
            </div>

                      <div className="space-y-2 pt-2 border-t border-gray-200">
                <button
                  type="button"
                          className="w-full flex items-center justify-between p-2 hover:bg-gray-50 rounded"
                        >
                          <span className="text-sm font-medium text-gray-700">CONTACT INFO</span>
                          <ChevronRight className="w-4 h-4 text-gray-400" />
                </button>
                <button
                  type="button"
                          className="w-full flex items-center justify-between p-2 hover:bg-gray-50 rounded"
                        >
                          <span className="text-sm font-medium text-gray-700">NOTES {selectedCustomer.notes_count || 0}</span>
                          <ChevronRight className="w-4 h-4 text-gray-400" />
                </button>
                        <div className="p-2">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-700">NOTIFICATION PREFERENCES</span>
                            <ChevronDown className="w-4 h-4 text-gray-400" />
              </div>
                          <div className="space-y-2">
                <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-600">Emails</span>
                              <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.contactInfo.emailNotifications}
                          onChange={(e) => setFormData(prev => ({ 
                            ...prev, 
                            contactInfo: { ...prev.contactInfo, emailNotifications: e.target.checked }
                          }))}
                                  className="sr-only peer"
                        />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                        </label>
                </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-600">Text messages</span>
                              <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.contactInfo.textNotifications}
                          onChange={(e) => setFormData(prev => ({ 
                            ...prev, 
                            contactInfo: { ...prev.contactInfo, textNotifications: e.target.checked }
                          }))}
                                  className="sr-only peer"
                        />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                        </label>
              </div>
                    </div>
                  </div>
                </div>
            </div>
                  ) : (
                    <div className="p-4 bg-gray-50">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Search customers"
                          value={customerSearch}
                          onChange={(e) => setCustomerSearch(e.target.value)}
                          onFocus={() => setShowCustomerDropdown(true)}
                          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingCustomer(null); // Clear editing state for new customer
                          setIsCustomerModalOpen(true);
                        }}
                        className="mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
                      >
                        New Customer
                      </button>
                      {showCustomerDropdown && (
                        <>
                          <div 
                            className="fixed inset-0 z-40" 
                            onClick={() => setShowCustomerDropdown(false)}
                          />
                          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                            {filteredCustomers.map(customer => (
                              <button
                                key={customer.id}
                                type="button"
                                onClick={() => {
                                  // Directly select the customer
                                  handleCustomerSelect(customer);
                                  setShowCustomerDropdown(false);
                                }}
                                className="w-full text-left px-4 py-2 hover:bg-gray-100 border-b border-gray-100 last:border-b-0"
                              >
                                <p className="font-medium">{customer.first_name} {customer.last_name}</p>
                                <p className="text-sm text-gray-600">{customer.email || 'No email address'}</p>
                              </button>
                            ))}
                  </div>
                        </>
                      )}
                </div>
                  )}
              </div>
              
                {/* Service Address Section */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                  {formData.serviceAddress.street ? (
                    <div className="relative">
                      {/* Google Maps Embed */}
                      <div className="w-full h-48 bg-gray-100 rounded-t-lg overflow-hidden">
                        <iframe
                          title="Service Address Map"
                          width="100%"
                          height="100%"
                          style={{ border: 0 }}
                          loading="lazy"
                          allowFullScreen
                          referrerPolicy="no-referrer-when-downgrade"
                          src={`https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${encodeURIComponent(
                            `${formData.serviceAddress.street}, ${formData.serviceAddress.city}, ${formData.serviceAddress.state || ''} ${formData.serviceAddress.zipCode || ''}`
                          )}&zoom=16&maptype=roadmap`}
                        />
                      </div>
                      <div className="p-4 border-t border-gray-200">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-700">SERVICE ADDRESS</span>
                          <button
                            type="button"
                            onClick={() => setShowAddressModal(true)}
                            className="text-sm text-blue-600 hover:text-blue-700"
                          >
                            Edit
                          </button>
                    </div>
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm text-gray-900">{formData.serviceAddress.street}</span>
                            <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">Default</span>
                          </div>
                          <p className="text-sm text-gray-600">
                            {formData.serviceAddress.city}
                            {formData.serviceAddress.state && `, ${formData.serviceAddress.state}`}
                            {formData.serviceAddress.zipCode && ` ${formData.serviceAddress.zipCode}`}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">SERVICE ADDRESS</span>
                      <button
                        type="button"
                          onClick={() => setShowAddressModal(true)}
                          className="text-sm text-blue-600 hover:text-blue-700"
                      >
                          Add Address
                      </button>
                    </div>
                      <p className="text-sm text-gray-500 mt-2">No service address set</p>
                    </div>
                  )}
              </div>

                {/* Territory Section */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                  <div className="p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">TERRITORY</span>
                      <button
                        type="button"
                        onClick={() => setShowTerritoryModal(true)}
                        className="text-sm text-blue-600 hover:text-blue-700"
                      >
                        Edit
                      </button>
                    </div>
                    <p className="mt-2 text-sm text-gray-900">
                      {detectedTerritory ? detectedTerritory.name : 'No territory selected'}
                    </p>
                    </div>
                  </div>

                {/* Payment Method Section */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                  <div className="p-4">
                    <span className="text-sm font-medium text-gray-700">PAYMENT METHOD</span>
                    <p className="mt-2 text-sm text-gray-600">
                      Attach a credit or debit card to charge at a later time when the job is complete.
                    </p>
                  <button
                    type="button"
                      onClick={() => setShowPaymentModal(true)}
                      className="mt-3 text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                      + Add payment method
                  </button>
                  </div>
                </div>

                {/* Tags Section */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                  <div className="p-4">
                    <div className="flex items-center space-x-2 mb-3">
                      <span className="text-sm font-medium text-gray-700">Tags</span>
                      <Info className="w-4 h-4 text-gray-400" />
                    </div>
                    <button
                      type="button"
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                      + Add Tag
                  </button>
                  </div>
            </div>

                {/* Internal Notes Section */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                  <div className="p-4">
                    <div className="flex items-center space-x-2 mb-3">
                      <span className="text-sm font-medium text-gray-700">Internal Notes</span>
                      <Info className="w-4 h-4 text-gray-400" />
                    </div>
                    <textarea
                      rows={4}
                      value={formData.internalNotes}
                      onChange={(e) => setFormData(prev => ({ ...prev, internalNotes: e.target.value }))}
                      placeholder="Add an internal note just for employees to see..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />
                    <div className="flex items-center space-x-2 mt-2">
                      <button type="button" className="text-gray-400 hover:text-gray-600">
                        <MessageSquare className="w-5 h-5" />
              </button>
                      <button type="button" className="text-gray-400 hover:text-gray-600">
                        <Paperclip className="w-5 h-5" />
              </button>
            </div>
        </div>
                </div>
              </div>
            </div>
          </form>}
      </div>

      {/* Modals */}
      <CustomerModal
        isOpen={isCustomerModalOpen}
        onClose={() => {
          setIsCustomerModalOpen(false);
          setEditingCustomer(null); // Clear editing state when modal closes
        }}
        onSave={handleCustomerSave}
        customer={editingCustomer}
        isEditing={!!editingCustomer}
        user={user}
      />
      
      <ServiceModal
        isOpen={isServiceModalOpen}
        onClose={() => setIsServiceModalOpen(false)}
        onSave={(newService) => {
          const serviceData = newService.service || newService;
          setServices(prev => [...prev, serviceData]);
          setFilteredServices(prev => [...prev, serviceData]);
          handleServiceSelect(serviceData);
          setIsServiceModalOpen(false);
        }}
        user={user}
      />
      
      <ServiceAddressModal
        isOpen={showAddressModal}
        onClose={() => setShowAddressModal(false)}
        onSave={handleAddressSave}
        address={formData.serviceAddress}
      />
      
      <PaymentMethodModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onSave={handlePaymentMethodSave}
        paymentMethod={formData.paymentMethod}
      />
      
      <TerritorySelectionModal
        isOpen={showTerritoryModal}
        onClose={() => setShowTerritoryModal(false)}
        onSelect={handleTerritorySelect}
        territories={territories}
        user={user}
      />
      
      <ServiceSelectionModal
        isOpen={showServiceSelectionModal}
        onClose={() => setShowServiceSelectionModal(false)}
        onServiceSelect={(service) => {
          handleServiceSelect(service);
          setShowServiceSelectionModal(false);
        }}
        selectedServices={selectedServices}
        user={user}
      />

      <ServiceCustomizationPopup
        isOpen={showServiceCustomizationPopup}
        onClose={handleCloseServiceCustomization}
        service={selectedService}
        modifiers={formData.serviceModifiers}
        intakeQuestions={formData.serviceIntakeQuestions}
        onModifiersChange={handleModifiersChange}
        onIntakeQuestionsChange={handleIntakeQuestionsChange}
        onSave={handleSaveServiceCustomization}
        initialAnswers={intakeQuestionAnswers}
        selectedModifiers={selectedModifiers}
      />

      <CreateServiceModal
        isOpen={showCreateServiceModal}
        onClose={() => setShowCreateServiceModal(false)}
        onServiceCreated={handleServiceCreated}
        user={user}
        initialCategory={(() => {
          const category = selectedCategoryId ? { id: selectedCategoryId, name: selectedCategoryName } : null;
          return category;
        })()}
      />
      
      <CalendarPicker
        selectedDate={formData.scheduledDate ? parseLocalDate(formData.scheduledDate) : new Date()}
        onDateSelect={(date) => {
          const dateString = formatDateLocal(date);
          setFormData(prev => ({ ...prev, scheduledDate: dateString }));
          setShowDatePicker(false);
        }}
        isOpen={showDatePicker}
        onClose={() => setShowDatePicker(false)}
        position="bottom-left"
      />
    </div>
  );
}