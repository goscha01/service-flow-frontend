"use client"

import { X } from "lucide-react"

interface Template {
  id: string
  name: string
  icon: string
}

interface ServiceTemplatesModalProps {
  isOpen: boolean
  onClose: () => void
  onSelectTemplate: (template: Template) => void
}

const templates: Template[] = [
  { id: "junk-removal", name: "Junk Removal", icon: "🚛" },
  { id: "standard-detail", name: "Standard Detail", icon: "✨" },
  { id: "tv-mounting", name: "TV Mounting", icon: "📺" },
  { id: "smart-home", name: "Smart Home Install", icon: "🏠" },
  { id: "garage-door", name: "Garage Door Repair", icon: "🚪" },
  { id: "hvac", name: "Heating & Air Conditioning Inspection", icon: "❄️" },
  { id: "plumbing", name: "Plumbing Service Call", icon: "🔧" },
  { id: "water-heater", name: "Water Heater", icon: "🔥" },
  { id: "refrigerator", name: "Refrigerator", icon: "🧊" },
  { id: "range", name: "Range", icon: "🍳" },
  { id: "washing-machine", name: "Washing Machine", icon: "👕" },
  { id: "dryer", name: "Dryer", icon: "🌀" },
  { id: "home-cleaning", name: "Standard Home Cleaning", icon: "🧽" },
]

const ServiceTemplatesModal = ({ isOpen, onClose, onSelectTemplate }: ServiceTemplatesModalProps) => {
  if (!isOpen) return null

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-xl w-full max-w-3xl relative my-6">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold text-gray-900">Service Templates</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500 hover:bg-gray-100 p-1 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <p className="text-gray-600 mb-6">
            Choose from our pre-built service templates to get started quickly, or create a custom service from scratch.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {templates.map((template) => (
              <button
                key={template.id}
                onClick={() => onSelectTemplate(template)}
                className="flex items-center space-x-4 p-4 rounded-lg border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-all w-full text-left group"
              >
                <div className="flex-shrink-0 w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center text-xl group-hover:bg-gray-200 transition-colors">
                  {template.icon}
                </div>
                <div>
                  <h3 className="text-base font-medium text-gray-900">{template.name}</h3>
                </div>
              </button>
            ))}
          </div>

          <div className="border-t border-gray-200 pt-6">
            <button
              onClick={() => onSelectTemplate({ id: "custom", name: "Custom Service", icon: "⚙️" })}
              className="w-full flex items-center justify-center space-x-3 p-4 rounded-lg border-2 border-dashed border-gray-300 hover:border-gray-400 transition-colors text-gray-600 hover:text-gray-900"
            >
              <span className="text-xl">⚙️</span>
              <span className="font-medium">Create Custom Service</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ServiceTemplatesModal 