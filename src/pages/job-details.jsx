import React, { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { 
  ArrowLeft, 
  Edit, 
  Save, 
  X, 
  Calendar, 
  Clock, 
  MapPin, 
  Users, 
  Phone, 
  Mail, 
  FileText, 
  CheckCircle, 
  XCircle, 
  PlayCircle, 
  PauseCircle,
  AlertCircle,
  Check,
  DollarSign,
  User,
  Building,
  ChevronDown,
  ChevronUp,
  Settings,
  CreditCard,
  Truck,
  Clipboard,
  Home,
  Plus,
  Tag,
  Star,
  MessageSquare,
  Bell,
  Zap,
  Shield,
  Award,
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
  MapPin as LocationIcon,
  Calendar as CalendarIcon,
  Copy,
  Trash2,
  Menu,
  Search
} from "lucide-react"
import { jobsAPI, notificationAPI, territoriesAPI, teamAPI, invoicesAPI } from "../services/api"
import api, { stripeAPI } from "../services/api"
import { useAuth } from "../context/AuthContext"
import Sidebar from "../components/sidebar"
import MobileHeader from "../components/mobile-header"
import AddressAutocomplete from "../components/address-autocomplete"
import IntakeAnswersDisplay from "../components/intake-answers-display"
import IntakeQuestionsForm from "../components/intake-questions-form"
import { formatPhoneNumber } from "../utils/phoneFormatter"
import { formatDateLocal } from "../utils/dateUtils"

const JobDetails = () => {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [job, setJob] = useState(null)
  const [loading, setLoading] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")
  const [error, setError] = useState("")

  // Google Places Autocomplete state (now handled by AddressAutocomplete component)

  // Form data for editing
  const [formData, setFormData] = useState({
    service_name: "",
    bathroom_count: "",
    duration: 0,
    workers_needed: 1,
    skills: [],
    notes: "",
    internal_notes: "",
    serviceAddress: {
      street: "",
      city: "",
      state: "",
      zipCode: ""
    },
    scheduledDate: "",
    scheduledTime: "",
    offer_to_providers: false
  })

  // UI state
  const [editing, setEditing] = useState(false)
  const [editingField, setEditingField] = useState(null)
  const [showActionMenu, setShowActionMenu] = useState(false)
  const [showRescheduleModal, setShowRescheduleModal] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [showEditServiceModal, setShowEditServiceModal] = useState(false)
  const [showEditAddressModal, setShowEditAddressModal] = useState(false)
  const [showMobileSidebar, setShowMobileSidebar] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showSendInvoiceModal, setShowSendInvoiceModal] = useState(false)
  const [showAddPaymentModal, setShowAddPaymentModal] = useState(false)
  const [showDiscountModal, setShowDiscountModal] = useState(false)
  const [showTipModal, setShowTipModal] = useState(false)
  const [includePaymentLink, setIncludePaymentLink] = useState(true)
  const [stripeConnected, setStripeConnected] = useState(false)
  const [manualEmail, setManualEmail] = useState('')
  const [showEmailRequiredModal, setShowEmailRequiredModal] = useState(false)
  const [showEditCustomerModal, setShowEditCustomerModal] = useState(false)
  const [pendingAction, setPendingAction] = useState(null) // 'send' or 'resend'
  const [showNotificationModal, setShowNotificationModal] = useState(false)
  const [notificationType, setNotificationType] = useState(null) // 'confirmation' or 'reminder'
  const [notificationEmail, setNotificationEmail] = useState('')
  const [showCustomMessageModal, setShowCustomMessageModal] = useState(false)
  const [customMessage, setCustomMessage] = useState('')
  const [customMessageEmail, setCustomMessageEmail] = useState('')
  const [editCustomerData, setEditCustomerData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: ''
  })
  
  // Address autopopulation state
  const [addressAutoPopulated, setAddressAutoPopulated] = useState(false)

  // Update form data when edit address modal opens
  useEffect(() => {
    if (showEditAddressModal && job) {
      setFormData(prev => ({
        ...prev,
        serviceAddress: {
          street: job.customer_address || job.service_address_street || "",
          city: job.customer_city || job.service_address_city || "",
          state: job.customer_state || job.service_address_state || "",
          zipCode: job.customer_zip_code || job.service_address_zip || ""
        }
      }))
    }
  }, [showEditAddressModal, job])

  // Update form data when edit service modal opens
  useEffect(() => {
    if (showEditServiceModal && job) {
      console.log('Updating formData for edit service modal:', {
        service_price: job.service_price,
        discount: job.discount,
        additional_fees: job.additional_fees,
        taxes: job.taxes,
        total: job.total
      })
      
      // Store original job data for reset functionality
      setOriginalJobData({
        service_modifiers: job.service_modifiers
      });
      
      const servicePrice = job.service_price || 0;
      const discount = job.discount || 0;
      const additionalFees = job.additional_fees || 0;
      const taxes = job.taxes || 0;
      const modifierPrice = calculateModifierPrice();
      const calculatedTotal = servicePrice + modifierPrice + additionalFees + taxes - discount;
      
      // Use the backend total as the default value for the input
      const totalPrice = parseFloat(job.total) || 0;
      
      setFormData(prev => ({
        ...prev,
        service_name: job.service_name || "",
        bathroom_count: job.bathroom_count || "",
        duration: job.duration || job.estimated_duration || 0,
        service_price: totalPrice, // Set backend total as default
        modifier_price: modifierPrice,
        discount: discount > 0 ? discount : undefined, // Only set if discount exists
        additional_fees: additionalFees,
        taxes: taxes,
        tip: 0,
        total: calculatedTotal
      }))
    }
  }, [showEditServiceModal, job])

  // Data state
  const [territories, setTerritories] = useState([])
  const [teamMembers, setTeamMembers] = useState([])
  const [assigning, setAssigning] = useState(false)
  const [selectedTeamMember, setSelectedTeamMember] = useState(null)
  const [invoice, setInvoice] = useState(null)
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [smsNotifications, setSmsNotifications] = useState(false)
  const [intakeQuestionAnswers, setIntakeQuestionAnswers] = useState({})
  const [originalJobData, setOriginalJobData] = useState(null)
  const [isRetrying, setIsRetrying] = useState(false)

  // Helper function to map job data from API response
  const mapJobData = (jobData) => {
    return {
      ...jobData,
      customer_first_name: jobData.customers?.first_name || jobData.customer_first_name,
      customer_last_name: jobData.customers?.last_name || jobData.customer_last_name,
      customer_email: jobData.customers?.email || jobData.customer_email,
      customer_phone: jobData.customers?.phone || jobData.customer_phone,
      customer_address: jobData.customers?.address || jobData.customer_address,
      customer_city: jobData.customers?.city || jobData.customer_city,
      customer_state: jobData.customers?.state || jobData.customer_state,
      customer_zip_code: jobData.customers?.zip_code || jobData.customer_zip_code,
      service_name: jobData.services?.name || jobData.service_name,
      service_price: jobData.services?.price || jobData.service_price,
      service_duration: jobData.services?.duration || jobData.service_duration,
      // Handle multiple services - check if service_name contains multiple services
      service_names: jobData.service_name && jobData.service_name.includes(', ') ? jobData.service_name.split(', ') : null,
      service_ids: jobData.service_ids ? (typeof jobData.service_ids === 'string' ? JSON.parse(jobData.service_ids) : jobData.service_ids) : null,
      // Map additional fields that might be missing
      duration: jobData.duration || jobData.estimated_duration,
      workers_needed: jobData.workers_needed || jobData.workers,
      // Convert ISO date format to expected format for backward compatibility
      scheduled_date: jobData.scheduled_date ? jobData.scheduled_date.replace('T', ' ') : jobData.scheduled_date,
      // Map service modifiers and intake questions
      service_modifiers: jobData.service_modifiers,
      service_intake_questions: jobData.service_intake_questions,
      intake_answers: jobData.intake_answers
    }
  }

  // For address modal mapping
  useEffect(() => {
    if (showEditAddressModal && job) {
      setFormData(prev => ({
        ...prev,
        serviceAddress: {
          street: job.service_address_street || "",
          city: job.service_address_city || "",
          state: job.service_address_state || "",
          zipCode: job.service_address_zip || ""
        }
      }))
    }
  }, [showEditAddressModal, job])

  // For reschedule modal mapping
  useEffect(() => {
    if (showRescheduleModal && job) {
      // Extract date and time directly from the string (format: "2024-01-15 10:00:00")
      const datePart = job.scheduled_date ? job.scheduled_date.split(' ')[0] : formatDateLocal(new Date())
      const timePart = job.scheduled_date ? job.scheduled_date.split(' ')[1]?.substring(0, 5) : '09:00'
      
      setFormData(prev => ({
        ...prev,
        scheduledDate: datePart,
        scheduledTime: timePart
      }))
    }
  }, [showRescheduleModal, job])

  // Fetch payment status from transactions table
  const fetchInvoiceStatus = async (jobId) => {
    try {
      console.log('💳 Checking payment status for job:', jobId)
      console.log('💳 API URL:', `${process.env.REACT_APP_API_URL || 'https://service-flow-backend-production-4568.up.railway.app/api'}/transactions/job/${jobId}`)
      
      // Check transactions for this job
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'https://service-flow-backend-production-4568.up.railway.app/api'}/transactions/job/${jobId}`)
      
      console.log('💳 Transaction API response status:', response.status)
      
      if (response.ok) {
        const data = await response.json()
        console.log('💳 Transaction API response data:', data)
        
        const { hasPayment, totalPaid, transactionCount, transactions } = data
        
        console.log('💳 Payment status:', { hasPayment, totalPaid, transactionCount })
        
        if (hasPayment && totalPaid > 0) {
          // Payment found - job is paid
          console.log('💳 Job is PAID - found', transactionCount, 'transactions totaling $', totalPaid)
          
          setJob(prev => {
            console.log('💳 Updating job status to PAID')
            return {
              ...prev,
              invoice_status: 'paid',
              total_paid_amount: totalPaid,
              total_invoice_amount: totalPaid, // For paid jobs, invoice amount = paid amount
              transaction_count: transactionCount
            }
          })
        } else {
          // No payment found - check if there are invoices
          console.log('💳 No payment found, checking for invoices...')
          
          try {
            const invoiceResponse = await api.get(`/invoices?job_id=${jobId}`)
            console.log('💳 Invoice check result:', invoiceResponse.data)
            
            if (invoiceResponse.data && invoiceResponse.data.length > 0) {
              const invoices = invoiceResponse.data
              let overallStatus = 'none'
              let totalAmount = 0
              let latestInvoice = null
              
              invoices.forEach(invoice => {
                totalAmount += parseFloat(invoice.total_amount || 0)
                
                if (invoice.status === 'sent' || invoice.status === 'invoiced') {
                  if (overallStatus === 'none') {
                    overallStatus = 'invoiced'
                    latestInvoice = invoice
                  }
                } else if (invoice.status === 'draft') {
                  if (overallStatus === 'none') {
                    overallStatus = 'draft'
                    latestInvoice = invoice
                  }
                }
              })
              
              setJob(prev => ({
                ...prev,
                invoice_status: overallStatus,
                invoice_id: latestInvoice?.id,
                total_invoice_amount: totalAmount,
                total_paid_amount: 0
              }))
            } else {
              // No invoices or payments
              setJob(prev => ({
                ...prev,
                invoice_status: 'none',
                invoice_id: null,
                total_invoice_amount: 0,
                total_paid_amount: 0
              }))
            }
          } catch (invoiceError) {
            console.error('💳 Error checking invoices:', invoiceError)
            // Set to no invoice if we can't check
            setJob(prev => ({
              ...prev,
              invoice_status: 'none',
              invoice_id: null,
              total_invoice_amount: 0,
              total_paid_amount: 0
            }))
          }
        }
      } else {
        console.error('💳 Transaction API error:', response.status)
        // Fallback to no payment status
        setJob(prev => ({
          ...prev,
          invoice_status: 'none',
          invoice_id: null,
          total_invoice_amount: 0,
          total_paid_amount: 0
        }))
      }
    } catch (error) {
      console.error('💳 Error checking payment status:', error)
      // Don't show error to user, just log it
    }
  }

  // Auto-refresh invoice status every 30 seconds if there's an invoice
  useEffect(() => {
    if (job?.id && job?.invoice_status && job.invoice_status !== 'paid') {
      console.log('💳 Setting up auto-refresh for invoice status')
      const interval = setInterval(() => {
        console.log('💳 Auto-refreshing invoice status...')
        fetchInvoiceStatus(job.id)
      }, 30000) // 30 seconds

      return () => clearInterval(interval)
    }
  }, [job?.id, job?.invoice_status])

  // Fetch job data with Windows Defender/Firewall retry logic
  useEffect(() => {
    const fetchJob = async (retryCount = 0) => {
      // Wait a bit to ensure authentication state is ready
      await new Promise(resolve => setTimeout(resolve, 100))
      
      setLoading(true)
      setError("") // Clear any previous errors
      try {
        console.log('🔧 Job Details: Fetching job data for ID:', jobId, retryCount > 0 ? `(retry ${retryCount})` : '')
        const jobData = await jobsAPI.getById(jobId)
        
        
        // Map customer and service data from nested structure
        const mappedJobData = mapJobData(jobData)
        
        console.log('🔧 Job Details: Raw job data from API:', jobData);
        console.log('🔧 Job Details: Mapped job data:', mappedJobData);
        console.log('🔧 Job Details: service_modifiers in mapped data:', mappedJobData.service_modifiers);
        console.log('🔧 Job Details: service_modifiers type:', typeof mappedJobData.service_modifiers);
        console.log('🔧 Job Details: service_modifiers value:', JSON.stringify(mappedJobData.service_modifiers, null, 2));
        console.log('🔧 Job Details: Pricing breakdown:', {
          service_price: mappedJobData.service_price,
          additional_fees: mappedJobData.additional_fees,
          taxes: mappedJobData.taxes,
          discount: mappedJobData.discount,
          total: mappedJobData.total
        });
        
        setJob(mappedJobData)
        
        // Fetch invoice status to show payment information
        console.log('💳 About to fetch invoice status for job ID:', mappedJobData.id)
        await fetchInvoiceStatus(mappedJobData.id)
        
        // Initialize form data
        setFormData({
          service_name: mappedJobData.service_name || "",
          bathroom_count: mappedJobData.bathroom_count || "",
          duration: mappedJobData.duration || mappedJobData.estimated_duration || 0,
          workers_needed: mappedJobData.workers_needed || mappedJobData.workers || 1,
          skills: mappedJobData.skills || [],
          notes: mappedJobData.notes || "",
          internal_notes: mappedJobData.internal_notes || "",
          serviceAddress: {
            street: mappedJobData.customer_address || mappedJobData.service_address_street || "",
            city: mappedJobData.customer_city || mappedJobData.service_address_city || "",
            state: mappedJobData.customer_state || mappedJobData.service_address_state || "",
            zipCode: mappedJobData.customer_zip_code || mappedJobData.service_address_zip || ""
          },
          scheduledDate: mappedJobData.scheduled_date ? (mappedJobData.scheduled_date.includes('T') ? mappedJobData.scheduled_date.split('T')[0] : mappedJobData.scheduled_date.split(' ')[0]) : "",
          scheduledTime: mappedJobData.scheduled_date ? (mappedJobData.scheduled_date.includes('T') ? mappedJobData.scheduled_date.split('T')[1]?.substring(0, 5) : mappedJobData.scheduled_date.split(' ')[1]?.substring(0, 5)) : "",
          offer_to_providers: mappedJobData.offer_to_providers || false,
          // Pricing fields
          service_price: mappedJobData.service_price || 0,
          discount: mappedJobData.discount || 0,
          additional_fees: mappedJobData.additional_fees || 0,
          taxes: mappedJobData.taxes || 0,
          tip: 0
        })

        // Initialize intake question answers
        if (mappedJobData.service_intake_questions) {
          const initialAnswers = {}
          mappedJobData.service_intake_questions.forEach(question => {
            if (question.answer) {
              initialAnswers[question.id] = question.answer
            }
          })
          setIntakeQuestionAnswers(initialAnswers)
        }

        // Fetch notification preferences
        if (jobData.customer_id) {
          try {
            const prefs = await notificationAPI.getPreferences(jobData.customer_id)
    
            setEmailNotifications(!!prefs.email_notifications)
            setSmsNotifications(!!prefs.sms_notifications)
          } catch (e) {
            console.error('Failed to load notification preferences:', e)
            // Use defaults - don't show error to user for notification preferences
            setEmailNotifications(true)
            setSmsNotifications(false)
          }
        }
      } catch (err) {
        console.error('Error fetching job:', err)
        
        // Handle Windows Defender/Firewall CORS preflight issues with retry
        if ((err.code === 'ERR_NETWORK' || err.message?.includes('CORS') || err.message?.includes('preflight') || err.message?.includes('Failed to fetch')) && retryCount < 3) {
          console.log(`🔄 Windows Defender/Firewall CORS issue detected, retrying in ${(retryCount + 1) * 2} seconds... (attempt ${retryCount + 1}/3)`)
          
          setIsRetrying(true)
          
          // Wait longer between retries for Windows Defender/firewall issues
          await new Promise(resolve => setTimeout(resolve, (retryCount + 1) * 2000))
          
          // Retry the request
          return fetchJob(retryCount + 1)
        }
        
        // Handle specific error types
        if (err.code === 'ERR_NETWORK' || err.message?.includes('CORS') || err.message?.includes('preflight')) {
          setError("Network error: Unable to load job details. This may be due to Windows Defender/firewall blocking the request. Please check your connection and try again.")
        } else if (err.response?.status === 404) {
          setError("Job not found. It may have been deleted.")
        } else if (err.response?.status === 401) {
          setError("Authentication required. Please log in again.")
          navigate('/signin')
        } else {
          setError(`Failed to load job details: ${err.message || 'Unknown error'}`)
        }
      } finally {
        setLoading(false)
        setIsRetrying(false)
      }
    }
    if (jobId) fetchJob()
  }, [jobId, navigate])

  // Fetch supporting data
  useEffect(() => {
    const fetchData = async () => {
      // Wait a bit to ensure authentication state is ready
      await new Promise(resolve => setTimeout(resolve, 200))
      
      try {
        const user = JSON.parse(localStorage.getItem('user') || '{}')
        if (user.id) {
          const [territoriesData, teamData] = await Promise.all([
            territoriesAPI.getAll(user.id),
            teamAPI.getAll(user.id)
          ])
          setTerritories(territoriesData.territories || territoriesData)
          setTeamMembers(teamData.teamMembers || teamData)
        }
      } catch (e) {
        console.error('Failed to fetch supporting data:', e)
      }
    }
    fetchData()
  }, [])

  // Fetch invoice data
  useEffect(() => {
    const fetchInvoice = async () => {
      if (!job || !job.invoice_id) return
      try {
        const data = await invoicesAPI.getById(job.invoice_id, job.user_id)
        setInvoice(data)
      } catch (e) {
        setInvoice(null)
      }
    }
    fetchInvoice()
  }, [job])

  // Check Stripe connection status
  useEffect(() => {
    const checkStripeStatus = async () => {
      try {
        console.log('🔍 Checking Stripe status...')
        const response = await stripeAPI.testConnection()
        console.log('🔍 Stripe status response:', response)
        setStripeConnected(response.connected)
        // If Stripe is not connected, disable payment link
        if (!response.connected) {
          setIncludePaymentLink(false)
        } else {
          // If Stripe is connected, enable payment link by default
          setIncludePaymentLink(true)
        }
      } catch (error) {
        console.error('Error checking Stripe status:', error)
        setStripeConnected(false)
        setIncludePaymentLink(false)
      }
    }
    
    checkStripeStatus()
  }, [])

  const statusOptions = [
    { key: 'pending', label: 'Pending', color: 'bg-gray-400' },
    { key: 'confirmed', label: 'Confirmed', color: 'bg-blue-500' },
    { key: 'in_progress', label: 'In Progress', color: 'bg-orange-500' },
    { key: 'completed', label: 'Completed', color: 'bg-purple-500' },
    { key: 'cancelled', label: 'Cancelled', color: 'bg-red-500' }
  ]

  const handleStatusChange = async (newStatus) => {
    if (!job) return
    try {
      setLoading(true)
      await jobsAPI.updateStatus(job.id, newStatus)
      setJob(prev => ({ ...prev, status: newStatus }))
      setSuccessMessage(`Job marked as ${newStatus}`)
      setTimeout(() => setSuccessMessage(""), 3000)
    } catch (error) {
      setError('Failed to update status')
    } finally {
      setLoading(false)
    }
  }

  const copyCustomerAddressToService = () => {
    if (!job) return;
    
    let parsedAddress = {
      street: "",
      city: "",
      state: "",
      zipCode: "",
      country: "USA"
    };
    
    // Check if customer has address information
    const hasCustomerAddress = job.customer_address || job.customer_city || job.customer_state || job.customer_zip_code;
    
    if (hasCustomerAddress) {
      // Use separate fields if available
      if (job.customer_city && job.customer_state && job.customer_zip_code) {
        parsedAddress.street = job.customer_address || "";
        parsedAddress.city = job.customer_city;
        parsedAddress.state = job.customer_state;
        parsedAddress.zipCode = job.customer_zip_code;
      } else if (job.customer_address) {
        // Fallback to parsing address string if separate fields aren't available
        const addressParts = job.customer_address.split(',').map(part => part.trim());
        
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
      
      setFormData(prev => ({
        ...prev,
        serviceAddress: parsedAddress
      }));
      
      // Show feedback
      setAddressAutoPopulated(true);
      setTimeout(() => setAddressAutoPopulated(false), 3000);
    }
  };

  const handleSave = async () => {
    if (!job) return
    try {
      setLoading(true)
      setError("")
      
      const updatedJob = {
        serviceName: formData.service_name,
        bathroomCount: formData.bathroom_count,
        duration: formData.duration,
        workers: formData.workers_needed,
        skills: formData.skills,
        notes: formData.notes,
        internalNotes: formData.internal_notes,
        serviceAddress: {
          street: formData.serviceAddress.street,
          city: formData.serviceAddress.city,
          state: formData.serviceAddress.state,
          zipCode: formData.serviceAddress.zipCode
        },
        offerToProviders: formData.offerToProviders,
        // Pricing fields - use formData if available, otherwise use current job values
        price: formData.service_price !== undefined ? formData.service_price : (job.service_price || 0),
        discount: formData.discount !== undefined ? formData.discount : (job.discount || 0),
        additionalFees: formData.additional_fees !== undefined ? formData.additional_fees : (job.additional_fees || 0),
        taxes: formData.taxes !== undefined ? formData.taxes : (job.taxes || 0),
        // Use consistent calculation for both total and total_amount
        total: calculateTotalPriceHelper(
          formData.service_price !== undefined ? formData.service_price : (job.service_price || 0),
          formData.modifier_price !== undefined ? formData.modifier_price : calculateModifierPrice(),
          formData.additional_fees !== undefined ? formData.additional_fees : (job.additional_fees || 0),
          formData.taxes !== undefined ? formData.taxes : (job.taxes || 0),
          formData.discount !== undefined ? formData.discount : (job.discount || 0)
        ),
        total_amount: calculateTotalPriceHelper(
          formData.service_price !== undefined ? formData.service_price : (job.service_price || 0),
          formData.modifier_price !== undefined ? formData.modifier_price : calculateModifierPrice(),
          formData.additional_fees !== undefined ? formData.additional_fees : (job.additional_fees || 0),
          formData.taxes !== undefined ? formData.taxes : (job.taxes || 0),
          formData.discount !== undefined ? formData.discount : (job.discount || 0)
        ),
        // Use the current service modifiers from job state (which includes any edits)
        serviceModifiers: job.service_modifiers
      }
      
      console.log('🔄 Job Details: Sending update data:', updatedJob);
      console.log('🔄 Job Details: Service address data:', updatedJob.serviceAddress);
      console.log('🔄 Job Details: Pricing data:', {
        price: updatedJob.price,
        discount: updatedJob.discount,
        additionalFees: updatedJob.additionalFees,
        taxes: updatedJob.taxes,
        total: updatedJob.total,
        total_amount: updatedJob.total_amount
      });

      const result = await jobsAPI.update(job.id, updatedJob)
      console.log('🔄 Job Details: API update result:', result);
      
      setSuccessMessage('Job updated successfully!')
      setTimeout(() => setSuccessMessage(""), 3000)
      setEditing(false)
      setEditingField(null)
      
      // Update the job state with new data immediately
      setJob(prev => {
        const updatedJobState = {
          ...prev,
          service_address_street: formData.serviceAddress.street,
          service_address_city: formData.serviceAddress.city,
          service_address_state: formData.serviceAddress.state,
          service_address_zip: formData.serviceAddress.zipCode,
          ...updatedJob
        };
        console.log('🔄 Job Details: Updated job state:', updatedJobState);
        return updatedJobState;
      })
      
      // Reload job data to get updated values
      const jobData = await jobsAPI.getById(jobId)
      const mappedJobData = mapJobData(jobData)
      setJob(mappedJobData)
    } catch (error) {
      console.error('Error updating job:', error)
      setError(error.response?.data?.error || 'Failed to update job')
    } finally {
      setLoading(false)
    }
  }

  const handleReschedule = async () => {
    if (!job) return
    try {
      setLoading(true)
      const scheduledDate = formData.scheduledDate && formData.scheduledTime 
        ? `${formData.scheduledDate}T${formData.scheduledTime}:00.000Z`
        : job.scheduled_date
      
      await jobsAPI.update(job.id, {
        scheduledDate: formData.scheduledDate,
        scheduledTime: formData.scheduledTime
      })
      setSuccessMessage('Job rescheduled successfully!')
      setTimeout(() => setSuccessMessage(""), 3000)
      setShowRescheduleModal(false)
      // Reload job data
      const jobData = await jobsAPI.getById(jobId)
      const mappedJobData = mapJobData(jobData)
      setJob(mappedJobData)
    } catch (error) {
      setError('Failed to reschedule job')
    } finally {
      setLoading(false)
    }
  }

  const handleTerritoryChange = async (territoryId) => {
    if (!job) return
    
    try {
      setLoading(true)
      const updateData = {
        territoryId: territoryId
      }
      
      await jobsAPI.update(job.id, updateData)
      
      setJob(prev => ({ ...prev, territory_id: territoryId }))
      setSuccessMessage('Territory updated successfully!')
      setTimeout(() => setSuccessMessage(""), 3000)
    } catch (error) {
      console.error('Territory update failed:', error)
      setError('Failed to update territory')
    } finally {
      setLoading(false)
    }
  }

  const handleTestEmail = async () => {
    try {
      setLoading(true)
      
      // Use manual email if provided, otherwise fall back to customer email
      const emailToUse = manualEmail || job.customer_email;
      
      if (!emailToUse) {
        setError('Please enter a customer email address');
        return;
      }
      
      const response = await api.post('/test-sendgrid', {
        testEmail: emailToUse
      })
      
      console.log('Test email result:', response.data)
      setSuccessMessage('Test email sent successfully!')
      setTimeout(() => setSuccessMessage(""), 3000)
    } catch (error) {
      console.error('Error sending test email:', error)
      setError('Failed to send test email: ' + (error.response?.data?.error || error.message))
    } finally {
      setLoading(false)
    }
  }

  const handleSendInvoice = async () => {
    if (!job) return
    try {
      setLoading(true)
      
      // First, create an invoice record
      const calculatedAmount = calculateTotalPrice();
      console.log('💰 Creating invoice with amount:', calculatedAmount);
      console.log('💰 Job data for calculation:', {
        jobTotal: job.total,
        servicePrice: job.service_price,
        additionalFees: job.additional_fees,
        taxes: job.taxes,
        discount: job.discount,
        tip: formData.tip
      });
      
      // Validate amount before sending
      if (calculatedAmount <= 0) {
        setError('Invoice amount must be greater than $0. Please check the job pricing.');
        return;
      }
      
      const createInvoiceData = {
        jobId: job.id,
        customerId: job.customer_id,
        amount: calculatedAmount,
        taxAmount: 0, // You can calculate tax if needed
        totalAmount: calculatedAmount,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 7 days from now
      };
      
      console.log('💰 Sending invoice data to server:', createInvoiceData);
      
      const invoiceResponse = await api.post('/create-invoice', createInvoiceData)
      
      const invoice = invoiceResponse.data
      console.log('📄 Invoice created:', invoice)
      
      // Send invoice email with the created invoice ID
      // Use manual email if provided, otherwise fall back to customer email
      const emailToUse = manualEmail || job.customer_email;
      
      if (!emailToUse) {
        setError('Please enter a customer email address');
        return;
      }
      
      const invoiceData = {
        invoiceId: invoice.id,
        jobId: job.id,
        customerEmail: emailToUse,
        customerName: `${job.customer_first_name} ${job.customer_last_name}`,
        amount: calculateTotalPrice(),
        serviceName: job.service_name,
        serviceDate: job.scheduled_date,
        address: job.customer_address,
        includePaymentLink: includePaymentLink
      }
      
      console.log('📧 Sending invoice email with data:', invoiceData)
      console.log('📧 Include payment link state:', includePaymentLink)
      
      const emailResponse = await api.post('/send-invoice-email', invoiceData)
      console.log('Invoice email sent:', emailResponse.data)
      
      // Update invoice status to 'sent'
      await api.put(`/invoices/${invoice.id}`, {
        status: 'sent'
      })
      
      // Update job invoice status to 'invoiced'
      await jobsAPI.update(job.id, {
        invoiceStatus: 'invoiced'
      })
      setJob(prev => ({ ...prev, invoice_status: 'invoiced' }))
      setSuccessMessage('Invoice sent successfully!')
      setTimeout(() => setSuccessMessage(""), 3000)
      setShowSendInvoiceModal(false)
      setManualEmail('') // Clear manual email after successful send
    } catch (error) {
      console.error('Error sending invoice:', error)
      setError('Failed to send invoice')
    } finally {
      setLoading(false)
    }
  }

  const handleTeamAssignment = async (teamMemberId, specificMemberId = null, makePrimary = false) => {
    if (!job) return
    try {
      setLoading(true)

      
      if (specificMemberId) {
        // Remove specific team member
        
        await jobsAPI.removeTeamMember(job.id, specificMemberId)
        setJob(prev => ({
          ...prev,
          team_assignments: prev.team_assignments.filter(ta => ta.team_member_id !== specificMemberId)
        }))
        setSuccessMessage('Team member removed!')
      } else if (teamMemberId) {
        // Add new team member
        
        await jobsAPI.assignToTeamMember(job.id, teamMemberId)
        
        // Refresh job data to get updated team assignments

        const updatedJobData = await jobsAPI.getById(job.id)
        
        
        const mappedUpdatedJob = mapJobData(updatedJobData)
        setJob(mappedUpdatedJob)
        setSuccessMessage('Team member assigned!')
      } else {
        // Remove all team members
        
        await jobsAPI.assignToTeamMember(job.id, null)
        setJob(prev => ({ ...prev, team_assignments: [] }))
        setSuccessMessage('All team members unassigned!')
      }
      
      setAssigning(false)
      setSelectedTeamMember(null)
      setTimeout(() => setSuccessMessage(""), 3000)
    } catch (error) {
      console.error('Team assignment error:', error)
      setError('Failed to assign team member')
    } finally {
      setLoading(false)
    }
  }

  const handleNotificationToggle = async (type, value) => {
    if (!job || !job.customer_id) return
    try {
      setLoading(true)

      
      if (type === 'email') {
        setEmailNotifications(value)
      } else if (type === 'sms') {
        setSmsNotifications(value)
      }
      
      // Update notification preferences in backend
      const preferences = {
        email_notifications: type === 'email' ? value : emailNotifications,
        sms_notifications: type === 'sms' ? value : smsNotifications
      }
      
      
      await notificationAPI.updatePreferences(job.customer_id, preferences)
      
      setSuccessMessage(`${type === 'email' ? 'Email' : 'SMS'} notifications ${value ? 'enabled' : 'disabled'}`)
      setTimeout(() => setSuccessMessage(""), 3000)
    } catch (error) {
      console.error('Failed to update notification preferences:', error)
      setError('Failed to update notification preferences')
      // Revert the toggle if update failed
      if (type === 'email') {
        setEmailNotifications(!value)
      } else if (type === 'sms') {
        setSmsNotifications(!value)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleIntakeQuestionsChange = (answers) => {
    console.log('🔄 Job Details: Intake questions changed', answers);
    setIntakeQuestionAnswers(answers)
  }

  const handleSaveIntakeQuestions = async () => {
    if (!job) return
    try {
      setLoading(true)
      setError("")
      
      // Update the job with new intake question answers
      const updatedJob = {
        service_intake_questions: job.service_intake_questions.map(question => ({
          ...question,
          answer: intakeQuestionAnswers[question.id] || null
        }))
      }
      
      await jobsAPI.update(job.id, updatedJob)
      
      setSuccessMessage('Intake question answers updated successfully!')
      setTimeout(() => setSuccessMessage(""), 3000)
      setEditingField(null)
      
      // Update the job state with new data immediately
      setJob(prev => ({
        ...prev,
        service_intake_questions: updatedJob.service_intake_questions
      }))
      
      // Reload job data to get updated values
      const jobData = await jobsAPI.getById(jobId)
      const mappedJobData = mapJobData(jobData)
      setJob(mappedJobData)
    } catch (error) {
      console.error('Error updating intake questions:', error)
      setError(error.response?.data?.error || 'Failed to update intake questions')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveService = async () => {
    if (!job) return
    try {
      setLoading(true)
      setError("")
      
      // Send only the changed values to backend, let backend calculate total
      const updatedJob = {
        service_price: formData.service_price,
        additional_fees: formData.additional_fees,
        taxes: formData.taxes,
        discount: formData.discount
      }
      
      await jobsAPI.update(job.id, updatedJob)
      
      setSuccessMessage('Service details updated successfully!')
      setTimeout(() => setSuccessMessage(""), 3000)
      
      // Close the modal
      setShowEditServiceModal(false)
      
      // Update the job state with new data immediately
      setJob(prev => ({
        ...prev,
        ...updatedJob
      }))
      
      // Reload job data to get updated values
      const jobData = await jobsAPI.getById(jobId)
      const mappedJobData = mapJobData(jobData)
      setJob(mappedJobData)
    } catch (error) {
      console.error('Error updating service details:', error)
      setError(error.response?.data?.error || 'Failed to update service details')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'Date placeholder'
    
    // Handle both ISO format (2025-08-29T09:00:00) and space format (2025-08-29 09:00:00)
    let datePart
    if (dateString.includes('T')) {
      datePart = dateString.split('T')[0]
    } else {
      datePart = dateString.split(' ')[0]
    }
    
    if (!datePart) return 'Date placeholder'
    
    const [year, month, day] = datePart.split('-')
    if (!year || !month || !day) return 'Date placeholder'
    
    // Use the stored date directly without creating Date objects to avoid timezone conversion
    const y = parseInt(year)
    const m = parseInt(month)
    const d = parseInt(day)
    
    // Create weekday and month names arrays
    const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    
    // Calculate weekday using Zeller's congruence to avoid Date object
    let adjustedMonth = m
    let adjustedYear = y
    if (m < 3) {
      adjustedMonth = m + 12
      adjustedYear = y - 1
    }
    
    const k = adjustedYear % 100
    const j = Math.floor(adjustedYear / 100)
    const h = (d + Math.floor((13 * (adjustedMonth + 1)) / 5) + k + Math.floor(k / 4) + Math.floor(j / 4) - 2 * j) % 7
    
    const weekdayIndex = ((h + 5) % 7) // Adjust for Sunday = 0
    const weekday = weekdays[weekdayIndex]
    const monthName = months[m - 1]
    
    return `${weekday}, ${monthName} ${d}, ${y}`
  }

  const formatTime = (dateString) => {
    if (!dateString) return 'Time placeholder'
    
    // Handle both ISO format (2025-08-29T09:00:00) and space format (2025-08-29 09:00:00)
    let timePart
    if (dateString.includes('T')) {
      timePart = dateString.split('T')[1]
    } else {
      timePart = dateString.split(' ')[1]
    }
    
    if (!timePart) return 'Time placeholder'
    
    const [hours, minutes] = timePart.split(':')
    const hour = parseInt(hours, 10)
    const minute = parseInt(minutes, 10)
    
    if (isNaN(hour) || isNaN(minute)) return 'Time placeholder'
    
    // Convert to 12-hour format
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour % 12 || 12
    const displayMinute = minute.toString().padStart(2, '0')
    
    const formatted = `${displayHour}:${displayMinute} ${ampm}`
    return formatted
  }

  // Helper function to calculate total price consistently
  const calculateTotalPriceHelper = (servicePrice, modifierPrice, additionalFees, taxes, discount) => {
    const basePrice = parseFloat(servicePrice) || 0;
    const modPrice = parseFloat(modifierPrice) || 0;
    const addFees = parseFloat(additionalFees) || 0;
    const taxAmount = parseFloat(taxes) || 0;
    const discAmount = parseFloat(discount) || 0;
    
    return basePrice + modPrice + addFees + taxAmount - discAmount;
  };

  // Calculate total modifier price
  const calculateModifierPrice = () => {
    try {
      const serviceModifiers = getServiceModifiers();
      let totalModifierPrice = 0;
      
      serviceModifiers.forEach(modifier => {
        if (modifier.selectedOptions && modifier.selectedOptions.length > 0) {
          modifier.selectedOptions.forEach(option => {
            console.log('🔧 Modifier option details:', {
              id: option.id,
              label: option.label,
              price: option.price,
              totalPrice: option.totalPrice,
              selectedQuantity: option.selectedQuantity
            });
            
            // Use the current price from the job state (which includes any edits)
            const basePrice = parseFloat(option.price || 0);
            
            // If totalPrice exists, use it (it's already calculated with quantity)
            // Otherwise, calculate price * quantity
            if (option.totalPrice !== undefined && option.totalPrice !== null) {
              console.log('🔧 Using totalPrice:', option.totalPrice);
              totalModifierPrice += parseFloat(option.totalPrice);
            } else if (option.selectedQuantity && option.selectedQuantity > 0) {
              // Calculate price * quantity if totalPrice is not available
              const calculatedTotal = basePrice * option.selectedQuantity;
              console.log('🔧 Calculating price * quantity:', basePrice, '*', option.selectedQuantity, '=', calculatedTotal);
              totalModifierPrice += calculatedTotal;
            } else {
              // Fallback to base price if no quantity
              console.log('🔧 Using base price:', basePrice);
              totalModifierPrice += basePrice;
            }
          });
        }
      });
      
      console.log('🔧 calculateModifierPrice: total modifier price:', totalModifierPrice);
      return totalModifierPrice;
    } catch (error) {
      console.error('Error calculating modifier price:', error);
      return 0;
    }
  }

  // Use backend-calculated total as source of truth
  const calculateTotalPrice = () => {
    try {
      // Use backend-calculated total from job data
      const baseTotal = parseFloat(job.total) || 0;
      const tip = formData.tip || 0;
      const calculatedTotal = baseTotal + tip;
      
      console.log('💰 Price calculation:', {
        jobTotal: job.total,
        baseTotal,
        tip,
        calculatedTotal,
        jobData: {
          service_price: job.service_price,
          additional_fees: job.additional_fees,
          taxes: job.taxes,
          discount: job.discount,
          total: job.total
        }
      });
      
      return calculatedTotal;
    } catch (error) {
      console.error('Error getting total price:', error);
      return 0;
    }
  }

  // Parse service modifiers from JSON
  const getServiceModifiers = () => {
    try {
      console.log('🔧 getServiceModifiers: job.service_modifiers:', job.service_modifiers);
      console.log('🔧 getServiceModifiers: job.service_modifiers type:', typeof job.service_modifiers);
      console.log('🔧 getServiceModifiers: job.service_modifiers stringified:', JSON.stringify(job.service_modifiers, null, 2));
      
      // Handle null, undefined, or empty values
      if (!job.service_modifiers || job.service_modifiers === null) {
        console.log('🔧 getServiceModifiers: No modifiers found, returning empty array');
        return [];
      }
      
      if (typeof job.service_modifiers === 'string') {
        const parsed = JSON.parse(job.service_modifiers);
        console.log('🔧 getServiceModifiers: parsed from string:', parsed);
        return Array.isArray(parsed) ? parsed : [];
      }
      
      const result = Array.isArray(job.service_modifiers) ? job.service_modifiers : [];
      console.log('🔧 getServiceModifiers: final result:', result);
      console.log('🔧 getServiceModifiers: result length:', result.length);
      console.log('🔧 getServiceModifiers: result items:', result.map(item => ({ id: item.id, title: item.title, selectedOptions: item.selectedOptions })));
      return result;
    } catch (error) {
      console.error('Error parsing service modifiers:', error);
      return [];
    }
  }

  // Parse service intake questions from JSON
  const getServiceIntakeQuestions = () => {
    try {
      if (!job.service_intake_questions) return [];
      if (typeof job.service_intake_questions === 'string') {
        try {
          const firstParse = JSON.parse(job.service_intake_questions);
          
          // Check if it's double-encoded
          if (typeof firstParse === 'string') {
            const secondParse = JSON.parse(firstParse);
            return Array.isArray(secondParse) ? secondParse : [];
          }
          
          return Array.isArray(firstParse) ? firstParse : [];
        } catch (firstError) {
          return [];
        }
      }
      return Array.isArray(job.service_intake_questions) ? job.service_intake_questions : [];
    } catch (error) {
      console.error('Error parsing service intake questions:', error);
      return [];
    }
  }

  // Format duration for display
  const formatDuration = (minutes) => {
    if (!minutes) return '0h';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }

  const getCustomerInitials = () => {
    const firstName = job?.customer_first_name || ''
    const lastName = job?.customer_last_name || ''
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
  }

  if (loading || !job) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <span className="text-gray-500 text-lg">
            {isRetrying ? 'Retrying connection...' : 'Loading job details...'}
          </span>
          {isRetrying && (
            <p className="text-sm text-gray-400 mt-2">
              Windows Defender/firewall may be blocking the request. Retrying...
            </p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <div className="flex-1 lg:ml-64 xl:ml-72">
        {/* Mobile Header */}
        <MobileHeader onMenuClick={() => setSidebarOpen(true)} />
        
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 sm:space-x-4 min-w-0 flex-1">
              <button
                className="flex items-center text-blue-600 hover:text-blue-700 flex-shrink-0"
                onClick={() => navigate('/jobs')}
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                <span className="text-sm hidden sm:inline">All Jobs</span>
              </button>
              
              <div className="min-w-0 flex-1">
                <h1 className="text-lg sm:text-xl font-semibold text-gray-900 truncate">
                  {job.service_names && job.service_names.length > 1 
                    ? `${job.service_names.length} Services` 
                    : (job.service_name || 'Service')
                  } for {job.customer_first_name} {job.customer_last_name}
                </h1>
                <p className="text-xs sm:text-sm text-gray-600">Job #{job.id}</p>
              </div>
            </div>

            <div className="flex items-center space-x-2 sm:space-x-3 flex-shrink-0">
              {/* Mobile sidebar toggle */}
              <button
                onClick={() => setShowMobileSidebar(true)}
                className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <Menu className="w-5 h-5 text-gray-600" />
              </button>

              <div className="hidden sm:flex items-center space-x-2 relative">
                <span className="text-sm text-gray-600">Territory</span>
                <div className="flex items-center bg-gray-100 px-2 py-1 rounded cursor-pointer relative"
                  onClick={() => setEditingField('territory')}
                >
                  <MapPin className="w-3 h-3 text-gray-500 mr-1" />
                  <span className="text-sm font-medium mr-1">
                    {territories.find(t => t.id === job.territory_id)?.name || 'Unassigned'}
                  </span>
                  <ChevronDown className="w-3 h-3 text-gray-500" />
                </div>
                {editingField === 'territory' && (
                  <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded shadow z-50">
                    {territories.map(t => (
                      <button
                        key={t.id}
                        className={`w-full text-left px-4 py-2 hover:bg-gray-100 ${job.territory_id === t.id ? 'font-semibold bg-gray-100' : ''}`}
                        onClick={() => {
                          handleTerritoryChange(t.id)
                          setEditingField(null)
                        }}
                      >
                        {t.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Action Menu */}
              <div className="relative">
                <button
                  onClick={() => setShowActionMenu(!showActionMenu)}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <MoreVertical className="w-5 h-5 text-gray-600" />
                </button>
                
                {showActionMenu && (
                  <>
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setShowActionMenu(false)}
                    />
                    <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                      <button
                        onClick={() => {
                          setShowEditServiceModal(true)
                          setShowActionMenu(false)
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center space-x-2"
                      >
                        <Edit3 className="w-4 h-4" />
                        <span>Edit Service</span>
                      </button>
                      <button
                        onClick={() => {
                          setShowEditAddressModal(true)
                          setShowActionMenu(false)
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center space-x-2"
                      >
                        <MapPin className="w-4 h-4" />
                        <span>Edit Address</span>
                      </button>
                      <button
                        onClick={() => {
                          setShowRescheduleModal(true)
                          setShowActionMenu(false)
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center space-x-2"
                      >
                        <Calendar className="w-4 h-4" />
                        <span>Reschedule</span>
                      </button>
                      <hr className="my-1" />
                      <button
                        onClick={() => {
                          setShowCancelModal(true)
                          setShowActionMenu(false)
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-gray-50 text-red-600 flex items-center space-x-2"
                      >
                        <X className="w-4 h-4" />
                        <span>Cancel Job</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Status Bar */}
          <div className="mt-4 sm:mt-6">
            <div className="flex items-center space-x-3">
              <label className="text-sm font-medium text-gray-700">Status:</label>
              <div className="relative">
                <button
                  className="flex items-center border border-gray-300 rounded px-3 py-1 text-sm bg-white hover:bg-gray-50 focus:outline-none"
                  onClick={() => setEditingField('status')}
                  style={{ minWidth: 140 }}
                >
                  <span className={`inline-block w-2 h-2 rounded-full mr-2 ${statusOptions.find(s => s.key === job.status)?.color || 'bg-gray-300'}`}></span>
                                          <span>{statusOptions.find(s => s.key === job.status)?.label || job.status || 'Status placeholder'}</span>
                  <ChevronDown className="w-4 h-4 ml-2 text-gray-400" />
                </button>
                {editingField === 'status' && (
                  <div className="absolute z-50 mt-1 w-48 bg-white border border-gray-200 rounded shadow-lg">
                    {statusOptions.map(status => (
                      <button
                        key={status.key}
                        className={`w-full flex items-center px-4 py-2 text-left hover:bg-gray-50 ${job.status === status.key ? 'font-semibold bg-gray-100' : ''}`}
                        onClick={() => {
                          handleStatusChange(status.key)
                          setEditingField(null)
                        }}
                      >
                        <span className={`inline-block w-2 h-2 rounded-full mr-2 ${status.color}`}></span>
                        {status.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
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
        <div className="flex flex-col lg:flex-row">
          {/* Left Column */}
          <div className="flex-1 lg:max-w-3xl p-4 sm:p-6">
            {/* Map Section */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-4 sm:mb-6">
              <div className="relative">
                {/* Google Maps Integration */}
                <div className="w-full h-80 sm:h-96 bg-gradient-to-br from-green-100 to-blue-100 rounded-t-lg flex items-center justify-center">
                  {job.service_address_street && job.service_address_city ? (
                    <iframe
                      width="100%"
                      height="100%"
                      style={{ border: 0, borderRadius: '8px 8px 0 0' }}
                      loading="lazy"
                      allowFullScreen
                      referrerPolicy="no-referrer-when-downgrade"
                      src={`https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${encodeURIComponent(
                        `${job.service_address_street}, ${job.service_address_city}, ${job.service_address_state || ''} ${job.service_address_zip || ''}`
                      )}`}
                      onError={(e) => {
                        console.error('Map iframe failed to load:', e);
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                      onLoad={() => {
                        console.log('Map loaded successfully for address:', `${job.service_address_street}, ${job.service_address_city}`);
                      }}
                    />
                  ) : null}
                  <div className={`text-center ${job.service_address_street && job.service_address_city ? 'hidden' : 'flex flex-col items-center justify-center'}`}>
                    <div className="w-10 sm:w-12 h-10 sm:h-12 bg-blue-500 rounded-lg flex items-center justify-center mx-auto mb-3">
                      <MapPin className="w-5 sm:w-6 h-5 sm:h-6 text-white" />
                    </div>
                    <p className="text-gray-600 font-medium">
                      {job.service_address_street ? 'Map unavailable' : 'No address set'}
                    </p>
                    <p className="text-sm text-gray-500">
                      {job.service_address_street ? 'Unable to load map for this address' : 'Add an address to see the map'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Location Info Section - Moved below map */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-4 sm:mb-6 p-4 sm:p-6">
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-gray-900 mb-1 text-sm sm:text-base">JOB LOCATION</h3>
                  <p className="text-gray-700 font-medium text-sm sm:text-base truncate">
                    {job.service_address_street || 'Address not set'}
                  </p>
                  <p className="text-gray-700 text-sm sm:text-base">
                    {job.service_address_city}, {job.service_address_state} {job.service_address_zip}
                  </p>
                  {job.service_address_street && (
                    <a 
                      href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
                        `${job.service_address_street}, ${job.service_address_city}, ${job.service_address_state} ${job.service_address_zip}`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-700 text-xs sm:text-sm font-medium mt-1 flex items-center"
                    >
                      View directions <ExternalLink className="w-3 h-3 ml-1" />
                    </a>
                  )}
                </div>
                <button
                  className="text-blue-600 hover:text-blue-700 text-xs sm:text-sm font-medium ml-2 flex-shrink-0"
                  onClick={() => setShowEditAddressModal(true)}
                >
                  Edit Address
                </button>
              </div>
            </div>

            {/* Date & Time Section */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-4 sm:mb-6 p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
                <div>
                  <h3 className="text-sm font-medium text-gray-600 mb-2">DATE & TIME</h3>
                  <div className="flex items-center space-x-3">
                    <Calendar className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    <div>
                      <p className="text-lg sm:text-xl font-semibold text-gray-900">
                        {formatTime(job.scheduled_date) || 'Time placeholder'}
                      </p>
                      <p className="text-gray-600 text-sm sm:text-base">{formatDate(job.scheduled_date) || 'Date placeholder'}</p>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                  <button 
                    onClick={() => setShowCancelModal(true)}
                    className="px-3 py-2 text-red-600 hover:bg-red-50 rounded border border-red-200 text-sm"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={() => setShowRescheduleModal(true)}
                    className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                  >
                    Reschedule
                  </button>
                </div>
              </div>
            </div>

            {/* Job Details Section */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-4 sm:mb-6 p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-600">JOB DETAILS</h3>
                <button
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                  onClick={() => setShowEditServiceModal(true)}
                >
                  Edit Service
                </button>
              </div>
              <div className="flex items-start space-x-4">
                <Clipboard className="w-5 h-5 text-gray-400 mt-1 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  {/* Display multiple services if available */}
                  {job.service_names && Array.isArray(job.service_names) && job.service_names.length > 1 ? (
                    <div className="space-y-2">
                      <p className="font-semibold text-gray-900">Multiple Services</p>
                      <div className="space-y-1">
                        {job.service_names.map((serviceName, index) => (
                          <div key={index} className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            <span className="text-sm text-gray-700">{serviceName}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                  <p className="font-semibold text-gray-900">{job.service_name}</p>
                  )}
                  <p className="text-gray-600 text-sm mb-2">
                    {job.service_names && job.service_names.length > 1 ? `${job.service_names.length} services` : 'Default service category'}
                  </p>
                  <p className="text-sm text-gray-600 mt-2">{formatDuration(job.duration || 0)}</p>
                </div>
              </div>
            </div>

            {/* Team Assignment Section - Moved from sidebar */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-4 sm:mb-6 p-4 sm:p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <Users className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Team Assignment</h3>
                    <p className="text-sm text-gray-500">Manage team members for this job</p>
                  </div>
                </div>
                <button
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-all duration-200 shadow-sm hover:shadow-md"
                  onClick={() => setAssigning(true)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Assign Member
                </button>
              </div>
              
              {job.team_assignments && job.team_assignments.length > 0 ? (
                <div className="space-y-4">
                  {job.team_assignments.map((assignment, index) => {
                    const member = teamMembers.find(m => String(m.id) === String(assignment.team_member_id));
                    const memberName = member ? (member.name || member.fullName || member.email || member.id) : 'Unknown Member';
                    const memberEmail = member ? (member.email || '') : '';
                    return (
                      <div key={assignment.team_member_id} className="group relative bg-gray-50 border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-lg transition-all duration-200">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className="relative">
                              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-sm">
                                <User className="w-6 h-6 text-white" />
                              </div>
                              {assignment.is_primary && (
                                <div className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-400 rounded-full flex items-center justify-center shadow-sm border-2 border-white">
                                  <Star className="w-2.5 h-2.5 text-white" />
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-3 mb-1">
                                <h4 className="text-base font-semibold text-gray-900 truncate">{memberName}</h4>
                                {assignment.is_primary && (
                                  <span className="inline-flex items-center px-2.5 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
                                    Primary
                                  </span>
                                )}
                              </div>
                              {memberEmail && (
                                <p className="text-sm text-gray-600 mb-1 truncate">{memberEmail}</p>
                              )}
                              <p className="text-xs text-gray-500 flex items-center">
                                <Calendar className="w-3 h-3 mr-1" />
                                Assigned {new Date(assignment.assigned_at).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric'
                                })}
                              </p>
                            </div>
                          </div>
                          <button
                            className="opacity-0 group-hover:opacity-100 inline-flex items-center px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-all duration-200"
                            onClick={() => handleTeamAssignment(null, assignment.team_member_id)}
                            title="Remove assignment"
                          >
                            <X className="w-4 h-4 mr-1" />
                            Remove
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  
                  {/* Summary Card */}
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <CheckCircle className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-blue-900">
                            {job.team_assignments.length} team member{job.team_assignments.length !== 1 ? 's' : ''} assigned
                          </p>
                          <p className="text-xs text-blue-700">
                            {job.workers_needed || 1} worker{job.workers_needed !== 1 ? 's' : ''} needed for this job
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-blue-900">
                          {job.team_assignments.length}/{job.workers_needed || 1}
                        </div>
                        <div className="text-xs text-blue-700">Assigned</div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border-2 border-dashed border-gray-300">
                  <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Users className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Team Members Assigned</h3>
                  <p className="text-sm text-gray-600 mb-6 max-w-sm mx-auto">
                    Assign team members to this job to ensure it gets completed efficiently and on time.
                  </p>
                  <button
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-all duration-200 shadow-sm hover:shadow-md"
                    onClick={() => setAssigning(true)}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Assign First Member
                  </button>
                </div>
              )}
            </div>

            {/* Team Assignment Modal */}
            {assigning && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[80vh] overflow-y-auto">
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">Assign Team Member</h3>
                      <button
                        onClick={() => {
                          setAssigning(false);
                          setSelectedTeamMember(null);
                        }}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Select Team Member
                        </label>
                        <select
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                          value={selectedTeamMember || ''}
                          onChange={(e) => setSelectedTeamMember(e.target.value)}
                        >
                          <option value="">Choose a team member...</option>
                          {teamMembers.map((member) => (
                            <option key={member.id} value={member.id}>
                              {member.first_name} {member.last_name} ({member.email})
                            </option>
                          ))}
                        </select>
                      </div>
                      
                      {teamMembers.length === 0 && (
                        <div className="text-center py-4">
                          <Users className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                          <p className="text-gray-500 text-sm">No team members available</p>
                          <p className="text-gray-400 text-xs">Add team members in the Team section first</p>
                        </div>
                      )}
                      
                      <div className="flex justify-end space-x-3 pt-4">
                        <button
                          onClick={() => {
                            setAssigning(false);
                            setSelectedTeamMember(null);
                          }}
                          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-200"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => {
                            if (selectedTeamMember) {
                              handleTeamAssignment(selectedTeamMember);
                              setAssigning(false);
                              setSelectedTeamMember(null);
                            }
                          }}
                          disabled={!selectedTeamMember}
                          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Assign Member
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Invoice Section */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 space-y-2 sm:space-y-0 sm:space-x-2">
                <div>
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-2xl font-bold text-gray-900">Invoice</h3>
                    <span className={`px-3 py-1 text-sm font-medium rounded-full ${
                      job.invoice_status === 'paid' 
                        ? 'bg-green-100 text-green-800' 
                        : job.invoice_status === 'invoiced' || job.invoice_status === 'sent'
                        ? 'bg-yellow-100 text-yellow-800'
                        : job.invoice_status === 'draft'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {job.invoice_status === 'paid' 
                        ? 'Paid' 
                        : job.invoice_status === 'invoiced' || job.invoice_status === 'sent'
                        ? 'Unpaid'
                        : job.invoice_status === 'draft'
                        ? 'Draft'
                        : 'No Invoice'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">Due Oct 2, 2025</p>
                </div>
                
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
                  <button 
                    onClick={() => setShowAddPaymentModal(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center space-x-2 text-sm font-medium"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Payment</span>
                    <ChevronDown className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => {
                      if (!job.customer_email) {
                        setPendingAction('send')
                        setShowEmailRequiredModal(true)
                      } else {
                        setShowSendInvoiceModal(true)
                      }
                    }}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium"
                  >
                    Send Invoice
                  </button>
                  <div className="flex space-x-2">
                    <button className="p-2 text-gray-400 hover:text-gray-600 border border-gray-300 rounded-lg">
                      <Printer className="w-4 h-4" />
                    </button>
                    <button className="p-2 text-gray-400 hover:text-gray-600 border border-gray-300 rounded-lg">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Amount paid</p>
                  <p className="text-lg font-semibold text-gray-900">
                    ${job.total_paid_amount ? job.total_paid_amount.toFixed(2) : '0.00'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600 mb-1">Amount due</p>
                  <p className={`text-lg font-semibold ${job.invoice_status === 'paid' ? 'text-green-600' : 'text-red-600 underline'}`}>
                    ${job.invoice_status === 'paid' ? '0.00' : (job.total_invoice_amount ? job.total_invoice_amount.toFixed(2) : calculateTotalPrice().toFixed(2))}
                  </p>
                </div>
                </div>

              {/* Payment Status Section */}
              <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${job.invoice_status === 'paid' ? 'bg-green-500' : job.invoice_status === 'invoiced' || job.invoice_status === 'sent' ? 'bg-yellow-500' : 'bg-gray-300'}`}></div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {job.invoice_status === 'paid' ? 'Payment Received' : 
                         job.invoice_status === 'invoiced' || job.invoice_status === 'sent' ? 'Invoice Sent' : 
                         'No Invoice Sent'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {job.invoice_status === 'paid' ? 'Customer has paid the invoice' : 
                         job.invoice_status === 'invoiced' || job.invoice_status === 'sent' ? 'Invoice sent to customer, awaiting payment' : 
                         'Invoice not yet sent to customer'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {job.invoice_status === 'paid' && (
                      <div className="flex items-center space-x-2 text-green-600">
                        <CheckCircle className="w-5 h-5" />
                        <span className="text-sm font-medium">Paid</span>
                      </div>
                    )}
                    <button
                      onClick={() => {
                        console.log('💳 Manual refresh clicked for job ID:', job.id)
                        fetchInvoiceStatus(job.id)
                      }}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                      title="Refresh payment status"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>

              {/* Service Details Section */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <h4 className="font-semibold text-gray-900 mb-4">{job.service_name}</h4>
                
                <div className="space-y-3">
                  {/* Base Price */}
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm text-gray-600">Base Price (${(parseFloat(job.services?.price) || 0).toFixed(2)})</p>
                  </div>
                    <span className="text-sm font-medium text-gray-900">${(parseFloat(job.services?.price) || 0).toFixed(2)}</span>
                  </div>
                  
                  {/* Modifiers */}
                  {(() => {
                    const serviceModifiers = getServiceModifiers();
                    let hasModifiers = false;
                    
                    return (
                      <>
                        {serviceModifiers.map((modifier, modifierIndex) => {
                          if (!modifier.selectedOptions || modifier.selectedOptions.length === 0) {
                            return null;
                          }
                          
                          hasModifiers = true;
                          return modifier.selectedOptions.map((option, index) => (
                            <div key={`${modifier.id}-${option.id}-${index}`} className="flex justify-between items-center">
                              <div>
                                <p className="text-sm text-gray-600">
                                  {option.selectedQuantity ? `${option.selectedQuantity} ${option.label || option.description}` : (option.label || option.description)}
                                </p>
                              </div>
                              <span className="text-sm font-medium text-gray-900">
                                ${parseFloat(option.price || 0).toFixed(2)}
                                </span>
                            </div>
                          ));
                        })}
                      </>
                    );
                  })()}
                  
                  {/* Discount */}
                  {(() => {
                    const discount = formData.discount !== undefined ? formData.discount : (parseFloat(job.discount) || 0);
                    
                    if (discount > 0) {
                      return (
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="text-sm text-gray-600">Discount</p>
                          </div>
                          <span className="text-sm font-medium text-green-600">
                            -${discount.toFixed(2)}
                          </span>
                        </div>
                      );
                    }
                    return null;
                  })()}
                  
                  {/* Service Adjustment Price */}
                  {(() => {
                    const basePrice = parseFloat(job.services?.price) || 0;
                    const modifierPrice = calculateModifierPrice();
                    const totalPrice = parseFloat(job.total) || 0;
                    const serviceAdjustment = totalPrice - (basePrice + modifierPrice);
                    
                    if (Math.abs(serviceAdjustment) > 0.01) {
                      return (
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="text-sm text-gray-600">Service Adjustment Price (${Math.abs(serviceAdjustment).toFixed(2)})</p>
                          </div>
                          <span className="text-sm font-medium text-gray-900">
                            ${Math.abs(serviceAdjustment).toFixed(2)}
                          </span>
                        </div>
                      );
                    }
                    return null;
                  })()}
                  
                  {/* Total */}
                  <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">Total</p>
                    </div>
                    <span className="text-sm font-semibold text-gray-900">
                      ${calculateTotalPrice().toFixed(2)}
                    </span>
                  </div>
                </div>
                
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <button 
                    onClick={() => setShowEditServiceModal(true)}
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit Service & Pricing
                  </button>
                    </div>
              </div>

              {/* Summary Section */}
              <div className="space-y-4">
                <div className="flex justify-between items-center py-2 border-b border-gray-200">
                  <span className="text-sm text-gray-600">Subtotal</span>
                  <span className="text-sm font-medium text-gray-900">${calculateTotalPrice().toFixed(2)}</span>
                    </div>
                
                <div className="flex justify-between items-center py-2 border-b border-gray-200">
                  <span className="text-sm text-gray-600">Total</span>
                  <span className="text-sm font-medium text-gray-900">${calculateTotalPrice().toFixed(2)}</span>
                    </div>
                
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-gray-600">Amount paid</span>
                  <span className="text-sm font-medium text-gray-900">
                    ${job.total_paid_amount ? job.total_paid_amount.toFixed(2) : '0.00'}
                  </span>
                        </div>
                
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-gray-600">Total due</span>
                  <span className={`text-sm font-medium ${job.invoice_status === 'paid' ? 'text-green-600' : 'text-gray-900'}`}>
                    ${job.invoice_status === 'paid' ? '0.00' : (job.total_invoice_amount ? job.total_invoice_amount.toFixed(2) : calculateTotalPrice().toFixed(2))}
                  </span>
                  </div>
                </div>

              {/* Payments Section */}
              <div className="mt-8">
                <h4 className="font-semibold text-gray-900 mb-4">Payments</h4>
                  <div className="text-center py-8">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <CreditCard className="w-6 h-6 text-gray-400" />
                  </div>
                    <p className="text-gray-500 font-medium">No payments</p>
                  <p className="text-sm text-gray-400 mt-1">
                      When you process or record a payment for this invoice, it will appear here.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            {/* Desktop Right Sidebar */}
          <div className="hidden lg:block w-80 xl:w-96 p-4 sm:p-6 space-y-6">
            {/* Customer Card */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <h3 className="font-semibold text-gray-900 mb-4">Customer</h3>
              
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-semibold text-sm">{getCustomerInitials()}</span>
                </div>
                <div>
                  <p className="font-semibold text-gray-900">
                    {job.customer_first_name && job.customer_last_name 
                      ? `${job.customer_first_name} ${job.customer_last_name}`
                      : job.customer_first_name || job.customer_last_name || 'Client name placeholder'
                    }
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center space-x-2 text-sm">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <a href={`tel:${job.customer_phone}`} className="text-blue-600 hover:text-blue-700">
                    {job.customer_phone ? formatPhoneNumber(job.customer_phone) : 'Phone placeholder'}
                  </a>
                </div>
                <div className="flex items-center space-x-2 text-sm">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <a href={`mailto:${job.customer_email}`} className="text-blue-600 hover:text-blue-700 truncate">
                    {job.customer_email || 'No email address'}
                  </a>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200">
                <button
                  onClick={() => {
                    setEditCustomerData({
                      firstName: job.customer_first_name || '',
                      lastName: job.customer_last_name || '',
                      email: job.customer_email || '',
                      phone: job.customer_phone || ''
                    })
                    setShowEditCustomerModal(true)
                  }}
                  className="w-full px-3 py-2 text-sm text-blue-600 hover:text-blue-700 border border-blue-200 hover:border-blue-300 rounded-lg transition-colors"
                >
                  Edit Customer
                </button>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex justify-between items-center text-sm">
                  <span className="font-medium text-gray-700">BILLING ADDRESS</span>
                  <button className="text-blue-600 hover:text-blue-700 font-medium">Edit</button>
                </div>
                <p className="text-sm text-gray-600 mt-1">Same as service address</p>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="text-sm">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium text-gray-700">EXPECTED PAYMENT METHOD</span>
                  </div>
                  <div className="flex items-center space-x-2 text-gray-600">
                    <CreditCard className="w-4 h-4" />
                    <span>No payment method on file</span>
                  </div>
                  <button className="text-blue-600 hover:text-blue-700 text-sm font-medium mt-1">
                    Add a card to charge later
                  </button>
                </div>
              </div>
            </div>

            {/* Team Section */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <h3 className="font-semibold text-gray-900 mb-4">Team</h3>
              <div className="space-y-4">
                {/* Job Requirements */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-700">JOB REQUIREMENTS</span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Workers needed</span>
                      <span className="font-medium">{job.workers_needed || 1} service provider</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Skills needed</span>
                      <span className="font-medium">
                        {job.skills && job.skills.length ? job.skills.join(', ') : 'No skill tags required'}
                      </span>
                    </div>
                  </div>
                </div>



                <div className="pt-4 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Offer job to service providers</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={formData.offer_to_providers}
                        onChange={(e) => {
                          setFormData(prev => ({ ...prev, offer_to_providers: e.target.checked }))
                          handleSave()
                        }}
                        className="sr-only peer" 
                      />
                      <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Allows qualified, available providers to see and claim this job. 
                    <button className="text-blue-600 hover:text-blue-700 ml-1">Learn more</button>
                  </p>
                </div>
              </div>
            </div>

            {/* Intake Questions & Answers */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900 flex items-center">
                  <MessageSquare className="w-5 h-5 mr-2 text-gray-400" />
                  Customer Questions & Answers
                </h3>
                <button
                  onClick={() => {
                    const newEditingField = editingField === 'intakeQuestions' ? null : 'intakeQuestions';
                    console.log('🔄 Job Details: Edit button clicked', { 
                      currentEditingField: editingField, 
                      newEditingField,
                      intakeQuestionAnswers,
                      serviceIntakeQuestions: job?.service_intake_questions 
                    });
                    setEditingField(newEditingField);
                  }}
                  className="px-3 py-1 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 flex items-center space-x-2"
                >
                  <Edit className="w-4 h-4" />
                  <span>{editingField === 'intakeQuestions' ? 'Cancel' : 'Edit Answers'}</span>
                </button>
              </div>
              
              {editingField === 'intakeQuestions' ? (
                <div>
                  <IntakeQuestionsForm
                    key={`intake-questions-${editingField}`}
                    questions={job.service_intake_questions || []}
                    onAnswersChange={handleIntakeQuestionsChange}
                    isEditable={true}
                    isSaving={loading}
                    initialAnswers={intakeQuestionAnswers}
                  />
                  <div className="mt-4 flex justify-end space-x-2">
                    <button
                      onClick={() => setEditingField(null)}
                      className="px-3 py-1 text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveIntakeQuestions}
                      disabled={loading}
                      className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                    >
                      {loading ? 'Saving...' : 'Save Answers'}
                    </button>
                  </div>
                </div>
              ) : (
            <IntakeAnswersDisplay intakeAnswers={(() => {
              // Get intake questions and answers from job data
              const intakeQuestionsAndAnswers = job.service_intake_questions || [];
              
              // Convert to the format expected by IntakeAnswersDisplay
              return intakeQuestionsAndAnswers.map(question => {
                return {
                  question_text: question.question,
                  question_type: question.questionType,
                  answer: question.answer || null,
                  created_at: job.created_at
                };
              });
            })()} />
              )}
            </div>

            {/* Notes & Files */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <h3 className="font-semibold text-gray-900 mb-4">Notes & Files</h3>
              <div className="py-4">
                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                {editingField === 'notes' ? (
                  <>
                    <textarea
                      className="w-full border border-gray-300 rounded p-2 mb-2"
                      rows={4}
                      value={formData.notes}
                      onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    />
                    <div className="flex justify-end space-x-2">
                      <button
                        className="px-3 py-1 text-gray-600 border border-gray-300 rounded"
                        onClick={() => setEditingField(null)}
                      >Cancel</button>
                      <button
                        className="px-3 py-1 bg-blue-600 text-white rounded"
                        onClick={handleSave}
                      >Save</button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-gray-700 mb-2 whitespace-pre-line min-h-[48px]">
                      {job.notes || <span className="text-gray-400">No notes</span>}
                    </p>
                    <button
                      className="px-3 py-1 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 flex items-center space-x-2"
                      onClick={() => setEditingField('notes')}
                    >
                      <Edit className="w-4 h-4" />
                      <span>{job.notes ? "Edit Note" : "Add Note"}</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Customer Notifications */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <h3 className="font-semibold text-gray-900 mb-4">Customer notifications</h3>
              
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-3">NOTIFICATION PREFERENCES</h4>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-700">Emails</span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={emailNotifications}
                          onChange={(e) => handleNotificationToggle('email', e.target.checked)}
                          disabled={loading}
                          className="sr-only peer" 
                        />
                        <div className={`w-9 h-5 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all ${emailNotifications ? 'bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white' : 'bg-gray-200'} ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}></div>
                      </label>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-700">Text messages</span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={smsNotifications}
                          onChange={(e) => handleNotificationToggle('sms', e.target.checked)}
                          disabled={loading}
                          className="sr-only peer" 
                        />
                        <div className={`w-9 h-5 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all ${smsNotifications ? 'bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white' : 'bg-gray-200'} ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}></div>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <CheckCircle className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium text-gray-700">Confirmation</h4>
                        <button 
                          onClick={() => {
                            setNotificationType('confirmation')
                            setNotificationEmail(job.customer_email || '')
                            setShowNotificationModal(true)
                          }}
                          className="text-blue-600 hover:text-blue-700 text-xs font-medium"
                        >
                          Resend
                        </button>
                      </div>
                      <p className="text-sm font-semibold text-gray-900">Appointment Confirmation</p>
                      <p className="text-xs text-gray-500">10 minutes ago • Email • Opened</p>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <Bell className="w-4 h-4 text-orange-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium text-gray-700">Reminder</h4>
                        <button 
                          onClick={() => {
                            setNotificationType('reminder')
                            setNotificationEmail(job.customer_email || '')
                            setShowNotificationModal(true)
                          }}
                          className="text-blue-600 hover:text-blue-700 text-xs font-medium"
                        >
                          Send Now
                        </button>
                      </div>
                      <p className="text-sm font-semibold text-gray-900">Appointment Reminder</p>
                      <p className="text-xs text-gray-500">Scheduled for 2 hours before appointment</p>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-medium text-gray-700">Custom Notifications</h4>
                      <p className="text-xs text-gray-500">Send custom messages to customer</p>
                    </div>
                    <button 
                      onClick={() => {
                        setCustomMessageEmail(job.customer_email || '')
                        setCustomMessage('')
                        setShowCustomMessageModal(true)
                      }}
                      className="px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                    >
                      Send Message
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Customer Feedback */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <h3 className="font-semibold text-gray-900 mb-4">Customer feedback</h3>
              
              <p className="text-sm text-gray-600 mb-2">
                An email will be sent to the customer asking them to rate the service after the job is marked complete.
              </p>
              <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                Learn more.
              </button>
            </div>

            {/* Conversion Summary */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <h3 className="font-semibold text-gray-900 mb-4">Conversion summary</h3>
              
              <div className="text-center py-4">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Target className="w-6 h-6 text-gray-400" />
                </div>
                <p className="text-gray-500 text-sm">No conversion data available</p>
              </div>
            </div>
          </div>
          </div>

          

       

          {/* Mobile Sidebar */}
          {showMobileSidebar && (
            <>
              <div 
                className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden" 
                onClick={() => setShowMobileSidebar(false)}
              />
              <div className="fixed top-0 right-0 h-full w-80 bg-white shadow-xl transform transition-transform duration-300 ease-in-out z-50 lg:hidden overflow-y-auto">
                <div className="p-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900">Job Details</h2>
                    <button
                      onClick={() => setShowMobileSidebar(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>
                </div>
                <div className="p-4 space-y-6">
                  {/* Customer Card */}
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                    <h3 className="font-semibold text-gray-900 mb-4">Customer</h3>
                    
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center">
                        <span className="text-white font-semibold text-sm">{getCustomerInitials()}</span>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">
                          {job.customer_first_name} {job.customer_last_name}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center space-x-2 text-sm">
                        <Phone className="w-4 h-4 text-gray-400" />
                        <a href={`tel:${job.customer_phone}`} className="text-blue-600 hover:text-blue-700">
                          {formatPhoneNumber(job.customer_phone)}
                        </a>
                      </div>
                      <div className="flex items-center space-x-2 text-sm">
                        <Mail className="w-4 h-4 text-gray-400" />
                        <a href={`mailto:${job.customer_email}`} className="text-blue-600 hover:text-blue-700 truncate">
                          {job.customer_email}
                        </a>
                      </div>
                    </div>
                  </div>

                  {/* Job Requirements Section */}
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                    <h3 className="font-semibold text-gray-900 mb-4">Job Requirements</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Workers needed</span>
                        <span className="font-medium">{job.workers_needed || 1} service provider</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Skills needed</span>
                        <span className="font-medium text-right max-w-xs">
                          {job.skills && job.skills.length ? job.skills.join(', ') : 'No skill tags required'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Intake Questions & Answers */}
                  <IntakeAnswersDisplay intakeAnswers={job.intake_answers || []} />

                  {/* Notes & Files */}
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                    <h3 className="font-semibold text-gray-900 mb-4">Notes & Files</h3>
                    <div className="py-4">
                      <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-700 mb-2 whitespace-pre-line min-h-[48px]">
                        {job.notes || <span className="text-gray-400">No notes</span>}
                      </p>
                      <button
                        className="px-3 py-1 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 flex items-center space-x-2"
                        onClick={() => setEditingField('notes')}
                      >
                        <Edit className="w-4 h-4" />
                        <span>{job.notes ? "Edit Note" : "Add Note"}</span>
                      </button>
                    </div>
                  </div>

                  {/* Customer Notifications */}
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                    <h3 className="font-semibold text-gray-900 mb-4">Customer notifications</h3>
                    
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-3">NOTIFICATION PREFERENCES</h4>
                        
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-700">Emails</span>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input 
                                type="checkbox" 
                                checked={emailNotifications}
                                onChange={(e) => handleNotificationToggle('email', e.target.checked)}
                                disabled={loading}
                                className="sr-only peer" 
                              />
                              <div className={`w-9 h-5 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all ${emailNotifications ? 'bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white' : 'bg-gray-200'} ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}></div>
                            </label>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-700">Text messages</span>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input 
                                type="checkbox" 
                                checked={smsNotifications}
                                onChange={(e) => handleNotificationToggle('sms', e.target.checked)}
                                disabled={loading}
                                className="sr-only peer" 
                              />
                              <div className={`w-9 h-5 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all ${smsNotifications ? 'bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white' : 'bg-gray-200'} ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}></div>
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Modals */}
        {/* Reschedule Modal */}
        {showRescheduleModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Reschedule Job</h3>
                  <button
                    onClick={() => setShowRescheduleModal(false)}
                    className="text-gray-400 hover:text-gray-600 p-1"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                    <input
                      type="date"
                      value={formData.scheduledDate}
                      onChange={(e) => setFormData(prev => ({ ...prev, scheduledDate: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Time</label>
                    <input
                      type="time"
                      value={formData.scheduledTime}
                      onChange={(e) => setFormData(prev => ({ ...prev, scheduledTime: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 mt-6">
                  <button
                    onClick={() => setShowRescheduleModal(false)}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800 order-2 sm:order-1"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleReschedule}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 order-1 sm:order-2"
                  >
                    Reschedule
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Cancel Modal */}
        {showCancelModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Cancel Job</h3>
                  <button
                    onClick={() => setShowCancelModal(false)}
                    className="text-gray-400 hover:text-gray-600 p-1"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <p className="text-gray-600 mb-6">
                  Are you sure you want to cancel this job? This action cannot be undone.
                </p>
                
                <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3">
                  <button
                    onClick={() => setShowCancelModal(false)}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800 order-2 sm:order-1"
                  >
                    Keep Job
                  </button>
                  <button
                    onClick={() => {
                      handleStatusChange('cancelled')
                      setShowCancelModal(false)
                    }}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 order-1 sm:order-2"
                  >
                    Cancel Job
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edit Service Modal */}
        {showEditServiceModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
              <div className="p-6 flex-1 overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-bold text-gray-900">Edit Job</h3>
                  <div className="flex space-x-3">
                  <button
                    onClick={() => {
                      setShowEditServiceModal(false);
                        setOriginalJobData(null);
                      if (originalJobData) {
                        setJob(prev => ({
                          ...prev,
                          service_modifiers: originalJobData.service_modifiers
                        }));
                      }
                    }}
                      className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg text-sm font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveService}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                    >
                      Save Job
                  </button>
                </div>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Services Section */}
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">Services</h4>
                    
                    {/* Search and Add Options */}
                    <div className="space-y-3 mb-6">
                      <div className="relative">
                    <input
                      type="text"
                          placeholder="Search services..."
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                        <Search className="absolute right-3 top-2.5 w-4 h-4 text-gray-400" />
                  </div>
                      <div className="flex space-x-2">
                        <button className="px-3 py-2 text-blue-600 hover:text-blue-700 text-sm font-medium border border-blue-200 rounded-lg">
                          Add Custom Service or Item
                        </button>
                        <button className="px-3 py-2 text-gray-600 hover:text-gray-700 text-sm font-medium border border-gray-300 rounded-lg">
                          Browse Services
                        </button>
                    </div>
                  </div>
                  
                    {/* Service List */}
                    <div className="border border-gray-200 rounded-lg">
                      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                        <div className="grid grid-cols-2 gap-4 text-sm font-medium text-gray-600">
                          <span>SERVICE</span>
                          <span>PRICE</span>
                        </div>
                      </div>
                      <div className="p-4">
                        <div className="flex items-center justify-between py-3 border-b border-gray-100">
                  <div>
                            <p className="font-medium text-gray-900">{job.service_name}</p>
                            <button className="text-blue-600 hover:text-blue-700 text-sm">Edit</button>
                            <button className="text-gray-600 hover:text-gray-700 text-sm ml-4">Show details &gt;</button>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium text-gray-900">${(parseFloat(job.service_price) || 0).toFixed(2)}</span>
                            <button className="p-1 text-gray-400 hover:text-gray-600">
                              <Edit className="w-4 h-4" />
                            </button>
                            <button className="p-1 text-gray-400 hover:text-red-600">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        
                        {/* Customize Price */}
                        <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                          <label className="block text-sm font-medium text-gray-700 mb-2">Customize price</label>
                          <div className="flex items-center space-x-2">
                            <span className="text-sm text-gray-500">$</span>
                    <input
                      type="number"
                          step="0.01"
                          value={formData.service_price === 0 ? "" : formData.service_price}
                              onFocus={e => {
                                if (e.target.value === "0" || e.target.value === "0.00") {
                                  e.target.value = "";
                                }
                              }}
                          onChange={e => {
                            const newPrice = e.target.value === "" ? 0 : parseFloat(e.target.value) || 0;
                                setFormData(prev => ({
                                ...prev, 
                                service_price: newPrice
                                }));
                              }}
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="0.00"
                        />
                            <button className="text-sm text-red-600 hover:text-red-800">Reset</button>
                      </div>
                          <div className="flex space-x-2 mt-2">
                            <button 
                              onClick={() => setShowEditServiceModal(false)}
                              className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
                            >
                              Cancel
                            </button>
                            <button 
                              onClick={handleSaveService}
                              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                            >
                              Save
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Cost Breakdown */}
                    <div className="mt-6 space-y-3">
                      <div className="flex justify-between items-center py-2 border-b border-gray-200">
                        <span className="text-sm text-gray-600">Subtotal</span>
                        <span className="text-sm font-medium text-gray-900">${calculateTotalPrice().toFixed(2)}</span>
                      </div>
                      <button 
                        onClick={() => setShowDiscountModal(true)}
                        className="text-sm text-blue-600 hover:text-blue-700"
                      >
                        Add Discount
                      </button>
                      <div className="flex justify-between items-center py-2">
                        <span className="text-sm text-gray-600">Taxes</span>
                        <span className="text-sm font-medium text-gray-900">$0.00</span>
                      </div>
                      <button 
                        onClick={() => setShowTipModal(true)}
                        className="text-sm text-blue-600 hover:text-blue-700"
                      >
                        Add tip
                      </button>
                      <div className="flex justify-between items-center py-2 border-t border-gray-200">
                        <span className="text-sm font-medium text-gray-900">Total</span>
                        <span className="text-sm font-medium text-gray-900">${calculateTotalPrice().toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Summary Section */}
                      <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">Summary</h4>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center py-2 border-b border-gray-200">
                        <span className="text-sm text-gray-600">Previous Total</span>
                        <span className="text-sm font-medium text-gray-900">${calculateTotalPrice().toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-gray-200">
                        <span className="text-sm text-gray-600">Updated Total</span>
                        <span className="text-sm font-medium text-gray-900">${calculateTotalPrice().toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center py-2">
                        <span className="text-sm text-gray-600">Estimated duration</span>
                        <span className="text-sm font-medium text-gray-900">{formatDuration(job.duration || 0)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edit Address Modal */}
        {showEditAddressModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Edit Address</h3>
                  <button
                    onClick={() => setShowEditAddressModal(false)}
                    className="text-gray-400 hover:text-gray-600 p-1"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                {/* Copy Customer Address Button */}
                {job && (job.customer_address || job.customer_city || job.customer_state || job.customer_zip_code) && (
                  <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg mb-4">
                    <div className="flex items-center">
                      <MapPin className="w-4 h-4 text-blue-600 mr-2" />
                      <div>
                        <p className="text-sm font-medium text-blue-900">Customer Address Available</p>
                        <p className="text-xs text-blue-700">
                          {job.customer_address || `${job.customer_city}, ${job.customer_state} ${job.customer_zip_code}`}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={copyCustomerAddressToService}
                      className="px-3 py-1 text-xs font-medium text-blue-600 bg-white border border-blue-300 rounded-md hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      Copy Address
                    </button>
                  </div>
                )}
                
                <div className="space-y-4">
                  <div className="relative">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Street Address
                      {addressAutoPopulated && formData.serviceAddress.street && (
                        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                          Auto-filled
                        </span>
                      )}
                    </label>
                    <AddressAutocomplete
                      value={formData.serviceAddress.street}
                      onChange={(value) => {
                        // Only update street if user is typing manually (not from address selection)
                        setFormData(prev => ({
                          ...prev,
                          serviceAddress: {
                            ...prev.serviceAddress,
                            street: value
                          }
                        }));
                      }}
                      onAddressSelect={(addressData) => {
                        console.log('Address selected in job details:', addressData);
                        setFormData(prev => {
                          const updatedFormData = {
                            ...prev,
                            serviceAddress: {
                              street: addressData.formattedAddress || '',
                              city: addressData.components.city || '',
                              state: addressData.components.state || '',
                              zipCode: addressData.components.zipCode || ''
                            }
                          };
                          console.log('🔄 Job Details: Updated form data after address selection:', updatedFormData);
                          return updatedFormData;
                        });
                        setAddressAutoPopulated(true);
                      }}
                      placeholder={job?.service_address_street || "Start typing address..."}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      City
                      {addressAutoPopulated && formData.serviceAddress.city && (
                        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                          Auto-filled
                        </span>
                      )}
                    </label>
                    <input
                      type="text"
                      value={formData.serviceAddress.city}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        serviceAddress: {
                          ...prev.serviceAddress,
                          city: e.target.value
                        }
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder={job?.service_address_city || "Enter city"}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        State
                        {addressAutoPopulated && formData.serviceAddress.state && (
                          <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                            Auto-filled
                          </span>
                        )}
                      </label>
                      <input
                        type="text"
                        value={formData.serviceAddress.state}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          serviceAddress: {
                            ...prev.serviceAddress,
                            state: e.target.value
                          }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder={job?.service_address_state || "Enter state"}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        ZIP Code
                        {addressAutoPopulated && formData.serviceAddress.zipCode && (
                          <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                            Auto-filled
                          </span>
                        )}
                      </label>
                      <input
                        type="text"
                        value={formData.serviceAddress.zipCode}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          serviceAddress: {
                            ...prev.serviceAddress,
                            zipCode: e.target.value
                          }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder={job?.service_address_zip || "Enter ZIP code"}
                      />
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 mt-6">
                  <button
                    onClick={() => setShowEditAddressModal(false)}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800 order-2 sm:order-1"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      handleSave()
                      setShowEditAddressModal(false)
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 order-1 sm:order-2"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Send Invoice Modal */}
        {showSendInvoiceModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-semibold text-gray-900">Email Invoice</h3>
                  <button
                    onClick={() => {
                      setShowSendInvoiceModal(false);
                      setManualEmail('');
                    }}
                    className="text-gray-400 hover:text-gray-600 p-1"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-6">
                  {/* Payment Link Option */}
                  <div className={`flex items-center justify-between p-4 rounded-lg ${stripeConnected ? 'bg-gray-50' : 'bg-red-50 border border-red-200'}`}>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">Include a link to pay this invoice online</h4>
                      <p className="text-sm text-gray-600">
                        {stripeConnected 
                          ? 'Allow customer to pay directly via Stripe' 
                          : 'Stripe is not connected. Please connect Stripe in Settings to enable online payments.'
                        }
                      </p>
                      {!stripeConnected && (
                        <button
                          onClick={async () => {
                            try {
                              console.log('🔄 Refreshing Stripe status...')
                              const response = await stripeAPI.testConnection()
                              console.log('🔄 Stripe refresh response:', response)
                              setStripeConnected(response.connected)
                              if (response.connected) {
                                setIncludePaymentLink(true)
                              }
                            } catch (error) {
                              console.error('Error refreshing Stripe status:', error)
                            }
                          }}
                          className="mt-2 text-sm text-blue-600 hover:text-blue-700 underline"
                        >
                          Refresh Stripe Status
                        </button>
                      )}
                    </div>
                    <label className={`relative inline-flex items-center ${stripeConnected ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`}>
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={includePaymentLink}
                        disabled={!stripeConnected}
                        onChange={(e) => setIncludePaymentLink(e.target.checked)}
                      />
                      <div className={`w-11 h-6 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 ${stripeConnected ? 'bg-gray-200' : 'bg-gray-300'}`}></div>
                    </label>
                  </div>

                  {/* Email Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Send to</label>
                    <input
                      type="email"
                      value={manualEmail || job.customer_email || ''}
                      onChange={(e) => setManualEmail(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter email address"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
                    <input
                      type="text"
                        defaultValue={`You have a new invoice from ${user?.business_name || 'Your Business'}`}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  </div>

                  {/* Invoice Summary */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-4">Invoice Summary</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">AMOUNT DUE</span>
                        <span className="font-semibold">${calculateTotalPrice().toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">DUE BY</span>
                        <span className="text-sm">{new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">SERVICE DATE</span>
                        <span className="text-sm">{new Date(job.scheduled_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">SERVICE ADDRESS</span>
                        <span className="text-sm">{job.customer_address || 'Address not provided'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Service Details */}
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-3">Service Details</h4>
                    <div className="space-y-2">
                      {job.service_names && job.service_names.length > 0 ? (
                        job.service_names.map((service, index) => (
                          <div key={index} className="flex justify-between text-sm">
                            <span>{service}</span>
                            <span>${job.service_prices && job.service_prices[index] ? job.service_prices[index].toFixed(2) : '0.00'}</span>
                          </div>
                        ))
                      ) : (
                        <div className="flex justify-between text-sm">
                          <span>{job.service_name || 'Service'}</span>
                          <span>${calculateTotalPrice().toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Financial Summary */}
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-3">Financial Summary</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Subtotal</span>
                        <span>${calculateTotalPrice().toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Total</span>
                        <span>${calculateTotalPrice().toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Total Paid</span>
                        <span>${job.total_paid_amount ? job.total_paid_amount.toFixed(2) : '0.00'}</span>
                      </div>
                      <div className="flex justify-between font-semibold border-t pt-2">
                        <span>Total Due</span>
                        <span className={job.invoice_status === 'paid' ? 'text-green-600' : ''}>
                          ${job.invoice_status === 'paid' ? '0.00' : (job.total_invoice_amount ? job.total_invoice_amount.toFixed(2) : calculateTotalPrice().toFixed(2))}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Closing Message */}
                  <div className="text-center text-sm text-gray-600">
                    We appreciate your business.
                  </div>

                  {/* Pay Invoice Button (if payment link is enabled) */}
                  {includePaymentLink && (
                    <div className="text-center">
                      <button className="px-6 py-3 bg-yellow-500 text-white font-semibold rounded-lg hover:bg-yellow-600 transition-colors">
                        Pay Invoice
                      </button>
                </div>
                  )}

                  {/* Test Email Button */}
                  <div className="text-center">
                    <button 
                      onClick={handleTestEmail}
                      className="px-4 py-2 bg-green-500 text-white text-sm rounded-lg hover:bg-green-600 transition-colors"
                    >
                      Test Email
                    </button>
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 mt-6 pt-4 border-t">
                  <button
                    onClick={() => {
                      setShowSendInvoiceModal(false);
                      setManualEmail('');
                    }}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800 order-2 sm:order-1"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSendInvoice}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 order-1 sm:order-2"
                  >
                    Send
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Email Required Modal */}
        {showEmailRequiredModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Email Required</h3>
                <button
                  onClick={() => {
                    setShowEmailRequiredModal(false);
                    setPendingAction(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-4">
                <p className="text-gray-600">
                  This customer doesn't have an email address. Please provide an email to {pendingAction === 'send' ? 'send the invoice' : 'resend the notification'}.
                </p>
                
                <div>
                  <label htmlFor="customer-email" className="block text-sm font-medium text-gray-700 mb-2">
                    Customer Email
                  </label>
                  <input
                    type="email"
                    id="customer-email"
                    value={manualEmail}
                    onChange={(e) => setManualEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter customer email address"
                    required
                  />
                </div>
                
                <div className="flex space-x-3 pt-4">
                  <button
                    onClick={() => {
                      setShowEmailRequiredModal(false);
                      setPendingAction(null);
                      setManualEmail('');
                    }}
                    className="flex-1 px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (manualEmail.trim()) {
                        if (pendingAction === 'send') {
                          setShowSendInvoiceModal(true);
                        } else if (pendingAction === 'resend') {
                          setSuccessMessage('Confirmation sent to customer!');
                          setTimeout(() => setSuccessMessage(""), 3000);
                        }
                        setShowEmailRequiredModal(false);
                        setPendingAction(null);
                      } else {
                        setError('Please enter a valid email address');
                      }
                    }}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    {pendingAction === 'send' ? 'Send Invoice' : 'Resend'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edit Customer Modal */}
        {showEditCustomerModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Edit Customer</h3>
                <button
                  onClick={() => setShowEditCustomerModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="edit-first-name" className="block text-sm font-medium text-gray-700 mb-2">
                    First Name
                  </label>
                  <input
                    type="text"
                    id="edit-first-name"
                    value={editCustomerData.firstName}
                    onChange={(e) => setEditCustomerData(prev => ({ ...prev, firstName: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label htmlFor="edit-last-name" className="block text-sm font-medium text-gray-700 mb-2">
                    Last Name
                  </label>
                  <input
                    type="text"
                    id="edit-last-name"
                    value={editCustomerData.lastName}
                    onChange={(e) => setEditCustomerData(prev => ({ ...prev, lastName: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label htmlFor="edit-email" className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    id="edit-email"
                    value={editCustomerData.email}
                    onChange={(e) => setEditCustomerData(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter email address"
                  />
                </div>
                
                <div>
                  <label htmlFor="edit-phone" className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    id="edit-phone"
                    value={editCustomerData.phone}
                    onChange={(e) => setEditCustomerData(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter phone number"
                  />
                </div>
                
                <div className="flex space-x-3 pt-4">
                  <button
                    onClick={() => setShowEditCustomerModal(false)}
                    className="flex-1 px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      // Frontend validation
                      if (editCustomerData.firstName && editCustomerData.firstName.trim() && (editCustomerData.firstName.trim().length < 2 || editCustomerData.firstName.trim().length > 50)) {
                        setError('First name must be between 2 and 50 characters');
                        return;
                      }
                      
                      if (editCustomerData.lastName && editCustomerData.lastName.trim() && (editCustomerData.lastName.trim().length < 2 || editCustomerData.lastName.trim().length > 50)) {
                        setError('Last name must be between 2 and 50 characters');
                        return;
                      }
                      
                      if (editCustomerData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editCustomerData.email)) {
                        setError('Please enter a valid email address');
                        return;
                      }

                      try {
                        setLoading(true);
                        setError(''); // Clear any previous errors
                        
                        const response = await api.put(`/customers/${job.customer_id}`, {
                          firstName: editCustomerData.firstName,
                          lastName: editCustomerData.lastName,
                          email: editCustomerData.email,
                          phone: editCustomerData.phone
                        });

                        console.log('✅ Customer updated successfully:', response.data);
                        
                        // Update the job data with new customer info
                        setJob(prev => ({
                          ...prev,
                          customer_first_name: editCustomerData.firstName,
                          customer_last_name: editCustomerData.lastName,
                          customer_email: editCustomerData.email,
                          customer_phone: editCustomerData.phone
                        }));

                        setSuccessMessage('Customer updated successfully!');
                        setTimeout(() => setSuccessMessage(""), 3000);
                        setShowEditCustomerModal(false);
                      } catch (error) {
                        console.error('❌ Error updating customer:', error);
                        setError(`Failed to update customer: ${error.response?.data?.error || error.message}`);
                      } finally {
                        setLoading(false);
                      }
                    }}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    disabled={loading}
                  >
                    {loading ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Notification Modal */}
        {showNotificationModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-semibold text-gray-900">
                    {notificationType === 'confirmation' ? 'Appointment Confirmation' : 'Appointment Reminder'}
                  </h3>
                  <button
                    onClick={() => {
                      setShowNotificationModal(false);
                      setNotificationType(null);
                      setNotificationEmail('');
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-6">
                  {/* Email Address */}
                  <div>
                    <label htmlFor="notification-email" className="block text-sm font-medium text-gray-700 mb-2">
                      Send to
                    </label>
                    <input
                      type="email"
                      id="notification-email"
                      value={notificationEmail}
                      onChange={(e) => setNotificationEmail(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter email address"
                      required
                    />
                  </div>

                  {/* Email Content Preview */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Content
                    </label>
                    <div className="border border-gray-300 rounded-lg p-4 bg-gray-50 max-h-60 overflow-y-auto">
                      {notificationType === 'confirmation' ? (
                        <div className="space-y-3">
                          <div className="font-semibold text-gray-900">
                            Hi {job?.customer_first_name || 'Customer'},
                          </div>
                          <div className="text-gray-700">
                            Your appointment has been confirmed for <strong>{new Date(job?.scheduled_date).toLocaleDateString('en-US', { 
                              weekday: 'long', 
                              month: 'long', 
                              day: 'numeric', 
                              year: 'numeric' 
                            })} at {new Date(job?.scheduled_date).toLocaleTimeString('en-US', { 
                              hour: 'numeric', 
                              minute: '2-digit',
                              hour12: true 
                            })}</strong>.
                          </div>
                          <div className="text-gray-700">
                            <strong>Service:</strong> {job?.service_name || 'Service'}
                          </div>
                          <div className="text-gray-700">
                            <strong>Location:</strong> {job?.service_address_street || 'Service Address'}, {job?.service_address_city || 'City'}, {job?.service_address_state || 'State'} {job?.service_address_zip || 'ZIP'}
                          </div>
                          <div className="text-gray-700">
                            We look forward to serving you!
                          </div>
                          <div className="text-gray-700">
                            Best regards,<br />
                            Your Service Team
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="font-semibold text-gray-900">
                            Hi {job?.customer_first_name || 'Customer'},
                          </div>
                          <div className="text-gray-700">
                            This is a friendly reminder that you have an appointment scheduled for <strong>{new Date(job?.scheduled_date).toLocaleDateString('en-US', { 
                              weekday: 'long', 
                              month: 'long', 
                              day: 'numeric', 
                              year: 'numeric' 
                            })} at {new Date(job?.scheduled_date).toLocaleTimeString('en-US', { 
                              hour: 'numeric', 
                              minute: '2-digit',
                              hour12: true 
                            })}</strong>.
                          </div>
                          <div className="text-gray-700">
                            <strong>Service:</strong> {job?.service_name || 'Service'}
                          </div>
                          <div className="text-gray-700">
                            <strong>Location:</strong> {job?.service_address_street || 'Service Address'}, {job?.service_address_city || 'City'}, {job?.service_address_state || 'State'} {job?.service_address_zip || 'ZIP'}
                          </div>
                          <div className="text-gray-700">
                            Please arrive on time. If you need to reschedule, please contact us as soon as possible.
                          </div>
                          <div className="text-gray-700">
                            Best regards,<br />
                            Your Service Team
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 pt-4 border-t">
                    <button
                      onClick={() => {
                        setShowNotificationModal(false);
                        setNotificationType(null);
                        setNotificationEmail('');
                      }}
                      className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 order-2 sm:order-1"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={async () => {
                        if (notificationEmail.trim()) {
                          try {
                            setLoading(true);
                            
                            // Construct service address
                            const serviceAddress = (() => {
                              if (job?.service_address_street) {
                                const addressParts = [
                                  job.service_address_street,
                                  job.service_address_city,
                                  job.service_address_state,
                                  job.service_address_zip,
                                  job.service_address_country
                                ].filter(Boolean);
                                return addressParts.join(', ');
                              }
                              return 'Service Address';
                            })();

                            const response = await api.post('/send-appointment-notification', {
                              notificationType,
                              customerEmail: notificationEmail,
                              jobId: job.id,
                              customerName: `${job.customer_first_name || ''} ${job.customer_last_name || ''}`.trim() || 'Customer',
                              serviceName: job.service_name || 'Service',
                              scheduledDate: job.scheduled_date,
                              serviceAddress: serviceAddress
                            });

                            console.log('📧 Notification sent successfully:', response.data);
                            setSuccessMessage(`${notificationType === 'confirmation' ? 'Confirmation' : 'Reminder'} sent to ${notificationEmail}!`);
                            setTimeout(() => setSuccessMessage(""), 3000);
                            setShowNotificationModal(false);
                            setNotificationType(null);
                            setNotificationEmail('');
                          } catch (error) {
                            console.error('❌ Error sending notification:', error);
                            setError(`Failed to send ${notificationType === 'confirmation' ? 'confirmation' : 'reminder'}: ${error.response?.data?.error || error.message}`);
                          } finally {
                            setLoading(false);
                          }
                        } else {
                          setError('Please enter a valid email address');
                        }
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 order-1 sm:order-2"
                      disabled={loading}
                    >
                      {loading ? 'Sending...' : (notificationType === 'confirmation' ? 'Resend Confirmation' : 'Send Reminder')}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Custom Message Modal */}
        {showCustomMessageModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-semibold text-gray-900">Send Custom Message</h3>
                  <button
                    onClick={() => {
                      setShowCustomMessageModal(false);
                      setCustomMessage('');
                      setCustomMessageEmail('');
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-6">
                  {/* Email Address */}
                  <div>
                    <label htmlFor="custom-message-email" className="block text-sm font-medium text-gray-700 mb-2">
                      Send to
                    </label>
                    <input
                      type="email"
                      id="custom-message-email"
                      value={customMessageEmail}
                      onChange={(e) => setCustomMessageEmail(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter email address"
                      required
                    />
                  </div>

                  {/* Custom Message */}
                  <div>
                    <label htmlFor="custom-message-text" className="block text-sm font-medium text-gray-700 mb-2">
                      Message
                    </label>
                    <textarea
                      id="custom-message-text"
                      value={customMessage}
                      onChange={(e) => setCustomMessage(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      rows={6}
                      placeholder="Enter your custom message here..."
                      required
                    />
                  </div>

                  {/* Message Preview */}
                  {customMessage && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Message Preview
                      </label>
                      <div className="border border-gray-300 rounded-lg p-4 bg-gray-50 max-h-40 overflow-y-auto">
                        <div className="space-y-2">
                          <div className="font-semibold text-gray-900">
                            Hi {job?.customer_first_name || 'Customer'},
                          </div>
                          <div className="text-gray-700 whitespace-pre-wrap">
                            {customMessage}
                          </div>
                          <div className="text-gray-700">
                            Best regards,<br />
                            Your Service Team
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 pt-4 border-t">
                    <button
                      onClick={() => {
                        setShowCustomMessageModal(false);
                        setCustomMessage('');
                        setCustomMessageEmail('');
                      }}
                      className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 order-2 sm:order-1"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={async () => {
                        if (customMessageEmail.trim() && customMessage.trim()) {
                          try {
                            setLoading(true);
                            
                            const response = await api.post('/send-custom-message', {
                              customerEmail: customMessageEmail,
                              jobId: job.id,
                              customerName: `${job.customer_first_name || ''} ${job.customer_last_name || ''}`.trim() || 'Customer',
                              message: customMessage
                            });

                            console.log('📧 Custom message sent successfully:', response.data);
                            setSuccessMessage(`Custom message sent to ${customMessageEmail}!`);
                            setTimeout(() => setSuccessMessage(""), 3000);
                            setShowCustomMessageModal(false);
                            setCustomMessage('');
                            setCustomMessageEmail('');
                          } catch (error) {
                            console.error('❌ Error sending custom message:', error);
                            setError(`Failed to send custom message: ${error.response?.data?.error || error.message}`);
                          } finally {
                            setLoading(false);
                          }
                        } else {
                          setError('Please enter both email address and message');
                        }
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 order-1 sm:order-2"
                      disabled={loading}
                    >
                      {loading ? 'Sending...' : 'Send Message'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Add Payment Modal */}
        {showAddPaymentModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Add Payment</h3>
                  <button
                    onClick={() => setShowAddPaymentModal(false)}
                    className="text-gray-400 hover:text-gray-600 p-1"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
                    <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                      <option value="cash">Cash</option>
                      <option value="check">Check</option>
                      <option value="credit_card">Credit Card</option>
                      <option value="bank_transfer">Bank Transfer</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Amount</label>
                    <input
                      type="number"
                      step="0.01"
                      defaultValue={parseFloat(job.total) || parseFloat(job.service_price) || 0}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter amount"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Payment Date</label>
                    <input
                      type="date"
                      defaultValue={new Date().toISOString().split('T')[0]}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                    <textarea
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Optional payment notes"
                    />
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 mt-6">
                  <button
                    onClick={() => setShowAddPaymentModal(false)}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800 order-2 sm:order-1"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      setSuccessMessage('Payment recorded successfully!')
                      setTimeout(() => setSuccessMessage(""), 3000)
                      setShowAddPaymentModal(false)
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 order-1 sm:order-2"
                  >
                    Record Payment
                  </button>
                </div>
              </div>
            </div>
          </div>
          )}

        {/* Discount Modal */}
        {showDiscountModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Add Discount</h3>
                  <button
                    onClick={() => setShowDiscountModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Discount Amount</label>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-500">$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.discount !== undefined ? formData.discount : ""}
                        onChange={e => {
                          const newDiscount = parseFloat(e.target.value) || 0;
                          setFormData(prev => ({
                            ...prev,
                            discount: newDiscount
                          }));
                        }}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                  
                  <div className="flex space-x-3 pt-4">
                    <button
                      onClick={() => setShowDiscountModal(false)}
                      className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        setSuccessMessage('Discount added successfully!')
                        setTimeout(() => setSuccessMessage(""), 3000)
                        setShowDiscountModal(false)
                      }}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Add Discount
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tip Modal */}
        {showTipModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Add Tip</h3>
                  <button
                    onClick={() => setShowTipModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Tip Amount</label>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-500">$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.tip || 0}
                        onChange={e => {
                          const newTip = parseFloat(e.target.value) || 0;
                          setFormData(prev => ({
                            ...prev,
                            tip: newTip
                          }));
                        }}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                  
                  <div className="flex space-x-3 pt-4">
                    <button
                      onClick={() => setShowTipModal(false)}
                      className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        setSuccessMessage('Tip added successfully!')
                        setTimeout(() => setSuccessMessage(""), 3000)
                        setShowTipModal(false)
                      }}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Add Tip
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        </div>
    )
  }

export default JobDetails 