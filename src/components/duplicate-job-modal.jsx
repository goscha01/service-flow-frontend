import React from 'react'
import { X, Copy } from 'lucide-react'

const DuplicateJobModal = ({ isOpen, onClose, job, onDuplicate }) => {
  if (!isOpen || !job) return null

  const handleDuplicate = () => {
    onDuplicate()
    onClose()
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

        {/* Content */}
        <div className="p-4 space-y-4">
          <div>
            <p className="text-sm text-gray-600 mb-4">
              This will open the Create Job page with all details from job #{job.id || job.job_id} pre-filled. 
              You can review and modify the details before saving.
            </p>
          </div>

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
              type="button"
              onClick={handleDuplicate}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
            >
              Continue to Create Job
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DuplicateJobModal

