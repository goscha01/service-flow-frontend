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
  Clipboard,
  RotateCw
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
import DiscountModal from "../components/discount-modal";
import RecurringFrequencyModal from "../components/recurring-frequency-modal";
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { jobsAPI, customersAPI, servicesAPI, teamAPI, territoriesAPI, leadsAPI, notificationSettingsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useCategory } from '../context/CategoryContext';
import { getImageUrl, handleImageError } from '../utils/imageUtils';
import { formatDateLocal, formatDateDisplay, parseLocalDate } from '../utils/dateUtils';
import { formatPhoneNumber } from '../utils/phoneFormatter';
import { formatRecurringFrequency } from '../utils/recurringUtils';
import { decodeHtmlEntities } from '../utils/htmlUtils';


export default function CreateJobPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const { selectedCategoryId, selectedCategoryName } = useCategory();
  const [jobselected, setJobselected] = useState(false);
  const [customerSelected, setCustomerSelected] = useState(false);
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
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [showRecurringModal, setShowRecurringModal] = useState(false);
  const [showLeadsModal, setShowLeadsModal] = useState(false);
  const [discountType, setDiscountType] = useState('fixed'); // 'fixed' or 'percentage'

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
    tags: [],
    attachments: [],
    recurringFrequency: "",
    recurringEndDate: "",
    autoInvoice: true,
    autoReminders: true,
    customerSignature: false,
    photosRequired: false,
    qualityCheck: true,
    arrivalWindow: false,
    // Service modifiers and intake questions
    serviceModifiers: [],
    serviceIntakeQuestions: [],
    intakeQuestionIdMapping: {}
  });

  // Data lists
  const [customers, setCustomers] = useState([]);
  const [leads, setLeads] = useState([]);
  const [services, setServices] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [filteredLeads, setFilteredLeads] = useState([]);
  const [filteredServices, setFilteredServices] = useState([]);

  // UI state
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const customerDropdownRef = useRef(null);
  const handleCustomerSelectRef = useRef(null);
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
  const [editingServicePriceId, setEditingServicePriceId] = useState(null); // Track which service price is being edited
  const [editingServicePriceValue, setEditingServicePriceValue] = useState(''); // Temporary price value while editing
  const [editingServiceDurationId, setEditingServiceDurationId] = useState(null); // Track which service duration is being edited
  const [editingServiceDurationHours, setEditingServiceDurationHours] = useState(''); // Temporary duration hours value
  const [editingServiceDurationMinutes, setEditingServiceDurationMinutes] = useState(''); // Temporary duration minutes value

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
  const [expandedCustomerSections, setExpandedCustomerSections] = useState({
    contact: false,
    notes: false
  });
  const [expandedServiceIds, setExpandedServiceIds] = useState([]);

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
      loadGlobalNotificationSettings();
    }
  }, [user?.id]);

  // Load global appointment confirmation SMS setting and set default
  const loadGlobalNotificationSettings = async () => {
    if (!user?.id) return;
    
    try {
      const settings = await notificationSettingsAPI.getSettings(user.id);
      // getSettings now returns empty array on error, so we can safely check
      if (Array.isArray(settings) && settings.length > 0) {
        const appointmentSetting = settings.find(s => s.notification_type === 'appointment_confirmation');
        
        if (appointmentSetting && appointmentSetting.sms_enabled === 1) {
          // Global SMS is enabled, default textNotifications to true
          setFormData(prev => ({
            ...prev,
            contactInfo: {
              ...prev.contactInfo,
              textNotifications: true
            }
          }));
        }
      }
    } catch (error) {
      // This should rarely happen now since getSettings handles errors internally
      console.warn('Error loading global notification settings:', error);
      // Don't show error to user, just use default
    }
  };

  // Handle lead data from location state (when converting lead to job)
  useEffect(() => {
    if (location.state?.fromLead && location.state?.leadData && customers.length > 0 && services.length > 0 && teamMembers.length > 0) {
      const leadData = location.state.leadData;
      console.log('📋 Loading lead data for job creation:', leadData);
      
      // Set service if lead has one
      if (leadData.serviceId) {
        const service = services.find(s => s.id === parseInt(leadData.serviceId));
        if (service) {
          setSelectedService(service);
          setSelectedServices([service]);
          setServiceSelected(true);
          setJobselected(true);
          console.log('✅ Service pre-selected from lead:', service.name);
        }
      }
      
      // Set team member if lead has assigned team member
      if (leadData.assignedTeamMemberId && teamMembers.length > 0) {
        const teamMember = teamMembers.find(tm => tm.id === parseInt(leadData.assignedTeamMemberId));
        if (teamMember) {
          setSelectedTeamMember(teamMember);
          setSelectedTeamMembers([teamMember]);
          setFormData(prev => ({
            ...prev,
            teamMemberId: teamMember.id
          }));
          console.log('✅ Team member pre-selected from lead:', teamMember.first_name, teamMember.last_name);
        }
      }
      
      // Set notes if lead has notes
      if (leadData.notes) {
        setFormData(prev => ({
          ...prev,
          notes: leadData.notes
        }));
      }
      
      // Set estimated value if lead has value
      if (leadData.value) {
        setFormData(prev => ({
          ...prev,
          price: parseFloat(leadData.value) || 0
        }));
      }
      
      // Clear location state to prevent re-loading on refresh
      window.history.replaceState({}, document.title);
    }
  }, [location.state, customers, services, teamMembers]);

  // Handle duplicate job from location state
  useEffect(() => {
    if (location.state?.duplicateJob && customers.length > 0 && services.length > 0) {
      const duplicateJob = location.state.duplicateJob;
      console.log('📋 Loading duplicate job data:', duplicateJob);
      
      // Set customer
      if (duplicateJob.customer_id) {
        const customer = customers.find(c => c.id === duplicateJob.customer_id);
        if (customer) {
          setSelectedCustomer(customer);
          setCustomerSelected(true);
        }
      }
      
      // Set service
      if (duplicateJob.service_id) {
        const service = services.find(s => s.id === duplicateJob.service_id);
        if (service) {
          setSelectedService(service);
          setSelectedServices([service]);
          setServiceSelected(true);
          setJobselected(true);
        }
      } else if (duplicateJob.service_name) {
        // If no service_id, try to find by name
        const service = services.find(s => s.name === duplicateJob.service_name);
        if (service) {
          setSelectedService(service);
          setSelectedServices([service]);
          setServiceSelected(true);
          setJobselected(true);
        }
      }
      
      // Set team member
      if (duplicateJob.team_member_id && teamMembers.length > 0) {
        const teamMember = teamMembers.find(tm => tm.id === duplicateJob.team_member_id);
        if (teamMember) {
          setSelectedTeamMember(teamMember);
          setSelectedTeamMembers([teamMember]);
        }
      }
      
      // Parse scheduled date and time
      let scheduledDate = '';
      let scheduledTime = '09:00';
      if (duplicateJob.scheduled_date) {
        const dateStr = duplicateJob.scheduled_date;
        if (dateStr.includes('T')) {
          const [datePart, timePart] = dateStr.split('T');
          scheduledDate = datePart;
          if (timePart) {
            scheduledTime = timePart.substring(0, 5); // Get HH:MM
          }
        } else if (dateStr.includes(' ')) {
          const [datePart, timePart] = dateStr.split(' ');
          scheduledDate = datePart;
          if (timePart) {
            scheduledTime = timePart.substring(0, 5);
          }
        } else {
          scheduledDate = dateStr;
        }
      }
      
      // Set form data
      setFormData(prev => ({
        ...prev,
        customerId: duplicateJob.customer_id || '',
        serviceId: duplicateJob.service_id || '',
        teamMemberId: duplicateJob.team_member_id || '',
        scheduledDate: scheduledDate,
        scheduledTime: scheduledTime,
        notes: duplicateJob.notes || '',
        duration: duplicateJob.duration || duplicateJob.estimated_duration || 360,
        estimatedDuration: duplicateJob.estimated_duration || duplicateJob.duration || 360,
        workers: duplicateJob.workers_needed || duplicateJob.workers || 0,
        skillsRequired: duplicateJob.skills_required || 0,
        price: duplicateJob.price || duplicateJob.service_price || 0,
        discount: duplicateJob.discount || 0,
        additionalFees: duplicateJob.additional_fees || 0,
        taxes: duplicateJob.taxes || 0,
        total: duplicateJob.total || duplicateJob.total_amount || 0,
        paymentMethod: duplicateJob.payment_method || '',
        territory: duplicateJob.territory_id || '',
        recurringJob: duplicateJob.is_recurring || false,
        recurringFrequency: duplicateJob.recurring_frequency || '',
        recurringEndDate: duplicateJob.recurring_end_date || '',
        serviceName: duplicateJob.service_name || '',
        invoiceStatus: duplicateJob.invoice_status || 'draft',
        paymentStatus: duplicateJob.payment_status || 'pending',
        offerToProviders: duplicateJob.offer_to_providers || false,
        serviceModifiers: duplicateJob.service_modifiers || [],
        serviceIntakeQuestions: duplicateJob.service_intake_questions || [],
        serviceAddress: {
          street: duplicateJob.service_address_street || '',
          city: duplicateJob.service_address_city || '',
          state: duplicateJob.service_address_state || '',
          zipCode: duplicateJob.service_address_zip || '',
          country: duplicateJob.service_address_country || 'USA',
          unit: duplicateJob.service_address_unit || ''
        }
      }));
      
      // Set territory
      if (duplicateJob.territory_id) {
        setDetectedTerritory(duplicateJob.territory_id);
      }
      
      // Clear location state to prevent re-loading on refresh
      window.history.replaceState({}, document.title);
    }
  }, [location.state, customers, services, teamMembers]);

  // Handle lead selection - convert to customer first
  // This will be defined after handleCustomerSelect, but we'll use a ref to access it
  const handleLeadSelect = useCallback(async (lead) => {
    try {
      // Convert lead to customer
      const convertedCustomer = await leadsAPI.convertToCustomer(lead.id);
      
      // Create customer data immediately from the converted result
      const customerData = {
        ...lead,
        id: convertedCustomer.customer_id || convertedCustomer.id,
        converted_customer_id: convertedCustomer.customer_id || convertedCustomer.id
      };
      
      // IMMEDIATELY set the customer as selected - don't wait for anything
      setSelectedCustomer(customerData);
      setCustomerSelected(true);
      setJobselected(true);
      
      // Set form data immediately with customer ID
      setFormData(prev => ({
        ...prev,
        customerId: customerData.id,
        contactInfo: {
          phone: lead.phone || "",
          email: lead.email || "",
          emailNotifications: true,
          textNotifications: false
        }
      }));
      
      // Refresh customers list to include the newly converted customer
      const customersData = await customersAPI.getAll(user.id);
      const updatedCustomers = customersData.customers || customersData;
      setCustomers(updatedCustomers);
      setFilteredCustomers(updatedCustomers);
      
      // Find the converted customer in the updated list (might have more complete data)
      const customer = updatedCustomers.find(c => 
        c.id === convertedCustomer.customer_id || 
        c.id === convertedCustomer.id ||
        (c.email === lead.email && c.first_name === lead.first_name && c.last_name === lead.last_name)
      );
      
      // If we found the customer with complete data, use handleCustomerSelect to populate all fields
      if (customer && handleCustomerSelectRef.current) {
        // This will update the form with address and other customer data
        await handleCustomerSelectRef.current(customer);
      } else if (handleCustomerSelectRef.current) {
        // Use the converted data directly
        await handleCustomerSelectRef.current(customerData);
      }
      
      // Remove the lead from the leads list since it's now converted
      setLeads(prevLeads => prevLeads.filter(l => l.id !== lead.id));
      setFilteredLeads(prevLeads => prevLeads.filter(l => l.id !== lead.id));
      
      setShowCustomerDropdown(false);
      setCustomerSearch("");
    } catch (error) {
      console.error('Error converting lead to customer:', error);
      setError(error.response?.data?.error || 'Failed to convert lead to customer. Please try again.');
      // Reset selection on error
      setSelectedCustomer(null);
      setCustomerSelected(false);
      setJobselected(false);
    }
  }, [user?.id]);

  // Define handleCustomerSelect before useEffect that uses it
  const handleCustomerSelect = useCallback(async (customer) => {
    setSelectedCustomer(customer);
    setCustomerSelected(true); // Mark customer as selected
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
  }, []);

  // Handle customerId from URL params
  useEffect(() => {
    const customerIdFromUrl = searchParams.get('customerId');
    if (customerIdFromUrl && !location.state?.duplicateJob) {
      // If customers list is empty, wait for it to load
      if (customers.length === 0 && !dataLoading) {
        // Customers list might not be loaded yet, try to fetch the specific customer
        const fetchCustomerById = async () => {
          try {
            const customerData = await customersAPI.getAll(user.id);
            const allCustomers = customerData.customers || customerData || [];
            setCustomers(allCustomers);
            setFilteredCustomers(allCustomers);
            
            const customer = allCustomers.find(c => 
              c.id === parseInt(customerIdFromUrl) || 
              c.id === customerIdFromUrl ||
              String(c.id) === String(customerIdFromUrl)
            );
            
            if (customer) {
              console.log('✅ Found customer from API:', customer);
              handleCustomerSelect(customer);
            } else {
              console.warn('⚠️ Customer not found in list:', customerIdFromUrl);
            }
          } catch (error) {
            console.error('Error fetching customer:', error);
          }
        };
        
        if (user?.id) {
          fetchCustomerById();
        }
        return;
      }
      
      // If customers list is loaded, find the customer
      if (customers.length > 0) {
        const customer = customers.find(c => 
          c.id === parseInt(customerIdFromUrl) || 
          c.id === customerIdFromUrl ||
          String(c.id) === String(customerIdFromUrl)
        );
        
        if (customer) {
          console.log('✅ Found customer in list:', customer);
          // Use handleCustomerSelect to properly populate address and all customer data
          handleCustomerSelect(customer);
        } else {
          console.warn('⚠️ Customer not found in list:', customerIdFromUrl, 'Available customers:', customers.map(c => c.id));
        }
      }
    }
  }, [searchParams, customers, location.state, handleCustomerSelect, dataLoading, user?.id]);

  useEffect(() => {
    // Filter customers and leads based on search
    if (customerSearch) {
      const filteredCustomers = (customers || []).filter(customer =>
        `${customer.first_name} ${customer.last_name}`.toLowerCase().includes(customerSearch.toLowerCase()) ||
        customer.email?.toLowerCase().includes(customerSearch.toLowerCase())
      );
      const filteredLeads = (leads || []).filter(lead =>
        `${lead.first_name} ${lead.last_name}`.toLowerCase().includes(customerSearch.toLowerCase()) ||
        lead.email?.toLowerCase().includes(customerSearch.toLowerCase())
      );
      setFilteredCustomers(filteredCustomers);
      setFilteredLeads(filteredLeads);
      // Show dropdown when there's a search term and results
      if (filteredCustomers.length > 0 || filteredLeads.length > 0) {
        setShowCustomerDropdown(true);
      }
    } else {
      setFilteredCustomers(customers || []);
      setFilteredLeads(leads || []);
      setShowCustomerDropdown(false);
    }
  }, [customerSearch, customers, leads]);

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


  // Calculate total price including modifiers - iterate through each service
  const calculateTotalPrice = useCallback(() => {
    try {
      let totalPrice = 0;
      
      console.log('🔧 CALC: Starting calculation for', selectedServices.length, 'services');
      
      // Calculate price for each service individually
      selectedServices.forEach(service => {
        let serviceTotal = parseFloat(service.price) || 0;
        console.log(`🔧 CALC: Service "${service.name}" - Base price: $${serviceTotal}`);
        
        // Get this service's modifiers and prices
        const serviceModifiers = service.serviceModifiers || service.parsedModifiers || [];
        const serviceSelectedModifiers = service.selectedModifiers || {};
        const serviceEditedPrices = service.editedModifierPrices || {};
        
        console.log(`  Modifiers available:`, serviceModifiers.length);
        console.log(`  Selected modifiers:`, serviceSelectedModifiers);
        console.log(`  Edited prices:`, serviceEditedPrices);
        
        // Calculate modifier prices for this service
        Object.entries(serviceSelectedModifiers).forEach(([modifierId, modifierData]) => {
          const modifier = serviceModifiers.find(m => String(m.id) === String(modifierId));
        
        if (!modifier) {
            console.log(`  Modifier ${modifierId} not found`);
          return;
        }
        
          console.log(`  Processing modifier: ${modifier.name || modifier.title}`);
          
          if (modifier.selectionType === 'quantity' && modifierData?.quantities) {
            Object.entries(modifierData.quantities).forEach(([optionId, quantity]) => {
              const option = modifier.options?.find(o => String(o.id) === String(optionId));
            
            if (option && quantity > 0) {
              const priceKey = `${modifierId}_option_${optionId}`;
                const price = parseFloat(serviceEditedPrices[priceKey] !== undefined 
                  ? serviceEditedPrices[priceKey] 
                  : option.price) || 0;
                
                const optionTotal = price * quantity;
                serviceTotal += optionTotal;
                
                console.log(`    ${option.name || option.label || option.title}: $${price} x ${quantity} = $${optionTotal}`);
              }
            });
          } else if (modifier.selectionType === 'multi' && modifierData?.selections) {
            const selections = Array.isArray(modifierData.selections) ? modifierData.selections : [modifierData.selections];
          
          selections.forEach(optionId => {
              const option = modifier.options?.find(o => String(o.id) === String(optionId));
            
            if (option) {
              const priceKey = `${modifierId}_option_${optionId}`;
                const price = parseFloat(serviceEditedPrices[priceKey] !== undefined 
                  ? serviceEditedPrices[priceKey] 
                  : option.price) || 0;
                
                serviceTotal += price;
                console.log(`    ${option.name || option.label || option.title}: $${price}`);
              }
            });
          } else if (modifierData?.selection) {
          // Single selection
            const option = modifier.options?.find(o => String(o.id) === String(modifierData.selection));
          
          if (option) {
              const priceKey = `${modifierId}_option_${modifierData.selection}`;
              const price = parseFloat(serviceEditedPrices[priceKey] !== undefined 
                ? serviceEditedPrices[priceKey] 
                : option.price) || 0;
              
              serviceTotal += price;
              console.log(`    ${option.name || option.label || option.title}: $${price}`);
          }
        }
      });
      
        console.log(`  Service "${service.name}" total: $${serviceTotal}`);
        totalPrice += serviceTotal;
      });
      
      console.log('🔧 CALC: Grand total:', totalPrice);
      return parseFloat(totalPrice) || 0;
    } catch (error) {
      console.error('Error calculating total price:', error);
      return 0;
    }
  }, [selectedServices]);

  // ✅ FIX 6: Update effect to recalculate on all relevant changes
  useEffect(() => {
    if (selectedServices.length > 0) {
      const subtotal = calculateTotalPrice();
      let discountAmount = 0;
      const discountValue = parseFloat(formData.discount) || 0;
      
      // Calculate discount based on type
      if (discountValue > 0) {
        if (discountType === 'percentage') {
          discountAmount = (subtotal * discountValue) / 100;
        } else {
          discountAmount = discountValue;
        }
      }
      
      const additionalFees = parseFloat(formData.additionalFees) || 0;
      const taxes = parseFloat(formData.taxes) || 0;
      
      const total = subtotal - discountAmount + additionalFees + taxes;
      
      console.log('🔧 EFFECT: Updating prices - Subtotal:', subtotal, 'Discount:', discountAmount, 'Total:', total);
      
      setFormData(prev => ({
        ...prev,
        price: subtotal,
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
    formData.discount, 
    formData.additionalFees, 
    formData.taxes,
    discountType,
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
      const [customersData, servicesData, teamData, territoriesData, leadsData] = await Promise.all([
        customersAPI.getAll(user.id),
        servicesAPI.getAll(user.id),
        teamAPI.getAll(user.id),
        territoriesAPI.getAll(user.id),
        leadsAPI.getAll().catch(() => []) // Fetch leads, but don't fail if it errors
      ]);
      
      const services = servicesData.services || servicesData;
      
      // Decode HTML entities in service names
      const decodedServices = Array.isArray(services) ? services.map(service => ({
        ...service,
        name: decodeHtmlEntities(service.name || '')
      })) : services;
      
      setCustomers(customersData.customers || customersData);
      setLeads(leadsData.leads || leadsData || []);
      setServices(decodedServices);
      setTeamMembers(teamData.teamMembers || teamData);
      setTerritories(territoriesData.territories || territoriesData);
      setFilteredCustomers(customersData.customers || customersData);
      setFilteredLeads(leadsData.leads || leadsData || []);
      setFilteredServices(decodedServices);
    } catch (error) {
      console.error('Error loading data:', error);
      setError('Failed to load data. Please refresh the page.');
    } finally {
      setDataLoading(false);
    }
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
    
    // Add service to selected services array with duration
    console.log('🔧 HANDLESERVICESELECT: Adding service to selectedServices with price:', service.price, 'duration:', durationInMinutes);
    setSelectedServices(prev => {
      const serviceWithDuration = {
        ...service,
        name: decodeHtmlEntities(service.name || ''), // Ensure name is decoded
        duration: durationInMinutes,
        originalDuration: service.duration || durationInMinutes
      };
      const updated = [...prev, serviceWithDuration];
      console.log('🔧 HANDLESERVICESELECT: Updated selectedServices:', updated.map(s => ({ name: s.name, price: s.price, duration: s.duration })));
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
      serviceName: decodeHtmlEntities(service.name || ''),
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
        // Update filtered customers to include the new customer
        setFilteredCustomers(prev => [...prev, savedCustomer]);
      }
      
      console.log('Customer saved successfully:', savedCustomer)
      // Select the customer and move to next step
      handleCustomerSelect(savedCustomer);
      setCustomerSelected(true); // Mark customer as selected to show next step
      setJobselected(true); // Show the form
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
    console.log('💾 Saving service customization for service:', selectedService?.id);
    console.log('💾 Current selectedModifiers:', selectedModifiers);
    console.log('💾 Current intakeQuestionAnswers:', intakeQuestionAnswers);
    console.log('💾 Current editedModifierPrices:', editedModifierPrices);
    
    // Update the service in selectedServices array with the new customization
    if (selectedService) {
      setSelectedServices(prev => {
        // Check if service already exists in selectedServices
        const serviceExists = prev.some(s => s.id === selectedService.id);
        
        if (serviceExists) {
          // Update existing service
          return prev.map(service => {
            if (service.id === selectedService.id) {
              const updatedService = {
                ...service,
                selectedModifiers: { ...selectedModifiers },
                intakeQuestionAnswers: { ...intakeQuestionAnswers },
                editedModifierPrices: { ...editedModifierPrices }
              };
              console.log('💾 Updated existing service with all customizations:', updatedService);
              return updatedService;
            }
            return service;
          });
        } else {
          // Add new service with customizations (e.g., newly created service)
          const updatedService = {
            ...selectedService,
            selectedModifiers: { ...selectedModifiers },
            intakeQuestionAnswers: { ...intakeQuestionAnswers },
            editedModifierPrices: { ...editedModifierPrices }
          };
          console.log('💾 Adding new service with all customizations:', updatedService);
          return [...prev, updatedService];
        }
      });
      
      // Trigger price recalculation
      setCalculationTrigger(prev => prev + 1);
    }
    
    setShowServiceCustomizationPopup(false);
  };

  // Discount modal handlers
  const handleSaveDiscount = (value, type) => {
    console.log('💰 Saving discount:', value, type);
    setDiscountType(type);
    setFormData(prev => ({
      ...prev,
      discount: value
    }));
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
    
    // Close the create service modal
    setShowCreateServiceModal(false);
    
    // Parse modifiers and intake questions from the newly created service
    let serviceModifiers = [];
    let serviceIntakeQuestions = [];
    
    // Parse modifiers
    if (serviceData.modifiers) {
      try {
        let parsedModifiers;
        if (typeof serviceData.modifiers === 'string') {
          try {
            const firstParse = JSON.parse(serviceData.modifiers);
            if (typeof firstParse === 'string') {
              parsedModifiers = JSON.parse(firstParse);
            } else {
              parsedModifiers = firstParse;
            }
          } catch (firstError) {
            parsedModifiers = [];
          }
        } else {
          parsedModifiers = serviceData.modifiers;
        }
        serviceModifiers = Array.isArray(parsedModifiers) ? parsedModifiers : [];
      } catch (error) {
        console.error('Error parsing service modifiers:', error);
        serviceModifiers = [];
      }
    }
    
    // Parse intake questions
    const intakeQuestionsData = serviceData.intake_questions || serviceData.intakeQuestions;
    if (intakeQuestionsData) {
      try {
        let parsedQuestions;
        if (typeof intakeQuestionsData === 'string') {
          try {
            parsedQuestions = JSON.parse(intakeQuestionsData);
          } catch (firstError) {
            try {
              parsedQuestions = JSON.parse(JSON.parse(intakeQuestionsData));
            } catch (secondError) {
              parsedQuestions = [];
            }
          }
        } else {
          parsedQuestions = intakeQuestionsData;
        }
        
        if (Array.isArray(parsedQuestions)) {
          // Create ID mapping and normalize IDs
          const idMapping = {};
          serviceIntakeQuestions = parsedQuestions.map((question, index) => {
            const normalizedId = index + 1;
            idMapping[normalizedId] = question.id;
            return {
              ...question,
              id: normalizedId
            };
          });
          // Store ID mapping for backend
          setFormData(prev => ({ ...prev, intakeQuestionIdMapping: idMapping }));
        }
      } catch (error) {
        console.error('Error parsing service intake questions:', error);
        serviceIntakeQuestions = [];
      }
    }
    
    // Check if service has modifiers or intake questions that need customization
    const hasModifiers = serviceModifiers && serviceModifiers.length > 0;
    const hasIntakeQuestions = serviceIntakeQuestions && serviceIntakeQuestions.length > 0;
    
    console.log('🔧 Service has modifiers:', hasModifiers, serviceModifiers);
    console.log('🔧 Service has intake questions:', hasIntakeQuestions, serviceIntakeQuestions);
    
    if (hasModifiers || hasIntakeQuestions) {
      // Service has customization options - open customization popup
      console.log('🔧 Service has customization options, opening customization popup');
      
      // Set the service as selected for customization
      setSelectedService(serviceData);
      setServiceSelected(true);
      
      // Add service modifiers and questions with service ID
      const modifiersWithServiceId = serviceModifiers.map(modifier => ({
        ...modifier,
        serviceId: serviceData.id
      }));
      
      const questionsWithServiceId = serviceIntakeQuestions.map(question => ({
        ...question,
        serviceId: serviceData.id
      }));
      
      // Update form data with service info, modifiers, and questions
      setFormData(prev => ({
        ...prev,
        serviceId: serviceData.id,
        serviceName: serviceData.name,
        price: parseFloat(serviceData.price) || 0,
        total: parseFloat(serviceData.price) || 0,
        duration: parseInt(serviceData.duration) || 60,
        serviceModifiers: modifiersWithServiceId,
        serviceIntakeQuestions: questionsWithServiceId
      }));
      
      // Reset modifiers and answers for fresh customization
      setSelectedModifiers({});
      setIntakeQuestionAnswers({});
      setEditedModifierPrices({});
      
      // Open the customization popup
      setShowServiceCustomizationPopup(true);
      
      console.log('🔧 Customization popup opened for newly created service');
    } else {
      // No customization needed - add service directly
      console.log('🔧 No customization needed, adding service directly');
      
      // Ensure service name is decoded before adding
      const decodedServiceData = {
        ...serviceData,
        name: decodeHtmlEntities(serviceData.name || '')
      };
      setSelectedServices(prev => [...prev, decodedServiceData]);
      setSelectedService(decodedServiceData);
      setServiceSelected(true);
      
      // Update form data with proper service information
      setFormData(prev => ({
        ...prev,
        serviceId: serviceData.id,
        serviceName: decodeHtmlEntities(serviceData.name || ''),
        price: parseFloat(serviceData.price) || 0,
        total: parseFloat(serviceData.price) || 0,
        duration: parseInt(serviceData.duration) || 60
      }));
      
      console.log('🔧 Service added to job successfully');
    }
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
      serviceName: decodeHtmlEntities(service.name || ''),
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
      // Calculate base duration from all selected services
      let baseDuration = 0;
      if (selectedServices.length > 0) {
        // Sum up durations from all selected services
        baseDuration = selectedServices.reduce((total, service) => {
          const serviceDuration = service.duration || 0;
          return total + serviceDuration;
        }, 0);
      } else {
        // Fallback to formData.duration if no services selected
        baseDuration = parseFloat(formData.duration) || 0;
      }
      
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
        <div className="bg-white border-b border-gray-200 py-4 px-5 lg:px-40 xl:px-44 2xl:px-48">
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            <h1 style={{fontFamily: 'Montserrat', fontWeight: 700}} className="text-lg sm:text-xl font-semibold text-gray-900">Create Job</h1>
            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={() => navigate('/jobs')}
                style={{fontFamily: 'Montserrat', fontWeight: 500}}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="create-job-form"
                style={{fontFamily: 'Montserrat', fontWeight: 500}}
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
        <div className="px-5 lg:px-40 xl:px-44 2xl:px-48 py-4 sm:py-6 lg:py-8">
          <div className="max-w-7xl mx-auto">
          {!customerSelected && (
            <div className="space-y-4">
              {/* Customer Section */}
              <div className="bg-white rounded-lg border border-gray-200 p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900" style={{ fontFamily: 'Montserrat', fontWeight: 600 }}>Customer</h2>
                  <div className="flex items-center space-x-3">
                    <button
                      type="button"
                      onClick={() => setShowLeadsModal(true)}
                      className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                      style={{ fontFamily: 'Montserrat', fontWeight: 500 }}
                    >
                      Leads
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingCustomer(null);
                        setIsCustomerModalOpen(true);
                      }}
                      className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                      style={{ fontFamily: 'Montserrat', fontWeight: 500 }}
                    >
                      New Customer
                    </button>
                  </div>
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
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    style={{ fontFamily: 'Montserrat', fontWeight: 400 }}
                  />
                  {showCustomerDropdown && (filteredCustomers.length > 0 || filteredLeads.length > 0) && (
                      <>
                        <div 
                          className="fixed inset-0 z-40" 
                          onClick={() => setShowCustomerDropdown(false)}
                        />
                      <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        {/* Customers Section */}
                        {filteredCustomers.length > 0 && (
                          <>
                            {filteredCustomers.map(customer => (
                              <button
                                key={customer.id}
                                type="button"
                                onClick={() => {
                                  handleCustomerSelect(customer);
                                  setShowCustomerDropdown(false);
                                  setCustomerSearch('');
                                  setCustomerSelected(true);
                                  setJobselected(true);
                                }}
                                className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                              >
                                <p className="font-medium text-gray-900">{customer.first_name} {customer.last_name}</p>
                                <p className="text-sm text-gray-600">{customer.email || 'No email address'}</p>
                              </button>
                            ))}
                            {filteredLeads.length > 0 && (
                              <div className="px-4 py-2 bg-gray-50 border-t border-b border-gray-200">
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Leads</p>
                              </div>
                            )}
                          </>
                        )}
                        {/* Leads Section */}
                        {filteredLeads.map(lead => (
                          <button
                            key={`lead-${lead.id}`}
                            type="button"
                            onClick={() => {
                              handleLeadSelect(lead);
                              setShowCustomerDropdown(false);
                              setCustomerSearch('');
                            }}
                            className="w-full text-left px-4 py-3 hover:bg-blue-50 border-b border-gray-100 last:border-b-0"
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium text-gray-900">{lead.first_name} {lead.last_name}</p>
                                <p className="text-sm text-gray-600">{lead.email || 'No email address'}</p>
                              </div>
                              <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
                                Lead
                              </span>
                            </div>
                          </button>
                        ))}
                      </div>
                      </>
                    )}
                  </div>
              </div>

              {/* Services Section - Disabled */}
              <div className="bg-gray-100 rounded-lg p-5">
                <h2 className="text-lg font-semibold text-gray-500" style={{ fontFamily: 'Montserrat', fontWeight: 600 }}>Services</h2>
              </div>

              {/* Schedule Section - Disabled */}
              <div className="bg-gray-100 rounded-lg p-5">
                <h2 className="text-lg font-semibold text-gray-500" style={{ fontFamily: 'Montserrat', fontWeight: 600 }}>Schedule</h2>
              </div>
            </div>
          )}
         {customerSelected && (
          <form id="create-job-form" onSubmit={handleSubmit} className="w-full" noValidate>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
              {/* Left Column - Services and Schedule */}
              <div className="lg:col-span-2 space-y-6 min-w-0">
                {/* Services Section */}
            <div className="bg-white rounded-lg border border-gray-200">
                  <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                      <h2 className="text-lg font-bold text-gray-900" style={{ fontFamily: 'Montserrat', fontWeight: 700 }}>Services</h2>
                  <button
                    type="button"
                        onClick={() => setShowCreateServiceModal(true)}
                        className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                        style={{ fontFamily: 'Montserrat', fontWeight: 500 }}
                  >
                        Add Custom Service or Item
                  </button>
                </div>
                  </div>
                  <div className="px-6 py-5 space-y-4">
                    {/* Service Search */}
                    <div className="flex gap-3">
                  <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                        placeholder="Search services"
                        value={serviceSearch}
                        onChange={(e) => setServiceSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        style={{ fontFamily: 'Montserrat', fontWeight: 400 }}
                      />
                    </div>
                      <button
                        type="button"
                      onClick={() => setShowServiceSelectionModal(true)}
                      className="px-5 py-2.5 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 font-medium text-sm"
                      style={{ fontFamily: 'Montserrat', fontWeight: 500 }}
                      >
                      Browse Services
                      </button>
                    </div>
                    {/* Selected Services List */}
                    
                    {selectedServices.length > 0 && (
                      <div className="space-y-0">
                        {/* Service List Header */}
                        <div className="flex items-center justify-between py-3 border-b border-gray-200">
                          <span className="text-xs font-bold text-gray-900 uppercase tracking-wide" style={{ fontFamily: 'Montserrat', fontWeight: 700 }}>Service</span>
                          <span className="text-xs font-bold text-gray-900 uppercase tracking-wide" style={{ fontFamily: 'Montserrat', fontWeight: 700 }}>Price</span>
                        </div>
                        
                        {/* Service Items */}
                        {selectedServices.map((service) => {
                          const isExpanded = expandedServiceIds.includes(service.id);
                          
                          // Parse modifiers - check all possible field names
                          let parsedModifiers = [];
                          const modifiersData = service.serviceModifiers || service.parsedModifiers || service.modifiers || service.service_modifiers;
                          if (modifiersData) {
                            try {
                              if (typeof modifiersData === 'string') {
                                parsedModifiers = JSON.parse(modifiersData);
                              } else if (Array.isArray(modifiersData)) {
                                parsedModifiers = modifiersData;
                              }
                            } catch (error) {
                              console.error('Error parsing modifiers:', error);
                            }
                          }
                          
                          // Parse intake questions - check all possible field names
                          let parsedIntakeQuestions = [];
                          const intakeData = service.serviceIntakeQuestions || service.parsedIntakeQuestions || service.intake_questions || service.intakeQuestions;
                          if (intakeData) {
                            try {
                              if (typeof intakeData === 'string') {
                                parsedIntakeQuestions = JSON.parse(intakeData);
                              } else if (Array.isArray(intakeData)) {
                                parsedIntakeQuestions = intakeData;
                              }
                            } catch (error) {
                              console.error('Error parsing intake questions:', error);
                            }
                          }
                          
                          const hasModifiers = parsedModifiers.length > 0;
                          const hasIntakeQuestions = parsedIntakeQuestions.length > 0;
                          
                          // Debug logging
                          if (isExpanded) {
                            console.log('🔍 Expanded service:', service.name);
                            console.log('🔍 Service object:', service);
                            console.log('🔍 Has modifiers?', hasModifiers);
                            console.log('🔍 Parsed modifiers:', parsedModifiers);
                            console.log('🔍 Has intake questions?', hasIntakeQuestions);
                            console.log('🔍 Parsed intake questions:', parsedIntakeQuestions);
                            console.log('🔍 Selected modifiers state:', selectedModifiers);
                            console.log('🔍 Intake answers state:', intakeQuestionAnswers);
                          }
                          
                          return (
                          <div key={service.id} className="py-4 border-b border-gray-200">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (isExpanded) {
                                      setExpandedServiceIds(prev => prev.filter(id => id !== service.id));
                                    } else {
                                      setExpandedServiceIds(prev => [...prev, service.id]);
                                    }
                                  }}
                                  className="text-left"
                                >
                                  <div className="text-sm font-semibold text-blue-600 hover:text-blue-700 mb-1" style={{ fontFamily: 'Montserrat', fontWeight: 600 }}>
                                    {decodeHtmlEntities(service.name || '')}
                                  </div>
                                  <div className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1" style={{ fontFamily: 'Montserrat', fontWeight: 400 }}>
                                    Show details {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                                  </div>
                                </button>
                              </div>
                              <div className="flex items-center gap-3">
                                {/* Duration Display/Edit */}
                                {editingServiceDurationId === service.id ? (
                                  // Duration editing mode
                                  <div className="flex items-center gap-2">
                                    <div className="flex items-center gap-1 border border-gray-300 rounded px-2 py-1 bg-white">
                                      <input
                                        type="number"
                                        min="0"
                                        value={editingServiceDurationHours}
                                        onChange={(e) => setEditingServiceDurationHours(e.target.value)}
                                        className="w-10 px-1 py-0.5 text-sm border-0 focus:ring-0 text-center"
                                        placeholder="0"
                                        style={{ fontFamily: 'Montserrat', fontWeight: 400 }}
                                      />
                                      <span className="text-xs text-gray-500">h</span>
                                      <input
                                        type="number"
                                        min="0"
                                        max="59"
                                        value={editingServiceDurationMinutes}
                                        onChange={(e) => setEditingServiceDurationMinutes(e.target.value)}
                                        className="w-10 px-1 py-0.5 text-sm border-0 focus:ring-0 text-center"
                                        placeholder="0"
                                        style={{ fontFamily: 'Montserrat', fontWeight: 400 }}
                                      />
                                      <span className="text-xs text-gray-500">m</span>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const hours = parseInt(editingServiceDurationHours) || 0;
                                        const minutes = parseInt(editingServiceDurationMinutes) || 0;
                                        const durationInMinutes = hours * 60 + minutes;
                                        setSelectedServices(prev => prev.map(s => 
                                          s.id === service.id ? { ...s, duration: durationInMinutes, originalDuration: s.originalDuration || s.duration } : s
                                        ));
                                        setEditingServiceDurationId(null);
                                        setEditingServiceDurationHours('');
                                        setEditingServiceDurationMinutes('');
                                      }}
                                      className="text-xs px-2 py-1 text-blue-600 hover:text-blue-700 font-medium"
                                      style={{ fontFamily: 'Montserrat', fontWeight: 500 }}
                                    >
                                      Save
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingServiceDurationId(null);
                                        setEditingServiceDurationHours('');
                                        setEditingServiceDurationMinutes('');
                                      }}
                                      className="text-xs px-2 py-1 text-gray-600 hover:text-gray-700 font-medium"
                                      style={{ fontFamily: 'Montserrat', fontWeight: 500 }}
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                ) : (
                                  // Duration display mode
                                  <div className="flex items-center gap-1">
                                    <Clock className="w-4 h-4 text-gray-400" />
                                    <span className="text-sm font-medium text-gray-700" style={{ fontFamily: 'Montserrat', fontWeight: 500 }}>
                                      {(() => {
                                        const duration = service.duration || 0;
                                        const hours = Math.floor(duration / 60);
                                        const mins = duration % 60;
                                        if (hours > 0 && mins > 0) {
                                          return `${hours}h ${mins}m`;
                                        } else if (hours > 0) {
                                          return `${hours}h`;
                                        } else {
                                          return `${mins}m`;
                                        }
                                      })()}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const duration = service.duration || 0;
                                        const hours = Math.floor(duration / 60);
                                        const mins = duration % 60;
                                        setEditingServiceDurationId(service.id);
                                        setEditingServiceDurationHours(hours.toString());
                                        setEditingServiceDurationMinutes(mins.toString());
                                      }}
                                      className="text-gray-400 hover:text-blue-600 transition-colors ml-1"
                                      title="Edit duration"
                                    >
                                      <Edit3 className="w-3 h-3" />
                                    </button>
                                  </div>
                                )}
                                
                                {/* Price Display/Edit */}
                                {editingServicePriceId === service.id ? (
                                  // Price editing mode
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm text-gray-500">$</span>
                                    <input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      value={editingServicePriceValue}
                                      onChange={(e) => setEditingServicePriceValue(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          // Save on Enter
                                          const newPrice = parseFloat(editingServicePriceValue) || 0;
                                          setSelectedServices(prev => prev.map(s => 
                                            s.id === service.id ? { ...s, price: newPrice, originalPrice: s.originalPrice || s.price } : s
                                          ));
                                          setEditingServicePriceId(null);
                                          setEditingServicePriceValue('');
                                        } else if (e.key === 'Escape') {
                                          // Cancel on Escape
                                          setEditingServicePriceId(null);
                                          setEditingServicePriceValue('');
                                        }
                                      }}
                                      autoFocus
                                      className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                      style={{ fontFamily: 'Montserrat', fontWeight: 400 }}
                                    />
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const newPrice = parseFloat(editingServicePriceValue) || 0;
                                        setSelectedServices(prev => prev.map(s => 
                                          s.id === service.id ? { ...s, price: newPrice, originalPrice: s.originalPrice || s.price } : s
                                        ));
                                        setEditingServicePriceId(null);
                                        setEditingServicePriceValue('');
                                      }}
                                      className="text-xs px-2 py-1 text-blue-600 hover:text-blue-700 font-medium"
                                      style={{ fontFamily: 'Montserrat', fontWeight: 500 }}
                                    >
                                      Save
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingServicePriceId(null);
                                        setEditingServicePriceValue('');
                                      }}
                                      className="text-xs px-2 py-1 text-gray-600 hover:text-gray-700 font-medium"
                                      style={{ fontFamily: 'Montserrat', fontWeight: 500 }}
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                ) : (
                                  // Display mode
                                  <>
                                <span className="text-base font-medium text-gray-900" style={{ fontFamily: 'Montserrat', fontWeight: 500 }}>
                                  ${parseFloat(service.price || 0).toFixed(2)}
                                </span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingServicePriceId(service.id);
                                        setEditingServicePriceValue(parseFloat(service.price || 0).toFixed(2));
                                      }}
                                      className="text-gray-400 hover:text-blue-600 transition-colors"
                                      title="Edit price"
                                    >
                                      <Edit3 className="w-4 h-4" />
                                    </button>
                                  </>
                                )}
                                <button
                                  type="button"
                                  onClick={() => {
                                    console.log('✏️ Opening customization for service:', service.name);
                                    console.log('✏️ Service modifiers:', service.selectedModifiers);
                                    console.log('✏️ Service answers:', service.intakeQuestionAnswers);
                                    console.log('✏️ Service edited prices:', service.editedModifierPrices);
                                    
                                    // Load this service's specific modifiers, answers, and prices into state
                                    if (service.selectedModifiers) {
                                      setSelectedModifiers(service.selectedModifiers);
                                    } else {
                                      setSelectedModifiers({});
                                    }
                                    
                                    if (service.intakeQuestionAnswers) {
                                      setIntakeQuestionAnswers(service.intakeQuestionAnswers);
                                    } else {
                                      setIntakeQuestionAnswers({});
                                    }
                                    
                                    if (service.editedModifierPrices) {
                                      setEditedModifierPrices(service.editedModifierPrices);
                                    } else {
                                      setEditedModifierPrices({});
                                    }
                                    
                                    setSelectedService(service);
                                    setShowServiceCustomizationPopup(true);
                                  }}
                                  className="text-gray-400 hover:text-gray-600 transition-colors"
                                  title="Edit service details"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => removeService(service.id)}
                                  className="text-gray-400 hover:text-red-600 transition-colors"
                                  title="Remove service"
                                >
                                  <Trash2 className="w-5 h-5" />
                                </button>
                              </div>
                            </div>
                            
                            {/* Expanded Details */}
                            {isExpanded && (
                              <div className="mt-4 space-y-4 bg-gray-50 -mx-6 px-6 py-4 rounded-lg">
                                {/* Customize Duration Section */}
                                <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                                  <label className="block text-sm font-medium text-gray-700 mb-2" style={{ fontFamily: 'Montserrat', fontWeight: 500 }}>
                                    Customize duration
                                  </label>
                                  <div className="flex items-center space-x-2">
                                    <div className="flex items-center gap-2 border border-gray-300 rounded-lg px-3 py-2 bg-white">
                                      <input
                                        type="number"
                                        min="0"
                                        value={(() => {
                                          const duration = service.duration || 0;
                                          return Math.floor(duration / 60);
                                        })()}
                                        onChange={(e) => {
                                          const hours = parseInt(e.target.value) || 0;
                                          const minutes = (service.duration || 0) % 60;
                                          const durationInMinutes = hours * 60 + minutes;
                                          setSelectedServices(prev => prev.map(s => 
                                            s.id === service.id ? { ...s, duration: durationInMinutes, originalDuration: s.originalDuration || s.duration } : s
                                          ));
                                        }}
                                        className="w-16 px-2 py-1 text-sm border-0 focus:ring-0 text-center"
                                        style={{ fontFamily: 'Montserrat', fontWeight: 400 }}
                                      />
                                      <span className="text-sm text-gray-500">hours</span>
                                    </div>
                                    <div className="flex items-center gap-2 border border-gray-300 rounded-lg px-3 py-2 bg-white">
                                      <input
                                        type="number"
                                        min="0"
                                        max="59"
                                        value={(() => {
                                          const duration = service.duration || 0;
                                          return duration % 60;
                                        })()}
                                        onChange={(e) => {
                                          const minutes = parseInt(e.target.value) || 0;
                                          const hours = Math.floor((service.duration || 0) / 60);
                                          const durationInMinutes = hours * 60 + minutes;
                                          setSelectedServices(prev => prev.map(s => 
                                            s.id === service.id ? { ...s, duration: durationInMinutes, originalDuration: s.originalDuration || s.duration } : s
                                          ));
                                        }}
                                        className="w-16 px-2 py-1 text-sm border-0 focus:ring-0 text-center"
                                        style={{ fontFamily: 'Montserrat', fontWeight: 400 }}
                                      />
                                      <span className="text-sm text-gray-500">minutes</span>
                                    </div>
                                  </div>
                                  <div className="flex space-x-2 mt-2">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        // Reset to original duration
                                        const originalDuration = service.originalDuration || service.duration || 0;
                                        setSelectedServices(prev => prev.map(s => 
                                          s.id === service.id ? { ...s, duration: originalDuration } : s
                                        ));
                                      }}
                                      className="text-sm text-red-600 hover:text-red-800 font-medium"
                                      style={{ fontFamily: 'Montserrat', fontWeight: 500 }}
                                    >
                                      Reset
                                    </button>
                                  </div>
                                </div>
                                
                                {/* Customize Price Section */}
                                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                                  <label className="block text-sm font-medium text-gray-700 mb-2" style={{ fontFamily: 'Montserrat', fontWeight: 500 }}>
                                    Customize price
                                  </label>
                                  <div className="flex items-center space-x-2">
                                    <span className="text-sm text-gray-500">$</span>
                                    <input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      value={service.price === 0 ? "" : service.price}
                                      onChange={(e) => {
                                        const newPrice = e.target.value === "" ? 0 : parseFloat(e.target.value) || 0;
                                        setSelectedServices(prev => prev.map(s => 
                                          s.id === service.id ? { ...s, price: newPrice, originalPrice: s.originalPrice || s.price } : s
                                        ));
                                      }}
                                      onFocus={(e) => {
                                        if (e.target.value === "0" || e.target.value === "0.00") {
                                          e.target.value = "";
                                        }
                                      }}
                                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                      placeholder="0.00"
                                      style={{ fontFamily: 'Montserrat', fontWeight: 400 }}
                                    />
                                  </div>
                                  <div className="flex space-x-2 mt-2">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        // Reset to original price
                                        const originalPrice = service.originalPrice || service.price || 0;
                                        setSelectedServices(prev => prev.map(s => 
                                          s.id === service.id ? { ...s, price: originalPrice } : s
                                        ));
                                      }}
                                      className="text-sm text-red-600 hover:text-red-800 font-medium"
                                      style={{ fontFamily: 'Montserrat', fontWeight: 500 }}
                                    >
                                      Reset
                                    </button>
                                  </div>
                                </div>
                                
                                {/* Service Modifiers */}
                                {hasModifiers && (
                                  <div>
                                    <h4 className="text-sm font-bold text-gray-900 mb-2" style={{ fontFamily: 'Montserrat', fontWeight: 700 }}>
                                      Select Your Items
                                    </h4>
                                    <div className="space-y-1">
                                      {parsedModifiers.map((modifier) => {
                                        // Check if service has its own selectedModifiers object
                                        let modifierData = null;
                                        if (service.selectedModifiers && typeof service.selectedModifiers === 'object') {
                                          modifierData = service.selectedModifiers[modifier.id];
                                        } else {
                                          // Fallback to global state
                                          modifierData = selectedModifiers[modifier.id];
                                        }
                                        
                                        // Debug logging
                                        console.log(`🔍 Modifier ${modifier.name}:`, {
                                          modifierId: modifier.id,
                                          modifierData,
                                          options: modifier.options,
                                          selectionType: modifier.selectionType,
                                          fullModifier: modifier
                                        });
                                        
                                        // Log each option structure
                                        modifier.options?.forEach(opt => {
                                          console.log('  Option:', opt.id, {
                                            name: opt.name,
                                            label: opt.label,
                                            text: opt.text,
                                            title: opt.title,
                                            allKeys: Object.keys(opt)
                                          });
                                        });
                                        
                                        const isColorType = modifier.type?.toLowerCase() === 'color' || modifier.name?.toLowerCase().includes('color');
                                        const isImageType = modifier.type?.toLowerCase() === 'image' || modifier.displayType?.toLowerCase() === 'image';
                                        
                                        // Get selected options
                                        let selectedOptions = [];
                                        if (modifier.selectionType === 'quantity' && modifierData?.quantities) {
                                          Object.entries(modifierData.quantities).forEach(([optionId, quantity]) => {
                                            if (quantity > 0) {
                                              const option = modifier.options?.find(o => o.id === optionId || String(o.id) === String(optionId));
                                              if (option) {
                                                const displayName = option.name || option.label || option.text || option.title || option.value || `Option ${optionId}`;
                                                console.log(`  Found option ${optionId}:`, displayName, option);
                                                selectedOptions.push({ 
                                                  ...option, 
                                                  quantity,
                                                  displayName
                                                });
                                              } else {
                                                console.warn(`  Option ${optionId} not found in modifier ${modifier.name}`);
                                              }
                                            }
                                          });
                                        } else if (modifierData?.selections && Array.isArray(modifierData.selections)) {
                                          selectedOptions = (modifier.options?.filter(o => modifierData.selections.includes(o.id)) || []).map(opt => {
                                            const displayName = opt.name || opt.label || opt.text || opt.title || opt.value || `Option ${opt.id}`;
                                            console.log(`  Found multi-select option ${opt.id}:`, displayName, opt);
                                            return {
                                              ...opt,
                                              displayName
                                            };
                                          });
                                        } else if (modifierData?.selection) {
                                          const option = modifier.options?.find(o => o.id === modifierData.selection || String(o.id) === String(modifierData.selection));
                                          if (option) {
                                            const displayName = option.name || option.label || option.text || option.title || option.value || `Option ${option.id}`;
                                            console.log(`  Found single-select option ${modifierData.selection}:`, displayName, option);
                                            selectedOptions.push({
                                              ...option,
                                              displayName
                                            });
                                          } else {
                                            console.warn(`  Option ${modifierData.selection} not found in modifier ${modifier.name}`);
                                          }
                                        }
                                        
                                        // Only show modifiers that have selections
                                        if (selectedOptions.length === 0) return null;
                                        
                                        return (
                                          <div key={modifier.id} className="mb-3">
                                            {/* Modifier name as heading */}
                                            <div className="text-sm font-bold text-gray-900 mb-1" style={{ fontFamily: 'Montserrat', fontWeight: 700 }}>
                                              {modifier.name || modifier.title}
                          </div>
                                            
                                            {/* Show each selected option with details */}
                                            {selectedOptions.map((option, idx) => {
                                              console.log('📦 Displaying option:', option);
                                              
                                              // Get the price - check service's edited prices first
                                              const priceKey = `${modifier.id}_option_${option.id}`;
                                              let optionPrice = parseFloat(option.price || 0);
                                              
                                              // Check if service has edited prices for this option
                                              if (service.editedModifierPrices && service.editedModifierPrices[priceKey] !== undefined) {
                                                optionPrice = parseFloat(service.editedModifierPrices[priceKey]);
                                                console.log('📦 Using edited price for', option.displayName, ':', optionPrice);
                                              }
                                              
                                              return (
                                                <div key={idx} className="text-sm text-gray-600 mb-1 flex items-center justify-between" style={{ fontFamily: 'Montserrat', fontWeight: 400 }}>
                                                  <span>
                                                    {option.quantity && `${option.quantity}x `}
                                                    {option.displayName}
                                                  </span>
                                                  {optionPrice > 0 && (
                                                    <span className="text-gray-500 ml-2">
                                                      ${optionPrice.toFixed(2)}
                                                      {option.quantity && option.quantity > 1 && ` (${(optionPrice * option.quantity).toFixed(2)} total)`}
                                                    </span>
                                                  )}
                                                </div>
                                              );
                                            })}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                                
                                {/* Intake Questions */}
                                {hasIntakeQuestions && (
                                  <div className="space-y-2">
                                    {parsedIntakeQuestions.map((question, index) => {
                                      const questionId = question.id || index;
                                      
                                      // The answer should be stored with the service's intakeQuestionAnswers
                                      // Check if service has its own intakeQuestionAnswers object
                                      let answer = null;
                                      if (service.intakeQuestionAnswers && typeof service.intakeQuestionAnswers === 'object') {
                                        answer = service.intakeQuestionAnswers[questionId];
                                      } else {
                                        // Fallback to global state
                                        answer = intakeQuestionAnswers[questionId];
                                      }
                                      
                                      // Debug logging for this question
                                      if (isExpanded) {
                                        console.log(`🔍 Question ${questionId} for service ${service.name}:`, {
                                          question: question.question,
                                          questionType: question.questionType,
                                          serviceIntakeAnswers: service.intakeQuestionAnswers,
                                          answer,
                                          globalAnswers: intakeQuestionAnswers
                                        });
                                      }
                                      
                                      const isColorType = question.questionType === 'color_choice' || question.type?.toLowerCase() === 'color';
                                      const isImageType = question.type?.toLowerCase() === 'image' || question.inputType?.toLowerCase() === 'image';
                                      
                                      // Only show questions that have answers
                                      if (!answer) return null;
                                      
                                      return (
                                        <div key={questionId}>
                                          <div className="text-sm font-bold text-gray-900 mb-1" style={{ fontFamily: 'Montserrat', fontWeight: 700 }}>
                                            {question.question || question.label || question.text}
                                          </div>
                                          
                                          {answer && (
                                            isColorType ? (
                                              // Display color(s) as pill(s)
                                              <div className="flex flex-wrap gap-2">
                                                {(() => {
                                                  // Handle array of colors
                                                  if (Array.isArray(answer)) {
                                                    return answer.map((color, idx) => (
                                                      <div 
                                                        key={idx}
                                                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-gray-300"
                                                      >
                                                        <div 
                                                          className="w-5 h-5 rounded-full border border-gray-300 shadow-sm"
                                                          style={{ backgroundColor: color }}
                                                        />
                                                        <span className="text-sm text-gray-900" style={{ fontFamily: 'Montserrat', fontWeight: 400 }}>
                                                          {color}
                                                        </span>
                                                      </div>
                                                    ));
                                                  }
                                                  // Handle concatenated hex codes like "#FFD700#87CEEB"
                                                  else if (typeof answer === 'string' && answer.includes('#')) {
                                                    const colors = answer.match(/#[0-9A-Fa-f]{6}/g) || [answer];
                                                    return colors.map((color, idx) => (
                                                      <div 
                                                        key={idx}
                                                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-gray-300"
                                                      >
                                                        <div 
                                                          className="w-5 h-5 rounded-full border border-gray-300 shadow-sm"
                                                          style={{ backgroundColor: color }}
                                                        />
                                                        <span className="text-sm text-gray-900" style={{ fontFamily: 'Montserrat', fontWeight: 400 }}>
                                                          {color}
                                                        </span>
                                                      </div>
                                                    ));
                                                  }
                                                  // Handle single color
                                                  else {
                                                    return (
                                                      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-gray-300">
                                                        <div 
                                                          className="w-5 h-5 rounded-full border border-gray-300 shadow-sm"
                                                          style={{ backgroundColor: answer }}
                                                        />
                                                        <span className="text-sm text-gray-900" style={{ fontFamily: 'Montserrat', fontWeight: 400 }}>
                                                          {answer}
                                                        </span>
                                                      </div>
                                                    );
                                                  }
                                                })()}
                                              </div>
                                            ) : isImageType ? (
                                              // Display image
                                              <div className="inline-block">
                                                <img 
                                                  src={answer} 
                                                  alt="Selected"
                                                  className="w-20 h-20 object-cover rounded border border-gray-200"
                                                  onError={(e) => {
                                                    e.target.style.display = 'none';
                                                    e.target.nextSibling.style.display = 'flex';
                                                  }}
                                                />
                                                <div className="hidden w-20 h-20 bg-gray-100 rounded border border-gray-200 items-center justify-center text-xs text-gray-400">
                                                  No image
                                                </div>
                                              </div>
                                            ) : (
                                              // Display text (can be array or string)
                                              <div className="text-sm text-gray-600" style={{ fontFamily: 'Montserrat', fontWeight: 400 }}>
                                                {Array.isArray(answer) ? answer.join(', ') : answer}
                                              </div>
                                            )
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                                
                                {/* Show message only if expanded but no customizations */}
                                {!hasModifiers && !hasIntakeQuestions && (
                                  <div className="text-sm text-gray-500 text-center py-4" style={{ fontFamily: 'Montserrat', fontWeight: 400 }}>
                                    No customizations for this service
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                        )}
                        
                        {/* Pricing Summary */}
                        <div className="pt-4 space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-900" style={{ fontFamily: 'Montserrat', fontWeight: 700 }}>Subtotal</span>
                            <span className="text-base text-gray-900" style={{ fontFamily: 'Montserrat', fontWeight: 400 }}>${(parseFloat(calculateTotalPrice()) || 0).toFixed(2)}</span>
                          </div>
                          
                          {formData.discount > 0 ? (
                            <div className="flex justify-between items-center">
                            <button
                              type="button"
                                onClick={() => setShowDiscountModal(true)}
                                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                                style={{ fontFamily: 'Montserrat', fontWeight: 500 }}
                            >
                                Discount ({discountType === 'percentage' ? `${formData.discount}%` : `$${formData.discount}`})
                            </button>
                              <span className="text-base text-gray-900" style={{ fontFamily: 'Montserrat', fontWeight: 400 }}>
                                -${(() => {
                                  const subtotal = parseFloat(calculateTotalPrice()) || 0;
                                  if (discountType === 'percentage') {
                                    return ((subtotal * formData.discount) / 100).toFixed(2);
                                  }
                                  return parseFloat(formData.discount).toFixed(2);
                                })()}
                              </span>
                          </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setShowDiscountModal(true)}
                              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                              style={{ fontFamily: 'Montserrat', fontWeight: 500 }}
                            >
                              Add Discount
                            </button>
                          )}
                          
                            <button
                              type="button"
                              onClick={() => {/* Add fee modal */}}
                            className="text-sm text-blue-600 hover:text-blue-700 font-medium block"
                            style={{ fontFamily: 'Montserrat', fontWeight: 500 }}
                            >
                              Add Fee
                            </button>
                          
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm text-gray-900" style={{ fontFamily: 'Montserrat', fontWeight: 700 }}>Taxes</span>
                              <Info className="w-4 h-4 text-gray-400" />
                          </div>
                            <span className="text-base text-gray-900" style={{ fontFamily: 'Montserrat', fontWeight: 400 }}>${(formData.taxes || 0).toFixed(2)}</span>
                            </div>
                          
                          <div className="pt-3 border-t border-gray-200 flex justify-between items-center">
                            <span className="text-sm font-bold text-gray-900" style={{ fontFamily: 'Montserrat', fontWeight: 700 }}>Total</span>
                            <span className="text-base font-bold text-gray-900" style={{ fontFamily: 'Montserrat', fontWeight: 700 }}>${(parseFloat(formData.total) || 0).toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
            </div>

                {/* Schedule Section - Only show if service is selected */}
                {selectedServices.length > 0 && (
              <div className="bg-white rounded-lg border border-gray-200">
                  <div className="px-5 py-4 border-b border-gray-200">
                    <div className="flex items-center justify-between flex-wrap gap-3">
                      <h2 className="text-lg font-bold text-gray-900" style={{ fontFamily: 'Montserrat', fontWeight: 700 }}>Schedule</h2>
                      <div className="flex items-center gap-2">
                        <div className="relative">
                      <select
                        value={(() => {
                                const totalMinutes = calculateTotalDuration() || formData.duration || 30;
                            const hours = Math.floor(totalMinutes / 60);
                            const mins = totalMinutes % 60;
                          return `${hours}h ${mins}m`;
                          })()}
                        onChange={(e) => {
                          const match = e.target.value.match(/(\d+)h\s*(\d+)?m?/);
                          if (match) {
                            const hours = parseInt(match[1]) || 0;
                            const mins = parseInt(match[2]) || 0;
                            setFormData(prev => ({ ...prev, duration: hours * 60 + mins }));
                          }
                        }}
                            className="pl-8 pr-10 py-1.5 text-sm border border-gray-300 rounded-md bg-gray-50 appearance-none focus:outline-none focus:ring-1 focus:ring-blue-500"
                            style={{ fontFamily: 'Montserrat', fontWeight: 400 }}
                      >
                            {(() => {
                              const totalMinutes = calculateTotalDuration() || formData.duration || 30;
                              const hours = Math.floor(totalMinutes / 60);
                              const mins = totalMinutes % 60;
                              const calculatedValue = `${hours}h ${mins}m`;
                              const calculatedDisplay = hours > 0 
                                ? `${hours} ${hours === 1 ? 'hr' : 'hrs'}${mins > 0 ? ` ${mins} min` : ''}`
                                : `${mins} min`;
                              
                              // Generate options dynamically
                              const options = [];
                              
                              // Always include the calculated duration as the first option
                              options.push(
                                <option key={calculatedValue} value={calculatedValue}>
                                  {calculatedDisplay}
                                </option>
                              );
                              
                              // Add common preset options if they're different from calculated
                              const presets = [
                                { value: '0h 30m', label: '30 min' },
                                { value: '1h 0m', label: '1 hr' },
                                { value: '1h 30m', label: '1 hr 30 min' },
                                { value: '2h 0m', label: '2 hrs' },
                                { value: '2h 30m', label: '2 hrs 30 min' },
                                { value: '3h 0m', label: '3 hrs' },
                                { value: '3h 30m', label: '3 hrs 30 min' },
                                { value: '4h 0m', label: '4 hrs' },
                                { value: '4h 30m', label: '4 hrs 30 min' },
                                { value: '5h 0m', label: '5 hrs' },
                                { value: '6h 0m', label: '6 hrs' },
                                { value: '8h 0m', label: '8 hrs' }
                              ];
                              
                              presets.forEach(preset => {
                                if (preset.value !== calculatedValue) {
                                  options.push(
                                    <option key={preset.value} value={preset.value}>
                                      {preset.label}
                                    </option>
                                  );
                                }
                              });
                              
                              return options;
                            })()}
                      </select>
                          <Clock className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                          <ChevronDown className="absolute right-2.5 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                        </div>
                        
                        <div className="relative">
                      <select
                        value={formData.workers || 1}
                        onChange={(e) => setFormData(prev => ({ ...prev, workers: parseInt(e.target.value) }))}
                            className="pl-8 pr-10 py-1.5 text-sm border border-gray-300 rounded-md bg-gray-50 appearance-none focus:outline-none focus:ring-1 focus:ring-blue-500"
                            style={{ fontFamily: 'Montserrat', fontWeight: 400 }}
                      >
                        <option value="1">1 worker</option>
                        <option value="2">2 workers</option>
                        <option value="3">3 workers</option>
                        <option value="4">4 workers</option>
                      </select>
                          <Users className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                          <ChevronDown className="absolute right-2.5 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                        </div>
                        
                        <div className="relative">
                      <select
                        value={formData.skillsRequired || 0}
                        onChange={(e) => setFormData(prev => ({ ...prev, skillsRequired: parseInt(e.target.value) }))}
                            className="pl-8 pr-10 py-1.5 text-sm border border-gray-300 rounded-md bg-gray-50 appearance-none focus:outline-none focus:ring-1 focus:ring-blue-500"
                            style={{ fontFamily: 'Montserrat', fontWeight: 400 }}
                      >
                        <option value="0">0 skills required</option>
                        <option value="1">1 skill required</option>
                        <option value="2">2 skills required</option>
                      </select>
                          <Target className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                          <ChevronDown className="absolute right-2.5 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                        </div>
                      </div>
                    </div>
                      </div>
                      
                  <div className="px-5 py-4 space-y-4">
                    {/* Job Type Tabs */}
                    <div className="bg-gray-100 p-1 rounded-lg flex gap-1">
                        <button
                          type="button"
                        onClick={() => setFormData(prev => ({ ...prev, scheduleType: 'one-time', recurringJob: false }))}
                        className={`flex-1 px-6 py-2.5 rounded-md text-sm font-medium transition-all ${
                          formData.scheduleType === 'one-time'
                            ? 'bg-white text-blue-600 shadow-sm'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                        style={{ fontFamily: 'Montserrat', fontWeight: formData.scheduleType === 'one-time' ? 600 : 400 }}
                      >
                        One Time
                        </button>
                          <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, scheduleType: 'recurring', recurringJob: true }))}
                        className={`flex-1 px-6 py-2.5 rounded-md text-sm font-medium transition-all ${
                          formData.scheduleType === 'recurring'
                            ? 'bg-white text-blue-600 shadow-sm'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                        style={{ fontFamily: 'Montserrat', fontWeight: formData.scheduleType === 'recurring' ? 600 : 400 }}
                      >
                        Recurring Job
                          </button>
                      </div>
                      
                    {/* Scheduling Options */}
                    <div className="space-y-5">
                      <div className="flex items-start gap-3">
                        <div className="flex items-center justify-center w-5 h-5 mt-0.5">
                        <input
                          type="radio"
                          name="scheduling-option"
                          checked={!formData.letCustomerSchedule}
                          onChange={() => setFormData(prev => ({ ...prev, letCustomerSchedule: false }))}
                            className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                        />
                        </div>
                        <div className="flex-1">
                          <div className="font-bold text-sm text-gray-900 mb-4" style={{ fontFamily: 'Montserrat', fontWeight: 700 }}>Schedule Now</div>
                          <div className="flex gap-3 items-center mb-1">
                            <div className="relative flex-1">
                              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                              <input
                                type="text"
                                placeholder="Select a date & time"
                                value={formData.scheduledDate && formData.scheduledTime ? 
                                  `${formatDateDisplay(formData.scheduledDate)} at ${
                                    new Date(`2000-01-01 ${formData.scheduledTime}`).toLocaleTimeString('en-US', {
                                      hour: 'numeric',
                                      minute: '2-digit',
                                      hour12: true
                                    })
                                  }` : ''
                                }
                                onClick={() => setShowDatePicker(true)}
                                readOnly
                                className="w-full pl-10 pr-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white cursor-pointer"
                                style={{ fontFamily: 'Montserrat', fontWeight: 400 }}
                              />
                        </div>
                            <button
                              type="button"
                            onClick={() => setShowDatePicker(true)}
                              className="px-4 py-2.5 text-sm text-white bg-blue-500 hover:bg-blue-600 rounded-lg font-medium whitespace-nowrap transition-colors"
                              style={{ fontFamily: 'Montserrat', fontWeight: 500 }}
                            >
                            Find a Time
                            </button>
                          </div>
                          </div>
                        </div>
                        
                      
                        </div>
                      
                      {/* REPEATS Section - Only show when Recurring Job is selected */}
                      {formData.scheduleType === 'recurring' && (
                        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                          <div className="flex items-center gap-2">
                            <RotateCw className="w-5 h-5 text-gray-400" />
                            <span className="text-sm font-medium text-gray-700" style={{ fontFamily: 'Montserrat', fontWeight: 500 }}>
                              REPEATS
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setShowRecurringModal(true)}
                            className="flex items-center gap-2 text-sm hover:text-gray-900 transition-colors"
                            style={{ fontFamily: 'Montserrat', fontWeight: 400 }}
                          >
                            <span className={formData.recurringFrequency ? 'text-gray-900' : 'text-gray-500'}>
                              {formatRecurringFrequency(formData.recurringFrequency || '', formData.scheduledDate ? new Date(formData.scheduledDate) : null)}
                            </span>
                            <ChevronRight className="w-4 h-4 text-gray-400" />
                          </button>
                        </div>
                      )}

                    {/* Assigned Section */}
                    <div className="pt-5 border-t border-gray-200">
                      <div className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-4" style={{ fontFamily: 'Montserrat', fontWeight: 700 }}>Assigned</div>
                      
                        <button
                          type="button"
                        onClick={() => setShowTeamDropdown(true)}
                        className="inline-flex items-center gap-2 px-3 py-1.5 mb-4 text-sm text-blue-600 hover:text-blue-700 border border-blue-600 hover:border-blue-700 rounded-full font-medium transition-colors"
                        style={{ fontFamily: 'Montserrat', fontWeight: 500 }}
                        >
                        <Plus className="w-4 h-4" />
                        Assign
                        </button>
                      
                      {/* Display selected team members */}
                      {selectedTeamMembers.length > 0 && (
                        <div className="mb-4 space-y-2">
                          {selectedTeamMembers.map((member) => (
                            <div key={member.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-medium">
                                  {member.first_name?.[0]}{member.last_name?.[0]}
                                </div>
                                <span className="text-sm text-gray-900" style={{ fontFamily: 'Montserrat', fontWeight: 400 }}>
                                  {member.first_name} {member.last_name}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => removeTeamMember(member.id)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      
                   
                                      </div>
                                    </div>
                            </div>
                        )}
                      </div>
                      
              {/* Right Column - Customer Details */}
              <div className="lg:col-span-1 space-y-0 min-w-0">
                <div className="bg-white rounded-lg border border-gray-200">
                  {/* Customer Header */}
                  <div className="p-5 border-b border-gray-200">
                          <div className="flex items-center justify-between">
                      <h2 className="text-lg font-semibold text-gray-900" style={{ fontFamily: 'Montserrat', fontWeight: 600 }}>Customer</h2>
                            <button
                              type="button"
                          onClick={() => setShowCustomerDropdown(true)}
                        className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                        style={{ fontFamily: 'Montserrat', fontWeight: 500 }}
                            >
                          Change
                            </button>
                          </div>
                  </div>
                  {selectedCustomer && (
                    <>
                      {/* Customer Info */}
                      <div className="p-5 border-b border-gray-200">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center text-white font-medium flex-shrink-0">
                          {selectedCustomer.first_name?.[0]}{selectedCustomer.last_name?.[0]}
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-medium text-gray-900" style={{ fontFamily: 'Montserrat', fontWeight: 500 }}>
                              {selectedCustomer.first_name} {selectedCustomer.last_name}
                              </h3>
                                <button
                                  type="button"
                                onClick={() => {
                                  setEditingCustomer(selectedCustomer);
                                  setIsCustomerModalOpen(true);
                                }}
                              className="text-sm text-blue-600 hover:text-blue-700"
                                style={{ fontFamily: 'Montserrat', fontWeight: 400 }}
                                >
                              Edit
                                </button>
                            </div>
                              <p className="mt-1 text-xs text-gray-500" style={{ fontFamily: 'Montserrat', fontWeight: 400 }}>
                                Source: <span className="font-medium text-gray-700">{selectedCustomer.source || 'No source'}</span>
                              </p>
                              </div>
                          </div>
                    </div>

                      {/* Contact Info Section */}
                      <div className="border-b border-gray-200">
                        <button
                          type="button"
                          onClick={() => setExpandedCustomerSections(prev => ({ ...prev, contact: !prev.contact }))}
                          className="w-full px-5 py-3 hover:bg-gray-50 transition-colors text-left"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ fontFamily: 'Montserrat', fontWeight: 600 }}>Contact Info</span>
                            <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${expandedCustomerSections.contact ? 'rotate-90' : ''}`} />
                          </div>
                        </button>
                        {expandedCustomerSections.contact && (
                          <div className="px-5 pb-3 space-y-2">
                        {selectedCustomer.email && (
                              <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4 text-gray-400" />
                                <span className="text-sm text-gray-700" style={{ fontFamily: 'Montserrat', fontWeight: 400 }}>{selectedCustomer.email}</span>
                    </div>
                        )}
                        {selectedCustomer.phone && (
                              <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4 text-gray-400" />
                                <span className="text-sm text-gray-700" style={{ fontFamily: 'Montserrat', fontWeight: 400 }}>{formatPhoneNumber(selectedCustomer.phone)}</span>
                </div>
              )}
                        {!selectedCustomer.email && !selectedCustomer.phone && (
                              <p className="text-sm text-gray-500" style={{ fontFamily: 'Montserrat', fontWeight: 400 }}>No contact information available</p>
                            )}
                          </div>
              )}
            </div>

                      {/* Notes Section */}
                <button
                  type="button"
                        onClick={() => expandedSections.notes = !expandedSections.notes}
                        className="w-full px-5 py-3 border-b border-gray-200 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ fontFamily: 'Montserrat', fontWeight: 600 }}>Notes</span>
                            <span className="text-xs text-gray-400" style={{ fontFamily: 'Montserrat', fontWeight: 400 }}>{selectedCustomer.notes_count || 0}</span>
                          </div>
                          <ChevronRight className="w-4 h-4 text-gray-400" />
                        </div>
                </button>
                      
                      {/* Notification Preferences */}
                      <div className="px-5 py-3 border-b border-gray-200">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ fontFamily: 'Montserrat', fontWeight: 600 }}>Notification Preferences</span>
                <button
                  type="button"
                            className="text-sm text-blue-600 hover:text-blue-700"
                            style={{ fontFamily: 'Montserrat', fontWeight: 400 }}
                        >
                            Email
                </button>
              </div>
                        <div className="space-y-3">
                <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-700" style={{ fontFamily: 'Montserrat', fontWeight: 400 }}>Emails</span>
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
                              <div className="w-10 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                        </label>
                </div>
                            <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-700" style={{ fontFamily: 'Montserrat', fontWeight: 400 }}>Text messages</span>
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
                              <div className="w-10 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gray-200"></div>
                        </label>
              </div>
                    </div>
                  </div>
                        </>
                      )}
                  {/* Service Address with Map */}
                  {formData.serviceAddress.street && (
                    <>
                      <div className="h-40 bg-gray-100 relative">
                        <iframe
                          title="Service Address Map"
                          width="100%"
                          height="100%"
                          style={{ border: 0 }}
                          loading="lazy"
                          allowFullScreen
                          referrerPolicy="no-referrer-when-downgrade"
                          src={`https://www.google.com/maps/embed/v1/place?key=AIzaSyC_CrJWTsTHOTBd7TSzTuXOfutywZ2AyOQ&q=${encodeURIComponent(
                            `${formData.serviceAddress.street}, ${formData.serviceAddress.city}, ${formData.serviceAddress.state || ''} ${formData.serviceAddress.zipCode || ''}`
                          )}&zoom=16&maptype=roadmap`}
                        />
                      </div>
                      <div className="px-5 py-3 border-b border-gray-200">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ fontFamily: 'Montserrat', fontWeight: 600 }}>Service Address</span>
                          <button
                            type="button"
                            onClick={() => setShowAddressModal(true)}
                            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                            style={{ fontFamily: 'Montserrat', fontWeight: 500 }}
                          >
                            Edit
                          </button>
                    </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900" style={{ fontFamily: 'Montserrat', fontWeight: 500 }}>{formData.serviceAddress.street}</p>
                          <p className="text-sm text-gray-600" style={{ fontFamily: 'Montserrat', fontWeight: 400 }}>{formData.serviceAddress.city}</p>
                          </div>
                        </div>
                    </>
                  )}
                  
                  {/* Territory */}
                  <div className="px-5 py-3 border-b border-gray-200">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ fontFamily: 'Montserrat', fontWeight: 600 }}>Territory</span>
                      <button
                        type="button"
                        onClick={() => setShowTerritoryModal(true)}
                        className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                        style={{ fontFamily: 'Montserrat', fontWeight: 500 }}
                      >
                        Edit
                      </button>
                    </div>
                    <p className="text-sm text-gray-900" style={{ fontFamily: 'Montserrat', fontWeight: 400 }}>
                      {detectedTerritory?.name || formData.territory || (
                        <span className="text-gray-400 italic">Unassigned</span>
                      )}
                    </p>
                  </div>

                  {/* Payment Method */}
                  <div className="px-5 py-3 border-b border-gray-200">
                    <div className="mb-2">
                      <span className="text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ fontFamily: 'Montserrat', fontWeight: 600 }}>Payment Method</span>
                    </div>
                    <p className="text-sm text-gray-600 mb-3" style={{ fontFamily: 'Montserrat', fontWeight: 400 }}>Attach a credit or debit card to charge at a later time when the job is complete.</p>
                  <button
                    type="button"
                      onClick={() => setShowPaymentModal(true)}
                      className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
                      style={{ fontFamily: 'Montserrat', fontWeight: 500 }}
                  >
                      <Plus className="w-4 h-4" />
                      Add payment method
                  </button>
                </div>

                </div>
              </div>
            </div>
          </form>
        )}
          </div>
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

      {/* Leads Modal */}
      {showLeadsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900" style={{ fontFamily: 'Montserrat', fontWeight: 600 }}>
                Select a Lead
              </h2>
              <button
                onClick={() => setShowLeadsModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              {leads.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500">No leads available</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {leads.map(lead => (
                    <button
                      key={lead.id}
                      type="button"
                      onClick={async () => {
                        await handleLeadSelect(lead);
                        setShowLeadsModal(false);
                      }}
                      className="w-full text-left px-4 py-3 bg-white border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{lead.first_name} {lead.last_name}</p>
                          <div className="flex items-center space-x-4 mt-1">
                            {lead.email && (
                              <p className="text-sm text-gray-600 flex items-center">
                                <Mail className="w-4 h-4 mr-1" />
                                {lead.email}
                              </p>
                            )}
                            {lead.phone && (
                              <p className="text-sm text-gray-600 flex items-center">
                                <Phone className="w-4 h-4 mr-1" />
                                {formatPhoneNumber(lead.phone)}
                              </p>
                            )}
                          </div>
                          {lead.company && (
                            <p className="text-sm text-gray-500 mt-1 flex items-center">
                              <Building className="w-4 h-4 mr-1" />
                              {lead.company}
                            </p>
                          )}
                        </div>
                        <span className="px-3 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded-full ml-4">
                          Lead
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
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
      
      <RecurringFrequencyModal
        isOpen={showRecurringModal}
        onClose={() => setShowRecurringModal(false)}
        onSave={(data) => {
          setFormData(prev => ({
            ...prev,
            recurringFrequency: data.frequency,
            recurringEndDate: data.endDate || '',
            recurringJob: true
          }))
        }}
        currentFrequency={formData.recurringFrequency}
        scheduledDate={formData.scheduledDate}
      />
      
      <DiscountModal
        isOpen={showDiscountModal}
        onClose={() => setShowDiscountModal(false)}
        onSave={handleSaveDiscount}
        currentDiscount={formData.discount}
        currentDiscountType={discountType}
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
        editedModifierPrices={editedModifierPrices}
        onModifierPriceChange={handleModifierPriceChange}
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
        isOpen={showDatePicker}
        onClose={() => setShowDatePicker(false)}
        selectedDate={formData.scheduledDate ? parseLocalDate(formData.scheduledDate) : new Date()}
        selectedTime={formData.scheduledTime}
        duration={calculateTotalDuration()}
        workerId={selectedTeamMembers.length > 0 ? selectedTeamMembers[0]?.id : null}
        serviceId={selectedServices.length > 0 ? selectedServices[0]?.id : null}
        onDateTimeSelect={(date, time, arrivalWindow = false) => {
          const dateString = formatDateLocal(date);
          setFormData(prev => ({ 
            ...prev, 
            scheduledDate: dateString,
            scheduledTime: time,
            arrivalWindow: arrivalWindow
          }));
          setShowDatePicker(false);
        }}
      />

      {/* Team Member Assignment Modal */}
      {showTeamDropdown && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
          onClick={() => setShowTeamDropdown(false)}
        >
          <div 
            className="bg-white rounded-lg shadow-xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900" style={{ fontFamily: 'Montserrat', fontWeight: 700 }}>Assign Team Member</h3>
              <button
                onClick={() => setShowTeamDropdown(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              {teamMembers.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500 text-sm mb-1">No team members available</p>
                  <p className="text-gray-400 text-xs">Add team members in the Team section first</p>
                </div>
              ) : (
                <>
                  <div className="max-h-60 overflow-y-auto space-y-2">
                    {teamMembers.map((member) => {
                      const isSelected = selectedTeamMembers.find(m => m.id === member.id);
                      return (
                        <button
                          key={member.id}
                          type="button"
                          onClick={() => handleMultipleTeamMemberSelect(member)}
                          className={`w-full flex items-center space-x-3 p-3 rounded-lg transition-colors ${
                            isSelected 
                              ? 'bg-blue-50 border-2 border-blue-600' 
                              : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                          }`}
                        >
                          <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-medium flex-shrink-0">
                            {member.first_name?.[0]}{member.last_name?.[0]}
                          </div>
                          <div className="flex-1 text-left">
                            <p className="text-sm font-medium text-gray-900" style={{ fontFamily: 'Montserrat', fontWeight: 500 }}>
                              {member.first_name} {member.last_name}
                            </p>
                            <p className="text-xs text-gray-500" style={{ fontFamily: 'Montserrat', fontWeight: 400 }}>
                              {member.email}
                            </p>
                          </div>
                          {isSelected && (
                            <CheckCircle className="w-5 h-5 text-blue-600" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                  
                  {selectedTeamMembers.length > 0 && (
                    <div className="pt-4 border-t border-gray-200">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-700" style={{ fontFamily: 'Montserrat', fontWeight: 400 }}>
                          {selectedTeamMembers.length} member{selectedTeamMembers.length !== 1 ? 's' : ''} selected
                        </span>
                        <button
                          type="button"
                          onClick={clearAllTeamMembers}
                          className="text-sm text-red-600 hover:text-red-700 font-medium"
                          style={{ fontFamily: 'Montserrat', fontWeight: 500 }}
                        >
                          Clear All
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
              
              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowTeamDropdown(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
                  style={{ fontFamily: 'Montserrat', fontWeight: 500 }}
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}