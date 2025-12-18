import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Sidebar from '../components/sidebar'
import AddressValidation from '../components/address-validation'
import AddressAutocomplete from '../components/address-autocomplete'
import { 
  ChevronLeft, 
  Edit,
  Save,
  Trash2, 
  Phone, 
  Mail, 
  MapPin,
  Calendar,
  Settings,
  Users,
  Star,
  Clock,
  CheckCircle,
  XCircle,
  HelpCircle,
  Plus,
  X,
  Bell,
  MessageSquare,
  DollarSign,
  User,
  AlertCircle
} from 'lucide-react'
import { teamAPI, territoriesAPI, staffLocationsAPI } from '../services/api'
import UpdateAvailabilityModal from '../components/update-availability-modal'
import AddTeamMemberModal from '../components/add-team-member-modal'
import { getImageUrl } from '../utils/imageUtils'

const TeamMemberDetails = () => {
  const { memberId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  
  // State
  const [teamMember, setTeamMember] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editFormData, setEditFormData] = useState({})
  const [territories, setTerritories] = useState([])
  const [displayedTerritories, setDisplayedTerritories] = useState([])
  const [hasLoadedAvailability, setHasLoadedAvailability] = useState(false) // Track if availability has been loaded
  const [hasLoadedPermissions, setHasLoadedPermissions] = useState(false) // Track if permissions have been loaded
  const [workingHours, setWorkingHours] = useState({
    sunday: { available: false, hours: "" },
    monday: { available: true, hours: "9:00 AM - 6:00 PM" },
    tuesday: { available: true, hours: "9:00 AM - 6:00 PM" },
    wednesday: { available: true, hours: "9:00 AM - 6:00 PM" },
    thursday: { available: true, hours: "9:00 AM - 6:00 PM" },
    friday: { available: true, hours: "9:00 AM - 6:00 PM" },
    saturday: { available: false, hours: "" }
  })
  const [customAvailability, setCustomAvailability] = useState([])
  const [editingHours, setEditingHours] = useState(false)
  const [editingAvailability, setEditingAvailability] = useState(false)
  const [savingHours, setSavingHours] = useState(false)
  const [savingCustomAvailability, setSavingCustomAvailability] = useState(false)
  const [savingDay, setSavingDay] = useState(null) // Track which day is being saved
  const [showWeeklyHoursModal, setShowWeeklyHoursModal] = useState(false)
  const [showAvailabilityModal, setShowAvailabilityModal] = useState(false)
  const [selectedDates, setSelectedDates] = useState([])
  const [settings, setSettings] = useState({
    isServiceProvider: true,
    canEditAvailability: true,
    limitJobsPerDay: false,
    canAutoAssign: true,
    canClaimJobs: true,
    emailNotifications: true,
    smsNotifications: false
  })
  const [performanceData, setPerformanceData] = useState({
    jobsCompleted: 0,
    averageRating: 0,
    hoursWorked: 0,
    revenueGenerated: 0
  })
  const [recentJobs, setRecentJobs] = useState([])
  const [allTeamMembers, setAllTeamMembers] = useState([]) // For map display
  const [staffLocationsEnabled, setStaffLocationsEnabled] = useState(true) // Global setting for staff locations
  
  // Google Places Autocomplete
  const addressRef = useRef(null)
  const [addressSuggestions, setAddressSuggestions] = useState([])
  const [showAddressSuggestions, setShowAddressSuggestions] = useState(false)
  const [addressLoading, setAddressLoading] = useState(false)
  

  // Territories modal
  const [showAddTerritoryModal, setShowAddTerritoryModal] = useState(false)
  const [availableTerritories, setAvailableTerritories] = useState([])
  const [territoryLoading, setTerritoryLoading] = useState(false)

  // Delete modal
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState("")
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [resendingInvite, setResendingInvite] = useState(false)
  
  // Notifications
  const [notification, setNotification] = useState(null)

  // Load team member data
  useEffect(() => {
    if (memberId) {
      fetchTeamMemberDetails()
      fetchAvailableTerritories()
      fetchAllTeamMembers() // Fetch all members for map
      fetchStaffLocationsSetting() // Fetch global setting
    } else if (user?.teamMemberId) {
      // If no memberId in URL but user is a team member, navigate to their own profile
      navigate(`/team/${user.teamMemberId}`, { replace: true })
    }
  }, [memberId, user?.teamMemberId])

  // Fetch global staff locations setting
  const fetchStaffLocationsSetting = async () => {
    try {
      const response = await staffLocationsAPI.getStaffLocationsSetting()
      setStaffLocationsEnabled(response?.staff_locations_enabled !== false) // Default to true
    } catch (error) {
      console.error('Error fetching staff locations setting:', error)
      // Default to enabled if error
      setStaffLocationsEnabled(true)
    }
  }

  // Fetch all team members for map display
  const fetchAllTeamMembers = async () => {
    try {
      if (user?.id) {
        const response = await teamAPI.getAll(user.id, { status: 'active' })
        const members = response.teamMembers || response || []
        setAllTeamMembers(members)
      }
    } catch (error) {
      console.error('Error fetching all team members:', error)
    }
  }



  const fetchTeamMemberDetails = async () => {
    try {
      setLoading(true)
      setError('')
      
      console.log('Fetching team member with ID:', memberId)
      console.log('Current user:', user)
      console.log('User teamMemberId:', user?.teamMemberId)
      const response = await teamAPI.getById(memberId)
      console.log('Team member response:', response)
      console.log('Team member data:', JSON.stringify(response, null, 2))
      console.log('Team member availability from API:', response.teamMember?.availability)
      console.log('Team member permissions from API:', response.teamMember?.permissions)
      console.log('Team member territories from API:', response.teamMember?.territories)
      
      if (response && response.teamMember) {
        const teamMemberData = response.teamMember
        setTeamMember(teamMemberData)
        

        // Parse territories
        if (teamMemberData.territories) {
          try {
            console.log('Raw territories from team member:', teamMemberData.territories)
            let parsedTerritories
            if (typeof teamMemberData.territories === 'string') {
              console.log('Territories is string, parsing as JSON...')
              try {
                parsedTerritories = JSON.parse(teamMemberData.territories)
                console.log('First parse successful:', parsedTerritories)
              } catch (e) {
                console.log('First parse failed, trying double parse')
                try {
                  parsedTerritories = JSON.parse(JSON.parse(teamMemberData.territories))
                  console.log('Double parse successful:', parsedTerritories)
                } catch (e2) {
                  console.log('Double parse also failed, extracting numbers from string...')
                  // If JSON parsing fails, try to extract numbers from the string
                  const matches = teamMemberData.territories.match(/\d+/g)
                  parsedTerritories = matches ? matches.map(Number) : []
                  console.log('Extracted numbers from string:', parsedTerritories)
                }
              }
            } else {
              parsedTerritories = teamMemberData.territories
            }
            console.log('Final parsed territories:', parsedTerritories)
            console.log('Type of parsedTerritories:', typeof parsedTerritories)
            console.log('Is Array?', Array.isArray(parsedTerritories))
            console.log('Length:', parsedTerritories ? parsedTerritories.length : 'undefined')
            
            // Robust parsing to ensure we always have an array of territory IDs
            let finalTerritories = []
            
            // If parsedTerritories is a string, try to parse it again
            if (typeof parsedTerritories === 'string') {
              console.log('parsedTerritories is string, attempting to re-parse...')
              try {
                const reParsed = JSON.parse(parsedTerritories)
                console.log('Re-parsed result:', reParsed)
                if (Array.isArray(reParsed)) {
                  finalTerritories = reParsed
                }
              } catch (e) {
                console.log('Re-parsing failed:', e)
              }
            } else if (Array.isArray(parsedTerritories)) {
              console.log('parsedTerritories is already an array')
              finalTerritories = parsedTerritories
            } else if (parsedTerritories && typeof parsedTerritories === 'object' && parsedTerritories.length > 0) {
              console.log('parsedTerritories is array-like object')
              finalTerritories = parsedTerritories
            }
            
            // Filter to ensure we only have numeric IDs
            finalTerritories = finalTerritories.filter(id => typeof id === 'number' || (typeof id === 'string' && !isNaN(parseInt(id))))
            console.log('Final filtered territories:', finalTerritories)
            
            setTerritories(finalTerritories)
          } catch (e) {
            console.error('Error parsing territories:', e)
            setTerritories([])
          }
        } else {
          console.log('No territories found in team member data')
          setTerritories([])
        }

        // Parse availability - use actual data from database, only use defaults if truly no data exists
        if (teamMemberData.availability !== null && teamMemberData.availability !== undefined) {
          try {
            let parsedAvailability;
            
            if (typeof teamMemberData.availability === 'string') {
              // If it's a string, try to parse it
              try {
                parsedAvailability = JSON.parse(teamMemberData.availability);
              } catch (parseError) {
                console.error('Error parsing availability string:', parseError);
                parsedAvailability = null;
              }
            } else if (typeof teamMemberData.availability === 'object' && teamMemberData.availability !== null) {
              // If it's already an object, use it directly
              parsedAvailability = teamMemberData.availability;
            } else {
              parsedAvailability = null;
            }
            
            if (parsedAvailability && typeof parsedAvailability === 'object') {
              if (parsedAvailability.workingHours) {
                setWorkingHours(parsedAvailability.workingHours)
              }
              if (parsedAvailability.customAvailability !== undefined) {
                setCustomAvailability(parsedAvailability.customAvailability || [])
              }
              setHasLoadedAvailability(true) // Mark as loaded
            }
          } catch (e) {
            console.error('Error processing availability:', e)
            // Don't reset to defaults on error - data might exist but be malformed
            setHasLoadedAvailability(true) // Mark as attempted to load
          }
        } else {
          // No availability in database (null or undefined)
          // Only set defaults if this is the first time loading (hasn't been loaded before)
          if (!hasLoadedAvailability) {
            // Only set defaults on first load when no data exists
            console.log('No availability in database, setting defaults for first load')
          setWorkingHours({
            sunday: { available: false, hours: "" },
            monday: { available: true, hours: "9:00 AM - 6:00 PM" },
            tuesday: { available: true, hours: "9:00 AM - 6:00 PM" },
            wednesday: { available: true, hours: "9:00 AM - 6:00 PM" },
            thursday: { available: true, hours: "9:00 AM - 6:00 PM" },
            friday: { available: true, hours: "9:00 AM - 6:00 PM" },
            saturday: { available: false, hours: "" }
          })
            setCustomAvailability([])
          } else {
            // Already loaded before, availability is null - keep current state (don't reset)
            console.log('No availability in database, but already loaded - keeping current state')
          }
          setHasLoadedAvailability(true) // Mark as loaded (even though it's null)
        }

        // Parse permissions/settings - use actual data from database
        if (teamMemberData.permissions !== null && teamMemberData.permissions !== undefined) {
          try {
            let parsedPermissions;
            
            if (typeof teamMemberData.permissions === 'string') {
              // If it's a string, try to parse it
              try {
                parsedPermissions = JSON.parse(teamMemberData.permissions);
              } catch (parseError) {
                console.error('Error parsing permissions string:', parseError);
                parsedPermissions = null;
              }
            } else if (typeof teamMemberData.permissions === 'object' && teamMemberData.permissions !== null) {
              // If it's already an object, use it directly
              parsedPermissions = teamMemberData.permissions;
            } else {
              parsedPermissions = null;
            }
            
            if (parsedPermissions && typeof parsedPermissions === 'object') {
              // Use the actual permissions from database
              setSettings(parsedPermissions);
              setHasLoadedPermissions(true) // Mark as loaded
            }
          } catch (e) {
            console.error('Error processing permissions:', e)
            // Don't reset settings on error - keep current state
            setHasLoadedPermissions(true) // Mark as attempted to load
          }
        } else {
          // No permissions in database (null or undefined)
          // Don't apply defaults - use empty object to ensure each worker only has explicitly saved permissions
          setSettings({});
          setHasLoadedPermissions(true) // Mark as loaded (even though it's null)
        }

        // Set recent jobs if available
        if (response.jobs) {
          setRecentJobs(response.jobs)
        }
      }
    } catch (error) {
      console.error('Error fetching team member:', error)
      setError('Failed to load team member details')
    } finally {
      setLoading(false)
    }
  }

  const handleEditMember = () => {
    setEditFormData({
      first_name: teamMember?.first_name || '',
      last_name: teamMember?.last_name || '',
      email: teamMember?.email || '',
      phone: teamMember?.phone || '',
      role: teamMember?.role || '',
      location: teamMember?.location || '',
      city: teamMember?.city || '',
      state: teamMember?.state || '',
      zip_code: teamMember?.zip_code || '',
      hourly_rate: teamMember?.hourly_rate || null,
      commission_percentage: teamMember?.commission_percentage || null
    })
    setEditing(true)
  }

  const handleMemberUpdate = () => {
    fetchTeamMemberDetails()
    setEditing(false)
  }

  const handleSaveMember = async () => {
    try {
      setSaving(true)
      
      const updateData = {
        ...editFormData,
        color: editFormData.color || '#2563EB',
        territories: JSON.stringify(territories.map(t => typeof t === 'object' ? t.id : t)),
        availability: JSON.stringify({
          workingHours,
          customAvailability
        }),
        permissions: JSON.stringify(settings)
      }
      
      console.log('Saving team member with data:', updateData)
      await teamAPI.update(memberId, updateData)
      
      // Refresh data
      await fetchTeamMemberDetails()
      setEditing(false)
    } catch (error) {
      console.error('Error saving team member:', error)
      setError('Failed to save team member')
    } finally {
      setSaving(false)
    }
  }

  const handleCancelEdit = () => {
    setEditing(false)
    setEditFormData({})
  }

  const handleDeleteMember = () => {
    setShowDeleteModal(true)
  }

  const handleResendInvite = async () => {
    if (!teamMember?.id) return;
    
    try {
      setResendingInvite(true);
      await teamAPI.resendInvite(teamMember.id);
      setNotification({
        type: 'success',
        message: 'Invitation email sent successfully!'
      });
      // Clear notification after 3 seconds
      setTimeout(() => setNotification(null), 3000);
    } catch (error) {
      console.error('Error resending invite:', error);
      setNotification({
        type: 'error',
        message: error.response?.data?.error || 'Failed to resend invitation. Please try again.'
      });
      // Clear notification after 5 seconds
      setTimeout(() => setNotification(null), 5000);
    } finally {
      setResendingInvite(false);
    }
  }

  const confirmDeleteMember = async () => {
    // Prevent deleting account owner
    if (teamMember?.role === 'account owner' || teamMember?.role === 'owner' || teamMember?.role === 'admin') {
      setDeleteError('Cannot delete account owner')
      return
    }
    
    try {
      setDeleting(true)
      setDeleteError("") // Clear any previous errors
      await teamAPI.delete(memberId)
      
      // Show success notification before navigating
      setNotification({
        type: 'success',
        message: `Team member has been deleted successfully.`
      })
      
      // Navigate back to team page
      navigate('/team')
    } catch (error) {
      console.error('Error deleting team member:', error)
      
      // Enhanced error handling with specific error types
      let errorMessage = 'Failed to delete team member. Please try again.'
      
      if (error.response?.data) {
        const errorData = error.response.data
        
        // Use user-friendly message if available
        if (errorData.userMessage) {
          errorMessage = errorData.userMessage
        } else if (errorData.error) {
          errorMessage = errorData.error
        }
        
        // Log additional details for debugging
        console.log('Error details:', {
          errorType: errorData.errorType,
          status: error.response.status,
          details: errorData.details
        })
      } else if (error.message) {
        errorMessage = error.message
      }
      
      // Handle specific error types with additional context
      if (error.response?.status === 400) {
        // Business rule violations - show the specific error message
        setDeleteError(errorMessage)
      } else if (error.response?.status === 404) {
        setDeleteError('Team member not found. They may have already been deleted.')
      } else if (error.response?.status === 403) {
        setDeleteError('You do not have permission to delete this team member.')
      } else if (error.response?.status === 500) {
        setDeleteError('Server error occurred. Please try again later or contact support.')
      } else if (error.code === 'NETWORK_ERROR' || !navigator.onLine) {
        setDeleteError('Network error. Please check your internet connection and try again.')
      } else {
        setDeleteError(errorMessage)
      }
      
      // Don't close the modal on error - let user see the error message
    } finally {
      setDeleting(false)
    }
  }


  const fetchAvailableTerritories = async () => {
    try {
      setTerritoryLoading(true)
      console.log('Fetching available territories for user:', user?.id)
      const response = await territoriesAPI.getAll(user?.id, { status: 'active' })
      console.log('Available territories response:', response)
      console.log('Available territories array:', response.territories)
      console.log('Available territories count:', response.territories?.length || 0)
      console.log('Full API response structure:', Object.keys(response))
      setAvailableTerritories(response.territories || [])
    } catch (error) {
      console.error('Error fetching territories:', error)
      setAvailableTerritories([])
    } finally {
      setTerritoryLoading(false)
    }
  }

  const handleAddTerritory = () => {
    setShowAddTerritoryModal(true)
  }

  const handleSaveTerritory = async (territoryId) => {
    try {
      console.log('handleSaveTerritory called with territoryId:', territoryId)
      const foundTerritory = availableTerritories.find(t => t.id === territoryId)
      console.log('Found territory:', foundTerritory)
      
      if (foundTerritory) {
        const updatedTerritories = [...territories, territoryId]
        console.log('Updated territories array:', updatedTerritories)
        
        // Save to database - ensure we save as array of IDs
        const updateData = {
          territories: JSON.stringify(updatedTerritories)
        }
        console.log('Saving territories to database with data:', updateData)
        
        const response = await teamAPI.update(memberId, updateData)
        console.log('Team API update response:', response)
        
        // Update local state
        setTerritories(updatedTerritories)

      // Refresh team member data
      await fetchTeamMemberDetails()
        
        setShowAddTerritoryModal(false)
        console.log('Territory added successfully')
      } else {
        console.error('Territory not found for ID:', territoryId)
        alert('Territory not found. Please try again.')
      }
    } catch (error) {
      console.error('Error adding territory:', error)
      console.error('Error details:', error.response?.data || error.message)
      alert('Failed to add territory. Please try again.')
    }
  }

  const handleRemoveTerritory = async (territoryToRemove) => {
    try {
      console.log('Removing territory:', territoryToRemove)
      console.log('Current territories:', territories)
      
      // Get the territory ID to remove
      let territoryIdToRemove
      if (typeof territoryToRemove === 'object' && territoryToRemove.id) {
        territoryIdToRemove = territoryToRemove.id
      } else {
        territoryIdToRemove = territoryToRemove
      }
      
      console.log('Territory ID to remove:', territoryIdToRemove)
      
      // Remove the territory by its ID from the territories array
      const updatedTerritories = territories.filter(territoryId => {
        const numericId = typeof territoryId === 'string' ? parseInt(territoryId) : territoryId
        const numericRemoveId = typeof territoryIdToRemove === 'string' ? parseInt(territoryIdToRemove) : territoryIdToRemove
        
        console.log('Comparing territory ID:', numericId, 'with remove ID:', numericRemoveId)
        const shouldKeep = numericId !== numericRemoveId
        console.log('Should keep territory:', shouldKeep)
        return shouldKeep
      })
      
      console.log('Updated territories after removal:', updatedTerritories)
      
      // Save to database
      const updateData = {
        territories: JSON.stringify(updatedTerritories)
      }
      console.log('Saving territories to database after removal:', updateData)
      
      await teamAPI.update(memberId, updateData)
      
      // Update local state
      setTerritories(updatedTerritories)
      
      // Refresh team member data
      await fetchTeamMemberDetails()
      
      console.log('Territory removed successfully')
    } catch (error) {
      console.error('Error removing territory:', error)
      alert('Failed to remove territory. Please try again.')
    }
  }

  const handleSaveHours = async () => {
    try {
      console.log('handleSaveHours called')
      console.log('Current workingHours:', workingHours)
      
      setSavingHours(true)
      
      const updateData = {
        availability: JSON.stringify({
          workingHours,
          customAvailability
        })
      }
      
      console.log('Saving recurring hours:', updateData)
      await teamAPI.update(memberId, updateData)
      
      // Refresh team member data
      await fetchTeamMemberDetails()
      
      setEditingHours(false)
      setShowWeeklyHoursModal(false)
      console.log('Recurring hours saved successfully')
    } catch (error) {
      console.error('Error saving recurring hours:', error)
      alert('Failed to save recurring hours. Please try again.')
    } finally {
      setSavingHours(false)
    }
  }

  const handleSaveCustomAvailability = async () => {
    try {
      console.log('handleSaveCustomAvailability called')
      console.log('Current customAvailability:', customAvailability)
      
      setSavingCustomAvailability(true)
      
      const updateData = {
        availability: JSON.stringify({
          workingHours,
          customAvailability
        })
      }
      
      console.log('Saving custom availability:', updateData)
      await teamAPI.update(memberId, updateData)
      
      // Refresh team member data
      await fetchTeamMemberDetails()
      
      setEditingAvailability(false)
      console.log('Custom availability saved successfully')
    } catch (error) {
      console.error('Error saving custom availability:', error)
      alert('Failed to save custom availability. Please try again.')
    } finally {
      setSavingCustomAvailability(false)
    }
  }

  const handleSaveDay = async (day) => {
    try {
      console.log(`handleSaveDay called for ${day}`)
      console.log(`Current ${day} hours:`, workingHours[day])
      
      setSavingDay(day)
      
      const updateData = {
        availability: JSON.stringify({
          workingHours,
          customAvailability
        })
      }
      
      console.log(`Saving ${day} availability:`, updateData)
      await teamAPI.update(memberId, updateData)
      
      // Refresh team member data
      await fetchTeamMemberDetails()
      
      console.log(`${day} availability saved successfully`)
    } catch (error) {
      console.error(`Error saving ${day} availability:`, error)
      alert(`Failed to save ${day} availability. Please try again.`)
    } finally {
      setSavingDay(null)
    }
  }

  const handleAddCustomAvailability = () => {
    setShowAvailabilityModal(true)
  }

  const handleAvailabilityModalSave = async (availabilityData) => {
    // Handle single date availability update
    const existingIndex = customAvailability.findIndex(item => item.date === availabilityData.date)
    
    const availabilityItem = {
      id: existingIndex >= 0 ? customAvailability[existingIndex].id : Date.now() + Math.random(),
      date: availabilityData.date,
      available: availabilityData.available,
      hours: availabilityData.hours
    }
    
    if (existingIndex >= 0) {
      // Update existing
      setCustomAvailability(prev => prev.map((item, index) => 
        index === existingIndex ? availabilityItem : item
      ))
    } else {
      // Add new
      setCustomAvailability(prev => [...prev, availabilityItem])
    }
    
    // Save to backend
    try {
      setSavingCustomAvailability(true)
      
      const updateData = {
        availability: JSON.stringify({
          workingHours,
          customAvailability: existingIndex >= 0 
            ? customAvailability.map((item, index) => index === existingIndex ? availabilityItem : item)
            : [...customAvailability, availabilityItem]
        })
      }
      
      await teamAPI.update(memberId, updateData)
      
      // Refresh team member data
      await fetchTeamMemberDetails()
    } catch (error) {
      console.error('Error saving custom availability:', error)
      alert('Failed to save availability. Please try again.')
    } finally {
      setSavingCustomAvailability(false)
    }
  }

  const handleRemoveCustomAvailability = (id) => {
    setCustomAvailability(prev => prev.filter(item => item.id !== id))
  }

  const handleAddTimeSlot = (day) => {
    setWorkingHours(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        timeSlots: [
          ...(prev[day]?.timeSlots || []),
          {
            id: Date.now(),
            start: '09:00',
            end: '17:00',
            enabled: true
          }
        ]
      }
    }))
  }

  const handleRemoveTimeSlot = (day, slotId) => {
    setWorkingHours(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        timeSlots: (prev[day]?.timeSlots || []).filter(slot => slot.id !== slotId)
      }
    }))
  }

  const handleTimeSlotChange = (day, slotId, field, value) => {
    setWorkingHours(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        timeSlots: (prev[day]?.timeSlots || []).map(slot => 
          slot.id === slotId ? { ...slot, [field]: value } : slot
        )
      }
    }))
  }

  const generateTimeOptions = () => {
    const options = []
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
        options.push(time)
      }
    }
    return options
  }

  const timeOptions = generateTimeOptions()

  const getDayColor = (day) => {
    const colors = {
      sunday: 'bg-red-50 border-red-200',
      monday: 'bg-blue-50 border-blue-200',
      tuesday: 'bg-green-50 border-green-200',
      wednesday: 'bg-yellow-50 border-yellow-200',
      thursday: 'bg-purple-50 border-purple-200',
      friday: 'bg-pink-50 border-pink-200',
      saturday: 'bg-indigo-50 border-indigo-200'
    }
    return colors[day.toLowerCase()] || 'bg-gray-50 border-gray-200'
  }

  const handleSaveSettings = async (newSettings) => {
    try {
      const updateData = {
        permissions: JSON.stringify(newSettings)
      }
      
      console.log('Saving settings:', updateData)
      await teamAPI.update(memberId, updateData)
      
      setSettings(newSettings)
      // Refresh team member data
      await fetchTeamMemberDetails()
    } catch (error) {
      console.error('Error saving settings:', error)
      alert('Failed to save settings. Please try again.')
    }
  }

  // Handle address input change with backend proxy
  const handleLocationChange = async (e) => {
    const value = e.target.value
    setEditFormData(prev => ({ ...prev, location: value }))
    
    if (value.length < 3) {
      setAddressSuggestions([])
      setShowAddressSuggestions(false)
      return
    }

    try {
      setAddressLoading(true)
      const response = await fetch(`https://service-flow-backend-production.up.railway.app/api/places/autocomplete?input=${encodeURIComponent(value)}`)
      const data = await response.json()
      
      if (!response.ok) {
        console.error('Address suggestions API error:', data)
        setError(`Address suggestions failed: ${data.error || 'Unknown error'}`)
        setAddressSuggestions([])
        setShowAddressSuggestions(false)
        return
      }
      
      if (data.predictions) {
        setAddressSuggestions(data.predictions)
        setShowAddressSuggestions(true)
      }
    } catch (error) {
      console.error('Error fetching address suggestions:', error)
    } finally {
      setAddressLoading(false)
    }
  }

  // Handle address selection
  const handleAddressSelect = async (suggestion) => {
    try {
      const response = await fetch(`https://service-flow-backend-production.up.railway.app/api/places/details?place_id=${suggestion.place_id}`)
      const data = await response.json()
      
      if (data.result) {
        const place = data.result
        let city = ''
        let state = ''
        let zipCode = ''
        
        // Extract address components
        if (place.address_components) {
          place.address_components.forEach(component => {
            if (component.types.includes('locality')) {
              city = component.long_name
            }
            if (component.types.includes('administrative_area_level_1')) {
              state = component.short_name
            }
            if (component.types.includes('postal_code')) {
              zipCode = component.long_name
            }
          })
        }
        
        setEditFormData(prev => ({
          ...prev,
          location: suggestion.description,
          city: city,
          state: state,
          zip_code: zipCode
        }))
      }
    } catch (error) {
      console.error('Error fetching place details:', error)
    } finally {
      setShowAddressSuggestions(false)
      setAddressSuggestions([])
    }
  }

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (addressRef.current && !addressRef.current.contains(event.target)) {
        setShowAddressSuggestions(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])



  // Map territory IDs to full territory objects when available territories load
  useEffect(() => {
    if (availableTerritories.length > 0) {
      const mappedTerritories = territories.map(territoryId => {
        // Ensure territoryId is a number for comparison
        const numericId = typeof territoryId === 'string' ? parseInt(territoryId) : territoryId
        
        // Find the full territory object by ID
        const fullTerritory = availableTerritories.find(t => t.id === numericId)
        
        if (fullTerritory) {
          return fullTerritory
        } else {
          return { id: numericId, name: `Territory ${numericId}` }
        }
      })
      
      setDisplayedTerritories(mappedTerritories)
    } else if (territories.length === 0) {
      // If no territories, clear displayed territories
      setDisplayedTerritories([])
    }
  }, [availableTerritories, territories])

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading team member details...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
            <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-600 mb-4">{error}</p>
          <button 
            onClick={() => navigate('/team')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to Team
          </button>
          </div>
        </div>
      </div>
    )
  }

  if (!teamMember) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
            <XCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">Team member not found</p>
          <button 
            onClick={() => navigate('/team')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to Team
          </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
   <div className="flex h-screen bg-gray-50 overflow-hidden">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        {/* Notification Display */}
        {notification && (
          <div className={`fixed top-4 right-4 z-50 max-w-sm p-4 rounded-lg shadow-lg ${
            notification.type === 'success'
              ? 'bg-green-50 border border-green-200 text-green-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}>
            <div className="flex items-center">
              {notification.type === 'success' ? (
                <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
              )}
              <p className="text-sm font-medium">{notification.message}</p>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-auto bg-gray-50">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">

            {/* Main Content */}
            <div className="space-y-4 sm:space-y-6">
              {/* Profile Header Card with Map */}
              <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-4 sm:mb-6 gap-4">
            <button
              onClick={() => navigate("/team")}
                    className="flex items-center text-sm text-gray-600 hover:text-gray-900 self-start"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              All Team Members
            </button>
                  <div className="flex items-center space-x-2 sm:space-x-3">
                    <button
                      onClick={handleEditMember}
                      className="px-3 sm:px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                      Edit
                    </button>
                    {!(teamMember?.role === 'account owner' || teamMember?.role === 'owner' || teamMember?.role === 'admin') && (
                      <button
                        onClick={() => setShowDeleteModal(true)}
                        className="px-3 sm:px-4 py-2 text-sm font-medium text-white bg-red-600 border border-red-600 rounded-md hover:bg-red-700"
                      >
                        Deactivate
                      </button>
                    )}
                  </div>
                </div>

                {/* Two Column Layout: Profile Info Left, Map Right */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Left Column: Profile Information */}
                  <div className="lg:col-span-2 space-y-4">
                <div className="flex flex-col sm:flex-row items-start space-y-4 sm:space-y-0 sm:space-x-6">
                  {/* Profile Picture - Larger and Circular */}
                    <div
                    className="w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center text-white text-xl sm:text-2xl font-semibold overflow-hidden flex-shrink-0 mx-auto sm:mx-0"
                    style={{ backgroundColor: teamMember?.profile_picture ? 'transparent' : (teamMember?.color || '#2563EB') }}
                    >
                    {teamMember?.profile_picture ? (
                      <img 
                        src={getImageUrl(teamMember.profile_picture)} 
                        alt={`${teamMember?.first_name || ''} ${teamMember?.last_name || ''}`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          console.error('Failed to load profile picture:', teamMember.profile_picture);
                          e.target.style.display = 'none';
                        }}
                      />
                    ) : (
                      <span className="text-xl sm:text-2xl">
                      {teamMember?.first_name?.charAt(0) || 'T'}{teamMember?.last_name?.charAt(0) || 'M'}
                      </span>
                    )}
                    </div>
                  <div className="flex-1 w-full text-center sm:text-left">
                    <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-1">
                        {teamMember?.first_name || 'First'} {teamMember?.last_name || 'Last'}
                      </h1>
                    <p className="text-sm text-gray-600 mb-4 sm:mb-6">
                        {teamMember?.role === 'account owner' || teamMember?.role === 'owner' || teamMember?.role === 'admin' 
                          ? 'Account Owner' 
                          : teamMember?.role === 'manager' 
                            ? 'Manager' 
                            : teamMember?.role === 'scheduler' 
                              ? 'Scheduler' 
                              : teamMember?.role === 'worker' || teamMember?.role === 'technician' 
                              ? 'Team member' 
                                : teamMember?.role || 'Team Member'}
                      </p>
                    </div>
                </div>

                {/* Notification Banner */}
                {notification && (
                  <div className={`mt-4 p-3 rounded-lg ${
                    notification.type === 'success' 
                      ? 'bg-green-50 border border-green-200 text-green-800' 
                      : 'bg-red-50 border border-red-200 text-red-800'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{notification.message}</span>
                      <button
                        onClick={() => setNotification(null)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Contact Information Grid */}
                <div className="mt-4 sm:mt-6 space-y-3">
                  <div className="flex flex-col sm:grid sm:grid-cols-3 gap-2 sm:gap-4 py-2">
                    <span className="text-sm text-gray-600 font-medium sm:font-normal">Mobile phone</span>
                    <span className="text-sm text-gray-900 sm:col-span-2">{teamMember?.phone || 'No phone number'}</span>
                  </div>
                  <div className="flex flex-col sm:grid sm:grid-cols-3 gap-2 sm:gap-4 py-2">
                    <span className="text-sm text-gray-600 font-medium sm:font-normal">Email</span>
                    <span className="text-sm text-gray-900 sm:col-span-2 break-words">{teamMember?.email || 'No email'}</span>
                  </div>
                  <div className="flex flex-col sm:grid sm:grid-cols-3 gap-2 sm:gap-4 py-2">
                    <span className="text-sm text-gray-600 font-medium sm:font-normal">Address</span>
                    <span className="text-sm text-gray-900 sm:col-span-2">
                      {teamMember?.location || 'No address on file'}
                      {teamMember?.city && teamMember?.state && (
                        <span className="block text-gray-600">
                          {teamMember.city}, {teamMember.state} {teamMember.zip_code}
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="flex flex-col sm:grid sm:grid-cols-3 gap-2 sm:gap-4 py-2">
                    <span className="text-sm text-gray-600 font-medium sm:font-normal">Status</span>
                    <span className="text-sm sm:col-span-2">
                      {(() => {
                        const status = teamMember?.status?.toLowerCase() || 'unknown';
                        if (status === 'active' || status === 'activated') {
                          return (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Account Activated
                            </span>
                          );
                        } else if (status === 'invited' || status === 'pending') {
                          return (
                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                <AlertCircle className="w-3 h-3 mr-1" />
                                Pending Invitation
                              </span>
                              <button
                                onClick={handleResendInvite}
                                disabled={resendingInvite}
                                className="text-xs text-blue-600 hover:text-blue-700 font-medium underline disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {resendingInvite ? 'Sending...' : 'Resend Invite'}
                              </button>
                            </div>
                          );
                        } else if (status === 'inactive' || status === 'deactivated') {
                          return (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              <XCircle className="w-3 h-3 mr-1" />
                              Inactive
                            </span>
                          );
                        } else {
                          return (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              {teamMember?.status || 'Unknown'}
                            </span>
                          );
                        }
                      })()}
                    </span>
                  </div>
                  <div className="flex flex-col sm:grid sm:grid-cols-3 gap-2 sm:gap-4 py-2">
                    <span className="text-sm text-gray-600 font-medium sm:font-normal">Role</span>
                    <span className="text-sm text-gray-900 sm:col-span-2">
                      {teamMember?.role === 'account owner' || teamMember?.role === 'owner' || teamMember?.role === 'admin' 
                        ? 'Account Owner' 
                        : teamMember?.role === 'manager' 
                          ? 'Manager' 
                          : teamMember?.role === 'scheduler' 
                            ? 'Scheduler' 
                            : teamMember?.role === 'worker' || teamMember?.role === 'technician' 
                              ? 'Worker' 
                              : teamMember?.role || 'Team Member'}
                    </span>
                  </div>
                  {/* Payment Settings Section */}
                  <div className="border-t border-gray-200 pt-4 mt-4">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">Payment Settings</h3>
                    
                  <div className="flex flex-col sm:grid sm:grid-cols-3 gap-2 sm:gap-4 py-2">
                    <span className="text-sm text-gray-600 font-medium sm:font-normal">Hourly Rate</span>
                    <span className="text-sm text-gray-900 sm:col-span-2">
                      {editing ? (
                        <div className="flex items-center space-x-2">
                          <span className="text-gray-500">$</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={editFormData.hourly_rate !== undefined ? editFormData.hourly_rate : (teamMember?.hourly_rate || '')}
                            onChange={(e) => setEditFormData({ ...editFormData, hourly_rate: parseFloat(e.target.value) || null })}
                            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="0.00"
                          />
                            <span className="text-xs text-gray-400">/hour</span>
                        </div>
                      ) : (
                          <div className="flex items-center space-x-2">
                            {teamMember?.hourly_rate 
                              ? <span>${parseFloat(teamMember.hourly_rate).toFixed(2)}/hour</span>
                              : <span className="text-gray-400 italic">Not set</span>
                            }
                            {!editing && (
                              <button
                                onClick={handleEditMember}
                                className="text-xs text-blue-600 hover:text-blue-700 underline ml-2"
                              >
                                Set hourly rate
                              </button>
                            )}
                          </div>
                      )}
                    </span>
                    </div>
                    
                    <div className="flex flex-col sm:grid sm:grid-cols-3 gap-2 sm:gap-4 py-2">
                      <span className="text-sm text-gray-600 font-medium sm:font-normal">Commission %</span>
                      <span className="text-sm text-gray-900 sm:col-span-2">
                        {editing ? (
                          <div className="flex items-center space-x-2">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              max="100"
                              value={editFormData.commission_percentage !== undefined ? editFormData.commission_percentage : (teamMember?.commission_percentage || '')}
                              onChange={(e) => setEditFormData({ ...editFormData, commission_percentage: parseFloat(e.target.value) || null })}
                              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="0.00"
                            />
                            <span className="text-gray-500">%</span>
                            <span className="text-xs text-gray-400">of job revenue</span>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-2">
                            {teamMember?.commission_percentage 
                              ? <span>{parseFloat(teamMember.commission_percentage).toFixed(2)}% of job revenue</span>
                              : <span className="text-gray-400 italic">Not set</span>
                            }
                            {!editing && (
                              <button
                                onClick={handleEditMember}
                                className="text-xs text-blue-600 hover:text-blue-700 underline ml-2"
                              >
                                Set commission
                              </button>
                            )}
                          </div>
                        )}
                      </span>
                    </div>
                    
                    {(teamMember?.hourly_rate || teamMember?.commission_percentage) && (
                      <div className="flex flex-col sm:grid sm:grid-cols-3 gap-2 sm:gap-4 py-2">
                        <span className="text-sm text-gray-600 font-medium sm:font-normal">Payment Method</span>
                        <span className="text-sm text-gray-900 sm:col-span-2">
                          {teamMember?.hourly_rate && teamMember?.commission_percentage 
                            ? 'Hybrid (Hourly + Commission)'
                            : teamMember?.hourly_rate 
                              ? 'Hourly Rate Only'
                              : 'Commission Percentage Only'
                          }
                        </span>
                      </div>
                    )}
                    
                    {!editing && !teamMember?.hourly_rate && !teamMember?.commission_percentage && (
                      <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <p className="text-xs text-yellow-800">
                          <strong>Note:</strong> Set an hourly rate or commission percentage to enable payroll calculations. Click "Edit" above to set payment settings.
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col sm:grid sm:grid-cols-3 gap-2 sm:gap-4 py-2">
                    <span className="text-sm text-gray-600 font-medium sm:font-normal">Role permissions</span>
                    <div className="text-sm text-gray-900 sm:col-span-2 space-y-1">
                      {(() => {
                        // Define permission list based on role
                        const permissions = [];
                        if (teamMember?.role === 'worker') {
                          // Worker permissions from settings - use exact field names from database
                          // Only show permissions that are explicitly set to true
                          if (settings.viewCustomerContact === true) permissions.push('View contact info for customer (phone & email)');
                          if (settings.viewCustomerNotes === true) permissions.push('View customer notes');
                          if (settings.markJobStatus === true) permissions.push('Mark jobs as \'en-route\', \'in-progress\' & \'complete\'');
                          if (settings.resetJobStatuses === true) permissions.push('Reset job statuses');
                          if (settings.editJobDetails === true) permissions.push('Edit job details');
                          if (settings.viewEditJobPrice === true) permissions.push('View & edit job price, invoice, and line items');
                          if (settings.processPayments === true) permissions.push('Process payments and mark jobs as paid');
                          if (settings.rescheduleJobs === true) permissions.push('Reschedule jobs');
                          if (settings.seeOtherProviders === true) permissions.push('See other providers assigned');
                          if (settings.editAvailability === true) permissions.push('Edit their own availability');
                        } else if (teamMember?.role === 'scheduler') {
                          permissions.push('Access all jobs and all customers');
                          permissions.push('Create, edit, cancel, reschedule jobs');
                          permissions.push('Assign or un-assign jobs');
                          if (settings.processPayments) permissions.push('Process payments for jobs');
                        } else if (teamMember?.role === 'manager') {
                          permissions.push('Full access to all areas except billing');
                        } else {
                          permissions.push('Full access to all areas of account');
                        }
                        
                        if (permissions.length === 0) {
                          return <span>No specific permissions set</span>;
                        }
                        
                        return (
                          <ul className="space-y-1">
                            {permissions.map((permission, index) => (
                              <li key={index} className="flex items-center">
                                <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                                <span>{permission}</span>
                              </li>
                            ))}
                          </ul>
                        );
                      })()}
                    </div>
                  </div>
                </div>
                  </div>

                  {/* Right Column: Map */}
                  <div className="lg:col-span-1">
                    {!staffLocationsEnabled ? (
                      <div className="h-64 sm:h-80 bg-gray-100 rounded-lg flex items-center justify-center border border-gray-200">
                        <div className="text-center px-4">
                          <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                          <p className="text-sm text-gray-500">Staff locations are currently hidden</p>
                        </div>
                      </div>
                    ) : (() => {
                      // Helper function to get address from team member
                      const getMemberAddress = (member) => {
                        if (member.location) return member.location
                        if (member.city && member.state) {
                          const parts = [member.city, member.state]
                          if (member.zip_code) parts.push(member.zip_code)
                          return parts.join(', ')
                        }
                        if (member.address) return member.address
                        return null
                      }

                      // Get current team member's address only
                      const currentAddress = getMemberAddress(teamMember)

                      if (!currentAddress) {
                        return (
                          <div className="h-64 sm:h-80 bg-gray-100 rounded-lg flex items-center justify-center border border-gray-200">
                            <div className="text-center">
                              <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                              <p className="text-sm text-gray-500">No address on file</p>
                            </div>
                          </div>
                        )
                      }

                      // Build Google Maps URL for current member's address only
                      // Use place API with higher zoom (15) for close range view
                      const mapUrl = `https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${encodeURIComponent(currentAddress)}&zoom=15&maptype=roadmap`

                      return (
                        <div className="relative">
                          <div className="h-64 sm:h-80 rounded-lg overflow-hidden border border-gray-200">
                            <iframe
                              title="Team Member Location"
                              width="100%"
                              height="100%"
                              style={{ border: 0 }}
                              loading="lazy"
                              allowFullScreen
                              referrerPolicy="no-referrer-when-downgrade"
                              src={mapUrl}
                            />
                          </div>
                        </div>
                      )
                    })()}
                  </div>
                </div>
              </div>

              {/* Metadata Card */}
              <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <h3 className="text-base font-semibold text-gray-900">Metadata</h3>
                    <HelpCircle className="w-4 h-4 text-gray-400" />
                  </div>
                  <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                    Edit
                  </button>
                </div>
                <p className="text-sm text-gray-500">No custom metadata added yet</p>
              </div>

              {/* Service Provider Card */}
              <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">Service Provider</h3>
                    <p className="text-sm text-gray-600">This team member can be assigned to jobs</p>
                  </div>
                  <button
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 ${
                      settings.isServiceProvider ? 'bg-green-500' : 'bg-gray-200'
                    }`}
                    onClick={async () => {
                      const newSettings = { ...settings, isServiceProvider: !settings.isServiceProvider }
                      setSettings(newSettings)
                      await handleSaveSettings(newSettings)
                    }}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        settings.isServiceProvider ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Availability Card */}
              <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
                <div className="mb-4 sm:mb-6">
                  <h3 className="text-base font-semibold text-gray-900 mb-2">Availability</h3>
                  <p className="text-sm text-gray-600">
                    Manage this team member's availability by editing their regular work hours, or by adding custom availability for specific dates.{' '}
                    <a href="#" className="text-blue-600 hover:text-blue-700">Learn more...</a>
                  </p>
                </div>

                {/* Allow Edit Availability Toggle */}
                <div className="flex items-center justify-between py-4 border-b border-gray-200">
                  <div className="flex items-start space-x-3">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        Allow this team member to edit their availability
                      </p>
                      <p className="text-sm text-gray-600">
                        The team member's role allows them to edit their availability
                      </p>
                    </div>
                  </div>
                  <button
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 ${
                      settings.canEditAvailability ? 'bg-green-500' : 'bg-gray-200'
                    }`}
                    onClick={async () => {
                      const newSettings = { ...settings, canEditAvailability: !settings.canEditAvailability }
                      setSettings(newSettings)
                      await handleSaveSettings(newSettings)
                    }}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        settings.canEditAvailability ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Recurring Hours and Custom Availability Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 mt-4 sm:mt-6">
                  {/* Recurring Hours */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Recurring Hours</h4>
                        <HelpCircle className="w-4 h-4 text-gray-400" />
                      </div>
                    </div>

                    <div className="space-y-0 border border-gray-200 rounded-lg overflow-hidden">
                      {Object.entries(workingHours).map(([day, { available, hours, timeSlots = [] }], index) => (
                        <div
                          key={day}
                          className={`flex items-center justify-between px-4 py-3 ${
                            index !== Object.entries(workingHours).length - 1 ? 'border-b border-gray-200' : ''
                          }`}
                        >
                          <span className="text-sm font-medium text-gray-700 capitalize w-24">
                            {day}
                          </span>
                          <span className="text-sm text-gray-600 text-right flex-1">
                            {available ? (
                              timeSlots.length > 0 ? (
                                timeSlots.map((slot, slotIndex) => (
                                  <span key={slot.id}>
                                    {slot.start} - {slot.end}
                                    {slotIndex < timeSlots.length - 1 && ', '}
                                  </span>
                                ))
                              ) : (
                                hours || '9:00 AM - 6:00 PM'
                              )
                            ) : (
                              'Unavailable'
                            )}
                          </span>
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={() => setShowWeeklyHoursModal(true)}
                      className="mt-3 text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Edit Hours
                    </button>
                  </div>

                  {/* Custom Availability */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Custom Availability</h4>
                        <HelpCircle className="w-4 h-4 text-gray-400" />
                      </div>
                    </div>

                    {customAvailability.length === 0 ? (
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                        <Calendar className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                        <h5 className="text-sm font-medium text-gray-900 mb-1">Add a date override</h5>
                        <p className="text-xs text-gray-600 mb-4">
                          Customize this provider's availability for specific dates.
                        </p>
                        <button
                          onClick={() => setShowAvailabilityModal(true)}
                          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                        >
                          Add Date Override
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {customAvailability.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
                          >
                            <div>
                              <p className="text-sm font-medium text-gray-900">{item.date}</p>
                              <p className="text-xs text-gray-600">{item.hours}</p>
                            </div>
                            <button
                              onClick={() => handleRemoveCustomAvailability(item.id)}
                              className="text-gray-400 hover:text-red-600"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                        <button
                          onClick={() => setShowAvailabilityModal(true)}
                          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                        >
                          Add Date Override
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Limit Jobs Per Day */}
                <div className="flex items-center justify-between pt-6 mt-6 border-t border-gray-200">
                  <span className="text-sm text-gray-700">Limit the number of jobs per day for this provider</span>
                  <button
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 ${
                      settings.limitJobsPerDay ? 'bg-green-500' : 'bg-gray-200'
                    }`}
                    onClick={async () => {
                      const newSettings = { ...settings, limitJobsPerDay: !settings.limitJobsPerDay }
                      setSettings(newSettings)
                      await handleSaveSettings(newSettings)
                    }}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        settings.limitJobsPerDay ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Assignment Card */}
              <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
                <div className="mb-4 sm:mb-6">
                  <h3 className="text-base font-semibold text-gray-900 mb-2">Assignment</h3>
                  <p className="text-sm text-gray-600">
                    Control whether this provider can be auto-assigned to jobs, or claim eligible jobs that you've offered
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between py-3 border-b border-gray-200">
                    <div className="flex items-center space-x-3">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      <span className="text-sm text-gray-700">Can be auto-assigned jobs</span>
                    </div>
                    <button
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 ${
                        settings.canAutoAssign ? 'bg-green-500' : 'bg-gray-200'
                      }`}
                      onClick={async () => {
                        const newSettings = { ...settings, canAutoAssign: !settings.canAutoAssign }
                        setSettings(newSettings)
                        await handleSaveSettings(newSettings)
                      }}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          settings.canAutoAssign ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between py-3">
                    <div className="flex items-center space-x-3">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      <span className="text-sm text-gray-700">Can claim available job offers</span>
                    </div>
                    <button
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 ${
                        settings.canClaimJobs ? 'bg-green-500' : 'bg-gray-200'
                      }`}
                      onClick={async () => {
                        const newSettings = { ...settings, canClaimJobs: !settings.canClaimJobs }
                        setSettings(newSettings)
                        await handleSaveSettings(newSettings)
                      }}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          settings.canClaimJobs ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>

              {/* Notifications Card */}
              <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
                <div className="mb-4 sm:mb-6">
                  <h3 className="text-base font-semibold text-gray-900 mb-2">Notifications</h3>
                  <p className="text-sm text-gray-600">
                    How should this service provider be notified when they are assigned to a job?
                  </p>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <div className="flex items-start space-x-3">
                    <Bell className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Push Alerts: Not enabled</p>
                      <p className="text-sm text-gray-600">
                        This service provider has not enabled push notifications.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between py-3 border-b border-gray-200">
                    <div className="flex items-center space-x-3">
                      <Mail className="w-5 h-5 text-gray-400" />
                      <span className="text-sm text-gray-700">Emails</span>
                    </div>
                    <button
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 ${
                        settings.emailNotifications ? 'bg-green-500' : 'bg-gray-200'
                      }`}
                      onClick={async () => {
                        const newSettings = { ...settings, emailNotifications: !settings.emailNotifications }
                        setSettings(newSettings)
                        await handleSaveSettings(newSettings)
                      }}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          settings.emailNotifications ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between py-3">
                    <div className="flex items-center space-x-3">
                      <MessageSquare className="w-5 h-5 text-gray-400" />
                      <span className="text-sm text-gray-700">Text Messages (SMS)</span>
                    </div>
                    <button
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 ${
                        settings.smsNotifications ? 'bg-green-500' : 'bg-gray-200'
                      }`}
                      onClick={async () => {
                        const newSettings = { ...settings, smsNotifications: !settings.smsNotifications }
                        setSettings(newSettings)
                        await handleSaveSettings(newSettings)
                      }}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          settings.smsNotifications ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>

              {/* Skills Card */}
              <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
                <div className="mb-4 sm:mb-6">
                  <h3 className="text-base font-semibold text-gray-900 mb-2">Skills</h3>
                  <p className="text-sm text-gray-600">
                    Skill tags can be used to make sure workers meet specific job-related skills, certifications, equipment and licensing requirements.
                  </p>
                </div>

                <div className="text-center py-8">
                  <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  <p className="text-sm text-gray-600 mb-4">This provider doesn't have any skill tags yet</p>
                  <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                    Edit Skills
                  </button>
                </div>
              </div>

              {/* Calendar Color Card */}
              <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
                <div className="mb-4 sm:mb-6">
                  <h3 className="text-base font-semibold text-gray-900">Calendar color</h3>
                </div>

                <div className="flex flex-wrap gap-2">
                  {[
                    '#F97316', // Orange
                    '#EC4899', // Pink
                    '#EF4444', // Red
                    '#EAB308', // Yellow
                    '#A855F7', // Purple
                    '#3B82F6', // Blue
                    '#10B981', // Green
                    '#06B6D4', // Cyan
                    '#14B8A6', // Teal
                    '#E11D48', // Rose
                    '#DC2626', // Dark Red
                    '#1E293B', // Slate
                    '#0D9488', // Teal Dark
                    '#7C3AED', // Violet
                  ].map((color) => (
                    <button
                      key={color}
                      onClick={async () => {
                        setEditFormData({ ...editFormData, color })
                        const updateData = { ...teamMember, color }
                        await teamAPI.update(memberId, { color })
                        setTeamMember(updateData)
                      }}
                      className={`w-10 h-10 rounded-lg border-2 transition-all ${
                        (editFormData.color || teamMember?.color) === color
                          ? 'border-gray-900 scale-110'
                          : 'border-gray-200 hover:border-gray-400'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              {/* Delete Button - Hidden for account owner */}
              {!(teamMember?.role === 'account owner' || teamMember?.role === 'owner' || teamMember?.role === 'admin') && (
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <button
                    onClick={handleDeleteMember}
                    className="w-full px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  >
                    Delete Team Member
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
         
      {/* Add Territory Modal */}
      {showAddTerritoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
                      <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Add Territory</h3>
                        <button 
                onClick={() => setShowAddTerritoryModal(false)}
                className="text-gray-400 hover:text-gray-600"
                        >
                <X className="w-5 h-5" />
                        </button>
                      </div>
                      
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Territory</label>
                {territoryLoading ? (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="text-sm text-gray-500 mt-2">Loading territories...</p>
                                </div>
                ) : (
                  <select
                    onChange={(e) => {
                      const territoryId = parseInt(e.target.value)
                      if (territoryId) {
                        handleSaveTerritory(territoryId)
                        e.target.value = "" // Reset dropdown
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    defaultValue=""
                  >
                    <option value="" disabled>Select a territory</option>
                    {console.log('Available territories in modal:', availableTerritories)}
                    {console.log('Current territories:', territories)}
                    {availableTerritories
                      .filter(t => !territories.find(ct => (typeof ct === 'object' ? ct.id : ct) === t.id))
                      .map(territory => (
                        <option key={territory.id} value={territory.id}>
                          {territory.name} {territory.location ? `- ${territory.location}` : ''}
                        </option>
                      ))}
                  </select>
                )}
        </div>
      </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowAddTerritoryModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Weekly Hours Modal */}
      {showWeeklyHoursModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Edit Weekly Hours</h3>
              <button
                onClick={() => setShowWeeklyHoursModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-4">
                {Object.entries(workingHours).map(([day, { available, hours, timeSlots = [] }], index) => (
                  <div key={day} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={available}
                        onChange={(e) => setWorkingHours(prev => ({
                          ...prev,
                          [day]: { ...prev[day], available: e.target.checked }
                        }))}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="text-sm font-medium text-gray-900 capitalize min-w-[80px]">
                        {day}
                      </span>
                    </div>

                    {available ? (
                      <div className="flex-1 flex items-center justify-end min-w-0">
                        <div className="flex flex-col space-y-2 w-full max-w-xs">
                          {timeSlots.length === 0 && (
                            <button
                              onClick={() => handleAddTimeSlot(day)}
                              className="text-xs text-blue-600 hover:text-blue-700 font-medium self-start"
                            >
                              + Add Hours
                            </button>
                          )}
                          {timeSlots.map((slot, slotIndex) => (
                            <div key={slot.id} className="flex items-center space-x-2 flex-wrap">
                              <select
                                value={slot.start}
                                onChange={(e) => handleTimeSlotChange(day, slot.id, 'start', e.target.value)}
                                className="text-sm border border-gray-300 rounded px-2 py-1 min-w-0 flex-shrink-0"
                              >
                                {timeOptions.map(time => (
                                  <option key={time} value={time}>{time}</option>
                                ))}
                              </select>
                              <span className="text-sm text-gray-500 flex-shrink-0">to</span>
                              <select
                                value={slot.end}
                                onChange={(e) => handleTimeSlotChange(day, slot.id, 'end', e.target.value)}
                                className="text-sm border border-gray-300 rounded px-2 py-1 min-w-0 flex-shrink-0"
                              >
                                {timeOptions.map(time => (
                                  <option key={time} value={time}>{time}</option>
                                ))}
                              </select>
                              <button
                                onClick={() => handleRemoveTimeSlot(day, slot.id)}
                                className="text-red-600 hover:text-red-700 p-1 flex-shrink-0"
                              >
                                <X className="w-4 h-4" />
                              </button>
                              {slotIndex === timeSlots.length - 1 && (
                                <button
                                  onClick={() => handleAddTimeSlot(day)}
                                  className="text-xs text-blue-600 hover:text-blue-700 font-medium flex-shrink-0"
                                >
                                  + Add More
                                </button>
                              )}
                            </div>
                          ))}
                          {timeSlots.length > 0 && (
                            <button
                              onClick={() => handleSaveDay(day)}
                              disabled={savingDay === day}
                              className={`text-xs font-medium px-2 py-1 rounded self-start ${savingDay === day
                                  ? 'text-gray-400 cursor-not-allowed bg-gray-100'
                                  : 'text-green-600 hover:text-green-700 bg-green-50 hover:bg-green-100'
                                }`}
                            >
                              {savingDay === day ? 'Saving...' : 'Save'}
                            </button>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-gray-500">
                        Unavailable
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
              <button
                onClick={() => setShowWeeklyHoursModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveHours}
                disabled={savingHours}
                className={`px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 ${savingHours ? 'cursor-not-allowed' : ''}`}
              >
                {savingHours ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowDeleteModal(false)
            }
          }}
        >
          <div className="bg-white rounded-lg w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">
                  Delete Team Member
                </h3>
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="text-gray-400 hover:text-gray-500 hover:bg-gray-100 p-1 rounded-full transition-colors"
                  disabled={deleting}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Error Message Display */}
              {deleteError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                  <div className="flex items-center">
                    <AlertCircle className="h-4 w-4 text-red-600 mr-2" />
                    <p className="text-sm text-red-700">{deleteError}</p>
                  </div>
                </div>
              )}

              <div className="mb-6">
                <p className="text-gray-600">
                  Are you sure you want to delete <strong>{teamMember?.first_name} {teamMember?.last_name}</strong>? 
                  This action cannot be undone and will remove all associated data.
                </p>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowDeleteModal(false)
                    setDeleteError("") // Clear error when closing modal
                  }}
                  disabled={deleting}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteMember}
                  disabled={deleting}
                  className="flex-1 px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                >
                  {deleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Update Availability Modal */}
      <UpdateAvailabilityModal
        isOpen={showAvailabilityModal}
        onClose={() => setShowAvailabilityModal(false)}
        onSave={handleAvailabilityModalSave}
        teamMemberName={teamMember ? `${teamMember.first_name} ${teamMember.last_name}` : ''}
        selectedDates={selectedDates}
        availability={customAvailability}
      />

      {/* Edit Team Member Modal */}
      {editing && teamMember && (
        <AddTeamMemberModal
          isOpen={editing}
          onClose={() => {
            setEditing(false)
          }}
          onSuccess={handleMemberUpdate}
          userId={user?.id}
          member={teamMember}
          isEditing={true}
        />
      )}
    </>
  )
}

export default TeamMemberDetails 