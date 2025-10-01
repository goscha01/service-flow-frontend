"use client"

import { useState, useRef, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Wrench, Settings, Gift, HelpCircle, LogOut } from "lucide-react"
import { useAuth } from "../context/AuthContext"

const UserDropdown = ({ isOpen, onClose, onToggle }) => {
  const navigate = useNavigate()
  const dropdownRef = useRef(null)
  const { user, logout } = useAuth()

  // Debug: Log user object to see what fields are available
  useEffect(() => {
    if (user) {
      console.log('🔍 UserDropdown: User object:', user)
      console.log('🔍 UserDropdown: Profile picture field:', user.profilePicture)
    }
  }, [user])

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isOpen, onClose])

  const handleSignOut = () => {
    // Use the logout function from AuthContext
    logout()
    
    // Redirect to signin page
    navigate("/signin")
    onClose()
    
    // Optional: Show success message
    console.log("Successfully signed out")
  }

  const menuItems = [
    {
      icon: Wrench,
      label: "Services",
      onClick: () => {
        navigate("/services")
        onClose()
      }
    },
    {
      icon: Settings,
      label: "User Settings",
      onClick: () => {
        navigate("/settings/account")
        onClose()
      }
    },
    {
      icon: Gift,
      label: "What's New",
      onClick: () => {
        navigate("/whats-new")
        onClose()
      }
    },
    {
      icon: HelpCircle,
      label: "Serviceflow Help",
      onClick: () => {
        navigate("/help")
        onClose()
      }
    },
    {
      icon: LogOut,
      label: "Sign Out",
      onClick: handleSignOut
    }
  ]

  if (!isOpen) return null

  return (
    <div
      ref={dropdownRef}
      className="absolute bottom-full left-4 mb-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50"
    >
      {menuItems.map((item, index) => {
        const Icon = item.icon
        return (
          <button
            key={index}
            onClick={item.onClick}
            className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors text-left"
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            <span>{item.label}</span>
          </button>
        )
      })}
      
      {/* User Info at Bottom */}
      <div className="border-t border-gray-200 mt-2 pt-2 px-4">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden">
            {user?.profilePicture ? (
              <img 
                src={user.profilePicture} 
                alt="Profile" 
                className="w-full h-full object-cover"
                onError={(e) => {
                  console.error('Failed to load profile picture in user dropdown:', user.profilePicture);
                  e.target.style.display = 'none';
                }}
              />
            ) : (
              <span className="text-white font-medium text-xs">
                {user?.firstName && user?.lastName 
                  ? `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`
                  : user?.firstName?.charAt(0) || user?.email?.charAt(0) || 'U'
                }
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {user?.firstName && user?.lastName 
                ? `${user.firstName} ${user.lastName}`
                : user?.firstName || user?.email || 'User'
              }
            </p>
            <p className="text-xs text-gray-500 truncate">
              {user?.business_name || user?.businessName || user?.email || 'Business'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default UserDropdown 