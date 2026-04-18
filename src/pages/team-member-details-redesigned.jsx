import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Sidebar from '../components/sidebar'
import {
  ChevronLeft,
  Edit,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Settings,
  Users,
  Clock,
  CheckCircle,
  XCircle,
  HelpCircle,
  Plus,
  X,
  Bell,
  MessageSquare,
  User,
  AlertCircle,
  Zap,
  Flag,
  Tag,
  Palette,
  Trash2,
  DollarSign
} from 'lucide-react'
import { teamAPI, territoriesAPI, ledgerAPI } from '../services/api'
import TimeslotTemplateModal from '../components/timeslot-template-modal'
import DateOverrideModal from '../components/date-override-modal'

const TeamMemberDetailsRedesigned = () => {
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
  const [timeslotTemplates, setTimeslotTemplates] = useState([])
  const [isTimeslotTemplateModalOpen, setIsTimeslotTemplateModalOpen] = useState(false)
  const [editingTemplateIndex, setEditingTemplateIndex] = useState(null)
  const [showDateOverrideModal, setShowDateOverrideModal] = useState(false)
  const [editingOverrideIndex, setEditingOverrideIndex] = useState(null)
  const [overrideModalMode, setOverrideModalMode] = useState('unavailable') // 'unavailable' | 'custom_hours'
  const [memberAvailabilityRaw, setMemberAvailabilityRaw] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showAvailabilityModal, setShowAvailabilityModal] = useState(false)
  const [showSkillsModal, setShowSkillsModal] = useState(false)
  const [selectedColor, setSelectedColor] = useState('orange')
  const [skills, setSkills] = useState([])

  // Payout settings state
  const [payoutScheduleType, setPayoutScheduleType] = useState('manual')
  const [payoutDayOfWeek, setPayoutDayOfWeek] = useState(1)
  const [payoutSaving, setPayoutSaving] = useState(false)
  const [payoutSaved, setPayoutSaved] = useState(false)

  // Color options for calendar
  const colorOptions = [
    { name: 'red', value: 'bg-red-500' },
    { name: 'blue', value: 'bg-[var(--sf-blue-500)]' },
    { name: 'green', value: 'bg-green-500' },
    { name: 'yellow', value: 'bg-yellow-500' },
    { name: 'orange', value: 'bg-orange-500' },
    { name: 'purple', value: 'bg-purple-500' },
    { name: 'pink', value: 'bg-pink-500' },
    { name: 'indigo', value: 'bg-indigo-500' }
  ]

  useEffect(() => {
    if (memberId && user?.id) {
      fetchTeamMember()
      fetchTerritories()
    }
  }, [memberId, user?.id])

  const fetchTeamMember = async () => {
    try {
      setLoading(true)
      const member = await teamAPI.getById(memberId)
      setTeamMember(member)
      setPayoutScheduleType(member.payout_schedule_type || 'manual')
      setPayoutDayOfWeek(member.payout_day_of_week ?? 1)
      setEditFormData({
        first_name: member.first_name || '',
        last_name: member.last_name || '',
        email: member.email || '',
        phone: member.phone || '',
        address: member.address || '',
        role: member.role || 'Service Provider',
        status: member.status || 'active',
        can_be_assigned: member.can_be_assigned || true,
        can_edit_availability: member.can_edit_availability || true,
        auto_assign: member.auto_assign || true,
        can_claim_jobs: member.can_claim_jobs || true,
        email_notifications: member.email_notifications || true,
        sms_notifications: member.sms_notifications || false,
        push_notifications: member.push_notifications || false,
        calendar_color: member.calendar_color || 'orange',
        max_jobs_per_day: member.max_jobs_per_day || null
      })

      // Load member availability (timeslot templates, custom availability, working hours)
      try {
        const availData = await teamAPI.getAvailability(memberId)
        let avail = availData?.availability
        if (typeof avail === 'string') {
          try { avail = JSON.parse(avail) } catch (e) { avail = {} }
        }
        if (avail) {
          setMemberAvailabilityRaw(avail)
          setTimeslotTemplates(avail.timeslotTemplates || [])
          setCustomAvailability(avail.customAvailability || [])
          if (avail.workingHours) {
            setWorkingHours(avail.workingHours)
          }
        }
      } catch (availError) {
        console.error('Error fetching member availability:', availError)
      }
    } catch (error) {
      console.error('Error fetching team member:', error)
      setError('Failed to load team member details')
    } finally {
      setLoading(false)
    }
  }

  const fetchTerritories = async () => {
    try {
      const territoriesData = await territoriesAPI.getAll()
      setTerritories(territoriesData)
    } catch (error) {
      console.error('Error fetching territories:', error)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      const updatedMember = await teamAPI.update(memberId, editFormData)
      setTeamMember(updatedMember)
      setEditing(false)
      setShowEditModal(false)
    } catch (error) {
      console.error('Error updating team member:', error)
      setError('Failed to update team member')
    } finally {
      setSaving(false)
    }
  }

  const handleToggle = (field) => {
    setEditFormData(prev => ({
      ...prev,
      [field]: !prev[field]
    }))
  }

  const handleInputChange = (field, value) => {
    setEditFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const saveMemberAvailability = async (updatedAvail) => {
    const avail = { ...(memberAvailabilityRaw || {}), ...updatedAvail }
    await teamAPI.updateAvailability(memberId, avail)
    setMemberAvailabilityRaw(avail)
  }

  const handleSaveTimeslotTemplate = async (template) => {
    try {
      setSaving(true)
      let updatedTemplates
      if (editingTemplateIndex !== null) {
        updatedTemplates = [...timeslotTemplates]
        updatedTemplates[editingTemplateIndex] = template
      } else {
        updatedTemplates = [...timeslotTemplates, template]
      }
      await saveMemberAvailability({ timeslotTemplates: updatedTemplates, drivingTime: template.drivingTime ?? memberAvailabilityRaw?.drivingTime ?? 0 })
      setTimeslotTemplates(updatedTemplates)
      setIsTimeslotTemplateModalOpen(false)
      setEditingTemplateIndex(null)
    } catch (error) {
      console.error('Error saving timeslot template:', error)
      setError('Failed to save timeslot template')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteTimeslotTemplate = async (indexToDelete) => {
    try {
      setSaving(true)
      const updatedTemplates = timeslotTemplates.filter((_, i) => i !== indexToDelete)
      await saveMemberAvailability({ timeslotTemplates: updatedTemplates })
      setTimeslotTemplates(updatedTemplates)
    } catch (error) {
      console.error('Error deleting timeslot template:', error)
      setError('Failed to delete timeslot template')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveDateOverride = async (overrideData) => {
    try {
      setSaving(true)
      let updatedOverrides
      if (editingOverrideIndex !== null) {
        updatedOverrides = [...customAvailability]
        updatedOverrides[editingOverrideIndex] = overrideData
      } else {
        updatedOverrides = [...customAvailability, overrideData]
      }
      updatedOverrides.sort((a, b) => a.date.localeCompare(b.date))
      await saveMemberAvailability({ customAvailability: updatedOverrides })
      setCustomAvailability(updatedOverrides)
      setShowDateOverrideModal(false)
      setEditingOverrideIndex(null)
    } catch (error) {
      console.error('Error saving date override:', error)
      setError('Failed to save date override')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteDateOverride = async (indexToDelete) => {
    try {
      setSaving(true)
      const updatedOverrides = customAvailability.filter((_, i) => i !== indexToDelete)
      await saveMemberAvailability({ customAvailability: updatedOverrides })
      setCustomAvailability(updatedOverrides)
    } catch (error) {
      console.error('Error deleting date override:', error)
      setError('Failed to delete date override')
    } finally {
      setSaving(false)
    }
  }

  const getInitials = (firstName, lastName) => {
    return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase()
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-blue-100 text-blue-800'
      case 'inactive': return 'bg-[var(--sf-bg-page)] text-[var(--sf-text-primary)]'
      case 'suspended': return 'bg-red-100 text-red-800'
      default: return 'bg-[var(--sf-bg-page)] text-[var(--sf-text-primary)]'
    }
  }

  const getStatusText = (status) => {
    switch (status) {
      case 'active': return 'Account Activated'
      case 'inactive': return 'Account Inactive'
      case 'suspended': return 'Account Suspended'
      default: return 'Unknown Status'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--sf-bg-page)] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[var(--sf-bg-page)] flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-red-400" />
          <h3 className="mt-2 text-sm font-medium text-[var(--sf-text-primary)]">{error}</h3>
          <div className="mt-6">
            <button
              onClick={() => navigate('/team')}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-[var(--sf-blue-500)] hover:bg-[var(--sf-blue-600)]"
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
      <div className="min-h-screen bg-[var(--sf-bg-page)] flex items-center justify-center">
        <div className="text-center">
          <h3 className="mt-2 text-sm font-medium text-[var(--sf-text-primary)]">Team member not found</h3>
          <div className="mt-6">
            <button
              onClick={() => navigate('/team')}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-[var(--sf-blue-500)] hover:bg-[var(--sf-blue-600)]"
            >
              Back to Team
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--sf-bg-page)] flex">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <div className="flex-1 min-w-0 overflow-hidden ml-16 lg:ml-64 xl:ml-72">
        
        <div className="p-6">
          {/* Header */}
          <div className="mb-8">
            <button
              onClick={() => navigate('/team')}
              className="flex items-center text-[var(--sf-text-secondary)] hover:text-[var(--sf-text-primary)] mb-6"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              <span className="text-sm font-medium">All Team Members</span>
            </button>

            {/* Profile Header */}
            <div className="bg-white rounded-lg shadow-sm border border-[var(--sf-border-light)] p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-red-100 rounded-lg flex items-center justify-center">
                    <span className="text-red-600 font-bold text-xl">
                      {getInitials(teamMember.first_name, teamMember.last_name)}
                    </span>
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-[var(--sf-text-primary)]">
                      {teamMember.first_name} {teamMember.last_name}
                    </h1>
                    <p className="text-[var(--sf-text-secondary)]">{editFormData.role || 'Service Provider'}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowEditModal(true)}
                  className="px-4 py-2 text-[var(--sf-blue-500)] hover:text-[var(--sf-blue-500)] text-sm font-medium"
                >
                  Edit
                </button>
              </div>
            </div>
          </div>

          {/* Personal Information */}
          <div className="bg-white rounded-lg shadow-sm border border-[var(--sf-border-light)] p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-[var(--sf-text-primary)]">Personal Information</h2>
              <button
                onClick={() => setShowEditModal(true)}
                className="px-4 py-2 text-[var(--sf-blue-500)] hover:text-[var(--sf-blue-500)] text-sm font-medium"
              >
                Edit
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <Phone className="w-4 h-4 text-[var(--sf-text-muted)]" />
                <span className="text-sm text-[var(--sf-text-primary)]">
                  {editFormData.phone || 'No phone number'}
                </span>
              </div>
              
              <div className="flex items-center space-x-3">
                <Mail className="w-4 h-4 text-[var(--sf-text-muted)]" />
                <span className="text-sm text-[var(--sf-text-primary)]">{editFormData.email}</span>
              </div>
              
              <div className="flex items-center space-x-3">
                <MapPin className="w-4 h-4 text-[var(--sf-text-muted)]" />
                <span className="text-sm text-[var(--sf-text-primary)]">
                  {editFormData.address || 'No address on file'}
                </span>
              </div>
              
              <div className="flex items-center space-x-3">
                <span className="text-sm text-[var(--sf-text-primary)]">Status:</span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(editFormData.status)}`}>
                  {getStatusText(editFormData.status)}
                </span>
              </div>
              
              <div className="flex items-center space-x-3">
                <span className="text-sm text-[var(--sf-text-primary)]">Role:</span>
                <span className="text-sm text-[var(--sf-text-primary)]">{editFormData.role}</span>
              </div>
              
              <div className="flex items-center space-x-3">
                <span className="text-sm text-[var(--sf-text-primary)]">Role permissions:</span>
                <span className="text-sm text-[var(--sf-text-secondary)]">
                  {editFormData.role === 'Account Owner' 
                    ? 'Has full access to all areas of account'
                    : 'Limited access based on role'
                  }
                </span>
              </div>
            </div>
          </div>

          {/* Metadata */}
          <div className="bg-white rounded-lg shadow-sm border border-[var(--sf-border-light)] p-6 mb-6">
            <div className="flex items-center space-x-2 mb-4">
              <h2 className="text-lg font-semibold text-[var(--sf-text-primary)]">Metadata</h2>
              <HelpCircle className="w-4 h-4 text-[var(--sf-text-muted)]" />
            </div>
            <p className="text-sm text-[var(--sf-text-secondary)]">No custom metadata added yet</p>
          </div>

          {/* Service Provider */}
          <div className="bg-white rounded-lg shadow-sm border border-[var(--sf-border-light)] p-6 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-[var(--sf-text-primary)] mb-1">Service Provider</h2>
                <p className="text-sm text-[var(--sf-text-secondary)]">This team member can be assigned to jobs.</p>
              </div>
              <div className="flex items-center space-x-2">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  editFormData.can_be_assigned 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-[var(--sf-bg-page)] text-[var(--sf-text-primary)]'
                }`}>
                  {editFormData.can_be_assigned ? 'YES' : 'NO'}
                </span>
                <button
                  onClick={() => handleToggle('can_be_assigned')}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    editFormData.can_be_assigned ? 'bg-[var(--sf-blue-500)]' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      editFormData.can_be_assigned ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Availability */}
          <div className="bg-white rounded-lg shadow-sm border border-[var(--sf-border-light)] p-6 mb-6">
            <h2 className="text-lg font-semibold text-[var(--sf-text-primary)] mb-2">Availability</h2>
            <p className="text-sm text-[var(--sf-text-secondary)] mb-6">
              Manage this team member's availability by editing their regular work hours, or by adding custom availability for specific dates. Learn more...
            </p>

            {/* Allow editing availability */}
            <div className="flex items-center justify-between mb-6">
              <span className="text-sm font-medium text-[var(--sf-text-primary)]">
                Allow this team member to edit their availability
              </span>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-[var(--sf-text-secondary)]">
                  The team member's role allows them to edit their availability.
                </span>
                <button
                  onClick={() => handleToggle('can_edit_availability')}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    editFormData.can_edit_availability ? 'bg-[var(--sf-blue-500)]' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      editFormData.can_edit_availability ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recurring Hours */}
              <div>
                <div className="flex items-center space-x-2 mb-4">
                  <h3 className="text-sm font-semibold text-[var(--sf-text-primary)]">RECURRING HOURS</h3>
                  <HelpCircle className="w-4 h-4 text-[var(--sf-text-muted)]" />
                </div>
                <div className="space-y-2">
                  {['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].map(day => {
                    const hours = workingHours[day] || { available: false };
                    const displayHours = hours.available
                      ? (hours.start && hours.end
                        ? `${hours.start.replace(/^0/, '')} - ${hours.end.replace(/^0/, '')}`
                        : hours.hours || (hours.timeSlots?.length > 0
                          ? hours.timeSlots.map(ts => `${ts.start} - ${ts.end}`).join(', ')
                          : 'Available'))
                      : 'Unavailable';
                    return (
                      <div key={day} className="flex justify-between items-center text-sm">
                        <span className="capitalize font-medium text-[var(--sf-text-primary)]">{day}</span>
                        <span className={hours.available ? 'text-[var(--sf-text-secondary)]' : 'text-[var(--sf-text-muted)]'}>
                          {displayHours}
                        </span>
                      </div>
                    );
                  })}
                </div>
                {memberAvailabilityRaw?.break && (
                  <div className="mt-3 flex justify-between items-center text-sm bg-[var(--sf-bg-page)] rounded px-3 py-1.5">
                    <span className="font-medium text-[var(--sf-text-primary)]">Break</span>
                    <span className="text-[var(--sf-text-secondary)]">{memberAvailabilityRaw.break.start} - {memberAvailabilityRaw.break.end}</span>
                  </div>
                )}
                <button
                  onClick={() => setShowAvailabilityModal(true)}
                  className="mt-4 text-[var(--sf-blue-500)] hover:text-[var(--sf-blue-500)] text-sm font-medium"
                >
                  Edit Hours
                </button>
              </div>

              {/* Time Off / Additional Hours — split by override.available */}
              {(() => {
                const timeOffItems = customAvailability
                  .map((o, index) => ({ o, index }))
                  .filter(({ o }) => o.available === false)
                const additionalHoursItems = customAvailability
                  .map((o, index) => ({ o, index }))
                  .filter(({ o }) => o.available !== false && Array.isArray(o.hours) && o.hours.length > 0)
                const openModal = (mode, index = null) => {
                  setOverrideModalMode(mode)
                  setEditingOverrideIndex(index)
                  setShowDateOverrideModal(true)
                }
                const formatDate = (dateStr) => new Date(dateStr + 'T00:00:00')
                  .toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
                const formatHours = (hours) => Array.isArray(hours)
                  ? hours.filter(h => h && h.start && h.end).map(h => `${h.start}-${h.end}`).join(', ')
                  : (typeof hours === 'string' && hours.toLowerCase() !== 'unavailable' ? hours : '')

                return (
                  <>
                    {/* Time Off */}
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-2">
                          <h3 className="text-sm font-semibold text-[var(--sf-text-primary)]">TIME OFF</h3>
                          <HelpCircle className="w-4 h-4 text-[var(--sf-text-muted)]" />
                        </div>
                        {timeOffItems.length > 0 && (
                          <button
                            onClick={() => openModal('unavailable')}
                            className="text-[var(--sf-blue-500)] hover:text-[var(--sf-blue-500)] text-sm font-medium flex items-center gap-1"
                          >
                            <Plus className="w-3 h-3" /> Add
                          </button>
                        )}
                      </div>
                      {timeOffItems.length === 0 ? (
                        <div className="bg-[var(--sf-bg-page)] rounded-lg p-4 text-center">
                          <Calendar className="w-8 h-8 text-[var(--sf-text-muted)] mx-auto mb-2" />
                          <p className="text-sm text-[var(--sf-text-secondary)] mb-3">
                            Mark specific dates as unavailable.
                          </p>
                          <button
                            onClick={() => openModal('unavailable')}
                            className="px-4 py-2 bg-[var(--sf-blue-500)] text-white text-sm font-medium rounded-lg hover:bg-[var(--sf-blue-600)]"
                          >
                            Add Time Off
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {timeOffItems.map(({ o, index }) => (
                            <div key={index} className="flex items-center justify-between p-3 bg-[var(--sf-bg-page)] rounded-lg">
                              <div className="flex items-center gap-2">
                                <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
                                <div>
                                  <p className="text-sm font-medium text-[var(--sf-text-primary)]">{formatDate(o.date)}</p>
                                  <p className="text-xs text-[var(--sf-text-muted)]">
                                    {o.label ? `${o.label} · Unavailable` : 'Unavailable'}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => openModal('unavailable', index)}
                                  className="text-[var(--sf-blue-500)] hover:text-[var(--sf-blue-500)] text-xs font-medium px-2 py-1"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleDeleteDateOverride(index)}
                                  className="text-red-400 hover:text-red-600 p-1"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Additional Hours */}
                    <div className="mt-8">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-2">
                          <h3 className="text-sm font-semibold text-[var(--sf-text-primary)]">ADDITIONAL HOURS</h3>
                          <HelpCircle className="w-4 h-4 text-[var(--sf-text-muted)]" />
                        </div>
                        {additionalHoursItems.length > 0 && (
                          <button
                            onClick={() => openModal('custom_hours')}
                            className="text-[var(--sf-blue-500)] hover:text-[var(--sf-blue-500)] text-sm font-medium flex items-center gap-1"
                          >
                            <Plus className="w-3 h-3" /> Add
                          </button>
                        )}
                      </div>
                      {additionalHoursItems.length === 0 ? (
                        <div className="bg-[var(--sf-bg-page)] rounded-lg p-4 text-center">
                          <Calendar className="w-8 h-8 text-[var(--sf-text-muted)] mx-auto mb-2" />
                          <p className="text-sm text-[var(--sf-text-secondary)] mb-3">
                            Add custom working hours for a specific date (e.g. a day normally off).
                          </p>
                          <button
                            onClick={() => openModal('custom_hours')}
                            className="px-4 py-2 bg-[var(--sf-blue-500)] text-white text-sm font-medium rounded-lg hover:bg-[var(--sf-blue-600)]"
                          >
                            Add Additional Hours
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {additionalHoursItems.map(({ o, index }) => (
                            <div key={index} className="flex items-center justify-between p-3 bg-[var(--sf-bg-page)] rounded-lg">
                              <div className="flex items-center gap-2">
                                <div className="w-2.5 h-2.5 rounded-full bg-green-500"></div>
                                <div>
                                  <p className="text-sm font-medium text-[var(--sf-text-primary)]">{formatDate(o.date)}</p>
                                  <p className="text-xs text-[var(--sf-text-muted)]">
                                    {o.label && `${o.label} · `}{formatHours(o.hours) || 'Custom'}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => openModal('custom_hours', index)}
                                  className="text-[var(--sf-blue-500)] hover:text-[var(--sf-blue-500)] text-xs font-medium px-2 py-1"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleDeleteDateOverride(index)}
                                  className="text-red-400 hover:text-red-600 p-1"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )
              })()}
            </div>

          </div>

          {/* Timeslot Templates */}
          <div className="bg-white rounded-lg shadow-sm border border-[var(--sf-border-light)] p-6 mb-6">
            <h2 className="text-lg font-semibold text-[var(--sf-text-primary)] mb-2">Timeslot Templates</h2>
            <p className="text-sm text-[var(--sf-text-secondary)] mb-6">
              Configure timeslot settings for this team member. These control how booking time slots are generated.
            </p>

            {timeslotTemplates.length === 0 ? (
              <div className="bg-[var(--sf-bg-page)] rounded-lg p-6 text-center">
                <Clock className="w-8 h-8 text-[var(--sf-text-muted)] mx-auto mb-2" />
                <p className="text-sm text-[var(--sf-text-secondary)] mb-3">No timeslot templates configured for this member.</p>
                <button
                  onClick={() => { setEditingTemplateIndex(null); setIsTimeslotTemplateModalOpen(true) }}
                  className="px-4 py-2 bg-[var(--sf-blue-500)] text-white text-sm font-medium rounded-lg hover:bg-[var(--sf-blue-600)]"
                >
                  New Timeslot Template
                </button>
              </div>
            ) : (
              <>
                <div className="flex justify-end mb-4">
                  <button
                    onClick={() => { setEditingTemplateIndex(null); setIsTimeslotTemplateModalOpen(true) }}
                    className="px-4 py-2 bg-[var(--sf-blue-500)] text-white text-sm font-medium rounded-lg hover:bg-[var(--sf-blue-600)]"
                  >
                    New Template
                  </button>
                </div>
                <div className="space-y-3">
                  {timeslotTemplates.map((template, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border border-[var(--sf-border-light)] rounded-lg">
                      <div className="flex-1">
                        <h4 className="font-medium text-[var(--sf-text-primary)]">{template.name || `Template ${index + 1}`}</h4>
                        {template.description && <p className="text-sm text-[var(--sf-text-secondary)]">{template.description}</p>}
                        <div className="flex items-center gap-3 mt-1 text-xs text-[var(--sf-text-muted)]">
                          <span>{template.timeslotType || 'Arrival windows'}</span>
                          {template.arrivalWindowLength && (
                            <span>{template.arrivalWindowLength >= 60 ? `${template.arrivalWindowLength / 60}h` : `${template.arrivalWindowLength}m`} window</span>
                          )}
                          {template.drivingTime > 0 && (
                            <span className="text-amber-600">{template.drivingTime} min interval</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={() => { setEditingTemplateIndex(index); setIsTimeslotTemplateModalOpen(true) }}
                          className="text-[var(--sf-blue-500)] hover:text-[var(--sf-blue-500)] text-sm font-medium"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteTimeslotTemplate(index)}
                          className="text-red-600 hover:text-red-700 text-sm font-medium"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

      

          {/* Payout Settings */}
          <div className="bg-white rounded-lg shadow-sm border border-[var(--sf-border-light)] p-6 mb-6">
            <div className="flex items-center space-x-2 mb-2">
              <DollarSign className="w-5 h-5 text-[var(--sf-text-muted)]" />
              <h2 className="text-lg font-semibold text-[var(--sf-text-primary)]">Payout Settings</h2>
            </div>
            <p className="text-sm text-[var(--sf-text-secondary)] mb-6">
              Configure how and when this team member gets paid out.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--sf-text-primary)] mb-1">Schedule Type</label>
                <select
                  value={payoutScheduleType}
                  onChange={e => setPayoutScheduleType(e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--sf-border-light)] rounded-lg text-sm focus:ring-2 focus:ring-[var(--sf-blue-500)] focus:border-[var(--sf-blue-500)]"
                >
                  <option value="manual">Manual</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="biweekly">Biweekly</option>
                </select>
                <p className="text-xs text-[var(--sf-text-muted)] mt-1">
                  {payoutScheduleType === 'manual' && 'Payouts are created manually by an admin.'}
                  {payoutScheduleType === 'daily' && 'A payout batch is created automatically every day.'}
                  {payoutScheduleType === 'weekly' && 'A payout batch is created automatically once per week.'}
                  {payoutScheduleType === 'biweekly' && 'A payout batch is created automatically every two weeks.'}
                </p>
              </div>

              {(payoutScheduleType === 'weekly' || payoutScheduleType === 'biweekly') && (
                <div>
                  <label className="block text-sm font-medium text-[var(--sf-text-primary)] mb-1">Day of Week</label>
                  <select
                    value={payoutDayOfWeek}
                    onChange={e => setPayoutDayOfWeek(parseInt(e.target.value, 10))}
                    className="w-full px-3 py-2 border border-[var(--sf-border-light)] rounded-lg text-sm focus:ring-2 focus:ring-[var(--sf-blue-500)] focus:border-[var(--sf-blue-500)]"
                  >
                    <option value={0}>Sunday</option>
                    <option value={1}>Monday</option>
                    <option value={2}>Tuesday</option>
                    <option value={3}>Wednesday</option>
                    <option value={4}>Thursday</option>
                    <option value={5}>Friday</option>
                    <option value={6}>Saturday</option>
                  </select>
                </div>
              )}

              <div className="flex items-center gap-3">
                <button
                  onClick={async () => {
                    setPayoutSaving(true)
                    setPayoutSaved(false)
                    try {
                      await ledgerAPI.updatePayoutPreferences(memberId, {
                        payoutScheduleType,
                        payoutDayOfWeek
                      })
                      setPayoutSaved(true)
                      setTimeout(() => setPayoutSaved(false), 3000)
                    } catch (err) {
                      alert(err.response?.data?.error || 'Failed to save payout preferences')
                    } finally {
                      setPayoutSaving(false)
                    }
                  }}
                  disabled={payoutSaving}
                  style={{ backgroundColor: 'var(--sf-blue-500)', color: '#fff', padding: '8px 20px', fontSize: '14px', fontWeight: 500, borderRadius: '8px', border: 'none', cursor: payoutSaving ? 'not-allowed' : 'pointer', opacity: payoutSaving ? 0.5 : 1 }}
                >
                  {payoutSaving ? 'Saving...' : 'Save Payout Settings'}
                </button>
                {payoutSaved && (
                  <span className="text-sm text-green-600 font-medium flex items-center gap-1">
                    <CheckCircle className="w-4 h-4" /> Saved
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Notifications */}
          <div className="bg-white rounded-lg shadow-sm border border-[var(--sf-border-light)] p-6 mb-6">
            <h2 className="text-lg font-semibold text-[var(--sf-text-primary)] mb-2">Notifications</h2>
            <p className="text-sm text-[var(--sf-text-secondary)] mb-6">
              How should this service provider be notified when they are assigned to a job?
            </p>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Bell className="w-4 h-4 text-[var(--sf-text-muted)]" />
                  <div>
                    <span className="text-sm font-medium text-[var(--sf-text-primary)]">Push Alerts: Not enabled</span>
                    <p className="text-xs text-[var(--sf-text-muted)]">This service provider has not enabled push notifications.</p>
                  </div>
                </div>
                <span className="text-sm text-[var(--sf-text-muted)]">Not enabled</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Mail className="w-4 h-4 text-[var(--sf-text-muted)]" />
                  <span className="text-sm font-medium text-[var(--sf-text-primary)]">Emails</span>
                </div>
                <button
                  onClick={() => handleToggle('email_notifications')}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    editFormData.email_notifications ? 'bg-[var(--sf-blue-500)]' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      editFormData.email_notifications ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <MessageSquare className="w-4 h-4 text-[var(--sf-text-muted)]" />
                  <span className="text-sm font-medium text-[var(--sf-text-primary)]">Text Messages (SMS)</span>
                </div>
                <button
                  onClick={() => handleToggle('sms_notifications')}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    editFormData.sms_notifications ? 'bg-[var(--sf-blue-500)]' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      editFormData.sms_notifications ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Skills */}
          <div className="bg-white rounded-lg shadow-sm border border-[var(--sf-border-light)] p-6 mb-6">
            <h2 className="text-lg font-semibold text-[var(--sf-text-primary)] mb-2">Skills</h2>
            <p className="text-sm text-[var(--sf-text-secondary)] mb-4">
              Skill tags can be used to make sure workers meet specific job-related skills, certifications, equipment and licensing requirements.
            </p>
            
            <div className="bg-[var(--sf-bg-page)] rounded-lg p-4 text-center">
              <Tag className="w-8 h-8 text-[var(--sf-text-muted)] mx-auto mb-2" />
              <p className="text-sm text-[var(--sf-text-secondary)] mb-3">
                This provider doesn't have any skill tags yet.
              </p>
              <button
                onClick={() => setShowSkillsModal(true)}
                className="text-[var(--sf-blue-500)] hover:text-[var(--sf-blue-500)] text-sm font-medium"
              >
                Edit Skills
              </button>
            </div>
          </div>

          {/* Calendar Color */}
          <div className="bg-white rounded-lg shadow-sm border border-[var(--sf-border-light)] p-6">
            <h2 className="text-lg font-semibold text-[var(--sf-text-primary)] mb-4">Calendar color.</h2>
            <div className="flex space-x-2">
              {colorOptions.map((color) => (
                <button
                  key={color.name}
                  onClick={() => setSelectedColor(color.name)}
                  className={`w-8 h-8 rounded-lg ${color.value} flex items-center justify-center ${
                    selectedColor === color.name ? 'ring-2 ring-gray-400' : ''
                  }`}
                >
                  {selectedColor === color.name && (
                    <CheckCircle className="w-4 h-4 text-white" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-[var(--sf-text-primary)]">Edit Team Member</h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-[var(--sf-text-muted)] hover:text-[var(--sf-text-secondary)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--sf-text-primary)] mb-1">First Name</label>
                  <input
                    type="text"
                    value={editFormData.first_name}
                    onChange={(e) => handleInputChange('first_name', e.target.value)}
                    className="w-full px-3 py-2 border border-[var(--sf-border-light)] rounded-lg focus:ring-2 focus:ring-[var(--sf-blue-500)] focus:border-[var(--sf-blue-500)]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--sf-text-primary)] mb-1">Last Name</label>
                  <input
                    type="text"
                    value={editFormData.last_name}
                    onChange={(e) => handleInputChange('last_name', e.target.value)}
                    className="w-full px-3 py-2 border border-[var(--sf-border-light)] rounded-lg focus:ring-2 focus:ring-[var(--sf-blue-500)] focus:border-[var(--sf-blue-500)]"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-[var(--sf-text-primary)] mb-1">Email</label>
                <input
                  type="email"
                  value={editFormData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--sf-border-light)] rounded-lg focus:ring-2 focus:ring-[var(--sf-blue-500)] focus:border-[var(--sf-blue-500)]"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-[var(--sf-text-primary)] mb-1">Phone</label>
                <input
                  type="tel"
                  value={editFormData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--sf-border-light)] rounded-lg focus:ring-2 focus:ring-[var(--sf-blue-500)] focus:border-[var(--sf-blue-500)]"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-[var(--sf-text-primary)] mb-1">Address</label>
                <input
                  type="text"
                  value={editFormData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--sf-border-light)] rounded-lg focus:ring-2 focus:ring-[var(--sf-blue-500)] focus:border-[var(--sf-blue-500)]"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-[var(--sf-text-primary)] mb-1">Role</label>
                <select
                  value={editFormData.role}
                  onChange={(e) => handleInputChange('role', e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--sf-border-light)] rounded-lg focus:ring-2 focus:ring-[var(--sf-blue-500)] focus:border-[var(--sf-blue-500)]"
                >
                  <option value="Service Provider">Service Provider</option>
                  <option value="Account Owner">Account Owner</option>
                  <option value="Manager">Manager</option>
                  <option value="Admin">Admin</option>
                </select>
              </div>
            </div>
            
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowEditModal(false)}
                className="flex-1 px-4 py-2 border border-[var(--sf-border-light)] text-[var(--sf-text-primary)] rounded-lg hover:bg-[var(--sf-bg-page)]"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 px-4 py-2 bg-[var(--sf-blue-500)] text-white rounded-lg hover:bg-[var(--sf-blue-600)] disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      <TimeslotTemplateModal
        isOpen={isTimeslotTemplateModalOpen}
        onClose={() => { setIsTimeslotTemplateModalOpen(false); setEditingTemplateIndex(null) }}
        onSave={handleSaveTimeslotTemplate}
        existingTemplate={editingTemplateIndex !== null ? timeslotTemplates[editingTemplateIndex] : null}
      />

      <DateOverrideModal
        isOpen={showDateOverrideModal}
        onClose={() => { setShowDateOverrideModal(false); setEditingOverrideIndex(null) }}
        onSave={handleSaveDateOverride}
        existingOverride={editingOverrideIndex !== null ? customAvailability[editingOverrideIndex] : null}
        defaultMode={overrideModalMode}
      />

      {/* Availability Edit Modal */}
      {showAvailabilityModal && (() => {
        const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const initHours = {};
        days.forEach(day => {
          const dh = workingHours[day] || {};
          initHours[day] = {
            available: dh.available !== false,
            start: dh.start || (dh.timeSlots?.[0]?.start) || '09:00',
            end: dh.end || (dh.timeSlots?.[dh.timeSlots?.length - 1]?.end) || '18:00'
          };
        });
        const initBreak = memberAvailabilityRaw?.break || { start: '13:00', end: '14:00' };

        const AvailModal = () => {
          const [hrs, setHrs] = useState(initHours);
          const [brk, setBrk] = useState(initBreak);
          const [breakEnabled, setBreakEnabled] = useState(!!memberAvailabilityRaw?.break);
          const [saving, setSaving] = useState(false);

          const updateDay = (day, field, value) => setHrs(prev => ({ ...prev, [day]: { ...prev[day], [field]: value } }));

          const handleSave = async () => {
            setSaving(true);
            const newAvail = {
              workingHours: {},
              customAvailability: customAvailability || []
            };
            if (breakEnabled) newAvail.break = brk;
            days.forEach(day => {
              const d = hrs[day];
              newAvail.workingHours[day] = d.available
                ? { available: true, start: d.start, end: d.end, hours: `${d.start} - ${d.end}` }
                : { available: false, hours: '' };
            });
            try {
              await teamAPI.updateAvailability(memberId, newAvail);
              setWorkingHours(newAvail.workingHours);
              setMemberAvailabilityRaw(newAvail);
              setShowAvailabilityModal(false);
            } catch (err) {
              console.error('Failed to save availability:', err);
              alert('Failed to save availability');
            } finally { setSaving(false); }
          };

          return (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowAvailabilityModal(false)}>
              <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between p-4 border-b border-[var(--sf-border)]">
                  <h3 className="text-lg font-semibold text-[var(--sf-text-primary)]">Edit Working Hours</h3>
                  <button onClick={() => setShowAvailabilityModal(false)} className="p-1 hover:bg-[var(--sf-bg-hover)] rounded"><X size={18} /></button>
                </div>
                <div className="p-4 space-y-3">
                  {days.map(day => (
                    <div key={day} className="flex items-center gap-3">
                      <label className="flex items-center gap-2 w-24">
                        <input type="checkbox" checked={hrs[day].available} onChange={e => updateDay(day, 'available', e.target.checked)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                        <span className="text-sm font-medium capitalize text-[var(--sf-text-primary)]">{day.slice(0, 3)}</span>
                      </label>
                      {hrs[day].available ? (
                        <div className="flex items-center gap-1 flex-1">
                          <input type="time" value={hrs[day].start} onChange={e => updateDay(day, 'start', e.target.value)}
                            className="text-sm border border-[var(--sf-border)] rounded px-2 py-1 w-28" />
                          <span className="text-[var(--sf-text-muted)] text-xs">to</span>
                          <input type="time" value={hrs[day].end} onChange={e => updateDay(day, 'end', e.target.value)}
                            className="text-sm border border-[var(--sf-border)] rounded px-2 py-1 w-28" />
                        </div>
                      ) : (
                        <span className="text-sm text-[var(--sf-text-muted)] flex-1">Unavailable</span>
                      )}
                    </div>
                  ))}
                  <div className="border-t border-[var(--sf-border)] pt-3 mt-3">
                    <label className="flex items-center gap-2 mb-2">
                      <input type="checkbox" checked={breakEnabled} onChange={e => setBreakEnabled(e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                      <span className="text-sm font-medium text-[var(--sf-text-primary)]">Daily Break</span>
                    </label>
                    {breakEnabled && (
                      <div className="flex items-center gap-1 ml-6">
                        <input type="time" value={brk.start} onChange={e => setBrk(prev => ({ ...prev, start: e.target.value }))}
                          className="text-sm border border-[var(--sf-border)] rounded px-2 py-1 w-28" />
                        <span className="text-[var(--sf-text-muted)] text-xs">to</span>
                        <input type="time" value={brk.end} onChange={e => setBrk(prev => ({ ...prev, end: e.target.value }))}
                          className="text-sm border border-[var(--sf-border)] rounded px-2 py-1 w-28" />
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex justify-end gap-2 p-4 border-t border-[var(--sf-border)]">
                  <button onClick={() => setShowAvailabilityModal(false)}
                    className="px-4 py-2 text-sm text-[var(--sf-text-secondary)] hover:bg-[var(--sf-bg-hover)] rounded-lg">Cancel</button>
                  <button onClick={handleSave} disabled={saving}
                    className="px-4 py-2 text-sm text-white bg-[var(--sf-blue-500)] hover:bg-blue-700 rounded-lg disabled:opacity-50">
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
            </div>
          );
        };
        return <AvailModal />;
      })()}
    </div>
  )
}

export default TeamMemberDetailsRedesigned
