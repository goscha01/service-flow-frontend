"use client"

import { useState } from "react"
import { X } from "lucide-react"

interface CreateServiceModalProps {
  isOpen: boolean
  onClose: () => void
  onCreateService: (name: string) => void
  onStartWithTemplate: () => void
}

const CreateServiceModal = ({ isOpen, onClose, onCreateService, onStartWithTemplate }: CreateServiceModalProps) => {
  const [serviceName, setServiceName] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (serviceName.trim()) {
      onCreateService(serviceName.trim())
      setServiceName("")
      onClose()
    }
  }

  const handleClose = () => {
    setServiceName("")
    onClose()
  }

  if (!isOpen) return null

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose()
    }
  }

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-xl w-full max-w-md relative">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Create a service</h2>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-500 hover:bg-gray-100 p-1 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <p className="text-sm text-gray-600 mb-6">
            A service is something your customers can book online. For example, a home cleaning or a junk removal pickup.
          </p>

          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                  Name
                </label>
                <input
                  id="name"
                  type="text"
                  value={serviceName}
                  onChange={(e) => setServiceName(e.target.value)}
                  placeholder="Name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  autoFocus
                />
                <p className="mt-2 text-sm text-gray-500">
                  Give this service a name which broadly describes it. For example,{" "}
                  <em>Home Cleaning</em> rather than <em>1 Bedroom Home Cleaning</em>.
                </p>
                <p className="mt-2 text-sm text-gray-500">
                  You'll be able to add variations and options next to make it customizable.
                </p>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!serviceName.trim()}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Create Service
                </button>
              </div>
            </div>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              Prefer a head start?{" "}
              <button
                onClick={() => {
                  onStartWithTemplate()
                  handleClose()
                }}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Start with a template...
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CreateServiceModal 