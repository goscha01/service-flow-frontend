import { useState, useEffect } from "react"
import { serviceTemplatesAPI } from "../services/api"

const ServiceTemplatesModal = ({ isOpen, onClose, onSelectTemplate }) => {
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (isOpen) {
      loadTemplates()
    }
  }, [isOpen])

  const loadTemplates = async () => {
    try {
      setLoading(true)
      setError("")
      const templatesData = await serviceTemplatesAPI.getAll()
      setTemplates(templatesData)
    } catch (error) {
      console.error('Error loading templates:', error)
      setError("Failed to load service templates. Please try again.")
    } finally {
      setLoading(false)
    }
  }
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black opacity-50" onClick={onClose}></div>
      <div className="bg-white rounded-lg shadow-lg w-full max-w-4xl mx-4 relative max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Service Templates</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 transition-colors"
          >
            <span className="sr-only">Close</span>
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          <p className="text-sm text-gray-600 mb-6">
            Choose a template to get started with a pre-configured service. You can customize all details after selection.
          </p>
          
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Loading templates...</span>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-red-600 mb-4">{error}</p>
              <button
                onClick={loadTemplates}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Try Again
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {templates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => onSelectTemplate(template)}
                  className="flex items-start space-x-4 p-4 rounded-lg hover:bg-gray-50 transition-colors w-full text-left border border-gray-200 hover:border-blue-500 group"
                >
                  <div className="flex-shrink-0 w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                    <span className="text-2xl">{template.icon}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                      {template.name}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                      {template.description}
                    </p>
                    <div className="flex items-center space-x-4 mt-2">
                      <span className="text-xs text-gray-600">
                        ${template.price}
                      </span>
                      <span className="text-xs text-gray-600">
                        {template.duration.hours}h {template.duration.minutes}m
                      </span>
                      <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                        {template.category}
                      </span>
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    <svg 
                      className="w-5 h-5 text-gray-400 group-hover:text-blue-500 transition-colors" 
                      fill="none" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ServiceTemplatesModal 