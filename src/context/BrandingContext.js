"use client"

import { createContext, useContext, useState, useEffect } from 'react';
import { brandingAPI } from '../services/api';
import { useAuth } from './AuthContext';

const BrandingContext = createContext();

export const useBranding = () => {
  const context = useContext(BrandingContext);
  if (!context) {
    throw new Error('useBranding must be used within a BrandingProvider');
  }
  return context;
};

export const BrandingProvider = ({ children }) => {
  const { user } = useAuth();
  const [branding, setBranding] = useState({
    logo: null,
    showLogoInAdmin: false,
    primaryColor: "#4CAF50",
    headerBackground: "#ffffff",
    headerIcons: "#4CAF50",
    hideServiceflowBranding: false,
    favicon: null,
    heroImage: null
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load branding from database when user changes
  useEffect(() => {
    if (user?.id) {
      loadBrandingFromDatabase();
    } else {
      setLoading(false);
    }
  }, [user?.id]);

  const loadBrandingFromDatabase = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const brandingData = await brandingAPI.getBranding(user.id);
      
      // Merge with default values
      setBranding(prev => ({
        ...prev,
        ...brandingData
      }));
      
      // Also save to localStorage for backward compatibility
      localStorage.setItem('branding', JSON.stringify({
        ...branding,
        ...brandingData
      }));
      
    } catch (error) {
      console.error('Error loading branding from database:', error);
      setError('Failed to load branding settings');
      
      // Fallback to localStorage if database fails
      try {
        const savedBranding = localStorage.getItem('branding');
        if (savedBranding) {
          setBranding(JSON.parse(savedBranding));
        }
      } catch (localError) {
        console.error('Error loading branding from localStorage:', localError);
      }
    } finally {
      setLoading(false);
    }
  };

  const updateBranding = async (newBranding) => {
    try {
      setError(null);
      
      // Update local state immediately
      setBranding(prev => ({ ...prev, ...newBranding }));
      
      // Save to database
      await brandingAPI.updateBranding({
        userId: user.id,
        ...newBranding
      });
      
      // Also save to localStorage for backward compatibility
      localStorage.setItem('branding', JSON.stringify({
        ...branding,
        ...newBranding
      }));
      
      return { success: true };
    } catch (error) {
      console.error('Error updating branding:', error);
      setError('Failed to update branding settings');
      return { success: false, error: error.message };
    }
  };

  const value = {
    branding,
    loading,
    error,
    updateBranding,
    reloadBranding: loadBrandingFromDatabase
  };

  return (
    <BrandingContext.Provider value={value}>
      {children}
    </BrandingContext.Provider>
  );
};
