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
    // For routes that don't exist yet, show a message or navigate to dashboard
    if (path === "/offers" || path === "/notifications") {
      // TODO: Create these routes or show a coming soon message
      console.log(`Route ${path} not yet implemented`)
      // For now, navigate to dashboard
      navigate("/dashboard")
      return
    }
    navigate(path)
  }
  
  const isActive = (path) => {
    if (path === "/dashboard") {
      return location.pathname === "/dashboard"
    }
    return location.pathname.startsWith(path)
  }
  
  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 safe-area-bottom">
      <div className="flex items-center justify-around py-2 px-2">
        {navItems.map((item) => {
          const Icon = item.icon
          const active = isActive(item.path)
          
          return (
            <button
              key={item.path}
              onClick={() => handleNavigation(item.path)}
              className={`flex flex-col items-center space-y-1 px-2 py-2 flex-1 transition-colors ${
                active 
                  ? 'text-blue-600' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Icon className={`w-5 h-5 ${active ? 'text-blue-600' : ''}`} />
              <span className={`text-xs font-medium ${active ? 'text-blue-600' : 'text-gray-600'}`}>
                {item.label}
              </span>
            </button>
          )
        })}
      </div>
      {/* iOS home indicator spacer */}
      <div className="h-safe-area-inset-bottom bg-white" />
    </div>
  )
}

export default WorkerBottomNav

