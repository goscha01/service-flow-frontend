"use client"

import { Menu, Plus } from "lucide-react"
import { useState, useRef, useEffect } from "react"
import { useNavigate } from "react-router-dom"

const MobileHeader = ({ onMenuClick }) => {
  const [showNewMenu, setShowNewMenu] = useState(false)
  const newMenuRef = useRef(null)
  const navigate = useNavigate()

  const newOptions = [
    { title: "Job", icon: null, action: () => navigate("/createjob") },
    { title: "Customer", icon: null, action: () => console.log("Open customer modal") }
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

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  return (
    <div className="lg:hidden bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
      <div className="flex items-center space-x-3">
        <button onClick={onMenuClick} className="p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100">
          <Menu className="w-6 h-6" />
        </button>
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center">
            <span className="text-white font-bold text-sm">Z</span>
          </div>
          <span className="text-lg font-semibold text-gray-800">service-flow</span>
        </div>
      </div>
      
      <div className="relative" ref={newMenuRef}>
        <button 
          onClick={() => setShowNewMenu(!showNewMenu)}
          className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium flex items-center space-x-1 hover:bg-blue-700"
        >
          <span>New</span>
          <Plus className="w-4 h-4" />
        </button>
        
        {showNewMenu && (
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
            {newOptions.map((option, index) => (
              <div
                key={index}
                role="button"
                tabIndex={0}
                onClick={() => handleNewOptionClick(option)}
                onKeyDown={(e) => e.key === 'Enter' && handleNewOptionClick(option)}
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
