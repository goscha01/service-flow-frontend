import { useState } from "react"
import { X, Loader2 } from "lucide-react"

const SimpleCreateServiceModal = ({ isOpen, onClose, onCreateService, onStartWithTemplate, loading = false }) => {
  const [serviceName, setServiceName] = useState("")

  const handleSubmit = (e) => {
    e.preventDefault()
    if (serviceName.trim() && !loading) {
      onCreateService(serviceName.trim())
      // Don't close immediately - let parent handle closing after navigation
    }
  }

  const handleClose = () => {
    if (!loading) {
      setServiceName("")
      onClose()
    }
  }

  if (!isOpen) return null

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget && !loading) {
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
            <h2 className="text-xl font-semibold text-[var(--sf-text-primary)]">Create a service</h2>
            <button
              onClick={handleClose}
              disabled={loading}
              className="text-[var(--sf-text-muted)] hover:text-[var(--sf-text-muted)] hover:bg-[var(--sf-bg-hover)] p-1 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <p className="text-sm text-[var(--sf-text-secondary)] mb-6">
            A service is something your customers can book online. For example, a home cleaning or a junk removal pickup.
          </p>

          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-[var(--sf-text-primary)] mb-2">
                  Name
                </label>
                <input
                  id="name"
                  type="text"
                  value={serviceName}
                  onChange={(e) => setServiceName(e.target.value)}
                  placeholder="Name"
                  disabled={loading}
                  className="w-full px-3 py-2 border border-[var(--sf-border-light)] rounded-lg focus:ring-2 focus:ring-[var(--sf-blue-500)] focus:border-[var(--sf-blue-500)] disabled:opacity-50 disabled:cursor-not-allowed"
                  autoFocus
                />
                <p className="mt-2 text-sm text-[var(--sf-text-muted)]">
                  Give this service a name which broadly describes it. For example,{" "}
                  <em>Home Cleaning</em> rather than <em>1 Bedroom Home Cleaning</em>. You'll be able to add variations and options next to make it customizable.
                </p>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={loading}
                  className="px-4 py-2 text-sm font-medium text-[var(--sf-text-primary)] bg-white border border-[var(--sf-border-light)] rounded-lg hover:bg-[var(--sf-bg-page)] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!serviceName.trim() || loading}
                  className="px-4 py-2 text-sm font-medium text-white bg-gray-600 rounded-lg hover:bg-[var(--sf-blue-500)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    "Create Service"
                  )}
                </button>
              </div>
            </div>
          </form>

          <div className="mt-6 pt-6 border-t border-[var(--sf-border-light)]">
            <p className="text-sm text-[var(--sf-text-secondary)]">
              Or{" "}
              <button
                type="button"
                onClick={() => {
                  if (!loading) {
                    onStartWithTemplate()
                    handleClose()
                  }
                }}
                disabled={loading}
                className="text-[var(--sf-blue-500)] hover:text-[var(--sf-blue-500)] font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                start with a template...
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SimpleCreateServiceModal

