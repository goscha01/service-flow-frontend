"use client"
import { useState } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import UserDropdown from "./user-dropdown"
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
  BarChart3,
  Globe,
  Settings,
  X,
  Phone,
  Zap,
} from "lucide-react"

const Sidebar = ({ isOpen, onClose }) => {
  const navigate = useNavigate()
  const location = useLocation()
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false)
  const { user } = useAuth()
  console.log('🔍 Sidebar: Current user data:', user)

  const sidebarItems = [
    { icon: Home, label: "Dashboard", path: "/dashboard" },
    { icon: MessageSquare, label: "Requests", path: "/request" },
    { icon: Calendar, label: "Schedule", path: "/schedule" },
    { icon: Briefcase, label: "Jobs", path: "/jobs" },
    { icon: FileText, label: "Estimates", path: "/estimates", hidden: true },
    { icon: FileText, label: "Invoices", path: "/invoices", hidden: true },
    { icon: RotateCcw, label: "Recurring", path: "/recurring", hidden: true },
    { icon: CreditCard, label: "Payments", path: "/payments", hidden: true },
    { icon: Users, label: "Customers", path: "/customers" },
    { icon: UserCheck, label: "Team", path: "/team" },
    { icon: Wrench, label: "Services", path: "/services" },
    { icon: Tag, label: "Coupons", path: "/coupons", hidden: true },
    { icon: MapPin, label: "Territories", path: "/territories" },
    { icon: BarChart3, label: "Analytics", path: "/analytics", hidden: true },
    { icon: Globe, label: "Online Booking", path: "/online-booking", hidden: true },
    { icon: Settings, label: "Settings", path: "/settings" },
  ]

  const integrationItems = [
    { icon: Phone, label: "SMS Settings", path: "/settings/sms-settings" },
    { icon: Zap, label: "Stripe Connect", path: "/settings/stripe-connect" },
  ]

  const handleNavigation = (path) => {
    navigate(path)
    // Close sidebar on mobile when item is clicked
    if (window.innerWidth < 1024) {
      onClose()
    }
  }

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && <div className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden" onClick={onClose} />}

      {/* Sidebar */}
      <div
        className={`
        fixed inset-y-0 left-0 z-40 w-64 xl:w-72 bg-white border-r border-gray-200 
        transform transition-all duration-300 ease-in-out
        ${isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        flex flex-col shadow-lg
      `}
      >
        {/* Mobile Close Button */}
        <div className="lg:hidden flex justify-end p-4">
          <button onClick={onClose} className="p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Logo */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center space-x-2 cursor-pointer" onClick={() => handleNavigation("/dashboard")}>
           <img src="/logo.svg" alt="ServiceFlow Logo"  />
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 overflow-y-auto">
          <ul className="space-y-1">
            {sidebarItems.map((item, index) => {
              const Icon = item.icon
              const isActive = location.pathname === item.path
              return (
                <li key={index} className={item.hidden ? "feature-hidden" : ""}>
                  <button
                    onClick={() => handleNavigation(item.path)}
                    className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left ${
                      isActive ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    }`}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    <span>{item.label}</span>
                  </button>
                </li>
              )
            })}
          </ul>

          {/* Integrations Section */}
          <div className="mt-6">
            <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Integrations
            </h3>
            <ul className="space-y-1">
              {integrationItems.map((item, index) => {
                const Icon = item.icon
                const isActive = location.pathname === item.path
                return (
                  <li key={`integration-${index}`}>
                    <button
                      onClick={() => handleNavigation(item.path)}
                      className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left ${
                        isActive ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                      }`}
                    >
                      <Icon className="w-5 h-5 flex-shrink-0" />
                      <span>{item.label}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        </nav>

        {/* User Profile */}
        <div className="p-4 border-t border-gray-200 relative">
          {/* Debug: Log user object to see what fields are available */}
          {user && (
            <div className="hidden">
              {console.log('🔍 Sidebar: User object:', user)}
              {console.log('🔍 Sidebar: Profile picture field:', user.profilePicture)}
            </div>
          )}
          
          <button
            onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
            className="w-full flex items-center space-x-3 hover:bg-gray-50 rounded-lg p-2 transition-colors"
          >
            <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden">
              {user?.profilePicture ? (
                <img 
                  src={user.profilePicture} 
                  alt="Profile" 
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    console.error('Failed to load profile picture in sidebar:', user.profilePicture);
                    e.target.style.display = 'none';
                  }}
                />
              ) : (
                <span className="text-white font-medium text-sm">
                  {user?.firstName && user?.lastName 
                    ? `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`
                    : user?.firstName?.charAt(0) || user?.email?.charAt(0) || 'U'
                  }
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user?.firstName && user?.lastName 
                  ? `${user.firstName} ${user.lastName}`
                  : user?.firstName || user?.email || 'User'
                }
              </p>
              <p className="text-xs text-gray-500 truncate">
                {(() => {
                  const businessName = user?.business_name || user?.businessName || user?.email || 'Business';
                  console.log('🔍 Sidebar: Displaying business name:', businessName, 'from fields:', {
                    business_name: user?.business_name,
                    businessName: user?.businessName,
                    email: user?.email
                  });
                  return businessName;
                })()}
              </p>
            </div>
          </button>
          
          <UserDropdown
            isOpen={isUserDropdownOpen}
            onClose={() => setIsUserDropdownOpen(false)}
            onToggle={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
          />
        </div>
      </div>
    </>
  )
}

export default Sidebar
