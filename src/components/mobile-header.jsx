"use client"

import { Menu, Plus } from "lucide-react"
import { useState, useRef, useEffect } from "react"
import { useNavigate } from "react-router-dom"

const MobileHeader = ({ onMenuClick }) => {
  const [showNewMenu, setShowNewMenu] = useState(false)
  const newMenuRef = useRef(null)
  const navigate = useNavigate()

  const newOptions = [
    { title: "Job", action: () => navigate("/createjob") },
    { title: "Customer", action: () => console.log("Open customer modal") }
  ]

  const handleNewOptionClick = (option) => {
    setShowNewMenu(false)
    option.action()
  }

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (newMenuRef.current && !newMenuRef.current.contains(event.target)) {
        setShowNewMenu(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  return (
    <div className="lg:hidden bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between w-full max-w-full">
      
      {/* LEFT SECTION */}
      <div className="flex items-center gap-3 min-w-0 flex-1 overflow-hidden">
        <button 
          onClick={onMenuClick} 
          className="p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 flex-shrink-0"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 min-w-0 overflow-hidden">
          <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-sm">Z</span>
          </div>

          <span className="text-base font-semibold text-gray-800 truncate whitespace-nowrap">
            service-flow
          </span>
        </div>
      </div>

      {/* RIGHT SECTION */}
      <div className="relative flex-shrink-0 ml-2">
        <button
          onClick={() => setShowNewMenu(!showNewMenu)}
          className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5 hover:bg-blue-700 whitespace-nowrap"
        >
          <span>New</span>
          <Plus className="w-4 h-4" />
        </button>

        {showNewMenu && (
          <div
            className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50"
            ref={newMenuRef}
          >
            {newOptions.map((option, index) => (
              <div
                key={index}
                role="button"
                tabIndex={0}
                onClick={() => handleNewOptionClick(option)}
                onKeyDown={(e) => e.key === "Enter" && handleNewOptionClick(option)}
                className="w-full px-4 py-3 hover:bg-gray-50 cursor-pointer select-none active:bg-gray-100 border-b border-gray-100 last:border-0"
              >
                <span className="text-sm text-gray-700">{option.title}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default MobileHeader