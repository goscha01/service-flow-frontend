"use client"

import { useNavigate, useLocation } from "react-router-dom"
import { Home, Briefcase, Calendar, User, Megaphone, Bell, Clock } from "lucide-react"

const WorkerBottomNav = () => {
  const navigate = useNavigate()
  const location = useLocation()
  
  const navItems = [
    { icon: Home, label: "Home", path: "/dashboard" },
    { icon: Briefcase, label: "Jobs", path: "/jobs" },
    { icon: Calendar, label: "Schedule", path: "/schedule" },
    { icon: User, label: "Availability", path: "/availability" },
    { icon: Megaphone, label: "Offers", path: "/offers" },
    { icon: Bell, label: "Notifications", path: "/notifications" },
  ]
  
  const handleNavigation = (path) => {
    navigate(path)
  }
  
  const isActive = (path) => {
    if (path === "/dashboard") {
      return location.pathname === "/dashboard"
    }
    return location.pathname.startsWith(path)
  }
  
  return (
    <div className="lg:hidden fixed-bottom-nav bg-white border-t border-gray-200 z-[100] shadow-lg">
      <div className="flex items-center justify-around py-3.5 px-2 safe-area-bottom">
        {navItems.map((item) => {
          const Icon = item.icon
          const active = isActive(item.path)
          
          return (
            <button
              key={item.path}
              onClick={() => handleNavigation(item.path)}
              className={`flex flex-col items-center space-y-1.5 px-2 py-1.5 flex-1 transition-colors ${
                active 
                  ? 'text-blue-600' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Icon className={`w-6 h-6 ${active ? 'text-blue-600' : ''}`} />
              <span className={`text-xs font-medium ${active ? 'text-blue-600' : 'text-gray-600'}`}>
                {item.label}
              </span>
            </button>
          )
        })}
      </div>
      {/* iOS home indicator spacer - ensures proper spacing on devices with home indicator */}
      <div 
        className="bg-white h-safe-area-inset-bottom" 
        style={{ 
          minHeight: 'max(8px, env(safe-area-inset-bottom, 8px))' // Minimum 8px padding even without safe area
        }} 
      />
    </div>
  )
}

export default WorkerBottomNav

