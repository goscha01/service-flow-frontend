"use client"
import { useState } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import {
  Home,
  MessageSquare,
  Calendar,
  Briefcase,
  FileText,
  RotateCcw,
  CreditCard,
  Users,
  UserCheck,
  Wrench,
  Tag,
  MapPin,
  Globe,
  Settings,
  X,
} from "lucide-react"

const Sidebar = ({ isOpen, onClose }) => {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()

  const sidebarItems = [
    { icon: Home, label: "Dashboard", path: "/dashboard" },
    { icon: MessageSquare, label: "Requests", path: "/request" },
    { icon: Calendar, label: "Schedule", path: "/schedule" },
    { icon: Briefcase, label: "Jobs", path: "/jobs" },
    { icon: FileText, label: "Estimates", path: "/estimates" },
    { icon: RotateCcw, label: "Recurring", path: "/recurring" },
    { icon: CreditCard, label: "Payments", path: "/payments" },
    { icon: Users, label: "Customers", path: "/customers" },
    { icon: UserCheck, label: "Team", path: "/team" },
    { icon: Wrench, label: "Services", path: "/services" },
    { icon: Tag, label: "Coupons", path: "/coupons" },
    { icon: MapPin, label: "Territories", path: "/territories" },
    { icon: Globe, label: "Online Booking", path: "/online-booking" },
    { icon: Settings, label: "Settings", path: "/settings" },
  ]

  const handleNavigation = (path) => {
    navigate(path)
    if (window.innerWidth < 1024) {
      onClose()
    }
  }

  const getUserInitials = () => {
    if (!user) return "JW"
    const firstName = user.firstName || user.name || ""
    const lastName = user.lastName || ""
    if (firstName && lastName) {
      return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
    }
    if (firstName) {
      return firstName.charAt(0).toUpperCase()
    }
    return "JW"
  }

  const getUserDisplayName = () => {
    if (!user) return "Just web"
    return user.firstName || user.name || "Just web"
  }

  const getUserHandle = () => {
    if (!user) return "Just_web"
    return user.email?.split('@')[0] || "Just_web"
  }

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && <div className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden" onClick={onClose} />}

      {/* Sidebar */}
      <div
        className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-gray-200 
        transform transition-all duration-300 ease-in-out
        ${isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        flex flex-col
      `}
      >
        {/* Mobile Close Button */}
        <div className="lg:hidden flex justify-end p-4">
          <button onClick={onClose} className="p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Logo Section */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => handleNavigation("/dashboard")}>
            {/* Zenbooker Logo */}
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-semibold text-gray-900">zenbooker</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {sidebarItems.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.path
            
            return (
              <button
                key={item.path}
                onClick={() => handleNavigation(item.path)}
                className={`
                  w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200
                  ${isActive 
                    ? 'bg-blue-50 text-blue-700' 
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }
                `}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-blue-700' : 'text-gray-600'}`} />
                <span className="flex-1 text-left">{item.label}</span>
              </button>
            )
          })}
        </nav>

        {/* User Profile Section */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center space-x-3">
            {/* User Avatar */}
            <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">{getUserInitials()}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-900 truncate">
                {getUserDisplayName()}
              </div>
              <div className="text-xs text-gray-500 truncate">
                {getUserHandle()}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default Sidebar
