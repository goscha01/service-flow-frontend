import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Sidebar from '../components/sidebar'
import MobileHeader from '../components/mobile-header'
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
  Palette
} from 'lucide-react'
import { teamAPI, territoriesAPI } from '../services/api'

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
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showAvailabilityModal, setShowAvailabilityModal] = useState(false)
  const [showSkillsModal, setShowSkillsModal] = useState(false)
  const [selectedColor, setSelectedColor] = useState('orange')
  const [skills, setSkills] = useState([])

  // Color options for calendar
  const colorOptions = [
    { name: 'red', value: 'bg-red-500' },
    { name: 'blue', value: 'bg-blue-500' },
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

  const getInitials = (firstName, lastName) => {
    return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase()
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-blue-100 text-blue-800'
      case 'inactive': return 'bg-gray-100 text-gray-800'
      case 'suspended': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-red-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">{error}</h3>
          <div className="mt-6">
            <button
              onClick={() => navigate('/team')}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h3 className="mt-2 text-sm font-medium text-gray-900">Team member not found</h3>
          <div className="mt-6">
            <button
              onClick={() => navigate('/team')}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              Back to Team
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <div className="flex-1 min-w-0 overflow-hidden ml-16 lg:ml-64 xl:ml-72">
        <MobileHeader onMenuClick={() => setSidebarOpen(true)} />
        
        <div className="p-6">
          {/* Header */}
          <div className="mb-8">
            <button
              onClick={() => navigate('/team')}
              className="flex items-center text-gray-600 hover:text-gray-800 mb-6"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              <span className="text-sm font-medium">All Team Members</span>
            </button>

            {/* Profile Header */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-red-100 rounded-lg flex items-center justify-center">
                    <span className="text-red-600 font-bold text-xl">
                      {getInitials(teamMember.first_name, teamMember.last_name)}
                    </span>
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                      {teamMember.first_name} {teamMember.last_name}
                    </h1>
                    <p className="text-gray-600">{editFormData.role || 'Service Provider'}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowEditModal(true)}
                  className="px-4 py-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  Edit
                </button>
              </div>
            </div>
          </div>

          {/* Personal Information */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Personal Information</h2>
              <button
                onClick={() => setShowEditModal(true)}
                className="px-4 py-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                Edit
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <Phone className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-900">
                  {editFormData.phone || 'No phone number'}
                </span>
              </div>
              
              <div className="flex items-center space-x-3">
                <Mail className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-900">{editFormData.email}</span>
              </div>
              
              <div className="flex items-center space-x-3">
                <MapPin className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-900">
                  {editFormData.address || 'No address on file'}
                </span>
              </div>
              
              <div className="flex items-center space-x-3">
                <span className="text-sm text-gray-900">Status:</span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(editFormData.status)}`}>
                  {getStatusText(editFormData.status)}
                </span>
              </div>
              
              <div className="flex items-center space-x-3">
                <span className="text-sm text-gray-900">Role:</span>
                <span className="text-sm text-gray-900">{editFormData.role}</span>
              </div>
              
              <div className="flex items-center space-x-3">
                <span className="text-sm text-gray-900">Role permissions:</span>
                <span className="text-sm text-gray-600">
                  {editFormData.role === 'Account Owner' 
                    ? 'Has full access to all areas of account'
                    : 'Limited access based on role'
                  }
                </span>
              </div>
            </div>
          </div>

          {/* Metadata */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex items-center space-x-2 mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Metadata</h2>
              <HelpCircle className="w-4 h-4 text-gray-400" />
            </div>
            <p className="text-sm text-gray-600">No custom metadata added yet</p>
          </div>

          {/* Service Provider */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-1">Service Provider</h2>
                <p className="text-sm text-gray-600">This team member can be assigned to jobs.</p>
              </div>
              <div className="flex items-center space-x-2">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  editFormData.can_be_assigned 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {editFormData.can_be_assigned ? 'YES' : 'NO'}
                </span>
                <button
                  onClick={() => handleToggle('can_be_assigned')}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    editFormData.can_be_assigned ? 'bg-blue-600' : 'bg-gray-200'
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
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Availability</h2>
            <p className="text-sm text-gray-600 mb-6">
              Manage this team member's availability by editing their regular work hours, or by adding custom availability for specific dates. Learn more...
            </p>

            {/* Allow editing availability */}
            <div className="flex items-center justify-between mb-6">
              <span className="text-sm font-medium text-gray-900">
                Allow this team member to edit their availability
              </span>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">
                  The team member's role allows them to edit their availability.
                </span>
                <button
                  onClick={() => handleToggle('can_edit_availability')}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    editFormData.can_edit_availability ? 'bg-blue-600' : 'bg-gray-200'
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
                  <h3 className="text-sm font-semibold text-gray-900">RECURRING HOURS</h3>
                  <HelpCircle className="w-4 h-4 text-gray-400" />
                </div>
                <div className="space-y-2">
                  {Object.entries(workingHours).map(([day, hours]) => (
                    <div key={day} className="flex justify-between items-center text-sm">
                      <span className="capitalize font-medium text-gray-900">{day}</span>
                      <span className="text-gray-600">
                        {hours.available ? hours.hours : 'Unavailable'}
                      </span>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => setShowAvailabilityModal(true)}
                  className="mt-4 text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  Edit Hours
                </button>
              </div>

              {/* Custom Availability */}
              <div>
                <div className="flex items-center space-x-2 mb-4">
                  <h3 className="text-sm font-semibold text-gray-900">CUSTOM AVAILABILITY</h3>
                  <HelpCircle className="w-4 h-4 text-gray-400" />
                </div>
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <Calendar className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600 mb-3">
                    Add a date override - Customize this provider's availability for specific dates.
                  </p>
                  <button className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700">
                    Add Date Override
                  </button>
                </div>
              </div>
            </div>

            {/* Limit jobs per day */}
            <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-200">
              <span className="text-sm font-medium text-gray-900">
                Limit the number of jobs per day for this provider
              </span>
              <button
                onClick={() => handleToggle('max_jobs_per_day')}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  editFormData.max_jobs_per_day ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    editFormData.max_jobs_per_day ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Assignment */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Assignment</h2>
            <p className="text-sm text-gray-600 mb-6">
              Control whether this provider can be auto-assigned to jobs, or claim eligible jobs that you've offered.
            </p>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Zap className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-medium text-gray-900">
                    Can be auto-assigned jobs
                  </span>
                </div>
                <button
                  onClick={() => handleToggle('auto_assign')}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    editFormData.auto_assign ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      editFormData.auto_assign ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Flag className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-medium text-gray-900">
                    Can claim available job offers
                  </span>
                </div>
                <button
                  onClick={() => handleToggle('can_claim_jobs')}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    editFormData.can_claim_jobs ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      editFormData.can_claim_jobs ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Notifications */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Notifications</h2>
            <p className="text-sm text-gray-600 mb-6">
              How should this service provider be notified when they are assigned to a job?
            </p>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Bell className="w-4 h-4 text-gray-400" />
                  <div>
                    <span className="text-sm font-medium text-gray-900">Push Alerts: Not enabled</span>
                    <p className="text-xs text-gray-500">This service provider has not enabled push notifications.</p>
                  </div>
                </div>
                <span className="text-sm text-gray-500">Not enabled</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-medium text-gray-900">Emails</span>
                </div>
                <button
                  onClick={() => handleToggle('email_notifications')}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    editFormData.email_notifications ? 'bg-blue-600' : 'bg-gray-200'
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
                  <MessageSquare className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-medium text-gray-900">Text Messages (SMS)</span>
                </div>
                <button
                  onClick={() => handleToggle('sms_notifications')}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    editFormData.sms_notifications ? 'bg-blue-600' : 'bg-gray-200'
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
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Skills</h2>
            <p className="text-sm text-gray-600 mb-4">
              Skill tags can be used to make sure workers meet specific job-related skills, certifications, equipment and licensing requirements.
            </p>
            
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <Tag className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600 mb-3">
                This provider doesn't have any skill tags yet.
              </p>
              <button
                onClick={() => setShowSkillsModal(true)}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                Edit Skills
              </button>
            </div>
          </div>

          {/* Calendar Color */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Calendar color.</h2>
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
              <h3 className="text-lg font-semibold text-gray-900">Edit Team Member</h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                  <input
                    type="text"
                    value={editFormData.first_name}
                    onChange={(e) => handleInputChange('first_name', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                  <input
                    type="text"
                    value={editFormData.last_name}
                    onChange={(e) => handleInputChange('last_name', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={editFormData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="tel"
                  value={editFormData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <input
                  type="text"
                  value={editFormData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select
                  value={editFormData.role}
                  onChange={(e) => handleInputChange('role', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default TeamMemberDetailsRedesigned
