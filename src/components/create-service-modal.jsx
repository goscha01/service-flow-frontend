import { useState } from "react"
import { X, DollarSign, Clock, FileText, Tag, ChevronDown } from "lucide-react"

const CreateServiceModal = ({ isOpen, onClose, onCreateService, onStartWithTemplate, existingCategories = [] }) => {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    duration: { hours: 0, minutes: 30 },
    category: "",
    category_id: null,
    isFree: false,
    image: null
  })
  const [loading, setLoading] = useState(false)
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false)
  const [newCategory, setNewCategory] = useState("")

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.name.trim()) return

    setLoading(true)
    try {
      await onCreateService(formData)
      // Reset form
      resetForm()
    } catch (error) {
      console.error('Error creating service:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleDurationChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      duration: {
        ...prev.duration,
        [field]: parseInt(value) || 0
      }
    }))
  }

  const handleToggleFree = () => {
    setFormData(prev => ({
      ...prev,
      isFree: !prev.isFree,
      price: prev.isFree ? prev.price : ""
    }))
  }

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      price: "",
      duration: { hours: 0, minutes: 30 },
      category: "",
      category_id: null,
      isFree: false,
      image: null
    })
    setNewCategory("")
    setShowCategoryDropdown(false)
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black opacity-50" onClick={onClose}></div>
      <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl mx-4 relative max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Create a service</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-500 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          <p className="text-sm text-gray-600 mb-6">
            A service is something your customers can book online. For example, a home cleaning or a junk removal pickup.
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Service Name */}
              <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                Service Name *
                </label>
                <input
                  id="name"
                  type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="e.g., Home Cleaning, TV Mounting"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
                />
                <p className="mt-2 text-sm text-gray-500">
                  Give this service a name which broadly describes it. For example,{" "}
                  <em>Home Cleaning</em> rather than <em>1 Bedroom Home Cleaning</em>.
                </p>
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Describe what this service includes..."
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Category */}
            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <div className="relative">
                <Tag className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <input
                  id="category"
                  type="text"
                  value={formData.category}
                  onChange={(e) => handleInputChange('category', e.target.value)}
                  onFocus={() => setShowCategoryDropdown(true)}
                  placeholder="e.g., Cleaning, Installation, Repair"
                  className="w-full border border-gray-300 rounded-lg pl-10 pr-10 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                  className="absolute right-3 top-2.5 h-4 w-4 text-gray-400 hover:text-gray-600"
                >
                  <ChevronDown className={`w-4 h-4 transition-transform ${showCategoryDropdown ? 'rotate-180' : ''}`} />
                </button>
                
                {/* Category Dropdown */}
                {showCategoryDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {existingCategories.length > 0 && (
                      <div className="p-2 border-b border-gray-200">
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide px-2 py-1">Existing Categories</p>
                        {existingCategories.map((category, index) => (
                          <button
                            key={index}
                            type="button"
                            onClick={() => {
                              handleInputChange('category', category.name)
                              handleInputChange('category_id', category.id)
                              setShowCategoryDropdown(false)
                            }}
                            className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
                          >
                            {category.name}
                          </button>
                        ))}
                      </div>
                    )}
                    
                    {/* Add New Category */}
                    <div className="p-2">
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide px-2 py-1">Add New Category</p>
                      <div className="flex space-x-2">
                        <input
                          type="text"
                          value={newCategory}
                          onChange={(e) => setNewCategory(e.target.value)}
                          placeholder="Enter new category name"
                          className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          onKeyPress={(e) => {
                            if (e.key === 'Enter' && newCategory.trim()) {
                              const trimmedName = newCategory.trim()
                              const categoryExists = existingCategories.some(cat => 
                                cat.name && cat.name.toLowerCase() === trimmedName.toLowerCase()
                              )
                              
                              if (categoryExists) {
                                alert(`Category "${trimmedName}" already exists. Please choose a different name.`)
                                return
                              }
                              
                              handleInputChange('category', trimmedName)
                              handleInputChange('category_id', null) // Will be created on server
                              setNewCategory("")
                              setShowCategoryDropdown(false)
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (newCategory.trim()) {
                              const trimmedName = newCategory.trim()
                              const categoryExists = existingCategories.some(cat => 
                                cat.name && cat.name.toLowerCase() === trimmedName.toLowerCase()
                              )
                              
                              if (categoryExists) {
                                alert(`Category "${trimmedName}" already exists. Please choose a different name.`)
                                return
                              }
                              
                              handleInputChange('category', trimmedName)
                              handleInputChange('category_id', null) // Will be created on server
                              setNewCategory("")
                              setShowCategoryDropdown(false)
                            }
                          }}
                          className="px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Close dropdown when clicking outside */}
              {showCategoryDropdown && (
                <div 
                  className="fixed inset-0 z-0" 
                  onClick={() => setShowCategoryDropdown(false)}
                />
              )}
            </div>

            {/* Price Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-700">
                  Pricing
                </label>
                <div className="flex items-center space-x-3">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.isFree}
                      onChange={handleToggleFree}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Free service</span>
                  </label>
                </div>
              </div>

              {!formData.isFree && (
                <div className="relative">
                  <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <input
                    type="number"
                    value={formData.price}
                    onChange={(e) => handleInputChange('price', e.target.value)}
                    onFocus={(e) => {
                      e.target.select()
                      // Clear default values when focusing
                      if (e.target.value === '0' || e.target.value === '0.00') {
                        e.target.value = ''
                      }
                    }}
                    onBlur={(e) => {
                      if (e.target.value === '') {
                        handleInputChange('price', '')
                      }
                    }}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    className="w-full border border-gray-300 rounded-lg pl-10 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              )}
            </div>

            {/* Duration */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Estimated Duration
              </label>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-gray-400" />
                  <input
                    type="number"
                    value={formData.duration.hours}
                    onChange={(e) => handleDurationChange('hours', e.target.value)}
                    onFocus={(e) => {
                      e.target.select()
                      if (e.target.value === '0') {
                        e.target.value = ''
                      }
                    }}
                    onBlur={(e) => {
                      if (e.target.value === '') {
                        handleDurationChange('hours', '0')
                      }
                    }}
                    placeholder="0"
                    min="0"
                    className="w-16 border border-gray-300 rounded-lg px-2 py-2 text-center focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <span className="text-sm text-gray-600">hours</span>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    value={formData.duration.minutes}
                    onChange={(e) => handleDurationChange('minutes', e.target.value)}
                    onFocus={(e) => {
                      e.target.select()
                      // Clear default values when focusing
                      if (e.target.value === '30' || e.target.value === '0') {
                        e.target.value = ''
                      }
                    }}
                    onBlur={(e) => {
                      if (e.target.value === '') {
                        handleDurationChange('minutes', '30')
                      }
                    }}
                    placeholder="30"
                    min="0"
                    max="59"
                    className="w-16 border border-gray-300 rounded-lg px-2 py-2 text-center focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <span className="text-sm text-gray-600">minutes</span>
                </div>
              </div>
            </div>

            {/* Service Image */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Service Image
              </label>
              <div className="flex items-center space-x-4">
                {formData.image ? (
                  <div className="relative">
                    <img
                      src={URL.createObjectURL(formData.image)}
                      alt="Service preview"
                      className="w-20 h-20 object-cover rounded-lg border border-gray-300"
                    />
                    <button
                      type="button"
                      onClick={() => handleInputChange('image', null)}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <div className="w-20 h-20 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                    <span className="text-gray-400 text-xs text-center">No image</span>
                  </div>
                )}
                <div className="flex-1">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files[0]
                      if (file) {
                        handleInputChange('image', file)
                      }
                    }}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Upload an image to help customers identify this service
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                disabled={!formData.name.trim() || loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Creating...</span>
                  </>
                ) : (
                  <span>Create Service</span>
                )}
                </button>
            </div>
          </form>

          {/* Template Option */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              Prefer a head start?{" "}
              <button
                onClick={onStartWithTemplate}
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