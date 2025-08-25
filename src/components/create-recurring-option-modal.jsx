"use client"

import { useState } from "react"
import { X } from "lucide-react"

const CreateRecurringOptionModal = ({ isOpen, onClose, onSave }) => {
  const [frequency, setFrequency] = useState("Weekly")
  const [interval, setInterval] = useState(1)
  const [name, setName] = useState("Weekly")
  const [discount, setDiscount] = useState("None")

  const handleSave = () => {
    const recurringOption = {
      frequency,
      interval,
      name,
      discount
    }
    onSave(recurringOption)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Create a recurring option</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Frequency */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Frequency
            </label>
            <div className="flex space-x-2">
              <select
                value={frequency}
                onChange={(e) => {
                  setFrequency(e.target.value)
                  setName(e.target.value)
                }}
                className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="Weekly">Weekly</option>
                <option value="Bi-weekly">Bi-weekly</option>
                <option value="Monthly">Monthly</option>
                <option value="Quarterly">Quarterly</option>
              </select>
              <span className="flex items-center text-sm text-gray-600 px-2">Every</span>
              <input
                type="number"
                value={interval}
                onChange={(e) => setInterval(parseInt(e.target.value))}
                min="1"
                className="w-16 border border-gray-300 rounded-md px-3 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <span className="flex items-center text-sm text-gray-600 px-2">
                week{interval !== 1 ? 's' : ''}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Ex. a job beginning on Thu, Jul 3rd would repeat every week on Thursday
            </p>
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Name
            </label>
            <p className="text-sm text-gray-600 mb-2">
              Give this recurring option a display name for customers
            </p>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Weekly"
            />
          </div>

          {/* Discount */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Discount
            </label>
            <p className="text-sm text-gray-600 mb-2">
              You can optionally reward customers for booking a recurring appointment by offering a discount
            </p>
            <select
              value={discount}
              onChange={(e) => setDiscount(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="None">None</option>
              <option value="5%">5% off</option>
              <option value="10%">10% off</option>
              <option value="15%">15% off</option>
              <option value="20%">20% off</option>
              <option value="Custom">Custom amount</option>
            </select>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}

export default CreateRecurringOptionModal 