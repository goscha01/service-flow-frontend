import React, { useState } from 'react'
import { X, Copy, Calendar, Repeat } from 'lucide-react'

const DuplicateJobModal = ({ isOpen, onClose, job, onDuplicate }) => {
  const [isRecurring, setIsRecurring] = useState(false)
  const [frequency, setFrequency] = useState('weekly')
  const [endDate, setEndDate] = useState('')
  const [monthsAhead, setMonthsAhead] = useState(3) // Default: create jobs 3 months ahead
  const [loading, setLoading] = useState(false)

  if (!isOpen || !job) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const duplicateData = {
        isRecurring,
        frequency: isRecurring ? frequency : null,
        endDate: isRecurring && endDate ? endDate : null,
        monthsAhead: isRecurring ? monthsAhead : 1 // If not recurring, just duplicate once
      }

      await onDuplicate(duplicateData)
      onClose()
    } catch (error) {
      console.error('Error duplicating job:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <Copy className="w-5 h-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">Duplicate Job</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <p className="text-sm text-gray-600 mb-4">
              This will create a copy of job #{job.id || job.job_id}. You can optionally set it as a recurring job.
            </p>
          </div>

          {/* Recurring Toggle */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-2">
              <Repeat className="w-4 h-4 text-gray-600" />
              <label className="text-sm font-medium text-gray-900">
                Set as recurring job
              </label>
            </div>
            <button
              type="button"
              onClick={() => setIsRecurring(!isRecurring)}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                isRecurring ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  isRecurring ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Recurring Options */}
          {isRecurring && (
            <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Frequency
                </label>
                <select
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required={isRecurring}
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="biweekly">Bi-weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  End Date (Optional)
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Leave empty for no end date
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Create jobs ahead (months)
                </label>
                <input
                  type="number"
                  min="1"
                  max="12"
                  value={monthsAhead}
                  onChange={(e) => setMonthsAhead(parseInt(e.target.value) || 3)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Jobs will be created lazily {monthsAhead} months ahead. More jobs will be created automatically as needed.
                </p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Duplicating...' : isRecurring ? 'Duplicate & Set Recurring' : 'Duplicate Job'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default DuplicateJobModal

