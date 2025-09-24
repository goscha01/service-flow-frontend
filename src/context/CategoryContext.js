import React, { createContext, useContext, useState, useEffect } from 'react';

const CategoryContext = createContext();

export const useCategory = () => {
  const context = useContext(CategoryContext);
  if (!context) {
    throw new Error('useCategory must be used within a CategoryProvider');
  }
  return context;
};

export const CategoryProvider = ({ children }) => {
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [selectedCategoryName, setSelectedCategoryName] = useState('');
  const [categories, setCategories] = useState([]);

  // Load category preference from localStorage on mount
  useEffect(() => {
    const savedCategoryId = localStorage.getItem('selectedCategoryId');
    const savedCategoryName = localStorage.getItem('selectedCategoryName');
    
    if (savedCategoryId && savedCategoryName) {
      setSelectedCategoryId(savedCategoryId);
      setSelectedCategoryName(savedCategoryName);
    }
  }, []);

  // Save category preference to localStorage when it changes
  useEffect(() => {
    if (selectedCategoryId && selectedCategoryName) {
      localStorage.setItem('selectedCategoryId', selectedCategoryId);
      localStorage.setItem('selectedCategoryName', selectedCategoryName);
    }
  }, [selectedCategoryId, selectedCategoryName]);

  const selectCategory = (categoryId, categoryName) => {
    setSelectedCategoryId(categoryId);
    setSelectedCategoryName(categoryName);
  };

  const clearCategory = () => {
    setSelectedCategoryId(null);
    setSelectedCategoryName('');
    localStorage.removeItem('selectedCategoryId');
    localStorage.removeItem('selectedCategoryName');
  };

  const value = {
    selectedCategoryId,
    selectedCategoryName,
    categories,
    setCategories,
    selectCategory,
    clearCategory
  };

  return (
    <CategoryContext.Provider value={value}>
      {children}
    </CategoryContext.Provider>
  );
};
