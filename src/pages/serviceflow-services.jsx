"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import Sidebar from "../components/sidebar"
import MobileHeader from "../components/mobile-header"
import { GripVertical, Wrench, Plus, AlertCircle, AlertTriangle, Loader2, Trash2, X, Copy } from "lucide-react"
import CreateServiceModal from "../components/create-service-modal"
import ServiceTemplatesModal from "../components/service-templates-modal"
import ServicesDisplay from "../components/services-display"
import { servicesAPI } from "../services/api"
import { useAuth } from "../context/AuthContext"
import { getImageUrl, handleImageError } from "../utils/imageUtils"
import { normalizeAPIResponse, handleAPIError } from "../utils/dataHandler"
import useServiceSettings from "../components/use-service-settings"

const ServiceFlowServices = () => {
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  
  // Use persistent settings for categories enabled state
  const { 
    settings: { categoriesEnabled }, 
    updateSettings: updateServiceSettings, 
    saveSettings: saveServiceSettings 
  } = useServiceSettings({ categoriesEnabled: false })
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [templatesModalOpen, setTemplatesModalOpen] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [serviceToDelete, setServiceToDelete] = useState(null)
  const [duplicateSuccessModalOpen, setDuplicateSuccessModalOpen] = useState(false)
  const [duplicatedService, setDuplicatedService] = useState(null)
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
      
      // Extract services array from response using standardized handler
      const servicesArray = normalizeAPIResponse(servicesResponse, 'services')
      console.log('🔍 Services array:', servicesArray)
      
      // Sort services alphabetically by name
      const sortedServices = servicesArray.sort((a, b) => a.name.localeCompare(b.name))
      console.log('🔍 Sorted services:', sortedServices)
      setServices(sortedServices)
      
      // Try to fetch categories, but handle 404 gracefully
      try {
        const categoriesResponse = await servicesAPI.getServiceCategories(user.id)
        console.log('🔍 Categories API response:', categoriesResponse)
        
        // Set categories from API response - ensure we have the full category objects
        const categoryNames = categoriesResponse.map(cat => cat.name)
        console.log('🔍 Category names:', categoryNames)
        console.log('🔍 Full categories response:', categoriesResponse)
        setCategories(categoryNames)
        setCategoryObjects(categoriesResponse)
        
        // Update services to properly map to category names
        const updatedServices = sortedServices.map(service => {
          if (service.category && service.category.trim() !== '') {
            // Find the matching category object
            const matchingCategory = categoriesResponse.find(cat => cat.name === service.category)
            if (matchingCategory) {
              return { ...service, category: matchingCategory.name }
            }
          }
          return service
        })
        setServices(updatedServices)
      } catch (categoriesError) {
        console.log('🔍 Categories endpoint not available, using fallback:', categoriesError.message)
        
        // Fallback: Extract categories from services
        const uniqueCategories = [...new Set(sortedServices.map(service => service.category).filter(cat => cat && cat.trim() !== ''))]
        console.log('🔍 Fallback categories:', uniqueCategories)
        setCategories(uniqueCategories)
        setCategoryObjects([])
      }
      
      // Debug logging for rendering logic
      console.log('🔍 Debug - categoriesEnabled:', categoriesEnabled)
      console.log('🔍 Debug - categories array:', categories)
      console.log('🔍 Debug - services array length:', sortedServices.length)
      console.log('🔍 Debug - services with categories:', sortedServices.filter(s => s.category).length)
      console.log('🔍 Debug - services without categories:', sortedServices.filter(s => !s.category).length)
    } catch (error) {
      console.error('Error fetching services:', error)
      const errorInfo = handleAPIError(error, 'Services fetch')
      setError(`Failed to load services: ${errorInfo.message}`)
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
          
          const uploadResponse = await fetch('https://service-flow-backend-production.up.railway.app/api/upload-service-image', {
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
      
      // If the service has a category, make sure it's in the categories array
      if (newServiceData.category && newServiceData.category.trim() !== '') {
        setCategories(prev => {
          const categoryExists = prev.includes(newServiceData.category);
          if (!categoryExists) {
            console.log('🔧 Adding new category to categories array:', newServiceData.category);
            return [...prev, newServiceData.category];
          }
          return prev;
        });
      }
      
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

  const handleDuplicateService = async (service) => {
    try {
      setDeleteLoading(service.id); // Reuse loading state for duplicate
      
      // Create duplicate service data
      const duplicateData = {
        name: `${service.name} (Copy)`,
        description: service.description,
        price: service.price,
        duration: service.duration,
        category: service.category,
        category_id: service.category_id,
        image: service.image,
        modifiers: service.modifiers,
        intake_questions: service.intake_questions,
        require_payment_method: service.require_payment_method,
        userId: user.id
      };
      
      console.log('🔄 Duplicating service with data:', duplicateData);
      
      // Create the duplicate service
      const duplicatedService = await servicesAPI.create(duplicateData);
      
      // Store the duplicated service for the modal
      setDuplicatedService(duplicatedService);
      
      // Refresh the services list
      await fetchServices();
      
      // Show success modal
      setDuplicateSuccessModalOpen(true);
      
    } catch (error) {
      console.error('Error duplicating service:', error);
      alert('Failed to duplicate service. Please try again.');
    } finally {
      setDeleteLoading(null);
    }
  }

  const handleServiceEdit = (service) => {
    // Navigate to service edit page or open edit modal
    navigate(`/service/${service.id}/edit`)
  }

  const fixCategoryMapping = async () => {
    // This function can be used to manually fix category mapping issues
    console.log('🔧 Attempting to fix category mapping...')
    
    // Check if services have categories that don't match the categories array
    const mismatchedServices = services.filter(s => {
      if (!s.category || s.category.trim() === '') return false
      return !categories.includes(s.category)
    })
    
    console.log('🔧 Services with mismatched categories:', mismatchedServices)
    
    if (mismatchedServices.length > 0) {
      // Try to find the correct category for each service
      mismatchedServices.forEach(service => {
        console.log(`🔧 Service "${service.name}" has category "${service.category}" but categories array has:`, categories)
      })
      
      // Check if we can auto-fix by looking at service names
      console.log('🔧 Attempting to auto-fix category mapping...')
      
      services.forEach(service => {
        if (!service.category || service.category.trim() === '') {
          // Try to match service name to category
          if (service.name.toLowerCase().includes('clean') && categories.includes('cleaning')) {
            console.log(`🔧 Auto-fixing: "${service.name}" -> "cleaning" category`)
            // You can implement the actual update here
          }
        }
      })
    }
    
    // Show current state
    console.log('🔧 Current services state:')
    services.forEach(service => {
      console.log(`  - "${service.name}": category="${service.category}"`)
    })
    
    console.log('🔧 Available categories:', categories)
  }

  const autoFixCategoryMapping = async () => {
    console.log('🔧 Auto-fixing category mapping...')
    
    try {
      // Find services that should be in the cleaning category
      const servicesToUpdate = services.filter(service => {
        if (service.category && service.category.trim() !== '') return false // Already has a category
        return service.name.toLowerCase().includes('clean') || 
               service.name.toLowerCase().includes('cleaning') ||
               service.description?.toLowerCase().includes('clean') ||
               service.description?.toLowerCase().includes('cleaning')
      })
      
      console.log('🔧 Services to update:', servicesToUpdate.map(s => s.name))
      
      if (servicesToUpdate.length === 0) {
        console.log('🔧 No services need updating')
        return
      }
      
      // Update each service with the cleaning category
      for (const service of servicesToUpdate) {
        try {
          const updateData = {
            name: service.name,
            description: service.description,
            price: service.price,
            duration: service.duration,
            category: 'cleaning', // Set to cleaning category
            // Preserve other important fields
            image: service.image,
            require_payment_method: service.require_payment_method,
            is_active: service.is_active,
            category_id: service.category_id
          }
          
          // Only include modifiers and intake_questions if they exist and are not null/undefined
          if (service.modifiers !== null && service.modifiers !== undefined) {
            updateData.modifiers = service.modifiers;
          }
          if (service.intake_questions !== null && service.intake_questions !== undefined) {
            updateData.intake_questions = service.intake_questions;
          }
          
          console.log(`🔧 Updating service "${service.name}" with category "cleaning"`)
          await servicesAPI.update(service.id, updateData)
          
          // Update local state
          setServices(prev => prev.map(s => 
            s.id === service.id ? { ...s, category: 'cleaning' } : s
          ))
          
          console.log(`✅ Successfully updated "${service.name}"`)
        } catch (error) {
          console.error(`❌ Failed to update "${service.name}":`, error)
        }
      }
      
      // Refresh services to see the changes
      await fetchServices()
      
    } catch (error) {
      console.error('🔧 Auto-fix failed:', error)
    }
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
      
      // Preserve all service data including modifiers and intake questions
      const updateData = {
        name: service.name,
        description: service.description,
        price: service.price,
        duration: service.duration,
        category: newCategory,
        // Preserve other important fields
        image: service.image,
        require_payment_method: service.require_payment_method,
        is_active: service.is_active,
        category_id: service.category_id
      }
      
      // Only include modifiers and intake_questions if they exist and are not null/undefined
      if (service.modifiers !== null && service.modifiers !== undefined) {
        updateData.modifiers = service.modifiers;
      }
      if (service.intake_questions !== null && service.intake_questions !== undefined) {
        updateData.intake_questions = service.intake_questions;
      }
      
      console.log('🔧 Moving service to category:', service.name, '→', newCategory);
      console.log('🔧 Preserving modifiers:', service.modifiers);
      console.log('🔧 Preserving intake_questions:', service.intake_questions);
      
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
    if (draggedService && draggedService.category === (category === 'No category' ? '' : category)) {
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
      // Convert "No category" category to empty string for uncategorized services
      const newCategory = targetCategory === 'No category' ? '' : targetCategory
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
      <div className="flex-1 flex flex-col min-w-0 lg:ml-64 xl:ml-72">
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
                      {console.log('🔍 Render - categoriesEnabled:', categoriesEnabled, 'services length:', services.length, 'categories length:', categories.length)}
                      {categoriesEnabled ? (
                        // Group services by category, including "Additional" for uncategorized services
                        (() => {
                          // Services with string categories that don't exist in the categories array are treated as uncategorized
                          // Improved categorization logic - handle both category names and IDs
                          const categorizedServices = services.filter(s => {
                            if (!s.category || s.category.trim() === '') return false
                            // Check if the category exists in the categories array (by name)
                            return categories.includes(s.category)
                          })
                          const uncategorizedServices = services.filter(s => {
                            if (!s.category || s.category.trim() === '') return true
                            // Services with categories that don't exist in the categories array are uncategorized
                            return !categories.includes(s.category)
                          })
                          
                          console.log('🔍 Debug - Total services:', services.length)
                          console.log('🔍 Debug - Categorized services:', categorizedServices.length)
                          console.log('🔍 Debug - Uncategorized services:', uncategorizedServices.length)
                          console.log('🔍 Debug - Uncategorized services details:', uncategorizedServices.map(s => ({ id: s.id, name: s.name, category: s.category })))
                          console.log('🔍 Debug - Categories array:', categories)
                          console.log('🔍 Debug - All services and their categories:', services.map(s => ({ id: s.id, name: s.name, category: s.category, categoryType: typeof s.category })))
                          
                          // Debug: Check if services have categories that match the categories array
                          console.log('🔍 Debug - Categories array:', categories)
                          console.log('🔍 Debug - Services with categories:', services.filter(s => s.category && s.category.trim() !== '').map(s => s.category))
                          console.log('🔍 Debug - Category matching test:', categories.map(cat => ({
                            category: cat,
                            matchingServices: services.filter(s => s.category === cat).length
                          })))
                          
                          // Only show all services in "Additional" if there are truly no categories defined
                          if (categories.length === 0) {
                            console.log('🔍 Debug - No categories defined, showing all services in Additional')
                            return (
                              <div 
                                key="Additional" 
                                className="border-b border-gray-200 last:border-b-0 transition-all duration-200 relative"
                              >
                                <div className="px-4 py-3 flex items-center justify-between bg-gray-50">
                                  <h3 className="font-medium text-gray-900">No category</h3>
                                  <div className="flex items-center space-x-2">
                                    <span className="text-sm text-gray-500">
                                      {services.length} service{services.length !== 1 ? 's' : ''}
                                    </span>
                                  </div>
                                </div>
                                {services.map((service, index) => (
                                  <div
                                    key={service.id}
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, service)}
                                    onDragEnd={handleDragEnd}
                                    className={`flex items-center justify-between p-4 transition-all duration-200 ${
                                      index !== services.length - 1 ? "border-b border-gray-100" : ""
                                    } hover:bg-gray-50 cursor-move`}
                                  >
                                    <div 
                                      className="flex items-center space-x-4 flex-1 cursor-pointer hover:bg-gray-50 p-2 rounded"
                                      onClick={() => handleServiceClick(service.id)}
                                    >
                                      <GripVertical className="w-5 h-5 text-gray-400 cursor-move hover:text-gray-600 transition-colors" title="Drag to move service" />
                                      {service.image ? (
                                        <img 
                                          src={getImageUrl(service.image)} 
                                          alt={service.name}
                                          className="w-10 h-10 object-cover rounded"
                                          onError={(e) => handleImageError(e, null)}
                                        />
                                      ) : (
                                        <Wrench className="w-5 h-5 text-gray-400" />
                                      )}
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-1">
                                          <h3 className="font-medium text-gray-900">{service.name}</h3>
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              handleDuplicateService(service)
                                            }}
                                            disabled={deleteLoading === service.id}
                                            className="flex items-center px-2 py-1 text-xs font-medium text-green-600 hover:text-green-800 hover:bg-green-50 rounded-md transition-colors disabled:opacity-50"
                                            title="Duplicate service"
                                          >
                                            {deleteLoading === service.id ? (
                                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-green-600"></div>
                                            ) : (
                                              <>
                                                <Copy className="w-3 h-3 mr-1" />
                                                Duplicate
                                              </>
                                            )}
                                          </button>
                                        </div>
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
                          }
                          
                          // Get all categories and add "Additional" if there are uncategorized services
                          const allCategories = [...categories]
                          console.log('🔍 Debug - Initial allCategories:', allCategories)
                          if (uncategorizedServices.length > 0) {
                            allCategories.push('No category')
                            console.log('🔍 Debug - Added "Additional" category')
                          }
                          console.log('🔍 Debug - Final allCategories:', allCategories)
                          
                          // Smart sorting: categories with services first, then empty categories
                          // This ensures new categories (with 0 services) appear at the bottom
                          // and move up when they get their first service
                          const sortedCategories = allCategories.sort((a, b) => {
                            const aServices = a === 'No category' 
                              ? uncategorizedServices 
                              : services.filter(s => s.category && s.category.trim() === a)
                            const bServices = b === 'No category' 
                              ? uncategorizedServices 
                              : services.filter(s => s.category && s.category.trim() === b)
                            
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
                            console.log(`🔍 Debug - Processing category: "${category}"`)
                            const categoryServices = category === 'No category' 
                              ? uncategorizedServices 
                              : services.filter(s => s.category && s.category.trim() === category)
                            
                            console.log(`🔍 Category "${category}" has ${categoryServices.length} services`)
                            
                                                    // Show all categories, even if they have 0 services (for better UX)
                        // if (categoryServices.length === 0) {
                        //   return null
                        // }
                            
                        return (
                                <div 
                          key={category} 
                          className={`border-b border-gray-200 last:border-b-0 transition-all duration-200 relative ${
                                    dragOverCategory === category ? 'bg-blue-50 border-2 border-blue-200' : ''
                          } ${draggedService && draggedService.category !== (category === 'No category' ? '' : category) ? 'hover:bg-blue-25' : ''}`}
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
                          
                          {/* Show empty state for categories with no services */}
                          {categoryServices.length === 0 && (
                            <div className="px-4 py-6 text-center text-gray-500">
                              <p>No services in this category yet.</p>
                              <p className="text-sm mt-1">Drag services here or create new ones to get started.</p>
                            </div>
                          )}
                          
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
                                    src={getImageUrl(service.image)} 
                                    alt={service.name}
                                    className="w-10 h-10 object-cover rounded"
                                    onError={(e) => handleImageError(e, null)}
                                  />
                                ) : (
                                  <Wrench className="w-5 h-5 text-gray-400" />
                                )}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between mb-1">
                                    <h3 className="font-medium text-gray-900">{service.name}</h3>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleDuplicateService(service)
                                      }}
                                      disabled={deleteLoading === service.id}
                                      className="flex items-center px-2 py-1 text-xs font-medium text-green-600 hover:text-green-800 hover:bg-green-50 rounded-md transition-colors disabled:opacity-50"
                                      title="Duplicate service"
                                    >
                                      {deleteLoading === service.id ? (
                                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-green-600"></div>
                                      ) : (
                                        <>
                                          <Copy className="w-3 h-3 mr-1" />
                                          Duplicate
                                        </>
                                      )}
                                    </button>
                                  </div>
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
                              src={getImageUrl(service.image)} 
                              alt={service.name}
                              className="w-10 h-10 object-cover rounded"
                              onError={(e) => handleImageError(e, null)}
                            />
                          ) : (
                            <Wrench className="w-5 h-5 text-gray-400" />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <h3 className="font-medium text-gray-900">{service.name}</h3>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleDuplicateService(service)
                                }}
                                disabled={deleteLoading === service.id}
                                className="flex items-center px-2 py-1 text-xs font-medium text-green-600 hover:text-green-800 hover:bg-green-50 rounded-md transition-colors disabled:opacity-50"
                                title="Duplicate service"
                              >
                                {deleteLoading === service.id ? (
                                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-green-600"></div>
                                ) : (
                                  <>
                                    <Copy className="w-3 h-3 mr-1" />
                                    Duplicate
                                  </>
                                )}
                              </button>
                            </div>
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
                    onClick={async () => {
                      console.log('🔍 Toggle clicked - current categoriesEnabled:', categoriesEnabled)
                      console.log('🔍 Current services count:', services.length)
                      console.log('🔍 Current categories count:', categories.length)
                      
                      const newCategoriesEnabled = !categoriesEnabled
                      
                      // Update settings immediately (updates local state)
                      updateServiceSettings({ categoriesEnabled: newCategoriesEnabled })
                      
                      // Save to localStorage and potentially backend
                      try {
                        await saveServiceSettings({ categoriesEnabled: newCategoriesEnabled })
                        console.log('🔍 Service categories setting saved successfully:', newCategoriesEnabled)
                      } catch (error) {
                        console.error('🔍 Failed to save service categories setting:', error)
                      }
                    }}
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
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={fixCategoryMapping}
                        className="bg-yellow-600 text-white px-3 py-1 rounded text-sm hover:bg-yellow-700"
                        title="Debug category mapping issues"
                      >
                        Debug Categories
                      </button>
                      <button
                        onClick={autoFixCategoryMapping}
                        className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                        title="Auto-fix category mapping for cleaning services"
                      >
                        Auto-Fix Cleaning
                      </button>
                    <button
                      onClick={() => setShowAddCategoryModal(true)}
                      className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                    >
                      Add Category
                    </button>
                    </div>
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
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 transform transition-all duration-300 ease-out">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-red-100 rounded-full">
                    <Trash2 className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Delete Service</h3>
                    <p className="text-sm text-gray-500">This action cannot be undone</p>
                  </div>
                  </div>
                <button 
                  onClick={cancelDelete} 
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                  disabled={deleteLoading === serviceToDelete.id}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6">
                <div className="mb-4">
                  <p className="text-gray-700 mb-2">
                    Are you sure you want to delete <strong>"{serviceToDelete.name}"</strong>?
                  </p>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <div className="flex items-start space-x-2">
                      <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                      <div className="text-sm text-yellow-800">
                        <p className="font-medium">Warning:</p>
                        <ul className="mt-1 space-y-1 text-xs">
                          <li>• This service will be removed from all future bookings</li>
                          <li>• Existing jobs with this service will be affected</li>
                          <li>• This action cannot be undone</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Error Display */}
                {error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <AlertCircle className="w-4 h-4 text-red-600" />
                      <p className="text-sm text-red-800">{error}</p>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
                  <button
                    onClick={cancelDelete}
                    disabled={deleteLoading === serviceToDelete.id}
                    className="flex-1 sm:flex-none px-6 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmDelete}
                    disabled={deleteLoading === serviceToDelete.id}
                    className="flex-1 sm:flex-none px-6 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                  >
                    {deleteLoading === serviceToDelete.id ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Deleting...</span>
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4" />
                        <span>Delete Service</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Category Delete Confirmation Modal */}
        {categoryDeleteModalOpen && categoryToDelete && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 transform transition-all duration-300 ease-out">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-red-100 rounded-full">
                    <Trash2 className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Delete Category</h3>
                    <p className="text-sm text-gray-500">This action cannot be undone</p>
                  </div>
                </div>
                <button 
                  onClick={handleCancelCategoryDelete} 
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                  disabled={deletingCategory}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6">
                <div className="mb-4">
                  <p className="text-gray-700 mb-2">
                    Are you sure you want to delete the category <strong>"{categoryToDelete.name}"</strong>?
                  </p>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="flex items-start space-x-2">
                      <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      <div className="text-sm text-blue-800">
                        <p className="font-medium">Note:</p>
                        <p className="mt-1">All services in this category will be moved to "Uncategorized" and will remain available for booking.</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
                  <button
                    onClick={handleCancelCategoryDelete}
                    disabled={deletingCategory}
                    className="flex-1 sm:flex-none px-6 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmCategoryDelete}
                    disabled={deletingCategory}
                    className="flex-1 sm:flex-none px-6 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                  >
                    {deletingCategory ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Deleting...</span>
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4" />
                        <span>Delete Category</span>
                      </>
                    )}
                  </button>
                </div>
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

        {/* Duplicate Success Modal */}
        {duplicateSuccessModalOpen && duplicatedService && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 transform transition-all duration-300 ease-out">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-green-100 rounded-full">
                    <Copy className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Service Duplicated!</h3>
                    <p className="text-sm text-gray-500">Your service has been successfully duplicated</p>
                  </div>
                </div>
                <button 
                  onClick={() => setDuplicateSuccessModalOpen(false)} 
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6">
                <div className="mb-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <div className="flex items-start space-x-2">
                      <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="text-sm text-green-800">
                        <p className="font-medium">All service data has been copied:</p>
                        <ul className="mt-1 space-y-1 text-xs">
                          <li>• Service details and pricing</li>
                          <li>• Modifiers and options</li>
                          <li>• Intake questions</li>
                          <li>• Category assignment</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
                  <button
                    onClick={() => setDuplicateSuccessModalOpen(false)}
                    className="flex-1 sm:flex-none px-6 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500 transition-colors"
                  >
                    Stay Here
                  </button>
                  <button
                    onClick={() => {
                      setDuplicateSuccessModalOpen(false);
                      navigate(`/services/${duplicatedService.id}`);
                    }}
                    className="flex-1 sm:flex-none px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors flex items-center justify-center space-x-2"
                  >
                    <Copy className="w-4 h-4" />
                    <span>View Duplicated Service</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
    </div>
  )
}

export default ServiceFlowServices