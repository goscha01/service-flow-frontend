"use client"

import { useState, useEffect } from "react"
import { useAuth } from "../context/AuthContext"

const useServiceSettings = (defaultSettings = { categoriesEnabled: false }) => {
  const [settings, setSettings] = useState(defaultSettings)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const { user } = useAuth()

  // Load settings from backend and localStorage on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        setLoading(true)
        
        // First try to load from localStorage for immediate response
        const localSettings = localStorage.getItem('service-settings')
        if (localSettings) {
          setSettings({ ...defaultSettings, ...JSON.parse(localSettings) })
        }

        // Then try to sync with backend if user is available
        if (user?.id) {
          try {
            const token = localStorage.getItem('token')
            if (token) {
              const response = await fetch('/api/user/service-settings', {
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
                }
              })
              
              if (response.ok) {
                const backendSettings = await response.json()
                const mergedSettings = { ...defaultSettings, ...backendSettings }
                setSettings(mergedSettings)
                // Update localStorage with backend data
                localStorage.setItem('service-settings', JSON.stringify(mergedSettings))
                console.log('🔍 Service settings loaded from backend:', mergedSettings)
              } else {
                console.log('🔍 Backend service settings not available, using localStorage')
              }
            }
          } catch (backendError) {
            console.log('🔍 Failed to load from backend, using localStorage:', backendError.message)
          }
        }
      } catch (err) {
        console.error("Error loading service settings:", err)
        setError("Failed to load settings")
      } finally {
        setLoading(false)
      }
    }

    loadSettings()
  }, [user?.id])

  // Save settings to both localStorage and backend
  const saveSettings = async (newSettings) => {
    setLoading(true)
    setError(null)

    try {
      const updatedSettings = { ...settings, ...newSettings }
      
      // Save to localStorage immediately
      localStorage.setItem('service-settings', JSON.stringify(updatedSettings))
      setSettings(updatedSettings)

      // Try to save to backend if user is available
      if (user?.id) {
        try {
          const token = localStorage.getItem('token')
          if (token) {
            const response = await fetch('/api/user/service-settings', {
              method: 'PUT',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(updatedSettings)
            })
            
            if (response.ok) {
              console.log('🔍 Service settings saved to backend successfully')
            } else {
              console.log('🔍 Failed to save to backend, but localStorage updated')
            }
          }
        } catch (backendError) {
          console.log('🔍 Backend save failed, but localStorage updated:', backendError.message)
        }
      }

      return { success: true, message: "Settings saved successfully!" }
    } catch (err) {
      console.error("Error saving service settings:", err)
      setError("Failed to save settings")
      return { success: false, message: "Failed to save settings" }
    } finally {
      setLoading(false)
    }
  }

  // Update settings without saving
  const updateSettings = (newSettings) => {
    setSettings((prev) => ({ ...prev, ...newSettings }))
  }

  // Reset settings to default
  const resetSettings = async () => {
    setSettings(defaultSettings)
    localStorage.removeItem('service-settings')
    
    // Also reset on backend if user is available
    if (user?.id) {
      try {
        await saveSettings(defaultSettings)
      } catch (error) {
        console.error('Failed to reset settings on backend:', error)
      }
    }
  }

  return {
    settings,
    loading,
    error,
    saveSettings,
    updateSettings,
    resetSettings,
  }
}

export default useServiceSettings
