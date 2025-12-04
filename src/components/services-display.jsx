import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, GripVertical, Wrench, Copy } from 'lucide-react';
import { servicesAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { getImageUrl, handleImageError } from '../utils/imageUtils';
import { safeDecodeText } from '../utils/htmlUtils';

const ServicesDisplay = ({ 
  services = [], 
  categories = [], 
  onServiceDelete, 
  onServiceEdit,
  onCreateService,
  onCategoryChange 
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(null);

  // Sort categories by creation date - newest at the bottom
  const sortedCategories = [...categories].sort((a, b) => {
    const dateA = new Date(a.created_at || a.createdAt || 0);
    const dateB = new Date(b.created_at || b.createdAt || 0);
    return dateA - dateB; // Oldest first, newest last
  });

  // Group services by category
  const servicesByCategory = {};
  const uncategorizedServices = [];

  services.forEach(service => {
    if (service.category && service.category.trim() !== '') {
      if (!servicesByCategory[service.category]) {
        servicesByCategory[service.category] = [];
      }
      servicesByCategory[service.category].push(service);
    } else {
      uncategorizedServices.push(service);
    }
  });

  // Sort services within each category by creation date - newest first
  Object.keys(servicesByCategory).forEach(category => {
    servicesByCategory[category].sort((a, b) => {
      const dateA = new Date(a.created_at || a.createdAt || 0);
      const dateB = new Date(b.created_at || b.createdAt || 0);
      return dateB - dateA; // Newest first
    });
  });

  // Sort uncategorized services by creation date - newest first
  uncategorizedServices.sort((a, b) => {
    const dateA = new Date(a.created_at || a.createdAt || 0);
    const dateB = new Date(b.created_at || b.createdAt || 0);
    return dateB - dateA; // Newest first
  });

  const handleDeleteService = async (serviceId, serviceName) => {
    if (!window.confirm(`Are you sure you want to delete the service "${serviceName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      setDeleteLoading(serviceId);
      await servicesAPI.deleteService(serviceId);
      
      if (onServiceDelete) {
        onServiceDelete(serviceId);
      }
    } catch (error) {
      console.error('Error deleting service:', error);
      alert('Failed to delete service. Please try again.');
    } finally {
      setDeleteLoading(null);
    }
  };

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
      
      // Refresh the services list
      if (onServiceDelete) {
        // Trigger a refresh by calling the parent's refresh function
        // We'll use onServiceDelete as a refresh trigger since it's available
        onServiceDelete(null); // Pass null to indicate refresh
      }
      
      alert('Service duplicated successfully!');
      
    } catch (error) {
      console.error('Error duplicating service:', error);
      alert('Failed to duplicate service. Please try again.');
    } finally {
      setDeleteLoading(null);
    }
  };

  const renderServiceCard = (service) => (
    <div
      key={service.id}
      className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3 flex-1">
          {/* Service Image */}
          <div className="flex-shrink-0">
            {service.image ? (
              <img
                src={getImageUrl(service.image)}
                alt={safeDecodeText(service.name) || 'Service'}
                onError={handleImageError}
                className="w-16 h-16 object-cover rounded-lg border border-gray-200"
              />
            ) : (
              <div className="w-16 h-16 bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center">
                <Wrench className="w-8 h-8 text-gray-400" />
              </div>
            )}
          </div>

          {/* Service Details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-lg font-semibold text-gray-900" title={safeDecodeText(service.name)}>
                {safeDecodeText(service.name) || 'Unnamed Service'}
              </h3>
              <button
                onClick={() => handleDuplicateService(service)}
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
              <p className="text-sm text-gray-600 mb-2 line-clamp-2" title={safeDecodeText(service.description)}>
                {safeDecodeText(service.description)}
              </p>
            )}
            
            <div className="flex items-center space-x-4 text-sm text-gray-500">
              {service.price && (
                <span className="flex items-center">
                  <span className="font-medium text-green-600">${service.price}</span>
                </span>
              )}
              {service.duration && (
                <span className="flex items-center">
                  <span>{service.duration} min</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-2 ml-4">
          <button
            onClick={() => onServiceEdit && onServiceEdit(service)}
            className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
            title="Edit service"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleDeleteService(service.id, service.name)}
            disabled={deleteLoading === service.id}
            className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
            title="Delete service"
          >
            {deleteLoading === service.id ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      {/* Uncategorized Services Section - At the top, newest first */}
      {uncategorizedServices.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Uncategorized Services</h2>
            <span className="text-sm text-gray-500">{uncategorizedServices.length} services</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {uncategorizedServices.map(renderServiceCard)}
          </div>
        </div>
      )}

      {/* Categories and Services - Newest categories at the bottom */}
      {sortedCategories.map((category, categoryIndex) => {
        const categoryServices = servicesByCategory[category.name] || [];
        
        if (categoryServices.length === 0) return null;

        return (
          <div key={category.id || categoryIndex} className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: category.color || '#3B82F6' }}
                ></div>
                <h2 className="text-xl font-semibold text-gray-900">{category.name}</h2>
                <span className="text-sm text-gray-500">({categoryServices.length} services)</span>
              </div>
              <span className="text-xs text-gray-400 font-mono">Category #{categoryIndex + 1}</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categoryServices.map(renderServiceCard)}
            </div>
          </div>
        );
      })}

      {/* Empty State */}
      {services.length === 0 && (
        <div className="text-center py-12">
          <Wrench className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No services yet</h3>
          <p className="text-gray-500 mb-4">Create your first service to get started</p>
          <button
            onClick={onCreateService}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4 inline mr-2" />
            Create Service
          </button>
        </div>
      )}
    </div>
  );
};

export default ServicesDisplay;
