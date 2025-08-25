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
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Create a skill tag</h2>
          <button
            onClick={handleCancel}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-3">
              Skill tag name
            </label>
            <input
              type="text"
              value={skillTagName}
              onChange={(e) => setSkillTagName(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Ex. Cleaner, HVAC Tech"
              autoFocus
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
          <button
            onClick={handleCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!skillTagName.trim()}
            className="px-4 py-2 text-sm font-medium text-white bg-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed"
          >
            Save Skill Tag
          </button>
        </div>
      </div>
    </div>
  )
}

export default CreateSkillTagModal 