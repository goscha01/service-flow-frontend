import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Helper to decode JWT and check expiration
  const isTokenExpired = (token) => {
    if (!token) return true;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (!payload.exp) return true;
      return Date.now() >= payload.exp * 1000;
    } catch (e) {
      return true;
    }
  };

  useEffect(() => {
    // Check if user is already logged in on app start
    const checkAuthStatus = async () => {
      const token = localStorage.getItem('authToken');
      const userData = localStorage.getItem('user');
      
      if (token && userData && !isTokenExpired(token)) {
        try {
          const basicUserData = JSON.parse(userData);
          setUser(basicUserData);
          
          // Load full user profile including profile picture
          try {
            const { userProfileAPI } = await import('../services/api');
            const fullProfile = await userProfileAPI.getProfile(basicUserData.id);
            console.log('🔍 AuthContext: Full profile loaded:', fullProfile);
            setUser(fullProfile);
            // Update localStorage with full profile data
            localStorage.setItem('user', JSON.stringify(fullProfile));
          } catch (profileError) {
            console.error('Error loading full user profile:', profileError);
            // Keep using basic user data if profile loading fails
          }
        } catch (error) {
          console.error('Error parsing user data:', error);
          authAPI.signout();
        }
      } else {
        authAPI.signout();
        setUser(null);
      }
      setLoading(false);
    };

    checkAuthStatus();
  }, []);

  const login = async (credentials) => {
    try {
      const response = await authAPI.signin(credentials);
      const userData = response.user;
      const token = response.token;
      
      // Store user data and token
      localStorage.setItem('authToken', token);
      localStorage.setItem('user', JSON.stringify(userData));
      
      setUser(userData);
      return { success: true, user: userData };
    } catch (error) {
      throw error;
    }
  };

  const signup = async (userData) => {
    try {
      const response = await authAPI.signup(userData);
      const newUser = response.user;
      const token = response.token;
      
      // Store user data and token
      localStorage.setItem('authToken', token);
      localStorage.setItem('user', JSON.stringify(newUser));
      
      setUser(newUser);
      return { success: true, user: newUser };
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    authAPI.signout();
    setUser(null);
  };

  const updateUserProfile = (updatedProfile) => {
    // Ensure both business name fields are present for consistency
    const syncedProfile = {
      ...updatedProfile,
      businessName: updatedProfile.businessName || updatedProfile.business_name,
      business_name: updatedProfile.business_name || updatedProfile.businessName
    };
    
    console.log('🔍 AuthContext: Updating user profile with synced data:', syncedProfile);
    setUser(syncedProfile);
    localStorage.setItem('user', JSON.stringify(syncedProfile));
  };

  const refreshUserProfile = async () => {
    try {
      if (!user?.id) return;
      
      const { userProfileAPI } = await import('../services/api');
      const freshProfile = await userProfileAPI.getProfile(user.id);
      
      // Ensure both business name fields are present
      const syncedProfile = {
        ...freshProfile,
        businessName: freshProfile.businessName || freshProfile.business_name,
        business_name: freshProfile.business_name || freshProfile.businessName
      };
      
      console.log('🔍 AuthContext: Refreshing user profile with fresh data:', syncedProfile);
      setUser(syncedProfile);
      localStorage.setItem('user', JSON.stringify(syncedProfile));
      
      return syncedProfile;
    } catch (error) {
      console.error('Error refreshing user profile:', error);
      throw error;
    }
  };

  // Listen for token expiration on every page load and API error
  useEffect(() => {
    const interval = setInterval(() => {
      const token = localStorage.getItem('authToken');
      if (token && isTokenExpired(token)) {
        logout();
        window.location.href = '/signin';
      }
    }, 60 * 1000); // check every minute
    return () => clearInterval(interval);
  }, []);

  const isAuthenticated = () => {
    return !!user;
  };

  const value = {
    user,
    loading,
    login,
    signup,
    logout,
    updateUserProfile,
    refreshUserProfile,
    isAuthenticated
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 