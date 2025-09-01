import React, { useState, useEffect } from 'react';
import { Trash2, Edit, Plus, X } from 'lucide-react';
import { servicesAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

const CategoryManagement = ({ onCategoryChange }) => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { user } = useAuth();

  useEffect(() => {
    if (user?.id) {
      loadCategories();
    }
  }, [user?.id]);

  const loadCategories = async () => {
    try {
      setLoading(true);
      setError('');
      const categoriesData = await servicesAPI.getServiceCategories(user.id);
      
      // Sort categories by creation date - newest at the bottom
      const sortedCategories = categoriesData.sort((a, b) => {
        const dateA = new Date(a.created_at || a.createdAt || 0);
        const dateB = new Date(b.created_at || b.createdAt || 0);
        return dateA - dateB; // Oldest first, newest last
      });
      
      setCategories(sortedCategories);
    } catch (error) {
      console.error('Error loading categories:', error);
      setError('Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCategory = async (categoryId, categoryName) => {
    if (!window.confirm(`Are you sure you want to delete the category "${categoryName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      setDeleting(true);
      setError('');
      setSuccess('');

      const result = await servicesAPI.deleteCategory(categoryId);
      
      // Show the message from the server response
      const successMessage = result.message || `Category "${categoryName}" deleted successfully`;
      setSuccess(successMessage);
      setCategories(prev => prev.filter(cat => cat.id !== categoryId));
      
      // Notify parent component about the change
      if (onCategoryChange) {
        onCategoryChange();
      }

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error deleting category:', error);
      
      if (error.response?.data?.error) {
        setError(error.response.data.error);
      } else {
        setError('Failed to delete category');
      }
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Loading categories...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
          {error}
        </div>
      )}
      
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-green-700 text-sm">
          {success}
        </div>
      )}

      {/* Categories List */}
      <div className="space-y-2">
        <h3 className="text-lg font-medium text-gray-900">Service Categories</h3>
        
        {categories.length === 0 ? (
          <p className="text-gray-500 text-sm">No categories found. Create your first category when creating a service.</p>
        ) : (
          <div className="space-y-2">
            {categories.map((category, index) => (
              <div
                key={category.id}
                className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-400 font-mono">#{index + 1}</span>
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: category.color || '#3B82F6' }}
                    ></div>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">{category.name}</h4>
                    {category.description && (
                      <p className="text-sm text-gray-500">{category.description}</p>
                    )}
                    <p className="text-xs text-gray-400">
                      {category.serviceCount || 0} services
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleDeleteCategory(category.id, category.name)}
                    disabled={deleting}
                    className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                    title="Delete category"
                  >
                    {deleting ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Refresh Button */}
      <div className="flex justify-end">
        <button
          onClick={loadCategories}
          disabled={loading}
          className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors disabled:opacity-50"
        >
          Refresh
        </button>
      </div>
    </div>
  );
};

export default CategoryManagement;
