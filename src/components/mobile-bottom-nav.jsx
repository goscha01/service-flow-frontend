"use client"

import { useState, useRef, useEffect } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import { filterSidebarItems, isWorker } from "../utils/roleUtils"
import { getImageUrl } from "../utils/imageUtils"
import {
  Home,
  Briefcase,
  Calendar,
  Megaphone,
  Bell,
  Menu,
  X,
  MessageSquare,
  FileText,
  RotateCw,
  CreditCard,
  Users,
  UserCheck,
  Wrench,
  Tag,
  MapPin,
  BarChart3,
  Globe,
  Settings,
  ChevronRight,
  LogOut,
} from "lucide-react"

const MobileBottomNav = ({ teamMembers = [] }) => {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuth()
  const [showMoreOverlay, setShowMoreOverlay] = useState(false)
  const overlayRef = useRef(null)
  const isWorkerUser = isWorker(user)

  // Bottom nav items - always visible
  const bottomNavItems = [
    { icon: Home, label: "Home", path: "/dashboard" },
    { icon: Briefcase, label: "Jobs", path: "/jobs" },
    { icon: Calendar, label: "Schedule", path: "/schedule" },
    { icon: Megaphone, label: "Offers", path: "/offers" },
    { icon: Bell, label: "Notifications", path: "/notifications" },
  ]

  // All sidebar items
  const allSidebarItems = [
    { icon: Home, label: "Dashboard", path: "/dashboard" },
    { icon: MessageSquare, label: "Requests", path: "/request" },
    { icon: Calendar, label: "Schedule", path: "/schedule" },
    { icon: Briefcase, label: "Jobs", path: "/jobs" },
    { icon: FileText, label: "Estimates", path: "/estimates", hidden: true },
    { icon: FileText, label: "Invoices", path: "/invoices", hidden: true },
    { icon: RotateCw, label: "Recurring", path: "/recurring" },
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

  // Filter sidebar items by role
  const filteredSidebarItems = filterSidebarItems(allSidebarItems, user)

  // Items already in bottom nav
  const bottomNavPaths = ['/dashboard', '/jobs', '/schedule']

  // Get remaining items not in bottom nav
  const remainingItems = filteredSidebarItems.filter(item => 
    !bottomNavPaths.includes(item.path) && !item.hidden
  )

  // Handle sign out
  const handleSignOut = () => {
    logout()
    navigate('/signin')
    setShowMoreOverlay(false)
  }

  // Get initials helper
  const getInitials = (name) => {
    if (!name) return '?'
    const parts = name.trim().split(' ')
    if (parts.length === 1) {
      return parts[0].substring(0, 2).toUpperCase()
    }
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }

  // Check if route is active
  const isActive = (path) => {
    if (path === "/dashboard") {
      return location.pathname === "/dashboard"
    }
    return location.pathname.startsWith(path)
  }

  // Handle navigation
  const handleNavigation = (path) => {
    if (path === "/offers" || path === "/notifications") {
      // TODO: Create these routes or show a coming soon message
      console.log(`Route ${path} not yet implemented`)
      return
    }
    navigate(path)
    setShowMoreOverlay(false)
  }

  // Close overlay when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (overlayRef.current && !overlayRef.current.contains(event.target)) {
        setShowMoreOverlay(false)
      }
    }

    if (showMoreOverlay) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showMoreOverlay])

  // Get current user's team member data
  const currentUserTeamMember = user?.teamMemberId 
    ? teamMembers.find(member => member.id === user.teamMemberId)
    : null

  const userColor = currentUserTeamMember?.color || '#2563EB'
  const userFirstName = user?.firstName || user?.first_name || ''
  const userLastName = user?.lastName || user?.last_name || ''
  const userName = `${userFirstName} ${userLastName}`.trim() || user?.email || 'User'
  const userProfilePicture = user?.profilePicture || user?.profile_picture || null

  // Show "More" button for all users
  const showMoreButton = true

  return (
    <>
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 safe-area-bottom">
        <div className="flex items-center justify-around py-2 px-2">
          {bottomNavItems.map((item) => {
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
          
          {/* More button - show for all users */}
          {showMoreButton && (
            <button
              onClick={() => setShowMoreOverlay(true)}
              className={`flex flex-col items-center space-y-1 px-2 py-2 flex-1 transition-colors ${
                showMoreOverlay
                  ? 'text-blue-600' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Menu className={`w-5 h-5 ${showMoreOverlay ? 'text-blue-600' : ''}`} />
              <span className={`text-xs font-medium ${showMoreOverlay ? 'text-blue-600' : 'text-gray-600'}`}>
                More
              </span>
            </button>
          )}
        </div>
        {/* iOS home indicator spacer */}
        <div className="h-safe-area-inset-bottom bg-white" />
      </div>

      {/* More Overlay - Mobile Only */}
      {showMoreOverlay && (
        <div 
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-[9999] flex items-end justify-center"
          onClick={() => setShowMoreOverlay(false)}
        >
          <div 
            ref={overlayRef}
            className="bg-white rounded-t-2xl w-full max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 sticky top-0 bg-white z-10">
              <div className="flex items-center space-x-3">
                <img src="/logo.svg" alt="zenbooker" className="h-6" />
              </div>
              <button
                onClick={() => setShowMoreOverlay(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>
            
            {/* Account Section - Only show for non-workers */}
            {!isWorkerUser && (
              <div 
                className="px-6 py-4 border-b border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => {
                  navigate('/settings/account')
                  setShowMoreOverlay(false)
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div 
                      className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden"
                      style={{ backgroundColor: userProfilePicture ? 'transparent' : userColor }}
                    >
                      {userProfilePicture ? (
                        <img 
                          src={getImageUrl(userProfilePicture)} 
                          alt={userName}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.style.display = 'none'
                            e.target.nextSibling.style.display = 'flex'
                          }}
                        />
                      ) : null}
                      <span 
                        className={`text-white font-bold text-sm ${userProfilePicture ? 'hidden' : 'flex items-center justify-center'}`}
                      >
                        {getInitials(userName)}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {user?.business_name || user?.businessName || user?.email || 'Business'}
                      </p>
                      <p className="text-xs text-gray-500">Account Settings</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>
              </div>
            )}
            
            {/* Menu Items */}
            <div className="py-2">
              {/* For workers, only show Settings */}
              {isWorkerUser ? (
                <button
                  onClick={() => handleNavigation('/settings')}
                  className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="flex items-center space-x-3">
                    <Settings className="w-5 h-5 text-gray-600" />
                    <span className="text-sm font-medium text-gray-900">Settings</span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </button>
              ) : (
                remainingItems.map((item, index) => {
                  const Icon = item.icon
                  return (
                    <button
                      key={index}
                      onClick={() => handleNavigation(item.path)}
                      className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors text-left"
                    >
                      <div className="flex items-center space-x-3">
                        <Icon className="w-5 h-5 text-gray-600" />
                        <span className="text-sm font-medium text-gray-900">{item.label}</span>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    </button>
                  )
                })
              )}
              
              {/* Sign Out Button - Show for all users */}
              <button
                onClick={handleSignOut}
                className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors text-left border-t border-gray-200 mt-2"
              >
                <div className="flex items-center space-x-3">
                  <LogOut className="w-5 h-5 text-red-600" />
                  <span className="text-sm font-medium text-red-600">Sign Out</span>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default MobileBottomNav

