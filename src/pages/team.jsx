import { useState, useEffect } from "react"
import Sidebar from "../components/sidebar"
import MobileHeader from "../components/mobile-header"
import { Plus, Search, Filter, Users, TrendingUp, Calendar, DollarSign, Clock, Eye, Edit, Trash2, UserPlus, BarChart3 } from "lucide-react"
import { useAuth } from "../context/AuthContext"
import { teamAPI } from "../services/api"
import AddTeamMemberModal from "../components/add-team-member-modal"
import LoadingButton from "../components/loading-button"

const TeamPage = () => {
  const { user } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [activeTab, setActiveTab] = useState("members")
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [selectedMember, setSelectedMember] = useState(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  
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

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchTeamMembers()
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [filters])

  useEffect(() => {
    if (activeTab === "analytics") {
      fetchAnalytics()
    }
  }, [activeTab])

  const fetchTeamMembers = async () => {
    if (!user?.id) return
    
    try {
      setLoading(true)
      setError("")
      
      const response = await teamAPI.getAll(user.id, {
        status: filters.status,
        search: filters.search,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
        page: 1,
        limit: 50
      })
      
      setTeamMembers(response.teamMembers || response)
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
    setIsAddModalOpen(true)
  }

  const handleEditMember = (member) => {
    setSelectedMember(member)
    setIsEditModalOpen(true)
  }

  const handleViewMember = (member) => {
    navigate(`/team-member/${member.id}`)
  }

  const handleDeleteMember = async (memberId) => {
    if (!window.confirm('Are you sure you want to delete this team member?')) {
      return
    }
    
    try {
      await teamAPI.delete(memberId)
      fetchTeamMembers()
    } catch (error) {
      console.error('Error deleting team member:', error)
      alert('Failed to delete team member. Please try again.')
    }
  }

  const handleMemberUpdate = () => {
    fetchTeamMembers()
    setIsEditModalOpen(false)
    setSelectedMember(null)
  }

  const handleFilterChange = (newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }))
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800'
      case 'inactive':
        return 'bg-gray-100 text-gray-800'
      case 'on_leave':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusLabel = (status) => {
    switch (status) {
      case 'active':
        return 'Active'
      case 'inactive':
        return 'Inactive'
      case 'on_leave':
        return 'On Leave'
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
    <div className="min-h-screen bg-gray-50">
      <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />
      <MobileHeader onMenuClick={() => setSidebarOpen(true)} />
      
      <div className="lg:pl-72">
        <div className="px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Team Management</h1>
                <p className="mt-1 text-sm text-gray-500">
                  Manage your team members, track performance, and optimize productivity
                </p>
              </div>
              <button
                onClick={handleAddMember}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Add Team Member
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200 mb-6">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab("members")}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "members"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <Users className="w-4 h-4 inline mr-2" />
                Team Members
              </button>
              <button
                onClick={() => setActiveTab("analytics")}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "analytics"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <BarChart3 className="w-4 h-4 inline mr-2" />
                Performance Analytics
              </button>
            </nav>
          </div>

          {/* Team Members Tab */}
          {activeTab === "members" && (
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

                  <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
                    <select
                      value={filters.status}
                      onChange={(e) => handleFilterChange({ status: e.target.value })}
                      className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    >
                      <option value="">All Status</option>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="on_leave">On Leave</option>
                    </select>

                    <select
                      value={`${filters.sortBy}:${filters.sortOrder}`}
                      onChange={(e) => {
                        const [sortBy, sortOrder] = e.target.value.split(":")
                        handleFilterChange({ sortBy, sortOrder })
                      }}
                      className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    >
                      <option value="first_name:ASC">Sort by: Name A-Z</option>
                      <option value="first_name:DESC">Sort by: Name Z-A</option>
                      <option value="total_jobs:DESC">Sort by: Most Jobs</option>
                      <option value="avg_job_value:DESC">Sort by: Highest Value</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Team Members List */}
              {loading ? (
                <div className="flex justify-center items-center py-12">
                  <LoadingButton />
                </div>
              ) : error ? (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <AlertCircle className="h-5 w-5 text-red-400" />
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-red-800">{error}</h3>
                    </div>
                  </div>
                </div>
              ) : teamMembers.length === 0 ? (
                <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
                  <Users className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No team members</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Get started by adding your first team member.
                  </p>
                  <div className="mt-6">
                    <button
                      onClick={handleAddMember}
                      className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      <UserPlus className="w-4 h-4 mr-2" />
                      Add Team Member
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-white shadow overflow-hidden sm:rounded-md">
                  <ul className="divide-y divide-gray-200">
                    {teamMembers.map((member) => (
                      <li key={member.id}>
                        <div className="px-4 py-4 sm:px-6">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <div className="flex-shrink-0">
                                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                                  <span className="text-sm font-medium text-blue-600">
                                    {member.first_name?.[0]}{member.last_name?.[0]}
                                  </span>
                                </div>
                              </div>
                              <div className="ml-4">
                                <div className="flex items-center">
                                  <p className="text-sm font-medium text-gray-900">
                                    {member.first_name} {member.last_name}
                                  </p>
                                  <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(member.status)}`}>
                                    {getStatusLabel(member.status)}
                                  </span>
                                </div>
                                <div className="mt-1 flex items-center text-sm text-gray-500">
                                  <span>{member.email}</span>
                                  {member.phone && (
                                    <>
                                      <span className="mx-1">•</span>
                                      <span>{member.phone}</span>
                                    </>
                                  )}
                                  {member.role && (
                                    <>
                                      <span className="mx-1">•</span>
                                      <span>{member.role}</span>
                                    </>
                                  )}
                                </div>
                                {/* Skills Display */}
                                {(() => {
                                  let skills = [];
                                  try {
                                    if (member.skills) {
                                      skills = typeof member.skills === 'string' 
                                        ? JSON.parse(member.skills) 
                                        : member.skills;
                                    }
                                  } catch (error) {
                                    skills = [];
                                  }
                                  
                                  if (!Array.isArray(skills)) {
                                    skills = [];
                                  }
                                  
                                  return skills.length > 0 ? (
                                    <div className="mt-2 flex flex-wrap gap-1">
                                      {skills.slice(0, 3).map((skill, index) => (
                                        <span 
                                          key={index}
                                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                            skill.level === 'Expert' ? 'bg-green-100 text-green-800' :
                                            skill.level === 'Advanced' ? 'bg-blue-100 text-blue-800' :
                                            skill.level === 'Intermediate' ? 'bg-yellow-100 text-yellow-800' :
                                            'bg-purple-100 text-purple-800'
                                          }`}
                                        >
                                          {skill.name}
                                        </span>
                                      ))}
                                      {skills.length > 3 && (
                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                          +{skills.length - 3} more
                                        </span>
                                      )}
                                    </div>
                                  ) : null;
                                })()}
                              </div>
                            </div>
                            
                            <div className="flex items-center space-x-4">
                              {/* Performance Stats */}
                              <div className="hidden sm:flex items-center space-x-4 text-sm text-gray-500">
                                <div className="flex items-center">
                                  <Clock className="w-4 h-4 mr-1" />
                                  <span>{member.total_jobs || 0} jobs</span>
                                </div>
                                <div className="flex items-center">
                                  <TrendingUp className="w-4 h-4 mr-1" />
                                  <span>{member.completed_jobs || 0} completed</span>
                                </div>
                                <div className="flex items-center">
                                  <DollarSign className="w-4 h-4 mr-1" />
                                  <span>{formatCurrency(member.avg_job_value)} avg</span>
                                </div>
                              </div>
                              
                              {/* Actions */}
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={() => handleViewMember(member)}
                                  className="text-gray-400 hover:text-gray-500"
                                  title="View details"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleEditMember(member)}
                                  className="text-gray-400 hover:text-blue-500"
                                  title="Edit"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteMember(member.id)}
                                  className="text-gray-400 hover:text-red-500"
                                  title="Delete"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Analytics Tab */}
          {activeTab === "analytics" && (
            <div>
              {loading ? (
                <div className="flex justify-center items-center py-12">
                  <LoadingButton />
                </div>
              ) : error ? (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <AlertCircle className="h-5 w-5 text-red-400" />
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-red-800">{error}</h3>
                    </div>
                  </div>
                </div>
              ) : analytics ? (
                <div className="space-y-6">
                  {/* Overall Stats */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="bg-white overflow-hidden shadow rounded-lg">
                      <div className="p-5">
                        <div className="flex items-center">
                          <div className="flex-shrink-0">
                            <Users className="h-6 w-6 text-gray-400" />
                          </div>
                          <div className="ml-5 w-0 flex-1">
                            <dl>
                              <dt className="text-sm font-medium text-gray-500 truncate">
                                Total Team Members
                              </dt>
                              <dd className="text-lg font-medium text-gray-900">
                                {analytics.teamStats?.total_team_members || 0}
                              </dd>
                            </dl>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white overflow-hidden shadow rounded-lg">
                      <div className="p-5">
                        <div className="flex items-center">
                          <div className="flex-shrink-0">
                            <Calendar className="h-6 w-6 text-gray-400" />
                          </div>
                          <div className="ml-5 w-0 flex-1">
                            <dl>
                              <dt className="text-sm font-medium text-gray-500 truncate">
                                Total Jobs
                              </dt>
                              <dd className="text-lg font-medium text-gray-900">
                                {analytics.teamStats?.total_jobs || 0}
                              </dd>
                            </dl>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white overflow-hidden shadow rounded-lg">
                      <div className="p-5">
                        <div className="flex items-center">
                          <div className="flex-shrink-0">
                            <TrendingUp className="h-6 w-6 text-gray-400" />
                          </div>
                          <div className="ml-5 w-0 flex-1">
                            <dl>
                              <dt className="text-sm font-medium text-gray-500 truncate">
                                Completed Jobs
                              </dt>
                              <dd className="text-lg font-medium text-gray-900">
                                {analytics.teamStats?.completed_jobs || 0}
                              </dd>
                            </dl>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white overflow-hidden shadow rounded-lg">
                      <div className="p-5">
                        <div className="flex items-center">
                          <div className="flex-shrink-0">
                            <DollarSign className="h-6 w-6 text-gray-400" />
                          </div>
                          <div className="ml-5 w-0 flex-1">
                            <dl>
                              <dt className="text-sm font-medium text-gray-500 truncate">
                                Total Revenue
                              </dt>
                              <dd className="text-lg font-medium text-gray-900">
                                {formatCurrency(analytics.teamStats?.total_revenue)}
                              </dd>
                            </dl>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Performance Summary */}
                  <div className="bg-white shadow overflow-hidden sm:rounded-md">
                    <div className="px-4 py-5 sm:px-6">
                      <h3 className="text-lg leading-6 font-medium text-gray-900">
                        Team Performance Summary
                      </h3>
                    </div>
                    <div className="border-t border-gray-200">
                      <ul className="divide-y divide-gray-200">
                        {analytics.performanceSummary?.map((member) => (
                          <li key={member.id} className="px-4 py-4 sm:px-6">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center">
                                <div className="flex-shrink-0">
                                  <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                                    <span className="text-sm font-medium text-blue-600">
                                      {member.first_name?.[0]}{member.last_name?.[0]}
                                    </span>
                                  </div>
                                </div>
                                <div className="ml-4">
                                  <p className="text-sm font-medium text-gray-900">
                                    {member.first_name} {member.last_name}
                                  </p>
                                  <p className="text-sm text-gray-500">{member.role}</p>
                                </div>
                              </div>
                              
                              <div className="flex items-center space-x-6 text-sm">
                                <div className="text-center">
                                  <p className="text-gray-500">Total Jobs</p>
                                  <p className="font-medium text-gray-900">{member.total_jobs}</p>
                                </div>
                                <div className="text-center">
                                  <p className="text-gray-500">Completed</p>
                                  <p className="font-medium text-gray-900">{member.completed_jobs}</p>
                                </div>
                                <div className="text-center">
                                  <p className="text-gray-500">Active</p>
                                  <p className="font-medium text-gray-900">{member.active_jobs}</p>
                                </div>
                                <div className="text-center">
                                  <p className="text-gray-500">Avg Value</p>
                                  <p className="font-medium text-gray-900">{formatCurrency(member.avg_job_value)}</p>
                                </div>
                                <div className="text-center">
                                  <p className="text-gray-500">Total Revenue</p>
                                  <p className="font-medium text-gray-900">{formatCurrency(member.total_revenue)}</p>
                                </div>
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
                  <BarChart3 className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No analytics data</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Analytics will appear once you have team members and completed jobs.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Add Team Member Modal */}
      {isAddModalOpen && (
        <AddTeamMemberModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onSuccess={handleMemberUpdate}
          userId={user?.id}
        />
      )}

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
    </div>
  )
}

export default TeamPage 