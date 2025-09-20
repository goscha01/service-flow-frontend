"use client"

import { createContext, useContext, useState, useEffect } from "react"
import axios from "axios"

const TeamMemberAuthContext = createContext()

export const useTeamMemberAuth = () => {
  const context = useContext(TeamMemberAuthContext)
  if (!context) {
    throw new Error('useTeamMemberAuth must be used within a TeamMemberAuthProvider')
  }
  return context
}

export const TeamMemberAuthProvider = ({ children }) => {
  const [teamMember, setTeamMember] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Create axios instance for team member API calls
  const teamMemberApi = axios.create({
    baseURL: 'https://service-flow-backend-production.up.railway.app',
    timeout: 15000,
    headers: {
      'Content-Type': 'application/json',
    },
  })

  // Request interceptor to add auth token
  teamMemberApi.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem('teamMemberToken')
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
      return config
    },
    (error) => {
      return Promise.reject(error)
    }
  )

  // Response interceptor to handle auth errors
  teamMemberApi.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401) {
        // Token is invalid or expired
        console.log('Team member authentication failed, redirecting to login')
        localStorage.removeItem('teamMemberToken')
        localStorage.removeItem('teamMemberData')
        setTeamMember(null)
        // Redirect to login page
        window.location.href = '/team-member/login'
      }
      return Promise.reject(error)
    }
  )

  // Check if team member is logged in on app start
  useEffect(() => {
    const validateAuth = async () => {
      const token = localStorage.getItem('teamMemberToken')
      const teamMemberData = localStorage.getItem('teamMemberData')
      
      if (token && teamMemberData) {
        try {
          // Validate token with server
          const response = await teamMemberApi.get('/api/team-members/me')
          if (response.data && response.data.id) {
            setTeamMember(response.data)
          } else {
            // Token is invalid, clear storage
            localStorage.removeItem('teamMemberToken')
            localStorage.removeItem('teamMemberData')
            setTeamMember(null)
          }
        } catch (error) {
          console.error('Token validation failed:', error)
          // Token is invalid or expired, clear storage
          localStorage.removeItem('teamMemberToken')
          localStorage.removeItem('teamMemberData')
          setTeamMember(null)
        }
      }
      setLoading(false)
    }
    
    validateAuth()
  }, [])

  const login = async (username, password) => {
    try {
      setLoading(true)
      setError(null)
      
      console.log('Attempting team member login for:', username)
      console.log('API URL:', teamMemberApi.defaults.baseURL)
      
      const response = await teamMemberApi.post('/api/team-members/login', {
        username,
        password
      })
      
      console.log('Login response:', response.data)
      
      const { teamMember, token } = response.data
      
      // Store in localStorage
      localStorage.setItem('teamMemberToken', token)
      localStorage.setItem('teamMemberData', JSON.stringify(teamMember))
      
      setTeamMember(teamMember)
      return { success: true, teamMember }
    } catch (error) {
      console.error('Login error:', error)
      console.error('Error response:', error.response?.data)
      const errorMessage = error.response?.data?.error || 'Login failed'
      setError(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    try {
      const token = localStorage.getItem('teamMemberToken')
      if (token) {
        await teamMemberApi.post('/api/team-members/logout', { token })
      }
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      // Clear localStorage
      localStorage.removeItem('teamMemberToken')
      localStorage.removeItem('teamMemberData')
      setTeamMember(null)
      setError(null)
    }
  }

  const updateProfile = async (profileData) => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await teamMemberApi.put(`/api/team-members/${teamMember.id}`, profileData)
      
      const updatedTeamMember = { ...teamMember, ...response.data.teamMember }
      localStorage.setItem('teamMemberData', JSON.stringify(updatedTeamMember))
      setTeamMember(updatedTeamMember)
      
      return { success: true, teamMember: updatedTeamMember }
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Update failed'
      setError(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setLoading(false)
    }
  }

  const getDashboardData = async (startDate = null, endDate = null) => {
    try {
      setLoading(true)
      setError(null)
      
      const params = {}
      if (startDate) params.startDate = startDate
      if (endDate) params.endDate = endDate
      
      const response = await teamMemberApi.get(`/api/team-members/dashboard/${teamMember.id}`, { params })
      return { success: true, data: response.data }
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to fetch dashboard data'
      setError(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setLoading(false)
    }
  }

  const updateJobStatus = async (jobId, status, notes = '') => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await teamMemberApi.put(`/api/team-members/jobs/${jobId}/status`, {
        teamMemberId: teamMember.id,
        status,
        notes
      })
      
      return { success: true, data: response.data }
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to update job status'
      setError(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setLoading(false)
    }
  }

  const value = {
    teamMember,
    loading,
    error,
    login,
    logout,
    updateProfile,
    getDashboardData,
    updateJobStatus,
    isAuthenticated: !!teamMember
  }

  return (
    <TeamMemberAuthContext.Provider value={value}>
      {children}
    </TeamMemberAuthContext.Provider>
  )
} 