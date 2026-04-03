"use client"
import { useState, useMemo } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import UserDropdown from "./user-dropdown"
import { useAuth } from "../context/AuthContext"
import { filterSidebarItems, getUserRole } from "../utils/roleUtils"
import {
  Home,
  Calendar,
  CalendarDays,
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
  Target,
  Receipt,
  MessageSquare,
} from "lucide-react"

const Sidebar = ({ isOpen, onClose }) => {
  const navigate = useNavigate()
  const location = useLocation()
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false)
  const { user } = useAuth()

  const allSidebarItems = [
    { icon: Home, label: "Dashboard", path: "/dashboard", section: "main" },
    { icon: Target, label: "Leads", path: "/leads", section: "main" },
    { icon: MessageSquare, label: "Communications", path: "/communications", section: "main" },
    { icon: CalendarDays, label: "Tasks", path: "/calendar", section: "main" },
    { icon: Users, label: "Customers", path: "/customers", section: "main" },
    { icon: Briefcase, label: "Jobs", path: "/jobs", section: "main" },
    { icon: Calendar, label: "Schedule", path: "/schedule", section: "main" },
    { icon: FileText, label: "Estimates", path: "/estimates", hidden: true, section: "main" },
    { icon: FileText, label: "Invoices", path: "/invoices", hidden: true, section: "main" },
    { icon: RotateCcw, label: "Recurring", path: "/recurring", hidden: true, section: "main" },
    { icon: CreditCard, label: "Payments", path: "/payments", hidden: true, section: "main" },
    { icon: UserCheck, label: "Team", path: "/team", section: "tools" },
    { icon: Receipt, label: "Payroll", path: "/payroll", section: "tools" },
    { icon: Tag, label: "Coupons", path: "/coupons", hidden: true, section: "tools" },
    { icon: BarChart3, label: "Analytics", path: "/analytics", section: "tools" },
    { icon: Globe, label: "Online Booking", path: "/online-booking", hidden: true, section: "tools" },
    { icon: Settings, label: "Settings", path: "/settings", section: "tools" },
  ]

  const sidebarItems = useMemo(() => {
    return filterSidebarItems(allSidebarItems, user)
  }, [user])

  const mainItems = sidebarItems.filter(item => item.section === "main")
  const toolsItems = sidebarItems.filter(item => item.section === "tools")

  const handleNavigation = (path) => {
    navigate(path)
    if (window.innerWidth < 1024) {
      onClose()
    }
  }

  const renderNavItem = (item, index) => {
    const Icon = item.icon
    const isActive = location.pathname === item.path || (item.path === "/settings" && location.pathname.startsWith("/settings"))

    return (
      <li key={index} className={item.hidden ? "feature-hidden" : ""}>
        <button
          onClick={() => handleNavigation(item.path)}
          className={`
            sf-sidebar-item w-full text-left group relative
            md:justify-center md:px-3 lg:justify-start lg:px-4
            ${isActive ? 'active' : ''}
          `}
        >
          <Icon className="sf-sidebar-icon w-[20px] h-[20px] flex-shrink-0" />
          <span className="md:hidden lg:inline">{item.label}</span>

          {/* Tooltip for collapsed state on tablets */}
          <div className="absolute left-full ml-2 px-2.5 py-1.5 bg-[var(--sf-text-primary)] text-white text-xs rounded-md opacity-0 invisible md:group-hover:opacity-100 md:group-hover:visible lg:opacity-0 lg:invisible transition-all duration-200 whitespace-nowrap z-50 shadow-lg">
            {item.label}
          </div>
        </button>
      </li>
    )
  }

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && <div className="fixed inset-0 bg-black/30 backdrop-blur-[2px] z-40 lg:hidden" onClick={onClose} />}

      {/* Sidebar */}
      <div
        className={`
        sf-sidebar fixed inset-y-0 left-0 z-40
        w-[260px] md:w-20 lg:w-[260px]
        transform transition-all duration-300 ease-in-out
        ${isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        flex flex-col
      `}
      >
        {/* Mobile Close Button */}
        <div className="lg:hidden flex justify-end p-3">
          <button onClick={onClose} className="p-2 rounded-lg text-[var(--sf-text-muted)] hover:text-[var(--sf-text-primary)] hover:bg-[var(--sf-bg-hover)] transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Logo */}
        <div className="px-5 py-5 md:flex md:justify-center lg:justify-start">
          <div className="flex items-center space-x-2 cursor-pointer" onClick={() => handleNavigation("/dashboard")}>
            <img src="/logo.svg" alt="ServiceFlow Logo" className="md:w-8 lg:w-auto h-auto max-h-8" />
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 md:px-3 lg:px-4 overflow-y-auto scrollbar-hide">
          {/* Main Menu Section */}
          <div className="sf-sidebar-section-label hidden lg:block">Main Menu</div>
          <ul className="space-y-0.5">
            {mainItems.map(renderNavItem)}
          </ul>

          {/* Tools Section */}
          {toolsItems.length > 0 && (
            <>
              <div className="sf-sidebar-section-label hidden lg:block mt-6">Tools Area</div>
              <div className="my-4 border-t border-[var(--sf-border-light)] md:block hidden lg:hidden" />
              <ul className="space-y-0.5">
                {toolsItems.map(renderNavItem)}
              </ul>
            </>
          )}
        </nav>

        {/* User Profile */}
        <div className="p-4 border-t border-[var(--sf-border-light)] relative">
          <button
            onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
            className="w-full flex items-center space-x-3 md:justify-center lg:justify-start hover:bg-[var(--sf-bg-hover)] rounded-lg p-2 transition-colors"
          >
            <div className="w-10 h-10 bg-[var(--sf-blue-500)] rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden">
              {user?.profilePicture ? (
                <img
                  src={user.profilePicture}
                  alt="Profile"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
              ) : (
                <span className="text-white font-semibold text-sm">
                  {user?.firstName && user?.lastName
                    ? `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`
                    : user?.firstName?.charAt(0) || user?.email?.charAt(0) || 'U'
                  }
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0 text-left md:hidden lg:block">
              <p className="text-sm font-semibold text-[var(--sf-text-primary)] truncate">
                {user?.firstName && user?.lastName
                  ? `${user.firstName} ${user.lastName}`
                  : user?.firstName || user?.email || 'User'
                }
              </p>
              <p className="text-xs text-[var(--sf-text-muted)] truncate">
                {user?.business_name || user?.businessName || user?.email || 'Business'}
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
