import { useState, useEffect } from "react"
import Sidebar from "../components/sidebar"
import MobileHeader from "../components/mobile-header"
import { Plus, Search, Filter, Users, TrendingUp, Calendar, DollarSign, Clock, Eye, Edit, Trash2, UserPlus, BarChart3, AlertCircle, MapPin, Loader2, Power, PowerOff } from "lucide-react"
import { useAuth } from "../context/AuthContext"
import { teamAPI } from "../services/api"
import LoadingButton from "../components/loading-button"
import AddTeamMemberModal from "../components/add-team-member-modal"
import { useNavigate } from "react-router-dom"
import { handleTeamDeletionError, createErrorNotification, createSuccessNotification } from "../utils/errorHandler"

const ZenbookerTeam = () => {
  const { user, loading: authLoading } = useAuth()
  console.log('Current user:', user)
  console.log('Auth loading:', authLoading)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [activeTab, setActiveTab] = useState("all")
  const [selectedMember, setSelectedMember] = useState(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [memberToDelete, setMemberToDelete] = useState(null)
  const [showActivationModal, setShowActivationModal] = useState(false)
  const [activationLoading, setActivationLoading] = useState(false)
  const [memberToToggle, setMemberToToggle] = useState(null)
  const [showResendModal, setShowResendModal] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)
  const [memberToResend, setMemberToResend] = useState(null)
  const [notification, setNotification] = useState(null)
  const [deleteError, setDeleteError] = useState("")
  
  // API State
  const [teamMembers, setTeamMembers] = useState([])
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [filters, setFilters] = useState({
    status: "",
    search: "",
    sortBy: "first_name",
    sortOrder: "ASC"
  })

  const navigate = useNavigate()

  // Initial data fetch - wait for auth to load
  useEffect(() => {
    if (!authLoading && user?.id) {
      fetchTeamMembers()
    } else if (!authLoading && !user?.id) {
      // Redirect to signin if no user after auth has loaded
      navigate('/signin')
    }
  }, [authLoading, user?.id])

  // Debounced search
  useEffect(() => {
    if (!authLoading && user?.id) {
      const timeoutId = setTimeout(() => {
        fetchTeamMembers()
      }, 300)

      return () => clearTimeout(timeoutId)
    }
  }, [authLoading, user?.id, filters.status, filters.search, filters.sortBy, filters.sortOrder])

  useEffect(() => {
    if (activeTab === "analytics" && !authLoading && user?.id) {
      fetchAnalytics()
    }
  }, [activeTab, authLoading, user?.id])

  const fetchTeamMembers = async () => {
    console.log('Fetching team members for user:', user?.id)
    if (!user?.id) {
      console.log('No user ID found, skipping fetch')
      return
    }
    
    try {
      setLoading(true)
      setError("")
      
      console.log('Calling teamAPI.getAll with params:', {
        userId: user.id,
        status: filters.status,
        search: filters.search,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
        page: 1,
        limit: 50
      })
      
      const response = await teamAPI.getAll(user.id, {
        status: filters.status,
        search: filters.search,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
        page: 1,
        limit: 50
      })
      
      console.log('Team API response:', response)
      // The backend returns { teamMembers: [...], pagination: {...} }
      setTeamMembers(response.teamMembers || [])
    } catch (error) {
      console.error('Error fetching team members:', error)
      setError("Failed to load team members. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const fetchAnalytics = async () => {
    if (!user?.id) return
    
    try {
      setLoading(true)
      setError("")
      
      const response = await teamAPI.getAnalytics(user.id)
      setAnalytics(response)
    } catch (error) {
      console.error('Error fetching analytics:', error)
      setError("Failed to load analytics. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleAddMember = () => {
    navigate('/add-team-member')
  }

  const handleEditMember = (member) => {
    setSelectedMember(member)
    setIsEditModalOpen(true)
  }

  const handleViewMember = (member) => {
    // Navigate to team member details page
    navigate(`/team/${member.id}`)
  }

  const handleDeleteMember = (member) => {
    setMemberToDelete(member)
    setShowDeleteModal(true)
  }

  const confirmDeleteMember = async () => {
    if (!memberToDelete) return
    
    try {
      setDeleteLoading(true)
      setDeleteError("") // Clear any previous errors
      console.log('Deleting team member:', memberToDelete.id)
      const response = await teamAPI.delete(memberToDelete.id)
      console.log('Delete response:', response)
      
      // Show success notification
      setNotification(createSuccessNotification(
        `Team member ${memberToDelete.first_name} ${memberToDelete.last_name} has been deleted successfully.`
      ))
      
      setShowDeleteModal(false)
      setMemberToDelete(null)
      fetchTeamMembers()
      
      // Clear success notification after 3 seconds
      setTimeout(() => setNotification(null), 3000)
    } catch (error) {
      console.error('Error deleting team member:', error)
      
      // Use the enhanced error handling utility
      const errorInfo = handleTeamDeletionError(error)
      setDeleteError(errorInfo.message)
      
      // Log additional details for debugging
      console.log('Error details:', {
        type: errorInfo.type,
        status: errorInfo.status,
        details: errorInfo.details
      })
      
      // Don't close the modal on error - let user see the error message
    } finally {
      setDeleteLoading(false)
    }
  }

  const handleMemberUpdate = () => {
    fetchTeamMembers()
    setIsEditModalOpen(false)
    setSelectedMember(null)
  }

  const handleResendInvite = (member) => {
    setMemberToResend(member)
    setShowResendModal(true)
  }

  const confirmResendInvite = async () => {
    if (!memberToResend) return
    
    try {
      setResendLoading(true)
      await teamAPI.resendInvite(memberToResend.id)
      setShowResendModal(false)
      setMemberToResend(null)
      setNotification({
        type: 'success',
        message: 'Invitation resent successfully!'
      })
      // Clear notification after 3 seconds
      setTimeout(() => setNotification(null), 3000)
    } catch (error) {
      console.error('Error resending invite:', error)
      setNotification({
        type: 'error',
        message: 'Failed to resend invitation. Please try again.'
      })
      // Clear notification after 5 seconds
      setTimeout(() => setNotification(null), 5000)
    } finally {
      setResendLoading(false)
    }
  }

  const handleToggleActivation = async (member) => {
    setMemberToToggle(member)
    setShowActivationModal(true)
  }

  const confirmToggleActivation = async () => {
    if (!memberToToggle) return
    
    try {
      setActivationLoading(true)
      const newStatus = memberToToggle.status === 'active' ? 'inactive' : 'active';
      await teamAPI.update(memberToToggle.id, { status: newStatus });
      fetchTeamMembers(); // Refresh the list
      setShowActivationModal(false)
      setMemberToToggle(null)
      setNotification({
        type: 'success',
        message: `${memberToToggle.first_name} ${memberToToggle.last_name} has been ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully.`
      })
      // Clear notification after 3 seconds
      setTimeout(() => setNotification(null), 3000)
    } catch (error) {
      console.error('Error toggling team member activation:', error);
      setError("Failed to update team member status.");
    } finally {
      setActivationLoading(false)
    }
  }

  const handleFilterChange = (newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }))
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'invited':
        return 'bg-blue-100 text-blue-800'
      case 'inactive':
        return 'bg-red-100 text-red-800'
      case 'on_leave':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusLabel = (status) => {
    switch (status) {
      case 'active':
        return 'ACTIVE'
      case 'pending':
        return 'PENDING'
      case 'invited':
        return 'INVITED'
      case 'inactive':
        return 'INACTIVE'
      case 'on_leave':
        return 'ON LEAVE'
      default:
        return 'Unknown'
    }
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0)
  }

  const formatDuration = (minutes) => {
    if (!minutes) return '0h'
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours}h ${mins}m`
  }

  return (
    <>
      <div className="flex h-screen bg-gray-50 overflow-hidden">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        
        <div className="flex-1 flex flex-col min-w-0 lg:ml-64">
          <MobileHeader onMenuClick={() => setSidebarOpen(true)} />
          
          <div className="flex-1 overflow-auto">
            <div className="px-4 sm:px-6 lg:px-8 py-8">
              {/* Show loading spinner while auth is loading */}
              {authLoading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="flex items-center space-x-2">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                    <span className="text-gray-600">Loading...</span>
                  </div>
                </div>
              ) : (
                <>
                  {/* Header */}
                  <div className="mb-8">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
                      <div>
                        <h1 className="text-2xl font-bold text-gray-900">Team Members</h1>
                        <p className="mt-1 text-sm text-gray-500">
                          Manage your team members and their permissions
                        </p>
                      </div>
                      <button
                        onClick={handleAddMember}
                        className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        <UserPlus className="w-4 h-4 mr-2" />
                        Add Team Member
                      </button>
                    </div>
                  </div>

                  {/* Tabs */}
                  <div className="border-b border-gray-200 mb-6">
                    <nav className="-mb-px flex space-x-8 overflow-x-auto">
                      <button
                        onClick={() => setActiveTab("all")}
                        className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                          activeTab === "all"
                            ? "border-blue-500 text-blue-600"
                            : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                        }`}
                      >
                        <Users className="w-4 h-4 inline mr-2" />
                        All ({teamMembers.length})
                      </button>
                      <button
                        onClick={() => setActiveTab("active")}
                        className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                          activeTab === "active"
                            ? "border-blue-500 text-blue-600"
                            : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                        }`}
                      >
                        <Users className="w-4 h-4 inline mr-2" />
                        Active ({teamMembers.filter(m => m.status === 'active').length})
                      </button>
                      <button
                        onClick={() => setActiveTab("pending")}
                        className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                          activeTab === "pending"
                            ? "border-blue-500 text-blue-600"
                            : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                        }`}
                      >
                        <AlertCircle className="w-4 h-4 inline mr-2" />
                        Pending ({teamMembers.filter(m => m.status === 'pending').length})
                      </button>
                      <button
                        onClick={() => setActiveTab("invited")}
                        className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                          activeTab === "invited"
                            ? "border-blue-500 text-blue-600"
                            : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                        }`}
                      >
                        <AlertCircle className="w-4 h-4 inline mr-2" />
                        Invited ({teamMembers.filter(m => m.status === 'invited').length})
                      </button>
                      <button
                        onClick={() => setActiveTab("deactivated")}
                        className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                          activeTab === "deactivated"
                            ? "border-blue-500 text-blue-600"
                            : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                        }`}
                      >
                        <Users className="w-4 h-4 inline mr-2" />
                        Deactivated ({teamMembers.filter(m => m.status === 'inactive' || m.status === 'on_leave').length})
                      </button>
                      <button
                        onClick={() => setActiveTab("analytics")}
                        className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                          activeTab === "analytics"
                            ? "border-blue-500 text-blue-600"
                            : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                        }`}
                      >
                        <BarChart3 className="w-4 h-4 inline mr-2" />
                        Analytics
                      </button>
                    </nav>
                  </div>

                  {/* Team Members Tab */}
                  {(activeTab === "all" || activeTab === "active" || activeTab === "pending" || activeTab === "invited" || activeTab === "deactivated") && (
                    <div>
                      {/* Filters */}
                      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
                          <div className="relative flex-1 max-w-md">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                            <input
                              type="text"
                              placeholder="Search team members..."
                              value={filters.search}
                              onChange={(e) => handleFilterChange({ search: e.target.value })}
                              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                            />
                          </div>

                          <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
                            <select
                              value={filters.status}
                              onChange={(e) => handleFilterChange({ status: e.target.value })}
                              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                            >
                              <option value="">All Status</option>
                              <option value="active">Active</option>
                              <option value="pending">Pending</option>
                              <option value="inactive">Inactive</option>
                              <option value="on_leave">On Leave</option>
                            </select>

                            <select
                              value={filters.sortBy}
                              onChange={(e) => handleFilterChange({ sortBy: e.target.value })}
                              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                            >
                              <option value="first_name">Sort by Name</option>
                              <option value="created_at">Sort by Date Added</option>
                              <option value="role">Sort by Role</option>
                            </select>

                            <button
                              onClick={() => handleFilterChange({ sortOrder: filters.sortOrder === 'ASC' ? 'DESC' : 'ASC' })}
                              className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            >
                              <Filter className="w-4 h-4 mr-2" />
                              {filters.sortOrder === 'ASC' ? 'A-Z' : 'Z-A'}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Error Message */}
                      {error && (
                        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
                          <div className="flex">
                            <AlertCircle className="h-5 w-5 text-red-400 mr-3" />
                            <p className="text-sm text-red-700">{error}</p>
                          </div>
                        </div>
                      )}

                      {/* Success Notification */}
                      {notification && (
                        <div className={`mb-6 border rounded-lg p-4 ${
                          notification.type === 'success' 
                            ? 'bg-green-50 border-green-200' 
                            : 'bg-red-50 border-red-200'
                        }`}>
                          <div className="flex">
                            {notification.type === 'success' ? (
                              <svg className="h-5 w-5 text-green-400 mr-3" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                            ) : (
                              <AlertCircle className="h-5 w-5 text-red-400 mr-3" />
                            )}
                            <p className={`text-sm ${notification.type === 'success' ? 'text-green-700' : 'text-red-700'}`}>
                              {notification.message}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Loading State */}
                      {loading ? (
                        <div className="flex items-center justify-center h-64">
                          <div className="flex items-center space-x-2">
                            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                            <span className="text-gray-600">Loading team members...</span>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                          {teamMembers.length === 0 ? (
                            <div className="text-center py-12">
                              <Users className="mx-auto h-12 w-12 text-gray-400" />
                              <h3 className="mt-2 text-sm font-medium text-gray-900">No team members found</h3>
                              <p className="mt-1 text-sm text-gray-500">
                                {filters.search || filters.status
                                  ? "Try adjusting your search or filter criteria."
                                  : "Get started by adding your first team member."}
                              </p>
                              {!filters.search && !filters.status && (
                                <div className="mt-6">
                                  <button
                                    onClick={handleAddMember}
                                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                  >
                                    <UserPlus className="w-4 h-4 mr-2" />
                                    Add Team Member
                                  </button>
                                </div>
                              )}
                            </div>
                          ) : (
                            <ul className="divide-y divide-gray-200">
                              {Array.isArray(teamMembers) ? teamMembers
                                .filter(member => {
                                  if (activeTab === "all") return true;
                                  if (activeTab === "active") return member.status === 'active';
                                  if (activeTab === "pending") return member.status === 'pending';
                                  if (activeTab === "invited") return member.status === 'invited';
                                  if (activeTab === "deactivated") return member.status === 'inactive' || member.status === 'on_leave';
                                  return true;
                                })
                                .map((member) => (
                                  <li key={member.id}>
                                    <div className="px-4 py-4 sm:px-6">
                                      <div className="flex items-start space-x-4">
                                        <div className="flex-shrink-0">
                                          <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                                            <span className="text-sm font-medium text-blue-600">
                                              {member.first_name?.[0]}{member.last_name?.[0]}
                                            </span>
                                          </div>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                                            <div className="flex-1 min-w-0">
                                              <div className="flex flex-col space-y-1">
                                                <div className="flex items-center space-x-2">
                                                  <p className="text-sm font-medium text-gray-900 truncate">
                                                    {member.first_name} {member.last_name}
                                                  </p>
                                                  <div className="flex-shrink-0">
                                                    {member.status === 'active' && (
                                                      <div className="w-2 h-2 bg-green-500 rounded-full" title="Active"></div>
                                                    )}
                                                    {member.status === 'pending' && (
                                                      <div className="w-2 h-2 bg-yellow-500 rounded-full" title="Pending"></div>
                                                    )}
                                                    {member.status === 'invited' && (
                                                      <div className="w-2 h-2 bg-blue-500 rounded-full" title="Invited"></div>
                                                    )}
                                                    {(member.status === 'inactive' || member.status === 'on_leave') && (
                                                      <div className="w-2 h-2 bg-red-500 rounded-full" title="Inactive"></div>
                                                    )}
                                                  </div>
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(member.status)}`}>
                                                    {getStatusLabel(member.status)}
                                                  </span>
                                                </div>
                                              </div>
                                              <div className="mt-2 flex flex-col space-y-1 text-sm text-gray-500">
                                                {member.phone && (
                                                  <span className="truncate">{member.phone}</span>
                                                )}
                                                {member.territories && (() => {
                                                  let territories = [];
                                                  try {
                                                    territories = typeof member.territories === 'string' 
                                                      ? JSON.parse(member.territories || '[]') 
                                                      : member.territories || [];
                                                  } catch (error) {
                                                    console.error('Error parsing territories:', error);
                                                    territories = [];
                                                  }
                                                  
                                                  // Ensure territories is an array
                                                  if (!Array.isArray(territories)) {
                                                    territories = [];
                                                  }
                                                  
                                                  return territories.length > 0 && (
                                                    <div className="flex flex-wrap gap-1 mt-1">
                                                      {territories.map((territory, index) => {
                                                        // Handle different territory formats
                                                        let territoryDisplay = '';
                                                        if (typeof territory === 'object' && territory.name) {
                                                          territoryDisplay = territory.name;
                                                        } else if (typeof territory === 'number' || typeof territory === 'string') {
                                                          territoryDisplay = `Territory ${territory}`;
                                                        } else {
                                                          territoryDisplay = String(territory);
                                                        }
                                                        
                                                        return (
                                                          <span
                                                            key={index}
                                                            className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                                                          >
                                                            <MapPin className="w-3 h-3 mr-1" />
                                                            {territoryDisplay}
                                                          </span>
                                                        );
                                                      })}
                                                    </div>
                                                  );
                                                })()}
                                              </div>
                                            </div>
                                            <div className="mt-3 sm:mt-0 flex items-center justify-end space-x-2">
                                              {/* Activation/Deactivation Toggle */}
                                              {(member.status === 'active' || member.status === 'inactive' || member.status === 'pending' || member.status === 'invited') && (
                                                <button
                                                  onClick={() => handleToggleActivation(member)}
                                                  className={`inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                                                    member.status === 'active' 
                                                      ? 'text-red-700 bg-red-100 hover:bg-red-200 focus:ring-red-500' 
                                                      : 'text-green-700 bg-green-100 hover:bg-green-200 focus:ring-green-500'
                                                  }`}
                                                >
                                                  {member.status === 'active' ? (
                                                    <>
                                                      <PowerOff className="w-3 h-3 mr-1" />
                                                      Deactivate
                                                    </>
                                                  ) : member.status === 'invited' ? (
                                                    <>
                                                      <Power className="w-3 h-3 mr-1" />
                                                      Activate (Skip Invite)
                                                    </>
                                                  ) : (
                                                    <>
                                                      <Power className="w-3 h-3 mr-1" />
                                                      Activate
                                                    </>
                                                  )}
                                                </button>
                                              )}
                                              
                                              {member.status === 'invited' && (
                                                <button
                                                  onClick={() => handleResendInvite(member)}
                                                  className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                                >
                                                  Resend Invite
                                                </button>
                                              )}
                                              <button
                                                onClick={() => handleViewMember(member)}
                                                className="p-2 text-gray-400 hover:text-gray-600"
                                              >
                                                <Eye className="w-4 h-4" />
                                              </button>
                                              <button
                                                onClick={() => handleEditMember(member)}
                                                className="p-2 text-gray-400 hover:text-blue-600"
                                              >
                                                <Edit className="w-4 h-4" />
                                              </button>
                                              <button
                                                onClick={() => handleDeleteMember(member)}
                                                className="p-2 text-gray-400 hover:text-red-600"
                                              >
                                                <Trash2 className="w-4 h-4" />
                                              </button>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </li>
                                )) : (
                                  <li className="px-4 py-4 text-center text-gray-500">
                                    No team members found or data is not in expected format.
                                  </li>
                                )}
                            </ul>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Edit Team Member Modal */}
        {isEditModalOpen && selectedMember && (
          <AddTeamMemberModal
            isOpen={isEditModalOpen}
            onClose={() => {
              setIsEditModalOpen(false)
              setSelectedMember(null)
            }}
            onSuccess={handleMemberUpdate}
            userId={user?.id}
            member={selectedMember}
            isEditing={true}
          />
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && memberToDelete && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 max-w-lg w-full">
              <div className="flex items-center mb-4">
                <AlertCircle className="h-6 w-6 text-red-600 mr-3" />
                <h3 className="text-lg font-medium text-gray-900">Delete Team Member</h3>
              </div>
              
              {/* Enhanced Error Message Display */}
              {deleteError && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
                  <div className="flex items-start">
                    <AlertCircle className="h-5 w-5 text-red-600 mr-3 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-red-800 mb-1">Unable to Delete Team Member</h4>
                      <p className="text-sm text-red-700 leading-relaxed">{deleteError}</p>
                      {/* Show additional help text for specific error types */}
                      {deleteError.includes('active job assignment') && (
                        <div className="mt-2 text-xs text-red-600">
                          <p className="font-medium">What you can do:</p>
                          <ul className="list-disc list-inside mt-1 space-y-1">
                            <li>Complete or reassign their active jobs first</li>
                            <li>Deactivate the team member instead of deleting</li>
                            <li>Contact support if you need assistance</li>
                          </ul>
                        </div>
                      )}
                      {deleteError.includes('only admin') && (
                        <div className="mt-2 text-xs text-red-600">
                          <p className="font-medium">What you can do:</p>
                          <ul className="list-disc list-inside mt-1 space-y-1">
                            <li>Assign another team member as admin first</li>
                            <li>Deactivate this team member instead of deleting</li>
                          </ul>
                        </div>
                      )}
                      {deleteError.includes('network') && (
                        <div className="mt-2 text-xs text-red-600">
                          <p className="font-medium">Troubleshooting:</p>
                          <ul className="list-disc list-inside mt-1 space-y-1">
                            <li>Check your internet connection</li>
                            <li>Try refreshing the page</li>
                            <li>Contact support if the problem persists</li>
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
              
              <p className="text-sm text-gray-500 mb-6">
                Are you sure you want to delete <strong>{memberToDelete.first_name} {memberToDelete.last_name}</strong>? 
                This action cannot be undone.
              </p>
              
              {/* Warning for active team members */}
              {memberToDelete.status === 'active' && (
                <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                  <div className="flex items-start">
                    <AlertCircle className="h-4 w-4 text-yellow-600 mr-2 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-yellow-700">
                      <p className="font-medium">Warning:</p>
                      <p>This team member is currently active. If they have active job assignments, deletion will be blocked.</p>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowDeleteModal(false)
                    setMemberToDelete(null)
                    setDeleteError("") // Clear error when closing modal
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteMember}
                  disabled={deleteLoading}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {deleteLoading ? (
                    <div className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Deleting...
                    </div>
                  ) : "Delete"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Activation Confirmation Modal */}
        {showActivationModal && memberToToggle && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <div className="flex items-center mb-4">
                {memberToToggle.status === 'active' ? (
                  <PowerOff className="h-6 w-6 text-red-600 mr-3" />
                ) : (
                  <Power className="h-6 w-6 text-green-600 mr-3" />
                )}
                <h3 className="text-lg font-medium text-gray-900">
                  {memberToToggle.status === 'active' ? 'Deactivate' : 'Activate'} Team Member
                </h3>
              </div>
              <p className="text-sm text-gray-500 mb-6">
                {memberToToggle.status === 'active' ? (
                  <>Are you sure you want to deactivate <strong>{memberToToggle.first_name} {memberToToggle.last_name}</strong>? They will no longer be able to access the system.</>
                ) : memberToToggle.status === 'invited' ? (
                  <>Are you sure you want to activate <strong>{memberToToggle.first_name} {memberToToggle.last_name}</strong>? This will skip the invitation process and make them immediately active.</>
                ) : (
                  <>Are you sure you want to activate <strong>{memberToToggle.first_name} {memberToToggle.last_name}</strong>? They will be able to access the system.</>
                )}
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowActivationModal(false)
                    setMemberToToggle(null)
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmToggleActivation}
                  disabled={activationLoading}
                  className={`px-4 py-2 text-sm font-medium text-white border border-transparent rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 ${
                    memberToToggle.status === 'active' 
                      ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500' 
                      : 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
                  }`}
                >
                  {activationLoading ? "Updating..." : (memberToToggle.status === 'active' ? "Deactivate" : "Activate")}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Resend Invite Confirmation Modal */}
        {showResendModal && memberToResend && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <div className="flex items-center mb-4">
                <UserPlus className="h-6 w-6 text-blue-600 mr-3" />
                <h3 className="text-lg font-medium text-gray-900">Resend Invitation</h3>
              </div>
              <p className="text-sm text-gray-500 mb-6">
                Are you sure you want to resend the invitation to <strong>{memberToResend.first_name} {memberToResend.last_name}</strong>? 
                A new invitation email will be sent to {memberToResend.email}.
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowResendModal(false)
                    setMemberToResend(null)
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmResendInvite}
                  disabled={resendLoading}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {resendLoading ? "Sending..." : "Resend Invitation"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Notification */}
        {notification && (
          <div className={`fixed top-4 right-4 z-50 p-4 rounded-md shadow-lg ${
            notification.type === 'success' 
              ? 'bg-green-50 text-green-800 border border-green-200' 
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            <div className="flex items-center">
              {notification.type === 'success' ? (
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              )}
              <span className="font-medium">{notification.message}</span>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

export default ZenbookerTeam
