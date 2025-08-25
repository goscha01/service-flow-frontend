"use client"

import { useState, useEffect } from "react"

const useSettings = (settingsKey, defaultSettings = {}) => {
  const [settings, setSettings] = useState(defaultSettings)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Load settings from localStorage on mount
  useEffect(() => {
    try {
      const savedSettings = localStorage.getItem(settingsKey)
      if (savedSettings) {
        setSettings({ ...defaultSettings, ...JSON.parse(savedSettings) })
      }
    } catch (err) {
      console.error("Error loading settings:", err)
      setError("Failed to load settings")
    }
  }, [settingsKey])

  // Save settings to localStorage
  const saveSettings = async (newSettings) => {
    setLoading(true)
    setError(null)

    try {
      // Simulate API call delay
      await new Promise((resolve) => setTimeout(resolve, 500))

      const updatedSettings = { ...settings, ...newSettings }
      localStorage.setItem(settingsKey, JSON.stringify(updatedSettings))
      setSettings(updatedSettings)

      return { success: true, message: "Settings saved successfully!" }
    } catch (err) {
      console.error("Error saving settings:", err)
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
  const resetSettings = () => {
    setSettings(defaultSettings)
    localStorage.removeItem(settingsKey)
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

export default useSettings
