"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import Sidebar from "../components/sidebar"
import MobileHeader from "../components/mobile-header"
import { GripVertical, Wrench, Plus, AlertCircle, Loader2, Trash2, X } from "lucide-react"
import CreateServiceModal from "../components/create-service-modal"
import ServiceTemplatesModal from "../components/service-templates-modal"
import { servicesAPI } from "../services/api"
import { useAuth } from "../context/AuthContext"

const ZenbookerServices = () => {
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [categoriesEnabled, setCategoriesEnabled] = useState(true)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [templatesModalOpen, setTemplatesModalOpen] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [serviceToDelete, setServiceToDelete] = useState(null)
  const [categories, setCategories] = useState([])
  const [categoryObjects, setCategoryObjects] = useState([])
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState("")
  const [categoryDeleteModalOpen, setCategoryDeleteModalOpen] = useState(false)
  const [categoryToDelete, setCategoryToDelete] = useState(null)
  const [deletingCategory, setDeletingCategory] = useState(false)
  
  // Drag and drop state
  const [draggedService, setDraggedService] = useState(null)
  const [dragOverCategory, setDragOverCategory] = useState(null)
  
  // API State
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [deleteLoading, setDeleteLoading] = useState(null)

  // Fetch services on component mount
  useEffect(() => {
    if (user?.id && !authLoading) {
    fetchServices()
    }
  }, [user?.id, authLoading])

  const fetchServices = async () => {
    if (!user?.id) return
    
    try {
      setLoading(true)
      setError("")
      console.log('🔍 Fetching services for user:', user.id)
      
      // Fetch services first
      const servicesResponse = await servicesAPI.getAll(user.id)
      console.log('🔍 Services API response:', servicesResponse)
      
      // Extract services array from response (backend returns { services: [...], pagination: {...} })
      const servicesArray = servicesResponse.services || servicesResponse || []
      console.log('🔍 Services array:', servicesArray)
      
      // Sort services alphabetically by name
      const sortedServices = servicesArray.sort((a, b) => a.name.localeCompare(b.name))
      console.log('🔍 Sorted services:', sortedServices)
      setServices(sortedServices)
      
      // Try to fetch categories, but handle 404 gracefully
      try {
        const categoriesResponse = await servicesAPI.getServiceCategories(user.id)
        console.log('🔍 Categories API response:', categoriesResponse)
        
        // Set categories from API response
        const categoryNames = categoriesResponse.map(cat => cat.name)
        console.log('🔍 Category names:', categoryNames)
        setCategories(categoryNames)
        setCategoryObjects(categoriesResponse)
      } catch (categoriesError) {
        console.log('🔍 Categories endpoint not available, using fallback:', categoriesError.message)
        
        // Fallback: Extract categories from services
        const uniqueCategories = [...new Set(sortedServices.map(service => service.category).filter(Boolean))]
        console.log('🔍 Fallback categories:', uniqueCategories)
        setCategories(uniqueCategories)
        setCategoryObjects([])
      }
    } catch (error) {
      console.error('Error fetching services:', error)
      setError("Failed to load services. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleCreateService = async (serviceData) => {
    if (!user?.id) {
      console.error('No user ID found:', user);
      setError("Please log in again to create services.");
      return;
    }
    
    try {
      setError("")
      
      console.log('Current user:', user);
      console.log('Service data:', serviceData);
      
      // Upload image first if provided
      let imageUrl = null;
      if (serviceData.image) {
        try {
          const formData = new FormData();
          formData.append('image', serviceData.image);
          
          const uploadResponse = await fetch('https://zenbookapi.now2code.online/api/upload-service-image', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            },
            body: formData
          });
          
          if (uploadResponse.ok) {
            const uploadResult = await uploadResponse.json();
            imageUrl = uploadResult.imageUrl;
            console.log('Image uploaded successfully:', imageUrl);
          } else {
            console.error('Failed to upload image:', uploadResponse.statusText);
          }
        } catch (uploadError) {
          console.error('Error uploading image:', uploadError);
        }
      }
      
      // Convert duration to minutes for backend
      const durationInMinutes = (serviceData.duration.hours * 60) + serviceData.duration.minutes
      
      const newService = {
        userId: user.id,
        name: serviceData.name,
        description: serviceData.description || "",
        price: serviceData.isFree ? 0 : parseFloat(serviceData.price) || 0,
        duration: durationInMinutes,
        category: serviceData.category || "",
        modifiers: JSON.stringify([]), // Initialize with empty modifiers array
        isFree: serviceData.isFree,
        image: imageUrl // Include the uploaded image URL
      }
      
      console.log('Sending service data to backend:', newService);
      
      const response = await servicesAPI.create(newService)
      
      // Extract the service from the response (backend returns { message, service })
      const newServiceData = response.service || response
      
      // Add the new service to the list
      setServices(prev => [newServiceData, ...prev])
      setCreateModalOpen(false)
      
      // Navigate to the new service details
      navigate(`/services/${newServiceData.id}`)
    } catch (error) {
      console.error('Error creating service:', error)
      
      if (error.response) {
        const { status, data } = error.response
        switch (status) {
          case 400:
            setError(data?.error || "Please check your service information and try again.")
            break
          case 500:
            setError("Server error. Please try again later.")
            break
          default:
            setError(data?.error || "Failed to create service. Please try again.")
        }
      } else if (error.request) {
        setError("Network error. Please check your connection.")
      } else {
        setError("An unexpected error occurred.")
      }
    }
  }

  const handleDeleteService = async (serviceId) => {
    const service = services.find(s => s.id === serviceId)
    setServiceToDelete(service)
    setDeleteModalOpen(true)
  }

  const confirmDelete = async () => {
    if (!serviceToDelete) return
    
    try {
      setDeleteLoading(serviceToDelete.id)
      setError("")
      
      await servicesAPI.delete(serviceToDelete.id)
      
      // Remove the service from the list
      setServices(prev => prev.filter(service => service.id !== serviceToDelete.id))
      setDeleteModalOpen(false)
      setServiceToDelete(null)
    } catch (error) {
      console.error('Error deleting service:', error)
      
      if (error.response) {
        const { status, data } = error.response
        switch (status) {
          case 404:
            setError("Service not found.")
            break
          case 500:
            setError("Server error. Please try again later.")
            break
          default:
            setError(data?.error || "Failed to delete service. Please try again.")
        }
      } else if (error.request) {
        setError("Network error. Please check your connection.")
      } else {
        setError("An unexpected error occurred.")
      }
    } finally {
      setDeleteLoading(null)
    }
  }

  const cancelDelete = () => {
    setDeleteModalOpen(false)
    setServiceToDelete(null)
  }

  const handleSelectTemplate = async (template) => {
    setTemplatesModalOpen(false)
    
    // Create service from template
    const serviceData = {
      name: template.name,
      description: template.description,
      price: template.price,
      duration: template.duration,
      category: template.category,
      modifiers: template.modifiers || [],
      isFree: false
    }
    
    await handleCreateService(serviceData)
  }

  const handleServiceClick = (serviceId) => {
    navigate(`/services/${serviceId}`)
  }

  const handleRetry = () => {
    fetchServices()
  }

  const handleAddCategory = async () => {
    if (!newCategoryName.trim() || !user?.id) return
    
    // Check if category name already exists
    const trimmedName = newCategoryName.trim()
    const categoryExists = categories.some(cat => cat.toLowerCase() === trimmedName.toLowerCase())
    
    if (categoryExists) {
      setError(`Category "${trimmedName}" already exists. Please choose a different name.`)
      return
    }
    
    try {
      setError("")
      
      // Try to create category via API first
      try {
        const categoryData = {
          userId: user.id,
          name: trimmedName,
          description: `${trimmedName} services`,
          color: '#3B82F6'
        }
        
        const newCategory = await servicesAPI.createCategory(categoryData)
        console.log('Category created:', newCategory)
        
        // Add the new category to the list
        setCategories(prev => [...prev, newCategory.name])
        setCategoryObjects(prev => [...prev, newCategory])
      } catch (apiError) {
        console.log('Categories API not available, using local fallback:', apiError.message)
        
        // Check if it's a duplicate error from the API
        if (apiError.response?.status === 400 && apiError.response?.data?.error?.includes('already exists')) {
          setError(`Category "${trimmedName}" already exists. Please choose a different name.`)
          return
        }
        
        // Fallback: Add category locally only
        setCategories(prev => [...prev, trimmedName])
      }
      
      setNewCategoryName("")
      setShowAddCategoryModal(false)
    } catch (error) {
      console.error('Error adding category:', error)
      setError("Failed to add category. Please try again.")
    }
  }

  const handleMoveServiceToCategory = async (serviceId, newCategory) => {
    try {
      const service = services.find(s => s.id === serviceId)
      if (!service) return
      
      // Only send the essential fields for the update
      const updateData = {
        name: service.name,
        description: service.description,
        price: service.price,
        duration: service.duration,
        category: newCategory
      }
      
      // Update the service in the backend
      await servicesAPI.update(serviceId, updateData)
      
      // Update the service in the local state
      setServices(prev => prev.map(s => 
        s.id === serviceId ? { ...s, category: newCategory } : s
      ))
    } catch (error) {
      console.error('Error moving service to category:', error)
      setError("Failed to move service to category. Please try again.")
    }
  }

  const handleRemoveCategory = (categoryName) => {
    console.log('🔄 handleRemoveCategory called with:', categoryName);
    
    // Find the category object to get the ID
    const categoryObject = categoryObjects.find(cat => cat.name === categoryName);
    
    if (!categoryObject) {
      console.error('❌ Category object not found for:', categoryName);
      setError('Category not found. Please refresh the page and try again.');
      return;
    }
    
    console.log('🔄 Found category object:', categoryObject);
    
    // Set the category to delete and open the modal
    setCategoryToDelete({ name: categoryName, object: categoryObject });
    setCategoryDeleteModalOpen(true);
  }

  const handleConfirmCategoryDelete = async () => {
    if (!categoryToDelete) return;
    
    console.log('✅ User confirmed category deletion');
    
    try {
      setDeletingCategory(true);
      setError('');
      
      const { name: categoryName, object: categoryObject } = categoryToDelete;
      
      // First, move all services in this category to "Uncategorized"
      const servicesInCategory = services.filter(s => s.category === categoryName);
      console.log(`🔄 Moving ${servicesInCategory.length} services to uncategorized`);
      
      for (const service of servicesInCategory) {
        await handleMoveServiceToCategory(service.id, "");
      }
      
      // Now delete the category from the database
      console.log('🔄 Deleting category from database:', categoryObject.id);
      const result = await servicesAPI.deleteCategory(categoryObject.id);
      console.log('✅ Category deletion result:', result);
      
      // Update local state
      setCategories(prev => prev.filter(cat => cat !== categoryName));
      setCategoryObjects(prev => prev.filter(cat => cat.name !== categoryName));
      
      console.log('✅ Category removed successfully');
      
      // Close the modal
      setCategoryDeleteModalOpen(false);
      setCategoryToDelete(null);
      
    } catch (error) {
      console.error('❌ Error removing category:', error);
      console.error('❌ Error response:', error.response);
      console.error('❌ Error data:', error.response?.data);
      
      if (error.response?.data?.error) {
        setError(error.response.data.error);
      } else {
        setError('Failed to delete category. Please try again.');
      }
    } finally {
      setDeletingCategory(false);
    }
  }

  const handleCancelCategoryDelete = () => {
    console.log('❌ User cancelled category deletion');
    setCategoryDeleteModalOpen(false);
    setCategoryToDelete(null);
  }

  // Drag and drop handlers
  const handleDragStart = (e, service) => {
    setDraggedService(service)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/html', e.target.outerHTML)
    
    // Add visual feedback
    e.target.style.opacity = '0.5'
    e.target.style.transform = 'scale(0.95)'
    
    // Set a custom drag image
    const dragImage = e.target.cloneNode(true)
    dragImage.style.opacity = '0.8'
    dragImage.style.transform = 'scale(0.9)'
    document.body.appendChild(dragImage)
    e.dataTransfer.setDragImage(dragImage, 0, 0)
    
    // Remove the drag image after a short delay
    setTimeout(() => {
      document.body.removeChild(dragImage)
    }, 0)
  }

  const handleDragOver = (e, category) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    // Don't allow dropping on the same category
    if (draggedService && draggedService.category === (category === 'Additional' ? '' : category)) {
      return
    }
    setDragOverCategory(category)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    setDragOverCategory(null)
  }

  const handleDragEnd = (e) => {
    // Clean up visual feedback
    e.target.style.opacity = ''
    e.target.style.transform = ''
    setDraggedService(null)
    setDragOverCategory(null)
  }

  const handleDrop = async (e, targetCategory) => {
    e.preventDefault()
    setDragOverCategory(null)
    
    if (!draggedService || draggedService.category === targetCategory) {
      return
    }

    try {
      // Convert "Additional" category to empty string for uncategorized services
      const newCategory = targetCategory === 'Additional' ? '' : targetCategory
      await handleMoveServiceToCategory(draggedService.id, newCategory)
      setDraggedService(null)
    } catch (error) {
      console.error('Error moving service:', error)
      setError("Failed to move service. Please try again.")
    }
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Main Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} activePage="services" />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 lg:ml-64">
        {/* Mobile Header */}
        <MobileHeader onMenuClick={() => setSidebarOpen(true)} />

        {/* Desktop Header */}
        <div className="hidden lg:flex bg-white border-b border-gray-200 px-6 py-4 items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900">Services</h1>
          <button 
            onClick={() => setCreateModalOpen(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Add Service</span>
          </button>
        </div>

        {/* Mobile Header Content */}
        <div className="lg:hidden bg-white border-b border-gray-200 px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold text-gray-900">Services</h1>
            <button 
              onClick={() => setCreateModalOpen(true)}
              className="bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Add Service</span>
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto">
          <div className="max-w-4xl mx-auto p-6">
            {/* Auth Loading */}
            {authLoading ? (
              <div className="p-8 text-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
                <p className="text-gray-600">Loading...</p>
              </div>
            ) : (
              <>
            {/* Error Display */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="w-5 h-5 text-red-500" />
                  <p className="text-red-700">{error}</p>
                </div>
                <button
                  onClick={handleRetry}
                  className="mt-2 text-red-600 hover:text-red-700 text-sm font-medium"
                >
                  Try again
                </button>
              </div>
            )}

            {/* Services List */}
            <div className="bg-white rounded-lg border border-gray-200 mb-8">
              {loading ? (
                <div className="p-8 text-center">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
                  <p className="text-gray-600">Loading services...</p>
                </div>
              ) : services.length === 0 ? (
                <div className="p-8 text-center">
                  <Wrench className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No services yet</h3>
                  <p className="text-gray-500 mb-4">Create your first service to get started</p>
                  <button
                    onClick={() => setCreateModalOpen(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                  >
                    Create Service
                  </button>
                </div>
              ) : (
                <div>
                      {categoriesEnabled ? (
                        // Group services by category, including "Additional" for uncategorized services
                        (() => {
                          const categorizedServices = services.filter(s => s.category)
                          const uncategorizedServices = services.filter(s => !s.category)
                          
                          // Get all categories and add "Additional" if there are uncategorized services
                          const allCategories = [...categories]
                          if (uncategorizedServices.length > 0) {
                            allCategories.push('Additional')
                          }
                          
                          // Smart sorting: categories with services first, then empty categories
                          // This ensures new categories (with 0 services) appear at the bottom
                          // and move up when they get their first service
                          const sortedCategories = allCategories.sort((a, b) => {
                            const aServices = a === 'Additional' 
                              ? uncategorizedServices 
                              : services.filter(s => s.category === a)
                            const bServices = b === 'Additional' 
                              ? uncategorizedServices 
                              : services.filter(s => s.category === b)
                            
                            const aCount = aServices.length
                            const bCount = bServices.length
                            
                            // If both have services or both are empty, maintain original order
                            if ((aCount > 0 && bCount > 0) || (aCount === 0 && bCount === 0)) {
                              return allCategories.indexOf(a) - allCategories.indexOf(b)
                            }
                            
                            // Categories with services come first
                            if (aCount > 0 && bCount === 0) return -1
                            if (aCount === 0 && bCount > 0) return 1
                            
                            return 0
                          })
                          
                          return sortedCategories.map(category => {
                            const categoryServices = category === 'Additional' 
                              ? uncategorizedServices 
                              : services.filter(s => s.category === category)
                            
                      return (
                                <div 
                          key={category} 
                          className={`border-b border-gray-200 last:border-b-0 transition-all duration-200 relative ${
                                    dragOverCategory === category ? 'bg-blue-50 border-2 border-blue-200' : ''
                          } ${draggedService && draggedService.category !== (category === 'Additional' ? '' : category) ? 'hover:bg-blue-25' : ''}`}
                                  onDragOver={(e) => handleDragOver(e, category)}
                                  onDragLeave={handleDragLeave}
                                  onDrop={(e) => handleDrop(e, category)}
                                >
                          {/* Drop zone indicator */}
                          {dragOverCategory === category && (
                            <div className="absolute inset-0 bg-blue-100 bg-opacity-20 border-2 border-dashed border-blue-300 rounded-lg pointer-events-none z-10 flex items-center justify-center">
                              <div className="bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg">
                                <span className="font-medium">Drop service here</span>
                              </div>
                            </div>
                          )}
                                <div 
                                  className={`px-4 py-3 flex items-center justify-between ${
                                    categoryServices.length === 0 
                                      ? 'bg-gray-100' 
                                      : 'bg-gray-50'
                                  }`}
                                >
                                                        <h3 className={`font-medium ${categoryServices.length === 0 ? 'text-gray-400' : 'text-gray-900'}`}>
                              {category}
                              {categoryServices.length === 0 && (
                                <span className="ml-2 text-xs text-gray-400 font-normal">(empty)</span>
                              )}
                            </h3>
                            <div className="flex items-center space-x-2">
                              <span className={`text-sm ${categoryServices.length === 0 ? 'text-gray-400' : 'text-gray-500'}`}>
                                {categoryServices.length} service{categoryServices.length !== 1 ? 's' : ''}
                              </span>
                                    {category !== 'Additional' && (
                              <button
                                onClick={() => handleRemoveCategory(category)}
                                className="text-red-600 hover:text-red-700 text-sm"
                              >
                                Remove
                              </button>
                                    )}
                            </div>
                          </div>
                          {categoryServices.map((service, index) => (
                            <div
                              key={service.id}
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, service)}
                              onDragEnd={handleDragEnd}
                              className={`flex items-center justify-between p-4 transition-all duration-200 ${
                                index !== categoryServices.length - 1 ? "border-b border-gray-100" : ""
                              } ${draggedService?.id === service.id ? 'opacity-50 scale-95' : 'hover:bg-gray-50'} cursor-move`}
                            >
                              <div 
                                className="flex items-center space-x-4 flex-1 cursor-pointer hover:bg-gray-50 p-2 rounded"
                                onClick={() => handleServiceClick(service.id)}
                              >
                                <GripVertical className="w-5 h-5 text-gray-400 cursor-move hover:text-gray-600 transition-colors" title="Drag to move service" />
                                {service.image ? (
                                  <img 
                                    src={service.image} 
                                    alt={service.name}
                                    className="w-10 h-10 object-cover rounded"
                                  />
                                ) : (
                                  <Wrench className="w-5 h-5 text-gray-400" />
                                )}
                                <div className="flex-1 min-w-0">
                                  <h3 className="font-medium text-gray-900">{service.name}</h3>
                                  {service.description && (
                                    <p className="text-sm text-gray-500 mt-1 line-clamp-1">
                                      {service.description}
                                    </p>
                                  )}
                                  <div className="flex items-center space-x-4 mt-2">
                                    <span className="text-sm text-gray-600">
                                      {service.price ? `$${service.price}` : 'Free'}
                                    </span>
                                    {service.duration && (
                                      <span className="text-sm text-gray-600">
                                        {Math.floor(service.duration / 60)}h {service.duration % 60}m
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center space-x-4">
                                <div className={`w-2 h-2 rounded-full ${service.visible ? "bg-green-500" : "bg-yellow-500"}`}></div>
                                <span className={`text-sm ${service.visible ? "text-green-700" : "text-yellow-700"}`}>
                                  {service.visible ? "Visible" : "Hidden"}
                                </span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleDeleteService(service.id)
                                  }}
                                  disabled={deleteLoading === service.id}
                                  className="text-red-600 hover:text-red-700 text-sm font-medium disabled:opacity-50"
                                >
                                  {deleteLoading === service.id ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    "Delete"
                                  )}
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )
                    })
                        })()
                  ) : (
                    // Show all services without categories
                    services.map((service, index) => (
                      <div
                        key={service.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, service)}
                        className={`flex items-center justify-between p-4 ${
                          index !== services.length - 1 ? "border-b border-gray-200" : ""
                            } ${draggedService?.id === service.id ? 'opacity-50' : ''}`}
                      >
                        <div 
                          className="flex items-center space-x-4 flex-1 cursor-pointer hover:bg-gray-50 p-2 rounded"
                          onClick={() => handleServiceClick(service.id)}
                        >
                          <GripVertical className="w-5 h-5 text-gray-400 cursor-move" />
                          {service.image ? (
                            <img 
                              src={service.image} 
                              alt={service.name}
                              className="w-10 h-10 object-cover rounded"
                            />
                          ) : (
                            <Wrench className="w-5 h-5 text-gray-400" />
                          )}
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-gray-900">{service.name}</h3>
                            {service.description && (
                              <p className="text-sm text-gray-500 mt-1 line-clamp-1">
                                {service.description}
                              </p>
                            )}
                            <div className="flex items-center space-x-4 mt-2">
                              <span className="text-sm text-gray-600">
                                {service.price ? `$${service.price}` : 'Free'}
                              </span>
                              {service.duration && (
                                <span className="text-sm text-gray-600">
                                  {Math.floor(service.duration / 60)}h {service.duration % 60}m
                                </span>
                              )}
                              {service.category && (
                                <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                                  {service.category}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-4">
                          <div className={`w-2 h-2 rounded-full ${service.visible ? "bg-green-500" : "bg-yellow-500"}`}></div>
                          <span className={`text-sm ${service.visible ? "text-green-700" : "text-yellow-700"}`}>
                            {service.visible ? "Visible" : "Hidden"}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteService(service.id)
                            }}
                            disabled={deleteLoading === service.id}
                            className="text-red-600 hover:text-red-700 text-sm font-medium disabled:opacity-50"
                          >
                            {deleteLoading === service.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              "Delete"
                            )}
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Service Categories */}
            <div className="bg-gray-50 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Service categories</h3>
                  <p className="text-gray-600">
                    Service categories allow you to organize your services into groups for your booking page.{" "}
                    <button className="text-blue-600 hover:text-blue-700">Learn more</button>
                  </p>
                </div>
                <div className="flex-shrink-0">
                  <button
                    onClick={() => setCategoriesEnabled(!categoriesEnabled)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      categoriesEnabled ? "bg-blue-600" : "bg-gray-300"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        categoriesEnabled ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
              </div>
              
              {categoriesEnabled && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-gray-900">Categories</h4>
                    <button
                      onClick={() => setShowAddCategoryModal(true)}
                      className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                    >
                      Add Category
                    </button>
                  </div>
                  
                  {/* {categories.length > 0 ? (
                    <div className="space-y-2">
                      {categories.map(category => (
                        <div key={category} className="flex items-center justify-between bg-white p-3 rounded border">
                          <span className="font-medium text-gray-900">{category}</span>
                          <button
                            onClick={() => handleRemoveCategory(category)}
                            className="text-red-600 hover:text-red-700 text-sm"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">No categories created yet. Add your first category to get started.</p>
                  )} */}
                </div>
              )}
            </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <CreateServiceModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onCreateService={handleCreateService}
        onStartWithTemplate={() => {
          setCreateModalOpen(false)
          setTemplatesModalOpen(true)
        }}
        existingCategories={categoryObjects}
      />

      <ServiceTemplatesModal
        isOpen={templatesModalOpen}
        onClose={() => setTemplatesModalOpen(false)}
        onSelectTemplate={handleSelectTemplate}
      />

              {/* Delete Confirmation Modal */}
        {deleteModalOpen && serviceToDelete && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-xl max-w-sm w-full">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Confirm Deletion</h3>
                <button onClick={cancelDelete} className="text-gray-500 hover:text-gray-700">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-gray-800 mb-4">
                Are you sure you want to delete the service "{serviceToDelete.name}"? This action cannot be undone.
              </p>
              <div className="flex justify-end space-x-2">
                <button
                  onClick={cancelDelete}
                  className="px-4 py-2 rounded-lg text-gray-700 border border-gray-300 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={deleteLoading === serviceToDelete.id}
                  className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {deleteLoading === serviceToDelete.id ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Trash2 className="w-4 h-4 mr-2" />
                  )}
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Category Delete Confirmation Modal */}
        {categoryDeleteModalOpen && categoryToDelete && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-xl max-w-sm w-full">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Delete Category</h3>
                <button onClick={handleCancelCategoryDelete} className="text-gray-500 hover:text-gray-700">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="mb-4">
                <p className="text-gray-800 mb-2">
                  Are you sure you want to delete the category <strong>"{categoryToDelete.name}"</strong>?
                </p>
                <p className="text-sm text-gray-600">
                  This action cannot be undone. All services in this category will be moved to "Uncategorized".
                </p>
              </div>
              
              <div className="flex justify-end space-x-2">
                <button
                  onClick={handleCancelCategoryDelete}
                  disabled={deletingCategory}
                  className="px-4 py-2 rounded-lg text-gray-700 border border-gray-300 hover:bg-gray-100 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmCategoryDelete}
                  disabled={deletingCategory}
                  className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 flex items-center"
                >
                  {deletingCategory ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Category
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add Category Modal */}
        {showAddCategoryModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-xl max-w-sm w-full">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Add Category</h3>
                <button onClick={() => setShowAddCategoryModal(false)} className="text-gray-500 hover:text-gray-700">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              {/* Error Message */}
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category Name
                </label>
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => {
                    setNewCategoryName(e.target.value)
                    // Clear error when user starts typing
                    if (error) setError("")
                  }}
                  placeholder="Enter category name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  onKeyPress={(e) => e.key === 'Enter' && handleAddCategory()}
                />
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => {
                    setShowAddCategoryModal(false)
                    setError("") // Clear error when closing
                  }}
                  className="px-4 py-2 rounded-lg text-gray-700 border border-gray-300 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddCategory}
                  disabled={!newCategoryName.trim()}
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  Add Category
                </button>
              </div>
            </div>
          </div>
        )}
    </div>
  )
}

export default ZenbookerServices