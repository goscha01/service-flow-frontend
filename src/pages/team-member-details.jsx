import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Sidebar from '../components/sidebar'
import MobileHeader from '../components/mobile-header'
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
import { teamAPI } from '../services/api'

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

  // Load team member data
  useEffect(() => {
    if (memberId) {
      fetchTeamMemberDetails()
      fetchAvailableTerritories()
    }
  }, [memberId])



  const fetchTeamMemberDetails = async () => {
    try {
      setLoading(true)
      setError('')

      console.log('Fetching team member with ID:', memberId)
      const response = await teamAPI.getById(memberId)
      console.log('Team member response:', response)
      console.log('Team member data:', JSON.stringify(response, null, 2))
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

        // Parse availability
        if (teamMemberData.availability) {
          try {
            const parsedAvailability = typeof teamMemberData.availability === 'string'
              ? JSON.parse(teamMemberData.availability)
              : teamMemberData.availability

            if (parsedAvailability.workingHours) {
              setWorkingHours(parsedAvailability.workingHours)
            }
            if (parsedAvailability.customAvailability) {
              setCustomAvailability(parsedAvailability.customAvailability)
            }
          } catch (e) {
            console.error('Error parsing availability:', e)
            setWorkingHours({
              sunday: { available: false, hours: "" },
              monday: { available: true, hours: "9:00 AM - 6:00 PM" },
              tuesday: { available: true, hours: "9:00 AM - 6:00 PM" },
              wednesday: { available: true, hours: "9:00 AM - 6:00 PM" },
              thursday: { available: true, hours: "9:00 AM - 6:00 PM" },
              friday: { available: true, hours: "9:00 AM - 6:00 PM" },
              saturday: { available: false, hours: "" }
            })
          }
        }

        // Parse permissions/settings
        if (teamMemberData.permissions) {
          try {
            const parsedPermissions = typeof teamMemberData.permissions === 'string'
              ? JSON.parse(teamMemberData.permissions)
              : teamMemberData.permissions
            setSettings(parsedPermissions)
          } catch (e) {
            console.error('Error parsing permissions:', e)
          }
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
      first_name: teamMember.first_name || '',
      last_name: teamMember.last_name || '',
      email: teamMember.email || '',
      phone: teamMember.phone || '',
      role: teamMember.role || '',
      location: teamMember.location || '',
      city: teamMember.city || '',
      state: teamMember.state || '',
      zip_code: teamMember.zip_code || '',
      is_service_provider: teamMember.is_service_provider || false,
      color: teamMember.color || '#2563EB'
    })
    setEditing(true)
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

  const confirmDeleteMember = async () => {
    try {
      setDeleting(true)
      setDeleteError("") // Clear any previous errors
      await teamAPI.delete(memberId)
      navigate('/team')
    } catch (error) {
      console.error('Error deleting team member:', error)
      const errorMessage = error.response?.data?.error || error.message || 'Failed to delete team member. Please try again.'
      setDeleteError(errorMessage)
      // Don't close the modal on error - let user see the error message
    } finally {
      setDeleting(false)
    }
  }


  const fetchAvailableTerritories = async () => {
    try {
      setTerritoryLoading(true)
      console.log('Fetching available territories for user:', user?.id)
      const response = await fetch(`https://service-flow-backend-production.up.railway.app/api/territories?userId=${user?.id}&status=active`)
      const data = await response.json()
      console.log('Available territories response:', data)
      console.log('Available territories array:', data.territories)
      console.log('Available territories count:', data.territories?.length || 0)
      console.log('Full API response structure:', Object.keys(data))
      setAvailableTerritories(data.territories || [])
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

      // Remove the territory by its ID from the territories array
      const updatedTerritories = territories.filter(territoryId => {
        const numericId = typeof territoryId === 'string' ? parseInt(territoryId) : territoryId
        const removeId = typeof territoryToRemove === 'object' ? territoryToRemove.id : territoryToRemove
        const numericRemoveId = typeof removeId === 'string' ? parseInt(removeId) : removeId

        console.log('Comparing territory ID:', numericId, 'with remove ID:', numericRemoveId)
        return numericId !== numericRemoveId
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
    setCustomAvailability([
      ...customAvailability,
      {
        id: Date.now(),
        date: '',
        available: true,
        hours: ''
      }
    ])
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
    if (availableTerritories.length > 0 && territories.length > 0) {
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
    }
  }, [availableTerritories, territories])

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar isOpen={false} onClose={() => { }} />
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
        <Sidebar isOpen={false} onClose={() => { }} />
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
        <Sidebar isOpen={false} onClose={() => { }} />
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
        <Sidebar isOpen={false} onClose={() => { }} />

        <div className="flex-1 flex flex-col min-w-0 lg:ml-64">
          <MobileHeader onMenuClick={() => { }} />

          <div className="flex-1 overflow-auto">
            <div className="px-4 sm:px-6 lg:px-8 py-8">
              {/* Header */}
              <div className="mb-8">
                <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
                  <div className="flex items-center space-x-4">
                    <button
                      onClick={() => navigate("/team")}
                      className="flex items-center text-sm text-gray-500 hover:text-gray-700"
                    >
                      <ChevronLeft className="w-4 h-4 mr-1" />
                      All Team Members
                    </button>
                    <div className="h-6 w-px bg-gray-300 hidden sm:block"></div>
                    <h1 className="text-2xl font-bold text-gray-900">Team Member Details</h1>
                  </div>
                  <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2">
                    {!editing && (
                      <button
                        onClick={handleEditMember}
                        className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                      </button>
                    )}
                    {editing && (
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={handleCancelEdit}
                          className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleSaveMember}
                          disabled={saving}
                          className="flex items-center px-3 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50"
                        >
                          {saving ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              Saving...
                            </>
                          ) : (
                            <>
                              <Save className="w-4 h-4 mr-2" />
                              Save Changes
                            </>
                          )}
                        </button>
                      </div>
                    )}
                    <button
                      onClick={handleDeleteMember}
                      className="inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                {/* Basic Info Card */}
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                  <div className="p-4 sm:p-6">
                    <div className="flex items-center space-x-3 mb-6">
                      <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: teamMember.color || '#2563EB' }}>
                        <span className="font-medium text-lg" style={{ color: '#fff' }}>
                          {teamMember.first_name?.charAt(0) || 'T'}{teamMember.last_name?.charAt(0) || 'M'}
                        </span>
                      </div>
                      <div>
                        <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
                          {teamMember.first_name || 'First'} {teamMember.last_name || 'Last'}
                        </h2>
                        <p className="text-sm text-gray-500">{teamMember.role || 'Team Member'}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Contact Information */}
                      <div className="space-y-4">
                        <h3 className="text-lg font-medium text-gray-900">Contact Information</h3>

                        {editing ? (
                          <div className="space-y-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                              <input
                                type="text"
                                value={editFormData.first_name || ''}
                                onChange={(e) => setEditFormData({ ...editFormData, first_name: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                              <input
                                type="text"
                                value={editFormData.last_name || ''}
                                onChange={(e) => setEditFormData({ ...editFormData, last_name: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                              <input
                                type="email"
                                value={editFormData.email || ''}
                                onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                              <input
                                type="tel"
                                value={editFormData.phone || ''}
                                onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                              <input
                                type="text"
                                value={editFormData.role || ''}
                                onChange={(e) => setEditFormData({ ...editFormData, role: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Calendar Color</label>
                              <input
                                type="color"
                                value={editFormData.color || '#2563EB'}
                                onChange={(e) => setEditFormData({ ...editFormData, color: e.target.value })}
                                className="w-16 h-10 border border-gray-300 rounded"
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <div className="flex items-center space-x-3">
                              <Mail className="w-4 h-4 text-gray-400" />
                              <span className="text-sm text-gray-900">{teamMember.email || 'No email provided'}</span>
                            </div>
                            <div className="flex items-center space-x-3">
                              <Phone className="w-4 h-4 text-gray-400" />
                              <span className="text-sm text-gray-900">{teamMember.phone || 'No phone provided'}</span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Location Information */}
                      <div className="space-y-4">
                        <h3 className="text-lg font-medium text-gray-900">Location</h3>

                        {editing ? (
                          <div className="space-y-4">
                            <div className="relative" ref={addressRef}>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                              <input
                                type="text"
                                value={editFormData.location}
                                onChange={handleLocationChange}
                                placeholder="Start typing an address..."
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                              {addressLoading && (
                                <div className="absolute right-3 top-2">
                                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                                </div>
                              )}
                              {showAddressSuggestions && addressSuggestions.length > 0 && (
                                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto">
                                  {addressSuggestions.map((suggestion, index) => (
                                    <div
                                      key={index}
                                      onClick={() => handleAddressSelect(suggestion)}
                                      className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                                    >
                                      {suggestion.description}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                                <input
                                  type="text"
                                  value={editFormData.city}
                                  onChange={(e) => setEditFormData(prev => ({ ...prev, city: e.target.value }))}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                                <input
                                  type="text"
                                  value={editFormData.state}
                                  onChange={(e) => setEditFormData(prev => ({ ...prev, state: e.target.value }))}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">ZIP Code</label>
                                <input
                                  type="text"
                                  value={editFormData.zip_code}
                                  onChange={(e) => setEditFormData(prev => ({ ...prev, zip_code: e.target.value }))}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <div className="flex items-center space-x-3">
                              <MapPin className="w-4 h-4 text-gray-400" />
                              <span className="text-sm text-gray-900">
                                {teamMember.location || 'No address provided'}
                              </span>
                            </div>
                            {teamMember.city && teamMember.state && (
                              <div className="text-sm text-gray-600 ml-7">
                                {teamMember.city}, {teamMember.state} {teamMember.zip_code}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>


                {/* Territories Card */}
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                  <div className="p-4 sm:p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-medium text-gray-900">Territories</h3>
                      {!editing && (
                        <button
                          onClick={handleEditMember}
                          className="text-sm text-blue-600 hover:text-blue-700"
                        >
                          Edit
                        </button>
                      )}
                    </div>

                    {editing ? (
                      <div className="space-y-4">
                        <div className="flex flex-wrap gap-2">
                          {displayedTerritories.map((territory, index) => (
                            <div key={index} className="flex items-center space-x-2 bg-green-100 text-green-800 px-3 py-1 rounded-full">
                              <span className="text-sm">{territory.name || (typeof territory === 'number' ? `Territory ${territory}` : territory)}</span>
                              <button
                                onClick={() => handleRemoveTerritory(territory)}
                                className="text-green-600 hover:text-green-800"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                        <button
                          onClick={handleAddTerritory}
                          className="text-sm text-blue-600 hover:text-blue-700"
                        >
                          + Add Territory
                        </button>
                      </div>
                    ) : (
                      <div>
                        {console.log('Rendering displayed territories:', displayedTerritories)}
                        {console.log('Displayed territories type:', typeof displayedTerritories)}
                        {console.log('Displayed territories is array:', Array.isArray(displayedTerritories))}
                        {displayedTerritories.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {displayedTerritories.map((territory, index) => {
                              console.log('Rendering territory:', territory, 'type:', typeof territory)
                              return (
                                <span key={index} className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm">
                                  {territory.name || (typeof territory === 'number' ? `Territory ${territory}` : territory)}
                                </span>
                              )
                            })}
                          </div>
                        ) : (
                          <p className="text-gray-500 text-sm">No territories assigned</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Availability Section */}
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                  <div className="p-6">
                    <div className="mb-6">
                      <h4 className="text-base font-semibold text-gray-900">Availability</h4>
                      <p className="text-sm text-gray-500">
                        Manage this team member's availability by editing their regular work hours, or by adding custom availability for specific dates.
                        <a href="#" className="text-blue-600 hover:text-blue-700 ml-1">Learn more...</a>
                      </p>
                    </div>

                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-2">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span className="text-sm font-medium text-gray-900">Allow this team member to edit their availability</span>
                      </div>
                      <button
                        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${settings.canEditAvailability ? 'bg-green-500' : 'bg-gray-200'
                          }`}
                        onClick={async () => {
                          const newSettings = { ...settings, canEditAvailability: !settings.canEditAvailability }
                          setSettings(newSettings)
                          await handleSaveSettings(newSettings)
                        }}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${settings.canEditAvailability ? 'translate-x-5' : 'translate-x-0'
                            }`}
                        />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      {/* Recurring Hours */}
                      <div className="min-w-0">
                        <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0 mb-4">
                          <div className="flex items-center space-x-2">
                            <Clock className="w-4 h-4 text-gray-400" />
                            <h5 className="text-sm font-medium text-gray-900">RECURRING HOURS</h5>
                            <HelpCircle className="w-4 h-4 text-gray-400" />
                          </div>
                          <div className="flex space-x-2">
                            {!editingHours ? (
                              <button
                                onClick={() => setEditingHours(true)}
                                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                              >
                                Edit Hours
                              </button>
                            ) : (
                              <button
                                onClick={() => setEditingHours(false)}
                                className="text-sm text-gray-600 hover:text-gray-700 font-medium"
                              >
                                Done Editing
                              </button>
                            )}
                          </div>
                        </div>
                        {/* Compact Hours List - Similar to Screenshot */}
                        <div className="bg-white rounded-lg border border-gray-200">
                          {Object.entries(workingHours).map(([day, { available, hours, timeSlots = [] }], index) => (
                            <div key={day}>
                              <div className="flex items-center justify-between p-3 min-w-0">
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
                                    {editingHours ? (
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
                                    ) : (
                                      <div className="text-sm text-gray-600 text-right">
                                        {timeSlots.length > 0 ? (
                                          timeSlots.map((slot, slotIndex) => (
                                            <span key={slot.id}>
                                              {slot.start} - {slot.end}
                                              {slotIndex < timeSlots.length - 1 && ', '}
                                            </span>
                                          ))
                                        ) : (
                                          <span className="text-gray-500">{hours || 'No hours set'}</span>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <div className="text-sm text-gray-500">
                                    Unavailable
                                  </div>
                                )}
                              </div>
                              {index < Object.entries(workingHours).length - 1 && (
                                <div className="border-b border-gray-100"></div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Custom Availability */}
                      <div>
                        <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0 mb-4">
                          <div className="flex items-center space-x-2">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            <h5 className="text-sm font-medium text-gray-900">CUSTOM AVAILABILITY</h5>
                            <HelpCircle className="w-4 h-4 text-gray-400" />
                          </div>
                          {!editingAvailability ? (
                            <button
                              onClick={() => setEditingAvailability(true)}
                              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                            >
                              Add Date Override
                            </button>
                          ) : (
                            <div className="flex space-x-2">
                              <button
                                onClick={handleSaveCustomAvailability}
                                disabled={savingCustomAvailability}
                                className={`text-sm font-medium ${savingCustomAvailability
                                    ? 'text-gray-400 cursor-not-allowed'
                                    : 'text-green-600 hover:text-green-700'
                                  }`}
                              >
                                {savingCustomAvailability ? 'Saving...' : 'Save'}
                              </button>
                              <button
                                onClick={() => setEditingAvailability(false)}
                                className="text-sm text-gray-600 hover:text-gray-700 font-medium"
                              >
                                Cancel
                              </button>
                            </div>
                          )}
                        </div>

                        {editingAvailability && (
                          <div className="mb-4">
                            <button
                              onClick={handleAddCustomAvailability}
                              className="flex items-center text-sm text-blue-600 hover:text-blue-700 font-medium"
                            >
                              <Plus className="w-4 h-4 mr-1" />
                              Add Custom Date
                            </button>
                          </div>
                        )}

                        {customAvailability.length === 0 ? (
                          <div className="text-center p-6 bg-gray-50 rounded-lg">
                            <Calendar className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                            <p className="text-sm text-gray-500 mb-4">Add a date override</p>
                            <p className="text-xs text-gray-500 mb-4">Customize this provider's availability for specific dates.</p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {customAvailability.map((item) => (
                              <div key={item.id} className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:justify-between sm:space-y-0 p-3 bg-gray-50 rounded-lg">
                                <div className="flex-1 flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2">
                                  <input
                                    type="date"
                                    value={item.date}
                                    onChange={(e) => setCustomAvailability(prev =>
                                      prev.map(i => i.id === item.id ? { ...i, date: e.target.value } : i)
                                    )}
                                    className="text-sm border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                  />
                                  <input
                                    type="text"
                                    value={item.hours}
                                    onChange={(e) => setCustomAvailability(prev =>
                                      prev.map(i => i.id === item.id ? { ...i, hours: e.target.value } : i)
                                    )}
                                    placeholder="9:00 AM - 6:00 PM"
                                    className="text-sm border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                  />
                                </div>
                                {editingAvailability && (
                                  <button
                                    onClick={() => handleRemoveCustomAvailability(item.id)}
                                    className="text-red-600 hover:text-red-700"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Jobs Card */}
              {recentJobs.length > 0 && (
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center space-x-2">
                        <h3 className="text-lg font-semibold text-gray-900">Recent Jobs</h3>
                        <Calendar className="w-4 h-4 text-gray-400" />
                      </div>
                    </div>
                    <div className="space-y-4">
                      {recentJobs.slice(0, 5).map((job) => (
                        <div key={job.id} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
                            <div>
                              <h4 className="font-medium text-gray-900">{job.service_name}</h4>
                              <p className="text-sm text-gray-600">
                                {job.customer_first_name} {job.customer_last_name}
                              </p>
                              <p className="text-sm text-gray-500">
                                {job.scheduled_date ? job.scheduled_date.split(' ')[0] : 'No date'}
                              </p>
                            </div>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${job.status === 'completed' ? 'bg-green-100 text-green-800' :
                                job.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                                  'bg-gray-100 text-gray-800'
                              }`}>
                              {job.status.replace('_', ' ')}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
       
      

{/* Add Territory Modal */ }
{
  showAddTerritoryModal && (
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
  )
}


{/* Delete Confirmation Modal */ }
{
  showDeleteModal && (
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
   
  )
}
</>
)}
 

export default TeamMemberDetails 