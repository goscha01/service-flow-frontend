"use client"

import { useState } from "react"
import { X } from "lucide-react"

const TerritoryAdjustmentModal = ({ isOpen, onClose, onSave }) => {
  const [selectedTerritory, setSelectedTerritory] = useState("")
  const [adjustmentType, setAdjustmentType] = useState("percentage")
  const [adjustmentValue, setAdjustmentValue] = useState("")
  const [operation, setOperation] = useState("increase")

  const territories = [
    "Brooklyn Heights",
    "Manhattan",
    "Queens",
    "Bronx",
    "Staten Island",
    "Long Island"
  ]

  const handleSave = () => {
    if (!selectedTerritory || !adjustmentValue) return

    const rule = {
      territory: selectedTerritory,
      type: adjustmentType,
      value: adjustmentValue,
      operation
    }
    onSave(rule)
    onClose()
    
    // Reset form
    setSelectedTerritory("")
    setAdjustmentValue("")
    setAdjustmentType("percentage")
    setOperation("increase")
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Add Territory Adjustment Rule</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Territory Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Territory
            </label>
            <select
              value={selectedTerritory}
              onChange={(e) => setSelectedTerritory(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select a territory</option>
              {territories.map((territory) => (
                <option key={territory} value={territory}>
                  {territory}
                </option>
              ))}
            </select>
          </div>

          {/* Adjustment Type */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Adjustment Type
            </label>
            <div className="flex space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="percentage"
                  checked={adjustmentType === "percentage"}
                  onChange={(e) => setAdjustmentType(e.target.value)}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">Percentage</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="fixed"
                  checked={adjustmentType === "fixed"}
                  onChange={(e) => setAdjustmentType(e.target.value)}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">Fixed Amount</span>
              </label>
            </div>
          </div>

          {/* Operation */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Operation
            </label>
            <select
              value={operation}
              onChange={(e) => setOperation(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="increase">Increase price</option>
              <option value="decrease">Decrease price</option>
            </select>
          </div>

          {/* Adjustment Value */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              {adjustmentType === "percentage" ? "Percentage" : "Amount"}
            </label>
            <div className="relative">
              {adjustmentType === "fixed" && (
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                  $
                </span>
              )}
              <input
                type="number"
                value={adjustmentValue}
                onChange={(e) => setAdjustmentValue(e.target.value)}
                className={`w-full border border-gray-300 rounded-md py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  adjustmentType === "fixed" ? "pl-8 pr-3" : "px-3"
                }`}
                placeholder={adjustmentType === "percentage" ? "10" : "25.00"}
                min="0"
                step={adjustmentType === "percentage" ? "1" : "0.01"}
              />
              {adjustmentType === "percentage" && (
                <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                  %
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {adjustmentType === "percentage" 
                ? `${operation === "increase" ? "Increase" : "Decrease"} the base price by this percentage`
                : `${operation === "increase" ? "Add" : "Subtract"} this amount to/from the base price`
              }
            </p>
          </div>

          {/* Preview */}
          {selectedTerritory && adjustmentValue && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-blue-900 mb-1">Preview</h4>
              <p className="text-sm text-blue-700">
                {operation === "increase" ? "Increase" : "Decrease"} price in {selectedTerritory} by{" "}
                {adjustmentType === "percentage" ? `${adjustmentValue}%` : `$${adjustmentValue}`}
              </p>
              <p className="text-xs text-blue-600 mt-1">
                Base price $120.00 → {" "}
                {adjustmentType === "percentage" 
                  ? operation === "increase"
                    ? `$${(120 * (1 + parseFloat(adjustmentValue || 0) / 100)).toFixed(2)}`
                    : `$${(120 * (1 - parseFloat(adjustmentValue || 0) / 100)).toFixed(2)}`
                  : operation === "increase"
                    ? `$${(120 + parseFloat(adjustmentValue || 0)).toFixed(2)}`
                    : `$${(120 - parseFloat(adjustmentValue || 0)).toFixed(2)}`
                }
              </p>
            </div>
          )}
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
            disabled={!selectedTerritory || !adjustmentValue}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            Add Rule
          </button>
        </div>
      </div>
    </div>
  )
}

export default TerritoryAdjustmentModal 