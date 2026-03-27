"use client"

import { useState } from "react"
import { X } from "lucide-react"

const CreateSkillTagModal = ({ isOpen, onClose, onSave }) => {
  const [skillTagName, setSkillTagName] = useState("")

  const handleSave = () => {
    if (!skillTagName.trim()) return

    const skillTag = {
      id: Date.now(),
      name: skillTagName.trim()
    }
    
    onSave(skillTag)
    onClose()
    setSkillTagName("")
  }

  const handleCancel = () => {
    onClose()
    setSkillTagName("")
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[var(--sf-border-light)]">
          <h2 className="text-lg font-semibold text-[var(--sf-text-primary)]">Create a skill tag</h2>
          <button
            onClick={handleCancel}
            className="text-[var(--sf-text-muted)] hover:text-[var(--sf-text-secondary)]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div>
            <label className="block text-sm font-medium text-[var(--sf-text-primary)] mb-3">
              Skill tag name
            </label>
            <input
              type="text"
              value={skillTagName}
              onChange={(e) => setSkillTagName(e.target.value)}
              className="w-full border border-[var(--sf-border-light)] rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--sf-blue-500)] focus:border-[var(--sf-blue-500)]"
              placeholder="Ex. Cleaner, HVAC Tech"
              autoFocus
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-3 p-6 border-t border-[var(--sf-border-light)]">
          <button
            onClick={handleCancel}
            className="px-4 py-2 text-sm font-medium text-[var(--sf-text-primary)] bg-white border border-[var(--sf-border-light)] rounded-md hover:bg-[var(--sf-bg-page)] focus:outline-none focus:ring-2 focus:ring-[var(--sf-blue-500)]"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!skillTagName.trim()}
            className="px-4 py-2 text-sm font-medium text-white bg-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--sf-blue-500)] disabled:cursor-not-allowed"
          >
            Save Skill Tag
          </button>
        </div>
      </div>
    </div>
  )
}

export default CreateSkillTagModal 