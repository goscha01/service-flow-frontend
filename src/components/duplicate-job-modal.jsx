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
        <div className="flex items-center justify-between p-4 border-b border-[var(--sf-border-light)]">
          <div className="flex items-center space-x-2">
            <Copy className="w-5 h-5 text-[var(--sf-text-secondary)]" />
            <h2 className="text-lg font-semibold text-[var(--sf-text-primary)]">Duplicate Job</h2>
          </div>
          <button
            onClick={onClose}
            className="text-[var(--sf-text-muted)] hover:text-[var(--sf-text-secondary)]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          <div>
            <p className="text-sm text-[var(--sf-text-secondary)] mb-4">
              This will open the Create Job page with all details from job #{job.id || job.job_id} pre-filled
              and scroll to the Schedule section. Pick a new date/time and save.
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-[var(--sf-border-light)]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-[var(--sf-text-primary)] bg-white border border-[var(--sf-border-light)] rounded-lg hover:bg-[var(--sf-bg-page)]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDuplicate}
              className="px-4 py-2 text-sm font-medium text-white bg-[var(--sf-blue-500)] rounded-lg hover:bg-[var(--sf-blue-600)]"
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

