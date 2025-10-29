"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import Sidebar from "../components/sidebar"
import MobileHeader from "../components/mobile-header"
import { GripVertical, Wrench, Plus, AlertCircle, AlertTriangle, Loader2, Trash2, X, Copy, Edit, Eye, EyeOff } from "lucide-react"
import CreateServiceModal from "../components/create-service-modal"
import ServiceTemplatesModal from "../components/service-templates-modal"
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
  const [categoryEditModalOpen, setCategoryEditModalOpen] = useState(false)
  const [categoryToEdit, setCategoryToEdit] = useState(null)
  const [editingCategory, setEditingCategory] = useState(false)

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
      // Fetch services first
      const servicesResponse = await servicesAPI.getAll(user.id)
      const servicesArray = normalizeAPIResponse(servicesResponse, 'services')
      const sortedServices = servicesArray.sort((a, b) => a.name.localeCompare(b.name))
      setServices(sortedServices)

      // Try to fetch categories, but handle 404 gracefully
      try {
        const categoriesResponse = await servicesAPI.getServiceCategories(user.id)
        const categoryNames = categoriesResponse.map(cat => cat.name)
        setCategories(categoryNames)
        setCategoryObjects(categoriesResponse)

        // Update services to properly map to category names
        const updatedServices = sortedServices.map(service => {
          if (service.category && service.category.trim() !== '') {
            const matchingCategory = categoriesResponse.find(cat => cat.name === service.category)
            if (matchingCategory) {
              return { ...service, category: matchingCategory.name }
            }
          }
          return service
        })
        setServices(updatedServices)
      } catch (categoriesError) {
        // Fallback: Extract categories from services
        const uniqueCategories = [...new Set(sortedServices.map(service => service.category).filter(cat => cat && cat.trim() !== ''))]
        setCategories(uniqueCategories)
        setCategoryObjects([])
      }
    } catch (error) {
      const errorInfo = handleAPIError(error, 'Services fetch')
      setError(`Failed to load services: ${errorInfo.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateService = async (serviceData) => {
    if (!user?.id) {
      setError("Please log in again to create services.");
      return;
    }

    try {
      setError("")
      let imageUrl = null;
      if (serviceData.image) {
        try {
          const formData = new FormData();
          formData.append('image', serviceData.image);

          const uploadResponse = await fetch('https://service-flow-backend-production-4568.up.railway.app/api/upload-service-image', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            },
            body: formData
          });

          if (uploadResponse.ok) {
            const uploadResult = await uploadResponse.json();
            imageUrl = uploadResult.imageUrl;
          }
        } catch (uploadError) {}
      }

      const durationInMinutes = (serviceData.duration.hours * 60) + serviceData.duration.minutes

      const newService = {
        userId: user.id,
        name: serviceData.name,
        description: serviceData.description || "",
        price: serviceData.isFree ? 0 : parseFloat(serviceData.price) || 0,
        duration: durationInMinutes,
        category: serviceData.category || "",
        modifiers: JSON.stringify([]),
        isFree: serviceData.isFree,
        image: imageUrl
      }

      const response = await servicesAPI.create(newService)
      const newServiceData = response.service || response
      setServices(prev => [newServiceData, ...prev])

      if (newServiceData.category && newServiceData.category.trim() !== '') {
        setCategories(prev => {
          const categoryExists = prev.includes(newServiceData.category);
          if (!categoryExists) {
            return [...prev, newServiceData.category];
          }
          return prev;
        });
      }

      setCreateModalOpen(false)
      navigate(`/services/${newServiceData.id}`)
    } catch (error) {
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
      setServices(prev => prev.filter(service => service.id !== serviceToDelete.id))
      setDeleteModalOpen(false)
      setServiceToDelete(null)
    } catch (error) {
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
      setDeleteLoading(service.id);
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
      const duplicatedService = await servicesAPI.create(duplicateData);
      setDuplicatedService(duplicatedService);
      await fetchServices();
      setDuplicateSuccessModalOpen(true);
    } catch (error) {
      alert('Failed to duplicate service. Please try again.');
    } finally {
      setDeleteLoading(null);
    }
  }

  const handleServiceEdit = (service) => {
    navigate(`/service/${service.id}/edit`)
  }

  const fixCategoryMapping = async () => {}
  const autoFixCategoryMapping = async () => {}

  const handleRetry = () => {
    fetchServices()
  }

  const handleAddCategory = async () => {
    if (!newCategoryName.trim() || !user?.id) return
    const trimmedName = newCategoryName.trim()
    const categoryExists = categories.some(cat => cat.toLowerCase() === trimmedName.toLowerCase())
    if (categoryExists) {
      setError(`Category "${trimmedName}" already exists. Please choose a different name.`)
      return
    }
    try {
      setError("")
      try {
        const categoryData = {
          userId: user.id,
          name: trimmedName,
          description: `${trimmedName} services`,
          color: '#3B82F6'
        }
        const newCategory = await servicesAPI.createCategory(categoryData)
        setCategories(prev => [...prev, newCategory.name])
        setCategoryObjects(prev => [...prev, newCategory])
      } catch (apiError) {
        if (apiError.response?.status === 400 && apiError.response?.data?.error?.includes('already exists')) {
          setError(`Category "${trimmedName}" already exists. Please choose a different name.`)
          return
        }
        setCategories(prev => [...prev, trimmedName])
      }
      setNewCategoryName("")
      setShowAddCategoryModal(false)
    } catch (error) {
      setError("Failed to add category. Please try again.")
    }
  }

  const handleMoveServiceToCategory = async (serviceId, newCategory) => {
    try {
      const service = services.find(s => s.id === serviceId)
      if (!service) return
      const updateData = {
        name: service.name,
        description: service.description,
        price: service.price,
        duration: service.duration,
        category: newCategory,
        image: service.image,
        require_payment_method: service.require_payment_method,
        is_active: service.is_active,
        category_id: service.category_id
      }
      if (service.modifiers !== null && service.modifiers !== undefined) {
        updateData.modifiers = service.modifiers;
      }
      if (service.intake_questions !== null && service.intake_questions !== undefined) {
        updateData.intake_questions = service.intake_questions;
      }
      await servicesAPI.update(serviceId, updateData)
      setServices(prev => prev.map(s =>
        s.id === serviceId ? { ...s, category: newCategory } : s
      ))
    } catch (error) {
      setError("Failed to move service to category. Please try again.")
    }
  }

  const handleRemoveCategory = (categoryName) => {
    const categoryObject = categoryObjects.find(cat => cat.name === categoryName);
    if (!categoryObject) {
      setError('Category not found. Please refresh the page and try again.');
      return;
    }
    setCategoryToDelete({ name: categoryName, object: categoryObject });
    setCategoryDeleteModalOpen(true);
  }

  const handleConfirmCategoryDelete = async () => {
    if (!categoryToDelete) return;
    try {
      setDeletingCategory(true);
      setError('');
      const { name: categoryName, object: categoryObject } = categoryToDelete;
      const servicesInCategory = services.filter(s => s.category === categoryName);
      for (const service of servicesInCategory) {
        await handleMoveServiceToCategory(service.id, "");
      }
      await servicesAPI.deleteCategory(categoryObject.id);
      setCategories(prev => prev.filter(cat => cat !== categoryName));
      setCategoryObjects(prev => prev.filter(cat => cat.name !== categoryName));
      setCategoryDeleteModalOpen(false);
      setCategoryToDelete(null);
    } catch (error) {
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
    setCategoryDeleteModalOpen(false);
    setCategoryToDelete(null);
  }

  const handleEditCategory = (categoryName) => {
    const categoryObject = categoryObjects.find(cat => cat.name === categoryName);
    if (!categoryObject) {
      setError('Category not found. Please refresh the page and try again.');
      return;
    }
    setCategoryToEdit({ name: categoryName, object: categoryObject });
    setCategoryEditModalOpen(true);
  }

  const handleConfirmCategoryEdit = async () => {
    if (!categoryToEdit) return;
    try {
      setEditingCategory(true);
      setError('');
      const { name: oldCategoryName, object: categoryObject } = categoryToEdit;
      const newCategoryName = categoryObject.name;
      await servicesAPI.updateCategory(categoryObject.id, { name: newCategoryName });
      const servicesInCategory = services.filter(s => s.category === oldCategoryName);
      for (const service of servicesInCategory) {
        await handleMoveServiceToCategory(service.id, newCategoryName);
      }
      setCategories(prev => prev.map(cat => cat === oldCategoryName ? newCategoryName : cat));
      setCategoryObjects(prev => prev.map(cat =>
        cat.name === oldCategoryName ? { ...cat, name: newCategoryName } : cat
      ));
      setCategoryEditModalOpen(false);
      setCategoryToEdit(null);
    } catch (error) {
      if (error.response?.data?.error) {
        setError(error.response.data.error);
      } else {
        setError('Failed to update category. Please try again.');
      }
    } finally {
      setEditingCategory(false);
    }
  }

  const handleCancelCategoryEdit = () => {
    setCategoryEditModalOpen(false);
    setCategoryToEdit(null);
  }

  // Drag and drop handlers
  const handleDragStart = (e, service) => {
    setDraggedService(service)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/html', e.target.outerHTML)
    e.target.style.opacity = '0.5'
    e.target.style.transform = 'scale(0.95)'
    const dragImage = e.target.cloneNode(true)
    dragImage.style.opacity = '0.8'
    dragImage.style.transform = 'scale(0.9)'
    document.body.appendChild(dragImage)
    e.dataTransfer.setDragImage(dragImage, 0, 0)
    setTimeout(() => {
      document.body.removeChild(dragImage)
    }, 0)
  }

  const handleDragOver = (e, category) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
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
      const newCategory = targetCategory === 'No category' ? '' : targetCategory
      await handleMoveServiceToCategory(draggedService.id, newCategory)
      setDraggedService(null)
    } catch (error) {
      setError("Failed to move service. Please try again.")
    }
  }

  // Service Card UI
  const renderServiceCard = (service) => (
    <div
      key={service.id}
      draggable
      onDragStart={(e) => handleDragStart(e, service)}
      onDragEnd={handleDragEnd}
      onClick={() => handleServiceClick(service.id)}
      className={`flex items-center justify-between px-4 py-3 transition-all duration-200 bg-white cursor-pointer ${
        draggedService?.id === service.id ? 'opacity-50 scale-95' : 'hover:bg-gray-50'
      } border-b last:border-b-0`}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <GripVertical className="w-5 h-5 text-gray-300 cursor-move hover:text-gray-400 transition-colors flex-shrink-0" title="Drag to move service" />
        {service.image ? (
          <img
            src={getImageUrl(service.image)}
            alt={service.name}
            className="w-9 h-9 object-cover rounded flex-shrink-0"
            onError={(e) => handleImageError(e, null)}
          />
        ) : (
          <div className="w-9 h-9 flex items-center justify-center bg-gray-100 rounded flex-shrink-0">
            <Wrench className="w-4 h-4 text-gray-400" />
          </div>
        )}
        <div className="flex flex-col min-w-0">
          <span className="font-medium text-gray-900 text-sm truncate">{service.name}</span>
          <span className="text-xs text-gray-500">{service.price > 0 ? `${service.price}` : 'Free'}</span>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0 ml-4">
        <button
          onClick={(e) => {
            e.stopPropagation()
            handleServiceClick(service.id)
          }}
          className="p-1 rounded hover:bg-gray-100"
          title="Edit"
          tabIndex={-1}
          type="button"
        >
          <Edit className="w-5 h-5 text-gray-500" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation()
            handleDuplicateService(service)
          }}
          disabled={deleteLoading === service.id}
          className="p-1 rounded hover:bg-gray-100 disabled:opacity-50"
          title="Copy"
          tabIndex={-1}
          type="button"
        >
          {deleteLoading === service.id ? (
            <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
          ) : (
            <Copy className="w-5 h-5 text-gray-500" />
          )}
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation()
            handleDeleteService(service.id)
          }}
          disabled={deleteLoading === service.id}
          className="p-1 rounded hover:bg-red-50 disabled:opacity-50"
          title="Delete"
          tabIndex={-1}
          type="button"
        >
          {deleteLoading === service.id ? (
            <Loader2 className="w-5 h-5 animate-spin text-red-400" />
          ) : (
            <Trash2 className="w-5 h-5 text-red-500" />
          )}
        </button>
      </div>
    </div>
  );

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
          <div className="max-w-5xl mx-auto p-6">
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
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm mb-6">
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
                  {categoriesEnabled ? (() => {
                    const categorizedServices = services.filter(s => {
                      if (!s.category || s.category.trim() === '') return false
                      return categories.includes(s.category)
                    })
                    const uncategorizedServices = services.filter(s => {
                      if (!s.category || s.category.trim() === '') return true
                      return !categories.includes(s.category)
                    })
                    const allCategories = [...categories]
                    if (uncategorizedServices.length > 0) {
                      allCategories.push('No category')
                    }
                    const sortedCategories = allCategories.sort((a, b) => {
                      const aServices = a === 'No category'
                        ? uncategorizedServices
                        : services.filter(s => s.category && s.category.trim() === a)
                      const bServices = b === 'No category'
                        ? uncategorizedServices
                        : services.filter(s => s.category && s.category.trim() === b)
                      const aCount = aServices.length
                      const bCount = bServices.length
                      if ((aCount > 0 && bCount > 0) || (aCount === 0 && bCount === 0)) {
                        return allCategories.indexOf(a) - allCategories.indexOf(b)
                      }
                      if (aCount > 0 && bCount === 0) return -1
                      if (aCount === 0 && bCount > 0) return 1
                      return 0
                    })
                    return sortedCategories.map(category => {
                      const categoryServices = category === 'No category'
                        ? uncategorizedServices
                        : services.filter(s => s.category && s.category.trim() === category)
                      return (
                        <div
                          key={category}
                          className={`border-b border-gray-200 last:border-b-0 transition-all duration-200 relative ${
                            dragOverCategory === category ? 'bg-blue-50 border-2 border-blue-200' : ''
                          }`}
                          onDragOver={(e) => handleDragOver(e, category)}
                          onDragLeave={handleDragLeave}
                          onDrop={(e) => handleDrop(e, category)}
                        >
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
                              {category !== 'No category' && (
                                <div className="flex items-center space-x-1">
                                  <button
                                    onClick={() => handleEditCategory(category)}
                                    className="p-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
                                    title="Edit category name"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleRemoveCategory(category)}
                                    className="p-1 text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                                    title="Delete category"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                          {categoryServices.length === 0 && (
                            <div className="px-4 py-6 text-center text-gray-500">
                              <p>No services in this category yet.</p>
                              <p className="text-sm mt-1">Drag services here or create new ones to get started.</p>
                            </div>
                          )}
                          {categoryServices.map((service, index) => renderServiceCard(service))}
                        </div>
                      )
                    })
                  })() : (
                    services.map((service, index) => renderServiceCard(service))
                  )}
                </div>
              )}
            </div>

            {/* Service Categories */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h3 className="text-base font-semibold text-gray-900 mb-1">Service categories</h3>
                  <p className="text-sm text-gray-600">
                    Service categories allow you to organize your services into groups for your booking page.{" "}
                    <button className="text-blue-600 hover:text-blue-700 font-medium">Learn more</button>
                  </p>
                </div>
                <div className="flex-shrink-0">
                  <button
                    onClick={async () => {
                      const newCategoriesEnabled = !categoriesEnabled
                      updateServiceSettings({ categoriesEnabled: newCategoriesEnabled })
                      try {
                        await saveServiceSettings({ categoriesEnabled: newCategoriesEnabled })
                      } catch (error) {}
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
                <div className="space-y-4 mt-6">
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

      {deleteModalOpen && serviceToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 transform transition-all duration-300 ease-out">
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
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 text-red-600" />
                    <p className="text-sm text-red-800">{error}</p>
                  </div>
                </div>
              )}
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

      {categoryDeleteModalOpen && categoryToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 transform transition-all duration-300 ease-out">
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

      {categoryEditModalOpen && categoryToEdit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 transform transition-all duration-300 ease-out">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-full">
                  <Edit className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Edit Category</h3>
                  <p className="text-sm text-gray-500">Update category name</p>
                </div>
              </div>
              <button
                onClick={handleCancelCategoryEdit}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                disabled={editingCategory}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category Name
                </label>
                <input
                  type="text"
                  value={categoryToEdit.object.name}
                  onChange={(e) => {
                    setCategoryToEdit(prev => ({
                      ...prev,
                      object: { ...prev.object, name: e.target.value }
                    }));
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter category name"
                  disabled={editingCategory}
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
                <button
                  onClick={handleCancelCategoryEdit}
                  disabled={editingCategory}
                  className="flex-1 sm:flex-none px-6 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmCategoryEdit}
                  disabled={editingCategory || !categoryToEdit.object.name.trim()}
                  className="flex-1 sm:flex-none px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {editingCategory ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Updating...</span>
                    </>
                  ) : (
                    <>
                      <Edit className="w-4 h-4" />
                      <span>Update Category</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showAddCategoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-sm w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Add Category</h3>
              <button onClick={() => setShowAddCategoryModal(false)} className="text-gray-500 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>
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
                  setError("")
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

      {duplicateSuccessModalOpen && duplicatedService && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 transform transition-all duration-300 ease-out">
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
