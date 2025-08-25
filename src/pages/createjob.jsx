"use client"

import React, { useState, useEffect } from 'react';
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
import Sidebar from '../components/sidebar';
import MobileHeader from '../components/mobile-header';
import CustomerModal from "../components/customer-modal";
import ServiceModal from "../components/service-modal";
import ServiceAddressModal from "../components/service-address-modal";
import PaymentMethodModal from "../components/payment-method-modal";
import TerritorySelectionModal from "../components/territory-selection-modal";
import AddressAutocomplete from "../components/address-autocomplete";
import IntakeQuestionsForm from "../components/intake-questions-form";
import ServiceModifiersForm from "../components/service-modifiers-form";
import { useNavigate } from 'react-router-dom';
import { jobsAPI, customersAPI, servicesAPI, teamAPI, territoriesAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';


export default function CreateJobPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showTerritoryModal, setShowTerritoryModal] = useState(false);

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
  const [showServiceDropdown, setShowServiceDropdown] = useState(false);
  const [showTeamDropdown, setShowTeamDropdown] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");
  const [serviceSearch, setServiceSearch] = useState("");

  // Selected items
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [selectedService, setSelectedService] = useState(null);
  const [selectedTeamMember, setSelectedTeamMember] = useState(null);
  const [selectedTeamMembers, setSelectedTeamMembers] = useState([]); // Multiple team members
  const [detectedTerritory, setDetectedTerritory] = useState(null);
  const [territories, setTerritories] = useState([]);
  const [territoriesLoading, setTerritoriesLoading] = useState(false);
  
  // Service modifiers and intake questions state
  const [selectedModifiers, setSelectedModifiers] = useState({}); // { modifierId: selectedOptions[] }
  const [intakeQuestionAnswers, setIntakeQuestionAnswers] = useState({}); // { questionId: answer }
  const [calculationTrigger, setCalculationTrigger] = useState(0); // Trigger for recalculations

  // Expandable sections
  const [expandedSections, setExpandedSections] = useState({
    basicInfo: true,
    serviceDetails: true,
    scheduling: true,
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
    } else {
      setFilteredCustomers(customers || []);
    }
  }, [customerSearch, customers]);

  useEffect(() => {
    // Filter services based on search
    if (serviceSearch) {
      const filtered = (services || []).filter(service =>
        service.name.toLowerCase().includes(serviceSearch.toLowerCase()) ||
        service.category?.toLowerCase().includes(serviceSearch.toLowerCase())
      );
      setFilteredServices(filtered);
    } else {
      setFilteredServices(services || []);
    }
  }, [serviceSearch, services]);

  useEffect(() => {
    // Update price calculations
    if (selectedService) {
      const basePrice = selectedService.price || 0;
      const discount = formData.discount || 0;
      const additionalFees = formData.additionalFees || 0;
      const taxes = formData.taxes || 0;
      
      const subtotal = basePrice - discount + additionalFees;
      const total = subtotal + taxes;
      
      setFormData(prev => ({ 
        ...prev, 
        price: basePrice,
        total: total,
        serviceName: selectedService.name,
        duration: selectedService.duration || 0,
        estimatedDuration: selectedService.duration || 0
      }));
    }
  }, [selectedService, formData.discount, formData.additionalFees, formData.taxes]);

  // Monitor scheduledTime changes
  useEffect(() => {
    console.log('scheduledTime changed to:', formData.scheduledTime);
  }, [formData.scheduledTime]);

  // Monitor selectedModifiers changes for debugging
  useEffect(() => {
    console.log('🔄 selectedModifiers changed:', selectedModifiers);
    console.log('🔄 Current price calculation:', calculateTotalPrice());
    console.log('🔄 Current duration calculation:', calculateTotalDuration());
  }, [selectedModifiers, calculationTrigger]);

  // Monitor formData.serviceModifiers changes for debugging
  useEffect(() => {
    console.log('🔄 formData.serviceModifiers changed:', {
      serviceModifiers: formData.serviceModifiers,
      isArray: Array.isArray(formData.serviceModifiers),
      length: formData.serviceModifiers?.length,
      hasModifiers: formData.serviceModifiers && formData.serviceModifiers.length > 0
    });
  }, [formData.serviceModifiers]);

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
      
      setCustomers(customersData.customers || customersData);
      setServices(servicesData.services || servicesData);
      setTeamMembers(teamData.teamMembers || teamData);
      setTerritories(territoriesData.territories || territoriesData);
      setFilteredCustomers(customersData.customers || customersData);
      setFilteredServices(servicesData.services || servicesData);
    } catch (error) {
      console.error('Error loading data:', error);
      setError('Failed to load data. Please refresh the page.');
    } finally {
      setDataLoading(false);
    }
  };

  const handleCustomerSelect = async (customer) => {
    setSelectedCustomer(customer);
    
    console.log('Customer selected:', customer);
    console.log('Customer address fields:', {
      address: customer.address,
      city: customer.city,
      state: customer.state,
      zip_code: customer.zip_code
    });
    
    // Use separate address fields if available, otherwise parse the address string
    let parsedAddress = {
      street: "",
      city: "",
      state: "",
      zipCode: "",
      country: "USA"
    };
    
    if (customer.address || customer.city || customer.state || customer.zip_code) {
      // Use separate fields if available
      if (customer.city && customer.state && customer.zip_code) {
        parsedAddress.street = customer.address || "";
        parsedAddress.city = customer.city;
        parsedAddress.state = customer.state;
        parsedAddress.zipCode = customer.zip_code;
      } else if (customer.address) {
        // Fallback to parsing address string if separate fields aren't available
        const addressParts = customer.address.split(',').map(part => part.trim());
        
        console.log('Address parts:', addressParts);
        
        if (addressParts.length >= 1) {
          parsedAddress.street = addressParts[0];
        }
        
        if (addressParts.length >= 2) {
          parsedAddress.city = addressParts[1];
        }
        
        if (addressParts.length >= 3) {
          // Handle state and zip code which might be together like "State 12345"
          const stateZipPart = addressParts[2];
          const stateZipMatch = stateZipPart.match(/^([A-Za-z\s]+)\s+(\d{5}(?:-\d{4})?)$/);
          
          if (stateZipMatch) {
            parsedAddress.state = stateZipMatch[1].trim();
            parsedAddress.zipCode = stateZipMatch[2];
          } else {
            // If no zip code pattern, assume it's just state
            parsedAddress.state = stateZipPart;
          }
        }
      }
      
      console.log('Parsed address:', parsedAddress);
    }
    
    setFormData(prev => ({
      ...prev,
      customerId: customer.id,
      contactInfo: {
        phone: customer.phone || "",
        email: customer.email || "",
        emailNotifications: true,
        textNotifications: false
      },
      // Autopopulate service address from customer address if available
      serviceAddress: (customer.address || customer.city || customer.state || customer.zip_code) ? parsedAddress : prev.serviceAddress
    }));
    setShowCustomerDropdown(false);
    setCustomerSearch("");
  };

  const handleServiceSelect = (service) => {
    setSelectedService(service);
    
    console.log('🔄 Service selected:', service);
    console.log('🔄 Service modifiers raw:', service.modifiers);
    console.log('🔄 Service modifiers type:', typeof service.modifiers);
    
    // Handle duration properly - services store duration in MINUTES
    let durationInMinutes = 60; // Default 1 hour
    if (service.duration) {
      console.log('🔄 Service duration before conversion:', {
        duration: service.duration,
        type: typeof service.duration,
        isObject: typeof service.duration === 'object'
      });
      
      if (typeof service.duration === 'object' && service.duration.hours !== undefined) {
        // New format: { hours: X, minutes: Y }
        durationInMinutes = (service.duration.hours * 60) + service.duration.minutes;
        console.log('🔄 Converted object duration to minutes:', {
          hours: service.duration.hours,
          minutes: service.duration.minutes,
          totalMinutes: durationInMinutes
        });
      } else if (typeof service.duration === 'number') {
        // Service duration is already in minutes
        durationInMinutes = service.duration;
        console.log('🔄 Service duration in minutes:', {
          originalMinutes: service.duration,
          totalMinutes: durationInMinutes
        });
      }
    }
    
    console.log('🔄 Final duration in minutes for formData:', durationInMinutes);
    
    // Parse modifiers and intake questions if they exist
    let serviceModifiers = [];
    let serviceIntakeQuestions = [];
    
    if (service.modifiers) {
      try {
        console.log('🔄 Attempting to parse modifiers...');
        let parsedModifiers;
        
        if (typeof service.modifiers === 'string') {
          // Try to parse as regular JSON first
          try {
            const firstParse = JSON.parse(service.modifiers);
            console.log('🔄 First parse result:', firstParse);
            console.log('🔄 First parse type:', typeof firstParse);
            console.log('🔄 First parse is array?', Array.isArray(firstParse));
            
            // If first parse is still a string, it's double-encoded
            if (typeof firstParse === 'string') {
              console.log('🔄 First parse is still string, attempting second parse...');
              const secondParse = JSON.parse(firstParse);
              console.log('🔄 Second parse result:', secondParse);
              console.log('🔄 Second parse type:', typeof secondParse);
              console.log('🔄 Second parse is array?', Array.isArray(secondParse));
              
              parsedModifiers = Array.isArray(secondParse) ? secondParse : [];
            } else {
              // First parse was successful and returned an object/array
              parsedModifiers = Array.isArray(firstParse) ? firstParse : [];
            }
          } catch (firstError) {
            console.log('🔄 First parse failed:', firstError.message);
            parsedModifiers = [];
          }
        } else {
          parsedModifiers = service.modifiers;
        }
        
        serviceModifiers = parsedModifiers;
        
        console.log('🔄 Parsed modifiers:', serviceModifiers);
        console.log('🔄 Parsed modifiers type:', typeof serviceModifiers);
        console.log('🔄 Parsed modifiers is array?', Array.isArray(serviceModifiers));
        
        // Ensure serviceModifiers is an array
        if (!Array.isArray(serviceModifiers)) {
          console.warn('🔄 Service modifiers is not an array, converting to empty array:', serviceModifiers);
          serviceModifiers = [];
        }
        
        // Debug modifier durations
        console.log('🔄 Service modifiers loaded:', serviceModifiers);
        serviceModifiers.forEach(modifier => {
          console.log(`🔄 Modifier "${modifier.title || modifier.id}":`, {
            id: modifier.id,
            title: modifier.title,
            selectionType: modifier.selectionType,
            options: modifier.options?.length || 0
          });
          if (modifier.options && Array.isArray(modifier.options)) {
            modifier.options.forEach(option => {
              console.log(`🔄 Modifier option "${option.label || option.title || option.id}":`, {
                id: option.id,
                label: option.label,
                title: option.title,
                price: option.price,
                duration: option.duration,
                type: typeof option.duration,
                isObject: typeof option.duration === 'object'
              });
            });
          }
        });
      } catch (error) {
        console.error('Error parsing service modifiers:', error);
        console.error('Raw modifiers string:', service.modifiers);
        serviceModifiers = [];
      }
    } else {
      console.log('🔄 No modifiers found in service');
    }
    
    if (service.intake_questions) {
      try {
        let parsedQuestions;
        
        if (typeof service.intake_questions === 'string') {
          // Try to parse as regular JSON first
          try {
            parsedQuestions = JSON.parse(service.intake_questions);
            console.log('🔄 First parse successful for intake questions:', parsedQuestions);
          } catch (firstError) {
            console.log('🔄 First parse failed for intake questions, trying double parse');
            // If first parse fails, try parsing again (double-escaped)
            try {
              parsedQuestions = JSON.parse(JSON.parse(service.intake_questions));
              console.log('🔄 Double parse successful for intake questions:', parsedQuestions);
            } catch (secondError) {
              console.error('🔄 Both parse attempts failed for intake questions:', { firstError, secondError });
              throw secondError;
            }
          }
        } else {
          parsedQuestions = service.intake_questions;
        }
        
        const originalQuestions = parsedQuestions;
        
        // Ensure originalQuestions is an array
        if (!Array.isArray(originalQuestions)) {
          console.warn('🔄 Service intake questions is not an array, converting to empty array:', originalQuestions);
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
          
          console.log('🔄 Service intake questions loaded:', serviceIntakeQuestions);
          console.log('🔄 ID mapping created:', idMapping);
          console.log('🔄 Service intake questions count:', serviceIntakeQuestions.length);
          
          if (Array.isArray(serviceIntakeQuestions)) {
            serviceIntakeQuestions.forEach((q, index) => {
              console.log(`🔄 Question ${index + 1}:`, {
                id: q.id,
                originalId: idMapping[q.id],
                question: q.question,
                questionType: q.questionType,
                required: q.required
              });
            });
          }
        }
      } catch (error) {
        console.error('Error parsing service intake questions:', error);
        serviceIntakeQuestions = [];
      }
    } else {
      console.log('🔄 No intake questions found for service');
    }
    
    console.log('🔄 Setting formData with serviceModifiers:', serviceModifiers);
    console.log('🔄 Setting formData with serviceIntakeQuestions:', serviceIntakeQuestions);
    
    setFormData(prev => ({
      ...prev,
      serviceId: service.id,
      price: service.price || 0,
      duration: durationInMinutes, // Store in minutes
      workers: selectedTeamMembers.length > 0 ? selectedTeamMembers.length : (service.workers || 0),
      skillsRequired: service.skills || 0,
      serviceName: service.name,
      estimatedDuration: service.duration || 0,
      // Store service modifiers and intake questions for job creation
      serviceModifiers: serviceModifiers,
      serviceIntakeQuestions: serviceIntakeQuestions,
      // Keep existing time or default to 9 AM if no time set
      scheduledTime: prev.scheduledTime && prev.scheduledTime.trim() !== "" ? prev.scheduledTime : "09:00"
    }));
    
    // Clear previous intake answers when selecting a new service
    setIntakeQuestionAnswers({});
    setSelectedModifiers({}); // Clear previous modifier selections
    
    setShowServiceDropdown(false);
    setServiceSearch("");
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

    if (!selectedService) {
      setError('Please select a service.');
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
        serviceId: formData.serviceId,
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

      console.log('🕐 FRONTEND TIME DEBUG:');
      console.log('  - Time being sent:', jobData.scheduledTime);
      console.log('  - Time type:', typeof jobData.scheduledTime);
      console.log('  - Time length:', jobData.scheduledTime ? jobData.scheduledTime.length : 'null/undefined');
      console.log('  - Time validation:', timeRegex.test(jobData.scheduledTime));
      
      console.log('Creating job with data:', jobData);
      console.log('🔄 Intake questions being sent:', jobData.intakeQuestionAnswers);
      console.log('🔄 Intake questions count being sent:', Object.keys(jobData.intakeQuestionAnswers || {}).length);
      console.log('🔄 Intake questions keys being sent:', Object.keys(jobData.intakeQuestionAnswers || {}));
      const result = await jobsAPI.create(jobData);
      console.log('Job creation result:', result);
      
      setSuccessMessage('Job created successfully!');
      setTimeout(() => {
        // Navigate to the specific job details page
        const jobId = result.id || result.job?.id || result.job_id;
        console.log('Navigating to job ID:', jobId);
        if (jobId) {
          navigate(`/job/${jobId}`);
        } else {
          // If no job ID returned, navigate to jobs page and refresh
          navigate('/jobs');
          // Force a page reload to ensure new job appears
          window.location.reload();
        }
      }, 1500);
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
      const response = await customersAPI.create(customerData)
      console.log('Customer saved successfully:', response)
      
      const newCustomer = response.customer || response
      setCustomers(prev => [...prev, newCustomer]);
      handleCustomerSelect(newCustomer);
      
      return newCustomer
    } catch (error) {
      console.error('Error creating customer:', error)
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

  const handlePaymentMethodSave = (paymentMethod) => {
    setFormData(prev => ({ ...prev, paymentMethod }));
    setShowPaymentModal(false);
  };

  const handleTerritorySelect = (territory) => {
    setDetectedTerritory(territory);
    setFormData(prev => ({ ...prev, territory: territory.name, territoryId: territory.id }));
    setShowTerritoryModal(false);
  };

  // Handle modifier selections
  const handleModifierSelection = (modifierId, optionId, isSelected) => {
    console.log('🔄 Modifier selection:', { modifierId, optionId, isSelected });
    
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
      
      console.log('🔄 Updated modifier selections:', updatedSelections);
      return updatedSelections;
    });
  };

  // Handle modifiers change from the new component
  const handleModifiersChange = (modifiers) => {
    console.log('🔄 Modifiers changed:', modifiers);
    console.log('🔄 Service modifiers available:', formData.serviceModifiers);
    
    // Convert the new format to the existing format for compatibility
    const convertedModifiers = {};
    
    Object.entries(modifiers).forEach(([modifierId, modifierData]) => {
      const modifier = formData.serviceModifiers?.find(m => m.id == modifierId);
      console.log(`🔄 Processing modifier ${modifierId}:`, { modifier, modifierData });
      
      if (!modifier) {
        console.log(`🔄 Modifier ${modifierId} not found in serviceModifiers`);
        return;
      }
      
      if (modifier.selectionType === 'quantity') {
        // Handle quantity selection
        const quantities = modifierData.quantities || {};
        console.log(`🔄 Quantity modifier ${modifierId} quantities:`, quantities);
        Object.entries(quantities).forEach(([optionId, quantity]) => {
          if (quantity > 0) {
            if (!convertedModifiers[modifierId]) {
              convertedModifiers[modifierId] = {};
            }
            convertedModifiers[modifierId][optionId] = quantity;
          }
        });
      } else if (modifier.selectionType === 'multi') {
        // Handle multi-selection
        const selections = modifierData.selections || [];
        console.log(`🔄 Multi modifier ${modifierId} selections:`, selections);
        if (selections.length > 0) {
          convertedModifiers[modifierId] = selections;
        }
      } else {
        // Handle single selection
        const selection = modifierData.selection;
        console.log(`🔄 Single modifier ${modifierId} selection:`, selection);
        if (selection) {
          convertedModifiers[modifierId] = [selection];
        }
      }
    });
    
    console.log('🔄 Converted modifiers:', convertedModifiers);
    setSelectedModifiers(convertedModifiers);
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
    console.log('🔄 Intake questions changed:', answers);
    console.log('🔄 Intake questions count:', Object.keys(answers).length);
    console.log('🔄 Intake questions keys:', Object.keys(answers));
    console.log('🔄 Intake questions values:', Object.values(answers));
    
    // Verify that all questions have answers
    const serviceQuestions = formData.serviceIntakeQuestions || [];
    console.log('🔄 Service questions:', serviceQuestions.map(q => ({ id: q.id, question: q.question })));
    
    const missingAnswers = serviceQuestions.filter(q => !answers[q.id]);
    if (missingAnswers.length > 0) {
      console.log('🔄 Missing answers for questions:', missingAnswers);
    }
    
    setIntakeQuestionAnswers(answers);
  };

  // Calculate total price including modifiers
  const calculateTotalPrice = () => {
    try {
      // Ensure basePrice is a number
      let basePrice = parseFloat(formData.price) || 0;
      let modifierPrice = 0;
      
      console.log('🔄 Service modifiers available:', formData.serviceModifiers);
      console.log('🔄 Selected modifiers structure:', selectedModifiers);
      
      // Add prices from selected modifiers
      Object.entries(selectedModifiers).forEach(([modifierId, modifierData]) => {
        console.log(`🔄 Processing modifier ${modifierId}:`, { modifierData, type: typeof modifierData });
        console.log(`🔄 Looking for modifier with ID: ${modifierId}`);
        console.log(`🔄 Available modifier IDs:`, formData.serviceModifiers?.map(m => m.id));
        const modifier = formData.serviceModifiers?.find(m => m.id == modifierId);
        if (!modifier) {
          console.log(`🔄 Modifier ${modifierId} not found in serviceModifiers`);
          return;
        }
        
        if (modifier.selectionType === 'quantity') {
          console.log(`🔄 Processing quantity modifier ${modifierId}:`, modifierData);
          // Handle quantity selection - modifierData is { optionId: quantity }
          Object.entries(modifierData).forEach(([optionId, quantity]) => {
            console.log(`🔄 Quantity option ${optionId}:`, { quantity, type: typeof quantity });
            console.log(`🔄 Looking for option with ID: ${optionId}`);
            console.log(`🔄 Available option IDs:`, modifier.options?.map(o => o.id));
            const option = modifier.options?.find(o => o.id == optionId);
            console.log(`🔄 Found option:`, option);
            if (option && option.price && quantity > 0) {
              const optionPrice = parseFloat(option.price) || 0;
              const optionTotal = optionPrice * quantity;
              modifierPrice += optionTotal;
              console.log(`🔄 Added to modifier price: ${optionPrice} * ${quantity} = ${optionTotal}`);
            }
          });
        } else {
          console.log(`🔄 Processing single/multi modifier ${modifierId}:`, modifierData);
          // Handle single/multi selection - modifierData is array of optionIds
          const selectedOptionIds = Array.isArray(modifierData) ? modifierData : [modifierData];
          console.log(`🔄 Selected option IDs:`, selectedOptionIds);
          selectedOptionIds.forEach(optionId => {
            console.log(`🔄 Processing option ID:`, optionId);
            console.log(`🔄 Looking for option with ID: ${optionId}`);
            console.log(`🔄 Available option IDs:`, modifier.options?.map(o => o.id));
            const option = modifier.options?.find(o => o.id == optionId);
            console.log(`🔄 Found option:`, option);
            if (option && option.price) {
              const optionPrice = parseFloat(option.price) || 0;
              modifierPrice += optionPrice;
              console.log(`🔄 Added to modifier price: ${optionPrice}`);
            }
          });
        }
      });
      
      const totalPrice = basePrice + modifierPrice;
      console.log('🔄 Price calculation:', { 
        basePrice, 
        modifierPrice, 
        totalPrice, 
        selectedModifiers,
        selectedModifiersKeys: Object.keys(selectedModifiers),
        selectedModifiersValues: Object.values(selectedModifiers)
      });
      return totalPrice;
    } catch (error) {
      console.error('Error calculating total price:', error);
      return 0;
    }
  };

  // Calculate total duration including modifiers
  const calculateTotalDuration = () => {
    try {
      // Ensure baseDuration is a number (stored in minutes)
      let baseDuration = parseFloat(formData.duration) || 0;
      let modifierDuration = 0;
      
      // Add duration from selected modifiers
      Object.entries(selectedModifiers).forEach(([modifierId, modifierData]) => {
        const modifier = formData.serviceModifiers?.find(m => m.id == modifierId);
        if (!modifier) return;
        
        if (modifier.selectionType === 'quantity') {
          // Handle quantity selection - modifierData is { optionId: quantity }
          Object.entries(modifierData).forEach(([optionId, quantity]) => {
            const option = modifier.options?.find(o => o.id == optionId);
            if (option && option.duration && quantity > 0) {
              // Modifier durations are stored in minutes
              const optionDurationInMinutes = parseFloat(option.duration) || 0;
              
              modifierDuration += optionDurationInMinutes * quantity;
              
              console.log(`🔄 Modifier option "${option.label}" duration:`, {
                originalMinutes: optionDurationInMinutes,
                quantity,
                totalForThisOption: optionDurationInMinutes * quantity
              });
            }
          });
        } else {
          // Handle single/multi selection - modifierData is array of optionIds
          const selectedOptionIds = Array.isArray(modifierData) ? modifierData : [modifierData];
          selectedOptionIds.forEach(optionId => {
            const option = modifier.options?.find(o => o.id == optionId);
            if (option && option.duration) {
              // Modifier durations are stored in minutes
              const optionDurationInMinutes = parseFloat(option.duration) || 0;
              
              modifierDuration += optionDurationInMinutes;
              
              console.log(`🔄 Modifier option "${option.label}" duration:`, {
                originalMinutes: optionDurationInMinutes
              });
            }
          });
        }
      });
      
      const totalDurationInMinutes = baseDuration + modifierDuration;
      const totalDurationInHours = totalDurationInMinutes / 60; // Convert to hours for display
      
      console.log('🔄 Duration calculation:', { 
        baseDurationMinutes: baseDuration, 
        modifierDurationMinutes: modifierDuration, 
        totalDurationMinutes: totalDurationInMinutes,
        totalDurationHours: totalDurationInHours,
        formDataDuration: formData.duration,
        selectedModifiersCount: Object.keys(selectedModifiers).length,
        selectedModifiers
      });
      return totalDurationInMinutes; // Return in minutes for backend
    } catch (error) {
      console.error('Error calculating total duration:', error);
      return 0;
    }
  };

  // Show loading if user is not available
  if (!user) {
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
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <Sidebar />
      
      <div className="flex-1 lg:ml-64">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/jobs')}
                className="flex items-center text-blue-600 hover:text-blue-700"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                <span className="hidden sm:inline">Back to Jobs</span>
              </button>
              <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">Create New Job</h1>
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
        <div className="p-4 sm:p-6">
          <form onSubmit={handleSubmit} className="max-w-6xl mx-auto space-y-6" noValidate>
            
            {/* Basic Information Section */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div 
                className="p-6 cursor-pointer"
                onClick={() => toggleSection('basicInfo')}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <User className="w-5 h-5 text-blue-600" />
                    <h2 className="text-lg font-semibold text-gray-900">Basic Information</h2>
                  </div>
                  {expandedSections.basicInfo ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </div>
              </div>
              
              {expandedSections.basicInfo && (
                <div className="px-6 pb-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Customer Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Customer <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search customers..."
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                      onFocus={() => setShowCustomerDropdown(true)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    {selectedCustomer && (
                      <div className="mt-2 p-3 bg-blue-50 rounded-lg">
                        <p className="font-medium text-blue-900">
                          {selectedCustomer.first_name} {selectedCustomer.last_name}
                        </p>
                        <p className="text-sm text-blue-700">{selectedCustomer.email}</p>
                      </div>
                    )}
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
                            onClick={() => handleCustomerSelect(customer)}
                            className="w-full text-left px-4 py-2 hover:bg-gray-100 border-b border-gray-100 last:border-b-0"
                          >
                            <p className="font-medium">{customer.first_name} {customer.last_name}</p>
                            <p className="text-sm text-gray-600">{customer.email}</p>
                          </button>
                        ))}
                      </div>
                      </>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsCustomerModalOpen(true)}
                    className="mt-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    + Add New Customer
                  </button>
                </div>

                {/* Service Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Service <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search services..."
                      value={serviceSearch}
                      onChange={(e) => setServiceSearch(e.target.value)}
                      onFocus={() => setShowServiceDropdown(true)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    {selectedService && (
                      <div className="mt-2 p-3 bg-green-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          {selectedService.image && (
                            <img 
                              src={selectedService.image} 
                              alt={selectedService.name}
                              className="w-12 h-12 object-cover rounded-lg"
                            />
                          )}
                          <div className="flex-1">
                            <p className="font-medium text-green-900">{selectedService.name}</p>
                            <p className="text-sm text-green-700">${selectedService.price}</p>
                          </div>
                        </div>
                      </div>
                    )}
                    {showServiceDropdown && (
                      <>
                        <div 
                          className="fixed inset-0 z-40" 
                          onClick={() => setShowServiceDropdown(false)}
                        />
                      <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        {filteredServices.map(service => (
                          <button
                            key={service.id}
                            type="button"
                            onClick={() => handleServiceSelect(service)}
                            className="w-full text-left px-4 py-2 hover:bg-gray-100 border-b border-gray-100 last:border-b-0"
                          >
                            <div className="flex items-center space-x-3">
                              {service.image && (
                                <img 
                                  src={service.image} 
                                  alt={service.name}
                                  className="w-8 h-8 object-cover rounded"
                                />
                              )}
                              <div className="flex-1">
                                <p className="font-medium">{service.name}</p>
                                <p className="text-sm text-gray-600">${service.price}</p>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                      </>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsServiceModalOpen(true)}
                    className="mt-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    + Add New Service
                  </button>
                </div>

                {/* Service Modifiers - Right after service selection */}
                {(() => {
                  const hasModifiers = formData.serviceModifiers && formData.serviceModifiers.length > 0;
                  console.log('🔄 ServiceModifiers display condition check:', {
                    serviceModifiers: formData.serviceModifiers,
                    isArray: Array.isArray(formData.serviceModifiers),
                    length: formData.serviceModifiers?.length,
                    hasModifiers: hasModifiers
                  });
                  return hasModifiers;
                })() && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">Service Options</h3>
                      <p className="text-sm text-gray-600">Select any additional options to customize this service.</p>
                          </div>
                    
                    <ServiceModifiersForm 
                      modifiers={formData.serviceModifiers}
                      onModifiersChange={handleModifiersChange}
                    />
                  </div>
                )}

                {/* Intake Questions - Right after modifiers */}
                {formData.serviceIntakeQuestions && formData.serviceIntakeQuestions.length > 0 && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">Customer Information</h3>
                      <p className="text-sm text-gray-600">Please provide additional details for this job.</p>
                        </div>
                    
                    <IntakeQuestionsForm 
                      questions={formData.serviceIntakeQuestions}
                      onAnswersChange={handleIntakeQuestionsChange}
                    />
                  </div>
                )}

                    {/* Status */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                      <select
                        value={formData.status}
                        onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        {statusOptions.map(status => (
                          <option key={status.key} value={status.key}>
                            {status.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Priority */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                      <select
                        value={formData.priority}
                        onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        {priorityOptions.map(priority => (
                          <option key={priority.key} value={priority.key}>
                            {priority.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Scheduling Section */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div 
                className="p-6 cursor-pointer"
                onClick={() => toggleSection('scheduling')}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Calendar className="w-5 h-5 text-green-600" />
                    <h2 className="text-lg font-semibold text-gray-900">Scheduling</h2>
                  </div>
                  {expandedSections.scheduling ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </div>
              </div>
              
              {expandedSections.scheduling && (
                <div className="px-6 pb-6 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.scheduledDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, scheduledDate: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Time */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Time <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="time"
                    value={formData.scheduledTime}
                        onChange={(e) => {
                          console.log('Time input changed:', e.target.value);
                          console.log('Previous scheduledTime:', formData.scheduledTime);
                          setFormData(prev => {
                            console.log('Setting scheduledTime to:', e.target.value);
                            return { ...prev, scheduledTime: e.target.value };
                          });
                        }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        step="1800"
                      />
                    </div>

                    {/* Recurring Job */}
                    <div>
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={formData.recurringJob}
                          onChange={(e) => setFormData(prev => ({ ...prev, recurringJob: e.target.checked }))}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm font-medium text-gray-700">Recurring Job</span>
                      </label>
                    </div>

                    {/* Recurring Frequency */}
                    {formData.recurringJob && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Frequency</label>
                        <select
                          value={formData.recurringFrequency}
                          onChange={(e) => setFormData(prev => ({ ...prev, recurringFrequency: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          {recurringOptions.map(option => (
                            <option key={option.key} value={option.key}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Recurring End Date */}
                    {formData.recurringJob && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                        <input
                          type="date"
                          value={formData.recurringEndDate}
                          onChange={(e) => setFormData(prev => ({ ...prev, recurringEndDate: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Service Details Section */}
            {selectedService && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div 
                  className="p-6 cursor-pointer"
                  onClick={() => toggleSection('serviceDetails')}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Briefcase className="w-5 h-5 text-green-600" />
                      <h2 className="text-lg font-semibold text-gray-900">Service Details</h2>
                    </div>
                    {expandedSections.serviceDetails ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </div>
                </div>
                
                {expandedSections.serviceDetails && (
                  <div className="px-6 pb-6 space-y-6">
                    {/* Debug Info */}
                    <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <h4 className="text-sm font-medium text-yellow-800 mb-2">Debug Info:</h4>
                      <div className="text-xs text-yellow-700 space-y-1">
                        <div>Selected Modifiers: {JSON.stringify(selectedModifiers)}</div>
                        <div>Service Modifiers Count: {formData.serviceModifiers?.length || 0}</div>
                        <div>Calculation Trigger: {calculationTrigger}</div>
                      </div>
                    </div>

                    {/* Service Info Chips */}
                    <div className="flex flex-wrap gap-3 mb-6">
                      <div className="flex items-center space-x-2 bg-gray-100 rounded-full px-3 py-2">
                        <Clock className="w-4 h-4 text-gray-600" />
                        <span className="text-sm font-medium text-gray-700" key={`duration-${calculationTrigger}`}>
                          {(() => {
                            const totalMinutes = calculateTotalDuration() || 0;
                            const baseMinutes = parseFloat(formData.duration) || 0;
                            const hours = Math.floor(totalMinutes / 60);
                            const mins = totalMinutes % 60;
                            const display = mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
                            
                            if (totalMinutes !== baseMinutes) {
                              const baseHours = Math.floor(baseMinutes / 60);
                              const baseMins = baseMinutes % 60;
                              const baseDisplay = baseMins > 0 ? `${baseHours}h ${baseMins}m` : `${baseHours}h`;
                              const modifierMinutes = totalMinutes - baseMinutes;
                              const modifierHours = Math.floor(modifierMinutes / 60);
                              const modifierMins = modifierMinutes % 60;
                              const modifierDisplay = modifierMins > 0 ? `${modifierHours}h ${modifierMins}m` : `${modifierHours}h`;
                              
                              return (
                                <>
                                  {display}
                                  <span className="text-xs text-blue-600 ml-1">
                                    (base: {baseDisplay} + modifiers: {modifierDisplay})
                                  </span>
                                </>
                              );
                            }
                            return display;
                          })()}
                        </span>
                        <button
                          onClick={() => setFormData(prev => ({ ...prev, duration: prev.duration + 0.5 }))}
                          className="ml-1 text-gray-400 hover:text-gray-600"
                        >
                          <Edit className="w-3 h-3" />
                        </button>
                      </div>
                      
                      <div className="flex items-center space-x-2 bg-gray-100 rounded-full px-3 py-2">
                        <DollarSign className="w-4 h-4 text-gray-600" />
                        <span className="text-sm font-medium text-gray-700" key={`price-${calculationTrigger}`}>
                          ${(calculateTotalPrice() || 0).toFixed(2)}
                          {(calculateTotalPrice() || 0) !== (parseFloat(formData.price) || 0) && (
                            <span className="text-xs text-blue-600 ml-1">
                              (base: ${(parseFloat(formData.price) || 0).toFixed(2)} + modifiers: ${((calculateTotalPrice() || 0) - (parseFloat(formData.price) || 0)).toFixed(2)})
                            </span>
                          )}
                        </span>
                      </div>
                      
                      <div className="flex items-center space-x-2 bg-gray-100 rounded-full px-3 py-2">
                        <Users className="w-4 h-4 text-gray-600" />
                        <span className="text-sm font-medium text-gray-700">
                          {selectedTeamMembers.length > 0 
                            ? `${selectedTeamMembers.length} worker${selectedTeamMembers.length !== 1 ? 's' : ''} (from team)`
                            : `${formData.workers} worker${formData.workers !== 1 ? 's' : ''} (manual)`}
                        </span>
                        {selectedTeamMembers.length === 0 && (
                          <button
                            onClick={() => setFormData(prev => ({ ...prev, workers: prev.workers + 1 }))}
                            className="ml-1 text-gray-400 hover:text-gray-600"
                            title="Add worker manually"
                          >
                            <Edit className="w-3 h-3" />
                          </button>
                        )}
                        {selectedTeamMembers.length > 0 && (
                          <span className="ml-1 text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">
                            Auto
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-2 bg-gray-100 rounded-full px-3 py-2">
                        <Tag className="w-4 h-4 text-gray-600" />
                        <span className="text-sm font-medium text-gray-700">{formData.skillsRequired || 0} skills required</span>
                        <button
                          onClick={() => setFormData(prev => ({ ...prev, skillsRequired: (prev.skillsRequired || 0) + 1 }))}
                          className="ml-1 text-gray-400 hover:text-gray-600"
                        >
                          <Edit className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {/* Special Instructions */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Special Instructions</label>
                      <textarea
                        rows={3}
                        value={formData.specialInstructions}
                        onChange={(e) => setFormData(prev => ({ ...prev, specialInstructions: e.target.value }))}
                        placeholder="Any special instructions for this job..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Notes Section */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div 
                className="p-6 cursor-pointer"
                onClick={() => toggleSection('notes')}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <FileText className="w-5 h-5 text-blue-600" />
                    <h2 className="text-lg font-semibold text-gray-900">Notes & Communication</h2>
                  </div>
                  {expandedSections.notes ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </div>
              </div>
              
              {expandedSections.notes && (
                <div className="px-6 pb-6 space-y-6">
                  <div className="grid grid-cols-1 gap-6">
                  <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Job Notes (Customer Visible)</label>
                      <textarea
                        rows={4}
                        value={formData.notes}
                        onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                        placeholder="Add notes that will be visible to the customer..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Internal Notes (Team Only)</label>
                      <textarea
                        rows={4}
                        value={formData.internalNotes}
                        onChange={(e) => setFormData(prev => ({ ...prev, internalNotes: e.target.value }))}
                        placeholder="Add internal notes for your team..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
            {/* Team Assignment Section */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div 
                className="p-6 cursor-pointer"
                onClick={() => toggleSection('team')}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Users className="w-5 h-5 text-purple-600" />
                    <h2 className="text-lg font-semibold text-gray-900">Team Assignment</h2>
                  </div>
                  {expandedSections.team ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </div>
              </div>
              
              {expandedSections.team && (
                <div className="px-6 pb-6 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Assign Team Members
                        <span className="text-xs text-gray-500 ml-1">(Worker count will be set automatically)</span>
                      </label>
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setShowTeamDropdown(!showTeamDropdown)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-left focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          {selectedTeamMembers.length > 0 
                            ? `${selectedTeamMembers.length} member(s) selected` 
                            : "Select team members..."}
                        </button>
                        {showTeamDropdown && (
                          <>
                            <div 
                              className="fixed inset-0 z-40" 
                              onClick={() => setShowTeamDropdown(false)}
                            />
                            <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                              {teamMembers.map(member => {
                                const isSelected = selectedTeamMembers.find(m => m.id === member.id);
                                return (
                                  <button
                                    key={member.id}
                                    type="button"
                                    onClick={() => handleMultipleTeamMemberSelect(member)}
                                    className={`w-full text-left px-4 py-2 hover:bg-gray-100 border-b border-gray-100 last:border-b-0 ${
                                      isSelected ? 'bg-blue-50 text-blue-700' : ''
                                    }`}
                                  >
                                    <div className="flex items-center justify-between">
                                      <div>
                                        <p className="font-medium">{member.first_name} {member.last_name}</p>
                                        <p className="text-sm text-gray-600">{member.role || 'Team Member'}</p>
                                      </div>
                                      {isSelected && (
                                        <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                      )}
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          </>
                        )}
                      </div>
                      
                      {/* Show selected team members */}
                      {selectedTeamMembers.length > 0 && (
                        <div className="mt-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-gray-700">Selected Team Members:</p>
                            <button
                              type="button"
                              onClick={clearAllTeamMembers}
                              className="text-xs text-red-600 hover:text-red-700"
                            >
                              Clear All
                            </button>
                          </div>
                          <div className="space-y-2">
                            {selectedTeamMembers.map(member => (
                              <div key={member.id} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded-lg">
                                <span className="text-sm">{member.first_name} {member.last_name}</span>
                                <button
                                  type="button"
                                  onClick={() => removeTeamMember(member.id)}
                                  className="text-red-500 hover:text-red-700 text-sm"
                                >
                                  Remove
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Territory</label>
                      <button
                        type="button"
                        onClick={() => setShowTerritoryModal(true)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-left focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        {detectedTerritory ? detectedTerritory.name : "Select territory..."}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Schedule Section */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Schedule</h2>
              
              {/* Schedule Type Buttons */}
              <div className="flex space-x-2 mb-6">
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, scheduleType: 'one-time' }))}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    formData.scheduleType === 'one-time'
                      ? 'bg-blue-100 text-blue-700 border border-blue-200'
                      : 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200'
                  }`}
                >
                  One Time
                </button>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, scheduleType: 'recurring' }))}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    formData.scheduleType === 'recurring'
                      ? 'bg-blue-100 text-blue-700 border border-blue-200'
                      : 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200'
                  }`}
                >
                  Recurring Job
                </button>
              </div>

              {/* Schedule Now Section */}
              <div className="mb-6">
                <div className="flex items-center space-x-2 mb-4">
                  <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
                  <h3 className="text-sm font-medium text-gray-900">Schedule Now</h3>
                </div>
                
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Date *</label>
                    <div className="relative">
                  <input
                        type="date"
                        required
                        value={formData.scheduledDate}
                        onChange={(e) => setFormData(prev => ({ ...prev, scheduledDate: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                      <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    </div>
                </div>
                
              {/* Recurring Options */}
              {formData.scheduleType === 'recurring' && (
                <div className="border-t border-gray-200 pt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Recurring Frequency</label>
                  <select
                    value={formData.recurringFrequency || "weekly"}
                    onChange={(e) => setFormData(prev => ({ ...prev, recurringFrequency: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="weekly">Weekly</option>
                    <option value="bi-weekly">Bi-weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                  </select>
                </div>
              )}
              </div>
            </div>

            {/* Contact Information Section */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div 
                className="p-6 cursor-pointer"
                onClick={() => toggleSection('contact')}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Phone className="w-5 h-5 text-green-600" />
                    <h2 className="text-lg font-semibold text-gray-900">Contact Information</h2>
                  </div>
                  {expandedSections.contact ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </div>
              </div>
              
              {expandedSections.contact && (
                <div className="px-6 pb-6 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                  <input
                        type="tel"
                        value={formData.contactInfo.phone}
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          contactInfo: { ...prev.contactInfo, phone: e.target.value }
                        }))}
                        placeholder="(555) 123-4567"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                  <input
                        type="email"
                        value={formData.contactInfo.email}
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          contactInfo: { ...prev.contactInfo, email: e.target.value }
                        }))}
                        placeholder="customer@example.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              
                  <div className="space-y-4">
                    <h3 className="text-sm font-medium text-gray-700">Notification Preferences</h3>
                    <div className="space-y-3">
                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          id="emailNotifications"
                          checked={formData.contactInfo.emailNotifications}
                          onChange={(e) => setFormData(prev => ({ 
                            ...prev, 
                            contactInfo: { ...prev.contactInfo, emailNotifications: e.target.checked }
                          }))}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <label htmlFor="emailNotifications" className="text-sm text-gray-700">
                          Email notifications
                        </label>
                </div>

                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          id="textNotifications"
                          checked={formData.contactInfo.textNotifications}
                          onChange={(e) => setFormData(prev => ({ 
                            ...prev, 
                            contactInfo: { ...prev.contactInfo, textNotifications: e.target.checked }
                          }))}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <label htmlFor="textNotifications" className="text-sm text-gray-700">
                          SMS notifications
                        </label>
              </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Service Address Section */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div 
                className="p-6 cursor-pointer"
                onClick={() => toggleSection('address')}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <MapPin className="w-5 h-5 text-red-600" />
                    <h2 className="text-lg font-semibold text-gray-900">Service Address</h2>
                  </div>
                  {expandedSections.address ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </div>
              </div>
              
              {expandedSections.address && (
                <div className="px-6 pb-6 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Street Address</label>
                      <AddressAutocomplete
                        value={formData.serviceAddress.street}
                        onChange={(value) => setFormData(prev => ({ 
                          ...prev, 
                          serviceAddress: { ...prev.serviceAddress, street: value }
                        }))}
                        onAddressSelect={(addressComponents) => {
                          console.log('Address selected:', addressComponents);
                          setFormData(prev => ({
                            ...prev,
                            serviceAddress: {
                              ...prev.serviceAddress,
                              ...addressComponents
                            }
                          }));
                        }}
                        placeholder="123 Main Street"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                      <input
                        type="text"
                        value={formData.serviceAddress.city}
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          serviceAddress: { ...prev.serviceAddress, city: e.target.value }
                        }))}
                        placeholder="New York"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
                      <input
                        type="text"
                        value={formData.serviceAddress.state}
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          serviceAddress: { ...prev.serviceAddress, state: e.target.value }
                        }))}
                        placeholder="NY"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">ZIP Code</label>
                      <input
                        type="text"
                        value={formData.serviceAddress.zipCode}
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          serviceAddress: { ...prev.serviceAddress, zipCode: e.target.value }
                        }))}
                        placeholder="10001"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
                      <input
                        type="text"
                        value={formData.serviceAddress.country}
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          serviceAddress: { ...prev.serviceAddress, country: e.target.value }
                        }))}
                        placeholder="United States"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowAddressModal(true)}
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    + Use Address Modal
                  </button>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={() => navigate('/jobs')}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                onClick={() => console.log('Submit button clicked')}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating...' : 'Create Job'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Modals */}
      <CustomerModal
        isOpen={isCustomerModalOpen}
        onClose={() => setIsCustomerModalOpen(false)}
        onSave={handleCustomerSave}
        user={user}
      />
      
      <ServiceModal
        isOpen={isServiceModalOpen}
        onClose={() => setIsServiceModalOpen(false)}
        onSave={(newService) => {
          // Add the new service to the services list
          setServices(prev => [...prev, newService]);
          // Select the newly created service
          handleServiceSelect(newService);
          // Close the modal
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
    </div>
  );
}