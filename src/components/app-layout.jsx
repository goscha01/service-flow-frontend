"use client"
import { useState, useEffect } from "react"
import { Outlet } from "react-router-dom"
import Sidebar from "./sidebar"
import MobileBottomNav from "./mobile-bottom-nav"
import { useAuth } from "../context/AuthContext"
import { teamAPI } from "../services/api"

const AppLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { user } = useAuth()
  const [teamMembers, setTeamMembers] = useState([])

  // Fetch team members for MobileBottomNav
  useEffect(() => {
    if (user?.id) {
      const fetchTeamMembers = async () => {
        try {
          const teamResponse = await teamAPI.getAll(user.id, { page: 1, limit: 1000 })
          const members = teamResponse.teamMembers || teamResponse || []
          setTeamMembers(members)
        } catch (error) {
          console.error('Error fetching team members:', error)
          setTeamMembers([])
        }
      }
      fetchTeamMembers()
    }
  }, [user?.id])

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar - Hidden on mobile, shown on desktop */}
      <div className="hidden lg:block">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      </div>
      
      {/* Main Content Area */}
      <div className="flex-1 lg:ml-52 xl:ml-52">
        {/* Page Content */}
        <Outlet />
      </div>
      
      {/* Bottom Navigation - For all users on mobile */}
      <MobileBottomNav teamMembers={teamMembers} />
    </div>
  )
}

export default AppLayout

