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
    <div className="min-h-screen bg-[var(--sf-bg-page)] flex">
      {/* Sidebar - Hidden on mobile, shown on desktop */}
      <div className="hidden md:block">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 md:ml-20 lg:ml-[260px]">
        {/* Page Content */}
        <Outlet />
      </div>
      
      {/* Bottom Navigation - For all users on mobile */}
      <MobileBottomNav teamMembers={teamMembers} />
    </div>
  )
}

export default AppLayout

