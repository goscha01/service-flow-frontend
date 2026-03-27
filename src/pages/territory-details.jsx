import { useEffect, useState, useCallback } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import Sidebar from "../components/sidebar"
import TerritoryMap from "../components/territory-map"
import { territoriesAPI, servicesAPI, teamAPI } from "../services/api"
import { normalizeAPIResponse } from "../utils/dataHandler"
import CreateTerritoryModal from "../components/create-territory-modal"
import TerritoryTeamMembersModal from "../components/territory-team-members-modal"
import { ChevronLeft, Loader2, Building2, MapPin, Globe, Calendar, Check, X, Repeat, Clock, Navigation, FileText, Users as UsersIcon, AlertCircle, Plus, CheckCircle } from "lucide-react"

const TerritoryDetails = () => {
  const { territoryId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [territory, setTerritory] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [businessHours, setBusinessHours] = useState(null)
  const [teamMembers, setTeamMembers] = useState([])
  const [services, setServices] = useState([])
  const [territoryServices, setTerritoryServices] = useState([])
  const [showEditModal, setShowEditModal] = useState(false)
  const [showTeamMembersModal, setShowTeamMembersModal] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")

  const fetchTerritoryData = useCallback(async () => {
    try {
      setLoading(true)
      setError("")

      // Fetch territory details
      const territoryData = await territoriesAPI.getById(territoryId)
      const territoryObj = territoryData.territory || territoryData
      setTerritory(territoryObj)

      // Fetch business hours
      try {
        const hoursData = await territoriesAPI.getTerritoryBusinessHours(territoryId)
        setBusinessHours(hoursData.businessHours || hoursData || null)
      } catch (err) {
        console.log('Business hours not available:', err)
        setBusinessHours(null)
      }

      // Fetch team members - get IDs from territory and fetch full team member objects
      try {
        // Get team member IDs from territory's team_members field
        let teamMemberIds = []
        if (territoryObj.team_members) {
          // Parse if it's a string
          if (typeof territoryObj.team_members === 'string') {
            try {
              teamMemberIds = JSON.parse(territoryObj.team_members)
            } catch (e) {
              console.error('Error parsing team_members:', e)
              teamMemberIds = []
            }
          } else if (Array.isArray(territoryObj.team_members)) {
            teamMemberIds = territoryObj.team_members
          }
        }
        
        // If we have team member IDs, fetch the full team member objects
        if (teamMemberIds.length > 0) {
          // Fetch all team members
          const allMembersResponse = await teamAPI.getAll(user.id, {
            status: 'active',
            page: 1,
            limit: 1000
          })
          
          const allMembers = normalizeAPIResponse(allMembersResponse, 'teamMembers') || []
          
          // Filter to only team members whose IDs are in the territory's team_members array
          // Normalize IDs to numbers for comparison
          const normalizedTeamMemberIds = teamMemberIds.map(id => Number(id))
          const territoryMembers = allMembers.filter(member => {
            const memberId = Number(member.id)
            return normalizedTeamMemberIds.includes(memberId)
          })
          
          setTeamMembers(territoryMembers)
        } else {
          // Try the API endpoint as fallback
          try {
            const membersData = await territoriesAPI.getTerritoryTeamMembers(territoryId)
            const members = membersData.teamMembers || membersData || []
            setTeamMembers(Array.isArray(members) ? members : [])
          } catch (apiErr) {
            console.log('Team members API not available:', apiErr)
            setTeamMembers([])
          }
        }
      } catch (err) {
        console.error('Error fetching team members:', err)
        setTeamMembers([])
      }

      // Fetch all services
      try {
        const servicesData = await servicesAPI.getAll(user.id)
        const allServices = servicesData.services || servicesData || []
        setServices(Array.isArray(allServices) ? allServices : [])
        
        // Filter services for this territory if territory_id field exists
        if (territoryObj.services && Array.isArray(territoryObj.services)) {
          setTerritoryServices(territoryObj.services)
        } else if (Array.isArray(allServices)) {
          // If no specific territory services, show all services
          setTerritoryServices(allServices)
        } else {
          setTerritoryServices([])
        }
      } catch (err) {
        console.log('Services not available:', err)
        setServices([])
        setTerritoryServices([])
      }

    } catch (e) {
      console.error('Error fetching territory data:', e)
      setError("Failed to load territory details")
    } finally {
      setLoading(false)
    }
  }, [territoryId, user?.id])

  useEffect(() => {
    if (territoryId && user?.id) {
      fetchTerritoryData()
    }
  }, [territoryId, user?.id, fetchTerritoryData])

  const handleEditTerritory = () => {
    setShowEditModal(true)
  }

  const handleTerritoryUpdate = async () => {
    await fetchTerritoryData()
    setShowEditModal(false)
    setSuccessMessage('Territory updated successfully!')
    setTimeout(() => setSuccessMessage(''), 3000)
  }

  const formatBusinessHours = (hours) => {
    if (!hours || typeof hours !== 'object') return null
    
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
    const dayLabels = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    
    return days.map((day, idx) => {
      const dayHours = hours[day]
      if (!dayHours || !dayHours.available) {
        return { day: dayLabels[idx], hours: 'Unavailable' }
      }
      
      const startTime = dayHours.start_time || dayHours.startTime || '9:00 AM'
      const endTime = dayHours.end_time || dayHours.endTime || '6:00 PM'
      return { day: dayLabels[idx], hours: `${startTime} - ${endTime}` }
    })
  }

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'active':
      case 'enabled':
        return 'bg-green-100 text-green-700'
      case 'inactive':
      case 'disabled':
        return 'bg-[var(--sf-bg-page)] text-[var(--sf-text-primary)]'
      default:
        return 'bg-[var(--sf-bg-page)] text-[var(--sf-text-primary)]'
    }
  }

  const getStatusLabel = (status) => {
    switch (status?.toLowerCase()) {
      case 'active':
      case 'enabled':
        return 'Enabled'
      case 'inactive':
      case 'disabled':
        return 'Disabled'
      default:
        return status || 'Unknown'
    }
  }

  const getInitials = (firstName, lastName) => {
    return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase() || 'TM'
  }

  if (loading) {
    return (
      <div className="flex h-screen bg-[var(--sf-bg-page)]">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--sf-blue-500)]" />
        </div>
      </div>
    )
  }

  if (error || !territory) {
    return (
      <div className="flex h-screen bg-[var(--sf-bg-page)]">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-red-400" />
            <h3 className="mt-2 text-sm font-medium text-[var(--sf-text-primary)]">{error || "Territory not found"}</h3>
            <button
              onClick={() => navigate('/territories')}
              className="mt-4 px-4 py-2 bg-[var(--sf-blue-500)] text-white rounded-lg hover:bg-[var(--sf-blue-600)]"
            >
              Back to Territories
            </button>
          </div>
        </div>
      </div>
    )
  }

  const weekSchedule = formatBusinessHours(businessHours) || [
    { day: 'Sunday', hours: 'Unavailable' },
    { day: 'Monday', hours: '9:00 AM - 6:00 PM' },
    { day: 'Tuesday', hours: '9:00 AM - 6:00 PM' },
    { day: 'Wednesday', hours: '9:00 AM - 6:00 PM' },
    { day: 'Thursday', hours: '9:00 AM - 6:00 PM' },
    { day: 'Friday', hours: '9:00 AM - 6:00 PM' },
    { day: 'Saturday', hours: 'Unavailable' },
  ]

  const isOnlineBookingEnabled = territory.online_booking !== false && territory.online_booking !== 'disabled'
  const territoryStatus = territory.status || 'active'

  return (
    <div className="flex h-screen bg-[var(--sf-bg-page)]">
      <div className="flex-1 flex flex-col overflow-hidden ">

        <main className="flex-1 overflow-y-auto">
          <div className="max-w-[1600px] mx-auto px-5 lg:px-40 xl:px-44 2xl:px-48 py-8">
            {/* Back button and title */}
            <button
              onClick={() => navigate('/territories')}
              className="flex items-center text-[var(--sf-text-secondary)] hover:text-[var(--sf-text-primary)] mb-4"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              <span className="text-sm">All Territories</span>
            </button>

            <div className="flex items-center gap-3 mb-8">
              <h1 className="text-3xl font-bold text-[var(--sf-text-primary)]">{territory.name}</h1>
              <span className={`px-2.5 py-1 text-xs font-medium rounded ${getStatusColor(territoryStatus)}`}>
                {getStatusLabel(territoryStatus)}
              </span>
            </div>

            {/* Success Message */}
            {successMessage && (
              <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center space-x-3">
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                <p className="text-green-700 font-medium">{successMessage}</p>
              </div>
            )}

            {/* Two column layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left column - Main content */}
              <div className="lg:col-span-2 space-y-6">

                {/* Territory Details */}
                <div className="bg-white border border-[var(--sf-border-light)] rounded-lg p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-base font-semibold text-[var(--sf-text-primary)]">Territory Details</h2>
                    <button 
                      onClick={handleEditTerritory}
                      className="text-sm text-[var(--sf-blue-500)] hover:text-[var(--sf-blue-500)] font-medium"
                    >
                      Edit
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="flex items-start gap-3">
                      <Building2 className="w-5 h-5 text-[var(--sf-text-muted)] mt-0.5" />
                      <div>
                        <div className="text-xs font-medium text-[var(--sf-text-muted)] mb-1">Name</div>
                        <div className="text-sm text-[var(--sf-text-primary)]">{territory.name}</div>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <MapPin className="w-5 h-5 text-[var(--sf-text-muted)] mt-0.5" />
                      <div>
                        <div className="text-xs font-medium text-[var(--sf-text-muted)] mb-1">Location</div>
                        <div className="text-sm text-[var(--sf-text-primary)]">
                          {territory.address || territory.location || `${territory.name}, ${territory.city || ''}`}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <Globe className="w-5 h-5 text-[var(--sf-text-muted)] mt-0.5" />
                      <div>
                        <div className="text-xs font-medium text-[var(--sf-text-muted)] mb-1">Timezone</div>
                        <div className="text-sm text-[var(--sf-text-primary)]">
                          {territory.timezone || 'America/New_York'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Operating Hours */}
                <div className="bg-white border border-[var(--sf-border-light)] rounded-lg p-6">
                  <h2 className="text-base font-semibold text-[var(--sf-text-primary)] mb-2">Operating Hours</h2>
                  <p className="text-sm text-[var(--sf-text-secondary)] mb-6">
                    Manage this territory's availability by editing the weekly hours, or by adding special hours for specific dates.
                  </p>

                  <div className="flex items-center justify-between mb-6 pb-4 border-b border-[var(--sf-border-light)]">
                    <div className="flex items-center gap-2">
                      <Repeat className="w-4 h-4 text-[var(--sf-text-muted)]" />
                      <span className="text-sm font-medium text-[var(--sf-text-primary)]">RECURRING HOURS</span>
                    </div>
                    <button onClick={handleEditTerritory} className="text-sm text-[var(--sf-blue-500)] hover:text-[var(--sf-blue-500)] font-medium">Edit</button>
                  </div>

                  <div className="space-y-3 mb-6">
                    {weekSchedule.map((schedule, idx) => (
                      <div key={idx} className="flex items-center justify-between py-2">
                        <span className="text-sm text-[var(--sf-text-primary)] w-28">{schedule.day}</span>
                        <span className={`text-sm ${schedule.hours === 'Unavailable' ? 'text-[var(--sf-text-muted)]' : 'text-[var(--sf-text-primary)]'}`}>
                          {schedule.hours}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-[var(--sf-border-light)] pt-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-[var(--sf-text-muted)]" />
                        <span className="text-sm font-medium text-[var(--sf-text-primary)]">DATE OVERRIDES</span>
                      </div>
                      <button className="flex items-center gap-1 text-sm text-[var(--sf-blue-500)] hover:text-[var(--sf-blue-500)] font-medium">
                        <Plus className="w-4 h-4" />
                        <span>Add</span>
                      </button>
                    </div>

                    <div className="bg-[var(--sf-blue-50)] border border-blue-200 rounded-lg p-4 flex flex-col items-center justify-center text-center">
                      <Calendar className="w-8 h-8 text-[var(--sf-blue-500)] mb-2" />
                      <div className="text-sm font-medium text-[var(--sf-text-primary)] mb-1">Add a date override</div>
                      <div className="text-xs text-[var(--sf-text-secondary)]">
                        Update your hours to reflect schedule changes and closures during holidays, vacations, and other special dates.
                      </div>
                    </div>
                  </div>
                </div>

                {/* Services */}
                <div className="bg-white border border-[var(--sf-border-light)] rounded-lg p-6">
                  <h2 className="text-base font-semibold text-[var(--sf-text-primary)] mb-2">Services</h2>
                  <p className="text-sm text-[var(--sf-text-secondary)] mb-6">
                    Manage which services are offered to customers in this territory. You can also adjust pricing for services in this territory.
                  </p>

                  <div className="flex items-center justify-between mb-4 pb-4 border-b border-[var(--sf-border-light)]">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-[var(--sf-text-muted)]" />
                      <span className="text-sm font-medium text-[var(--sf-text-primary)]">SERVICES OFFERED</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-[var(--sf-text-primary)]">
                        {territoryServices.length > 0 ? `${territoryServices.length} Service${territoryServices.length !== 1 ? 's' : ''}` : 'All Services'}
                      </span>
                      <button onClick={handleEditTerritory} className="text-sm text-[var(--sf-blue-500)] hover:text-[var(--sf-blue-500)] font-medium">Edit</button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {territoryServices.length > 0 ? (
                      territoryServices.map((service) => (
                        <div key={service.id || service.service_id} className="py-2">
                          <span className="text-sm text-[var(--sf-text-primary)]">
                            {service.name || service.service_name || 'Unnamed Service'}
                          </span>
                          {service.price && (
                            <span className="ml-2 text-sm text-[var(--sf-text-muted)]">
                              - ${parseFloat(service.price).toFixed(2)}
                            </span>
                          )}
                        </div>
                      ))
                    ) : services.length > 0 ? (
                      services.map((service) => (
                        <div key={service.id} className="py-2">
                          <span className="text-sm text-[var(--sf-text-primary)]">{service.name || 'Unnamed Service'}</span>
                        </div>
                      ))
                    ) : (
                      <div className="py-3 text-sm text-[var(--sf-text-muted)]">No services available</div>
                    )}
                  </div>
                </div>

                {/* Service Providers */}
                <div className="bg-white border border-[var(--sf-border-light)] rounded-lg p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-semibold text-[var(--sf-text-primary)]">Service Providers</h2>
                      <span className="text-sm text-[var(--sf-text-muted)]">{teamMembers.length}</span>
                    </div>
                    <button 
                      onClick={() => setShowTeamMembersModal(true)} 
                      className="text-sm text-[var(--sf-blue-500)] hover:text-[var(--sf-blue-500)] font-medium"
                    >
                      Manage
                    </button>
                  </div>

                  {teamMembers.length > 0 ? (
                    <div className="space-y-3">
                      {teamMembers.map((member) => (
                        <div key={member.id || member.team_member_id} className="flex items-center gap-3 p-4 border border-[var(--sf-border-light)] rounded-lg">
                          <div className="w-10 h-10 bg-red-100 rounded flex items-center justify-center flex-shrink-0">
                            <span className="text-sm font-medium text-red-600">
                              {getInitials(member.first_name, member.last_name)}
                            </span>
                          </div>
                          <div className="flex-1">
                            <div className="text-sm font-medium text-[var(--sf-text-primary)] mb-0.5">
                              {member.first_name} {member.last_name}
                            </div>
                            <div className="text-xs text-[var(--sf-text-muted)]">
                              {member.status === 'active' ? 'Activated' : member.status || 'Pending'} • 
                              {member.email || 'No email'}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-[var(--sf-bg-page)] border border-[var(--sf-border-light)] rounded-lg p-4 text-center">
                      <UsersIcon className="w-8 h-8 text-[var(--sf-text-muted)] mx-auto mb-2" />
                      <p className="text-sm text-[var(--sf-text-secondary)]">No service providers assigned to this territory</p>
                      <button 
                        onClick={() => setShowTeamMembersModal(true)}
                        className="mt-3 text-sm text-[var(--sf-blue-500)] hover:text-[var(--sf-blue-500)] font-medium"
                      >
                        Add Service Provider
                      </button>
                    </div>
                  )}
                </div>

                {/* Staff Booking Notifications */}
                <div className="bg-white border border-[var(--sf-border-light)] rounded-lg p-6">
                  <h2 className="text-base font-semibold text-[var(--sf-text-primary)] mb-2">Staff Booking Notifications</h2>
                  <p className="text-sm text-[var(--sf-text-secondary)] mb-6">
                    You can choose staff members to be notified via email whenever a job in this territory is booked, rescheduled, or canceled.
                  </p>

                  {territory.notification_recipients && territory.notification_recipients.length > 0 ? (
                    <div className="space-y-2 mb-4">
                      {territory.notification_recipients.map((recipient, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-[var(--sf-bg-page)] rounded-lg">
                          <span className="text-sm text-[var(--sf-text-primary)]">{recipient.email || recipient}</span>
                          <button className="text-sm text-red-600 hover:text-red-700">Remove</button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-[var(--sf-text-muted)] mb-4">No notification recipients configured</p>
                  )}

                  <button className="px-4 py-2 border border-[var(--sf-border-light)] rounded-lg text-sm font-medium text-[var(--sf-text-primary)] hover:bg-[var(--sf-bg-page)] flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    Add Recipient
                  </button>
                </div>
              </div>

              {/* Right column - Sidebar */}
              <div className="space-y-6">

                {/* Map */}
                <div className="bg-white border border-[var(--sf-border-light)] rounded-lg overflow-hidden h-[500px] lg:h-[600px]">
                  <TerritoryMap territory={territory} height="100%" showDetails={false} compact={true} className="h-full rounded-none border-0" />
                </div>

                {/* Service Area */}
                <div className="bg-white border border-[var(--sf-border-light)] rounded-lg p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Navigation className="w-4 h-4 text-[var(--sf-text-muted)]" />
                    <span className="text-xs font-semibold text-[var(--sf-text-primary)] uppercase tracking-wide">Service Area</span>
                  </div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-lg font-semibold text-[var(--sf-text-primary)]">
                      {territory.radius_miles || territory.radius || 'N/A'} mile radius
                    </span>
                    <button onClick={handleEditTerritory} className="text-sm text-[var(--sf-blue-500)] hover:text-[var(--sf-blue-500)] font-medium">Edit</button>
                  </div>
                  <p className="text-xs text-[var(--sf-text-secondary)] leading-relaxed">
                    The geographic area this territory services. Service areas are used for determining which territories to route jobs to based on location.
                  </p>
                </div>

                {/* Service Delivery Modes */}
                <div className="bg-white border border-[var(--sf-border-light)] rounded-lg p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <FileText className="w-4 h-4 text-[var(--sf-text-muted)]" />
                    <span className="text-xs font-semibold text-[var(--sf-text-primary)] uppercase tracking-wide">Service Delivery Modes</span>
                  </div>
                  <div className="flex items-center justify-end mb-4">
                    <button onClick={handleEditTerritory} className="text-sm text-[var(--sf-blue-500)] hover:text-[var(--sf-blue-500)] font-medium">Edit</button>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Check className={`w-4 h-4 ${territory.mobile_service !== false ? 'text-green-600' : 'text-[var(--sf-text-muted)]'}`} />
                      <span className={`text-sm ${territory.mobile_service !== false ? 'text-[var(--sf-text-primary)]' : 'text-[var(--sf-text-muted)]'}`}>
                        Mobile Service
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <X className={`w-4 h-4 ${territory.at_business_location === true ? 'text-green-600' : 'text-[var(--sf-text-muted)]'}`} />
                      <span className={`text-sm ${territory.at_business_location === true ? 'text-[var(--sf-text-primary)]' : 'text-[var(--sf-text-muted)]'}`}>
                        At Business Location
                      </span>
                    </div>
                  </div>
                </div>

                {/* Online Booking */}
                <div className="bg-white border border-[var(--sf-border-light)] rounded-lg p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Calendar className="w-4 h-4 text-[var(--sf-text-muted)]" />
                    <span className="text-xs font-semibold text-[var(--sf-text-primary)] uppercase tracking-wide">Online Booking</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5">
                        <div className={`w-2 h-2 rounded-full ${isOnlineBookingEnabled ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                        <span className="text-sm font-medium text-[var(--sf-text-primary)]">{isOnlineBookingEnabled ? 'ON' : 'OFF'}</span>
                      </div>
                    </div>
                    <button onClick={handleEditTerritory} className="text-sm text-[var(--sf-blue-500)] hover:text-[var(--sf-blue-500)] font-medium">Edit</button>
                  </div>
                </div>

                {/* Scheduling Rules */}
                <div className="bg-white border border-[var(--sf-border-light)] rounded-lg p-5">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-semibold text-[var(--sf-text-primary)] uppercase tracking-wide">Scheduling Rules</span>
                    <button className="text-sm text-[var(--sf-blue-500)] hover:text-[var(--sf-blue-500)] font-medium">Manage</button>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <Clock className="w-4 h-4 text-[var(--sf-text-muted)] mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="text-xs text-[var(--sf-text-muted)] mb-0.5">Availability Calculation Method</div>
                        <div className="text-sm text-[var(--sf-text-primary)]">
                          {territory.availability_method || 'Use service provider availability'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <Calendar className="w-4 h-4 text-[var(--sf-text-muted)] mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="text-xs text-[var(--sf-text-muted)] mb-0.5">Timeslot Format</div>
                        <div className="text-sm text-[var(--sf-text-primary)]">
                          {territory.timeslot_format || '2 hour arrival windows'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <Navigation className="w-4 h-4 text-[var(--sf-text-muted)] mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="text-xs text-[var(--sf-text-muted)] mb-0.5">Max. Distance Between Jobs</div>
                        <div className="text-sm text-[var(--sf-text-primary)]">
                          {territory.max_distance_between_jobs ? `${territory.max_distance_between_jobs} miles` : 'No limit'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <FileText className="w-4 h-4 text-[var(--sf-text-muted)] mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="text-xs text-[var(--sf-text-muted)] mb-0.5">Min. Booking Notice</div>
                        <div className="text-sm text-[var(--sf-text-primary)]">
                          {territory.min_booking_notice || 'None'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <FileText className="w-4 h-4 text-[var(--sf-text-muted)] mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="text-xs text-[var(--sf-text-muted)] mb-0.5">Max. Booking Notice</div>
                        <div className="text-sm text-[var(--sf-text-primary)]">
                          {territory.max_booking_notice || 'None'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <UsersIcon className="w-4 h-4 text-[var(--sf-text-muted)] mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="text-xs text-[var(--sf-text-muted)] mb-0.5">Max. Jobs Per Day</div>
                        <div className="text-sm text-[var(--sf-text-primary)]">
                          {territory.max_jobs_per_day ? `${territory.max_jobs_per_day} jobs` : 'No limit'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Edit Territory Modal */}
      <CreateTerritoryModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        onSuccess={handleTerritoryUpdate}
        territory={territory}
        isEditing={true}
        userId={user?.id}
      />

      {/* Team Members Management Modal */}
      <TerritoryTeamMembersModal
        isOpen={showTeamMembersModal}
        onClose={() => setShowTeamMembersModal(false)}
        onSuccess={handleTerritoryUpdate}
        territoryId={territoryId}
        userId={user?.id}
        currentTeamMembers={teamMembers}
      />
    </div>
  )
}

export default TerritoryDetails