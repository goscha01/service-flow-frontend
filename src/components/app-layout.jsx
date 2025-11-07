"use client"
import { useState } from "react"
import { Outlet } from "react-router-dom"
import Sidebar from "./sidebar"
import MobileHeader from "./mobile-header"

const AppLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      {/* Main Content Area */}
      <div className="flex-1 lg:ml-52 xl:ml-52">
        {/* Mobile Header */}
        <MobileHeader onMenuClick={() => setSidebarOpen(true)} />
        
        {/* Page Content */}
        <Outlet />
      </div>
    </div>
  )
}

export default AppLayout

