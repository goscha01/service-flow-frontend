import { useState, useEffect } from "react"
import Sidebar from "../components/sidebar"
import MobileHeader from "../components/mobile-header"
import { Plus, Search, Filter, Users, TrendingUp, Calendar, DollarSign, Clock, Eye, Edit, Trash2, UserPlus, BarChart3, AlertCircle, MapPin, Loader2, Power, PowerOff, Zap, Settings, ChevronLeft, ChevronRight, HelpCircle } from "lucide-react"
import { useAuth } from "../context/AuthContext"
import { teamAPI } from "../services/api"
import LoadingButton from "../components/loading-button"
import AddTeamMemberModal from "../components/add-team-member-modal"
import { useNavigate } from "react-router-dom"
import { handleTeamDeletionError, createErrorNotification, createSuccessNotification } from "../utils/errorHandler"

const ServiceFlowTeam = () => {
  const { user, loading: authLoading } = useAuth()
  console.log('Current user:', user)
  console.log('Auth loading:', authLoading)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [activeTab, setActiveTab] = useState("active")
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
      setDeleteError("")
      console.log('Deleting team member:', memberToDelete.id)
      const response = await teamAPI.delete(memberToDelete.id)
      console.log('Delete response:', response)

      setNotification(createSuccessNotification(
        `Team member ${memberToDelete.first_name} ${memberToDelete.last_name} has been deleted successfully.`
      ))

      setShowDeleteModal(false)
      setMemberToDelete(null)
      fetchTeamMembers()

      setTimeout(() => setNotification(null), 3000)
    } catch (error) {
      console.error('Error deleting team member:', error)

      const errorInfo = handleTeamDeletionError(error)
      setDeleteError(errorInfo.message)

      console.log('Error details:', {
        type: errorInfo.type,
        status: errorInfo.status,
        details: errorInfo.details
      })
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
      setTimeout(() => setNotification(null), 3000)
    } catch (error) {
      console.error('Error resending invite:', error)
      setNotification({
        type: 'error',
        message: 'Failed to resend invitation. Please try again.'
      })
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
      fetchTeamMembers();
      setShowActivationModal(false)
      setMemberToToggle(null)
      setNotification({
        type: 'success',
        message: `${memberToToggle.first_name} ${memberToToggle.last_name} has been ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully.`
      })
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
        return 'bg-green-100 text-green-700'
      case 'pending':
        return 'bg-yellow-100 text-yellow-700'
      case 'invited':
        return 'bg-blue-100 text-blue-700'
      case 'inactive':
        return 'bg-gray-100 text-gray-700'
      case 'on_leave':
        return 'bg-gray-100 text-gray-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  const getStatusLabel = (status) => {
    switch (status) {
      case 'active':
        return 'ACTIVATED'
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

  const getFilteredMembers = () => {
    if (!Array.isArray(teamMembers)) return [];

    return teamMembers.filter(member => {
      if (activeTab === "active") return member.status === 'active';
      if (activeTab === "invited") return member.status === 'invited' || member.status === 'pending';
      if (activeTab === "deactivated") return member.status === 'inactive' || member.status === 'on_leave';
      return true;
    });
  }

  const filteredMembers = getFilteredMembers();

  return (
    <>
      <div className="flex h-screen bg-gray-50 overflow-hidden">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <div className="flex-1 flex flex-col min-w-0 lg:ml-64 xl:ml-72">
          <MobileHeader onMenuClick={() => setSidebarOpen(true)} />

          <div className="flex-1 overflow-auto">
            <div className="px-4 sm:px-6 lg:px-8 py-8">
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
                  <div className="mb-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
                      <h1 className="text-2xl font-semibold text-gray-900">Team Members</h1>
                      <button
                        onClick={handleAddMember}
                        className="inline-flex items-center justify-center px-5 py-2.5 text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                      >
                        Add Team Member
                      </button>
                    </div>
                  </div>

                  {/* Content Card */}
                  <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                    {/* Tabs */}
                    <div className="border-b border-gray-200">
                      <nav className="flex">
                        <button
                          onClick={() => setActiveTab("active")}
                          className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                            activeTab === "active"
                              ? "border-blue-600 text-blue-600"
                              : "border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300"
                          }`}
                        >
                          Active ({teamMembers.filter(m => m.status === 'active').length})
                        </button>
                        <button
                          onClick={() => setActiveTab("invited")}
                          className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                            activeTab === "invited"
                              ? "border-blue-600 text-blue-600"
                              : "border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300"
                          }`}
                        >
                          Invited ({teamMembers.filter(m => m.status === 'invited' || m.status === 'pending').length})
                        </button>
                        <button
                          onClick={() => setActiveTab("deactivated")}
                          className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                            activeTab === "deactivated"
                              ? "border-blue-600 text-blue-600"
                              : "border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300"
                          }`}
                        >
                          Deactivated ({teamMembers.filter(m => m.status === 'inactive' || m.status === 'on_leave').length})
                        </button>
                      </nav>
                    </div>

                    {/* Filters */}
                    <div className="p-6 border-b border-gray-200">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="w-full sm:w-64">
                          <select
                            value={filters.status}
                            onChange={(e) => handleFilterChange({ status: e.target.value })}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="">All team members</option>
                            <option value="active">Active only</option>
                            <option value="invited">Invited only</option>
                            <option value="inactive">Inactive only</option>
                          </select>
                        </div>

                        <div className="relative w-full sm:w-80">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                          <input
                            type="text"
                            placeholder="Search team members..."
                            value={filters.search}
                            onChange={(e) => handleFilterChange({ search: e.target.value })}
                            className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Error Message */}
                    {error && (
                      <div className="mx-6 mt-6 bg-red-50 border border-red-200 rounded-lg p-4">
                        <div className="flex">
                          <AlertCircle className="h-5 w-5 text-red-400 mr-3" />
                          <p className="text-sm text-red-700">{error}</p>
                        </div>
                      </div>
                    )}

                    {/* Loading State */}
                    {loading ? (
                      <div className="flex items-center justify-center py-16">
                        <div className="flex items-center space-x-2">
                          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                          <span className="text-gray-600">Loading team members...</span>
                        </div>
                      </div>
                    ) : filteredMembers.length === 0 ? (
                      <div className="text-center py-16">
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
                              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                            >
                              <UserPlus className="w-4 h-4 mr-2" />
                              Add Team Member
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <>
                        {/* Table */}
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr className="border-b border-gray-200">
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Team Member
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Access Role
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  <div className="flex items-center">
                                    Service Provider
                                    <HelpCircle className="w-3.5 h-3.5 ml-1.5 text-gray-400" />
                                  </div>
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Actions
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                              {filteredMembers.map((member) => (
                                <tr key={member.id} className="hover:bg-gray-50 transition-colors">
                                  <td className="px-6 py-4">
                                    <div className="flex items-center">
                                      <div className="flex-shrink-0 h-10 w-10 rounded-full bg-orange-300 flex items-center justify-center">
                                        <span className="text-sm font-semibold text-white">
                                          {member.first_name?.[0]}{member.last_name?.[0]}
                                        </span>
                                      </div>
                                      <div className="ml-4">
                                        <div className="flex items-center space-x-2">
                                          <div className="text-sm font-medium text-gray-900">
                                            {member.first_name} {member.last_name}
                                          </div>
                                          {member.status === 'active' && (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">
                                              {getStatusLabel(member.status)}
                                            </span>
                                          )}
                                          {member.status === 'invited' && (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">
                                              {getStatusLabel(member.status)}
                                            </span>
                                          )}
                                        </div>
                                        <div className="text-sm text-gray-500">
                                          {member.email || member.phone}
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4">
                                    <div className="text-sm text-gray-900">
                                      {member.role === 'owner' || member.role === 'admin' ? 'Account Owner' :
                                       member.role === 'manager' ? 'Manager' :
                                       member.role === 'technician' ? 'Technician' :
                                       'Team Member'}
                                    </div>
                                  </td>
                                  <td className="px-6 py-4">
                                    <div className="text-sm text-gray-900">
                                      {member.is_service_provider ? 'Yes' : 'No'}
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end space-x-3">
                                      <button
                                        onClick={() => handleViewMember(member)}
                                        className="text-gray-400 hover:text-gray-600 transition-colors"
                                        title="View schedule"
                                      >
                                        <Clock className="w-5 h-5" />
                                      </button>
                                      <button
                                        onClick={() => handleToggleActivation(member)}
                                        className="text-gray-400 hover:text-gray-600 transition-colors"
                                        title={member.status === 'active' ? 'Deactivate' : 'Activate'}
                                      >
                                        <Zap className="w-5 h-5" />
                                      </button>
                                      <button
                                        onClick={() => handleEditMember(member)}
                                        className="text-gray-400 hover:text-gray-600 transition-colors"
                                        title="More options"
                                      >
                                        <Settings className="w-5 h-5" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {/* Pagination */}
                        <div className="px-6 py-4 border-t border-gray-200">
                          <div className="flex items-center justify-center space-x-2">
                            <button
                              disabled
                              className="p-2 rounded-lg border border-gray-300 text-gray-400 cursor-not-allowed"
                            >
                              <ChevronLeft className="w-5 h-5" />
                            </button>
                            <button
                              disabled
                              className="p-2 rounded-lg border border-gray-300 text-gray-400 cursor-not-allowed"
                            >
                              <ChevronRight className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
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

              {deleteError && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
                  <div className="flex items-start">
                    <AlertCircle className="h-5 w-5 text-red-600 mr-3 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-red-800 mb-1">Unable to Delete Team Member</h4>
                      <p className="text-sm text-red-700 leading-relaxed">{deleteError}</p>
                    </div>
                  </div>
                </div>
              )}

              <p className="text-sm text-gray-500 mb-6">
                Are you sure you want to delete <strong>{memberToDelete.first_name} {memberToDelete.last_name}</strong>?
                This action cannot be undone.
              </p>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowDeleteModal(false)
                    setMemberToDelete(null)
                    setDeleteError("")
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteMember}
                  disabled={deleteLoading}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50"
                >
                  {deleteLoading ? "Deleting..." : "Delete"}
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
                  <>Are you sure you want to deactivate <strong>{memberToToggle.first_name} {memberToToggle.last_name}</strong>?</>
                ) : (
                  <>Are you sure you want to activate <strong>{memberToToggle.first_name} {memberToToggle.last_name}</strong>?</>
                )}
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowActivationModal(false)
                    setMemberToToggle(null)
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmToggleActivation}
                  disabled={activationLoading}
                  className={`px-4 py-2 text-sm font-medium text-white rounded-md ${
                    memberToToggle.status === 'active'
                      ? 'bg-red-600 hover:bg-red-700'
                      : 'bg-green-600 hover:bg-green-700'
                  } disabled:opacity-50`}
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
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowResendModal(false)
                    setMemberToResend(null)
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmResendInvite}
                  disabled={resendLoading}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {resendLoading ? "Sending..." : "Resend Invitation"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Notification */}
        {notification && (
          <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg ${
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

export default ServiceFlowTeam
