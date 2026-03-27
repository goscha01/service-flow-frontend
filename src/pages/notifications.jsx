"use client"

import { useState } from "react"
import { Bell, Check } from "lucide-react"
import MobileHeader from "../components/mobile-header"

const Notifications = () => {
  const [pushNotificationsEnabled, setPushNotificationsEnabled] = useState(false)

  const handleEnablePushNotifications = async () => {
    // Check if browser supports notifications
    if (!("Notification" in window)) {
      alert("This browser does not support notifications")
      return
    }

    // Request permission
    if (Notification.permission === "default") {
      const permission = await Notification.requestPermission()
      if (permission === "granted") {
        setPushNotificationsEnabled(true)
      }
    } else if (Notification.permission === "granted") {
      setPushNotificationsEnabled(true)
    } else {
      alert("Please enable notifications in your browser settings")
    }
  }

  return (
    <div className="lg:hidden min-h-screen bg-[var(--sf-bg-page)] pb-28 w-full max-w-full overflow-x-hidden">
      {/* Mobile Header */}
      <div className="fixed top-0 left-0 right-0 z-30 bg-white">
        <MobileHeader pageTitle="Notifications" />
      </div>

      {/* Main Content */}
      <div className="px-4 py-6 space-y-6" style={{ paddingTop: '100px' }}>
        {/* Push Notifications Prompt */}
        {!pushNotificationsEnabled && (
          <div className="bg-[var(--sf-bg-page)] rounded-xl shadow-sm p-6">
            <div className="flex flex-col items-center text-center space-y-4">
              {/* Pink Bell Icon */}
              <div className="w-16 h-16 bg-pink-500 rounded-full flex items-center justify-center">
                <Bell className="w-8 h-8 text-white" />
              </div>

              {/* Title */}
              <h2 className="text-lg font-bold text-[var(--sf-text-primary)]" style={{fontFamily: 'Montserrat', fontWeight: 700}}>
                Turn on push notifications
              </h2>

              {/* Description */}
              <p className="text-sm text-[var(--sf-text-secondary)] max-w-sm" style={{fontFamily: 'Montserrat', fontWeight: 400}}>
                Enable push notifications to get alerts when you're assigned to new jobs.
              </p>

              {/* Enable Button */}
              <button
                onClick={handleEnablePushNotifications}
                className="w-full sf-btn-primary bg-[var(--sf-blue-500)] text-white font-semibold py-3 px-4 rounded-lg hover:bg-[var(--sf-blue-600)] transition-colors"
                style={{fontFamily: 'Montserrat', fontWeight: 600}}
              >
                Enable push notifications
              </button>
            </div>
          </div>
        )}

        {/* All Caught Up Section */}
        <div className="flex flex-col items-center justify-center py-16 px-4">
          {/* Gray Checkmark Icon */}
          <div className="w-16 h-16 bg-[var(--sf-border-light)] rounded-full flex items-center justify-center mb-6">
            <Check className="w-8 h-8 text-[var(--sf-text-secondary)]" />
          </div>

          {/* Title */}
          <h3 className="text-lg font-bold text-[var(--sf-text-secondary)] mb-3" style={{fontFamily: 'Montserrat', fontWeight: 700}}>
            All caught up
          </h3>

          {/* Description */}
          <p className="text-sm text-[var(--sf-text-secondary)] text-center max-w-sm leading-relaxed" style={{fontFamily: 'Montserrat', fontWeight: 400}}>
            When you get new job assignments or changes to your existing ones, you'll find them here.
          </p>
        </div>
      </div>
    </div>
  )
}

export default Notifications

