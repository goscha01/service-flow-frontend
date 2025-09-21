import React, { useState, useEffect } from 'react'
import Sidebar from './sidebar'
import MobileHeader from './mobile-header'

const ResponsiveLayout = ({ children, className = "" }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [screenSize, setScreenSize] = useState('lg')

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 640) {
        setScreenSize('sm')
      } else if (window.innerWidth < 768) {
        setScreenSize('md')
      } else if (window.innerWidth < 1024) {
        setScreenSize('lg')
      } else if (window.innerWidth < 1280) {
        setScreenSize('xl')
      } else {
        setScreenSize('2xl')
      }
    }

    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const getContentPadding = () => {
    switch (screenSize) {
      case 'sm':
      case 'md':
        return 'ml-0' // Full width on mobile
      case 'lg':
        return 'ml-64' // 256px sidebar
      case 'xl':
        return 'ml-72' // 288px sidebar
      case '2xl':
        return 'ml-80' // 320px sidebar
      default:
        return 'ml-64'
    }
  }

  const getMaxWidth = () => {
    switch (screenSize) {
      case 'sm':
      case 'md':
        return 'max-w-full' // Full width on mobile
      case 'lg':
        return 'max-w-6xl' // 1152px
      case 'xl':
        return 'max-w-7xl' // 1280px
      case '2xl':
        return 'max-w-8xl' // 1408px
      default:
        return 'max-w-7xl'
    }
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${getContentPadding()}`}>
        <MobileHeader onMenuClick={() => setSidebarOpen(true)} />
        
        <main className="flex-1 overflow-y-auto">
          <div className={`mx-auto px-4 sm:px-6 lg:px-8 py-6 ${getMaxWidth()}`}>
            <div className={className}>
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

export default ResponsiveLayout
