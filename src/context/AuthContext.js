import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
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
  const location = useLocation();
  const pollingIntervalRef = useRef(null);
  const lastFetchedRef = useRef(null);
  const isPollingEnabledRef = useRef(true);

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
            // Initialize last fetched timestamp
            lastFetchedRef.current = Date.now();
          } catch (profileError) {
            console.error('Error loading full user profile:', profileError);
            // Keep using basic user data if profile loading fails
            lastFetchedRef.current = Date.now();
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
      lastFetchedRef.current = Date.now();
      return { success: true, user: userData };
    } catch (error) {
      throw error;
    }
  };

  const loginWithGoogle = async (googleResponse) => {
    try {
      // Google OAuth response already contains user data and token
      const userData = googleResponse.user;
      const token = googleResponse.token;
      
      // Store user data and token
      localStorage.setItem('authToken', token);
      localStorage.setItem('user', JSON.stringify(userData));
      
      setUser(userData);
      lastFetchedRef.current = Date.now();
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
      lastFetchedRef.current = Date.now();
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

  const refreshUserProfile = async (silent = false) => {
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
      
      // Compare roles and permissions to detect changes
      const hasRoleChanged = user.role !== syncedProfile.role || 
                            user.teamMemberRole !== syncedProfile.teamMemberRole;
      
      // Compare permissions (handle both object and string formats)
      const currentPermissions = typeof user.permissions === 'string' 
        ? JSON.parse(user.permissions || '{}') 
        : (user.permissions || {});
      const newPermissions = typeof syncedProfile.permissions === 'string'
        ? JSON.parse(syncedProfile.permissions || '{}')
        : (syncedProfile.permissions || {});
      
      const permissionsChanged = JSON.stringify(currentPermissions) !== JSON.stringify(newPermissions);
      
      if (hasRoleChanged || permissionsChanged) {
        if (!silent) {
          console.log('🔄 AuthContext: Role or permissions changed, updating user profile');
          console.log('🔄 Role changed:', hasRoleChanged);
          console.log('🔄 Permissions changed:', permissionsChanged);
        }
        
        // Update user state
        setUser(syncedProfile);
        localStorage.setItem('user', JSON.stringify(syncedProfile));
        
        // Update last fetched timestamp
        lastFetchedRef.current = Date.now();
        
        // Optionally show a notification to user about permission changes
        if (!silent && (hasRoleChanged || permissionsChanged)) {
          // You can add a toast notification here if needed
          console.log('✅ User role/permissions updated successfully');
        }
      } else {
        // Even if nothing changed, update the timestamp
        lastFetchedRef.current = Date.now();
        if (!silent) {
          console.log('🔍 AuthContext: User profile refreshed (no changes detected)');
        }
      }
      
      return syncedProfile;
    } catch (error) {
      console.error('Error refreshing user profile:', error);
      if (!silent) {
        throw error;
      }
      return null;
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

  // Poll for role/permission updates every 5 minutes
  useEffect(() => {
    if (!user?.id) {
      // Clear any existing polling if user logs out
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      return;
    }

    // Only start polling if it's not already running
    if (!pollingIntervalRef.current && isPollingEnabledRef.current) {
      console.log('🔄 AuthContext: Starting role/permission polling (every 5 minutes)');
      
      const pollUserProfile = async () => {
        if (isPollingEnabledRef.current && user?.id) {
          try {
            await refreshUserProfile(true); // Silent refresh
          } catch (error) {
            console.error('Error during role/permission polling:', error);
          }
        }
      };
      
      pollingIntervalRef.current = setInterval(pollUserProfile, 5 * 60 * 1000); // 5 minutes
    }

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch roles/permissions on navigation (route change)
  useEffect(() => {
    if (!user?.id) return;

    // Only fetch if it's been more than 30 seconds since last fetch
    // This prevents too many API calls during rapid navigation
    const now = Date.now();
    const timeSinceLastFetch = lastFetchedRef.current ? now - lastFetchedRef.current : Infinity;
    
    if (timeSinceLastFetch > 30000) { // 30 seconds throttle
      console.log('🔄 AuthContext: Route changed, fetching latest roles/permissions');
      refreshUserProfile(true).catch(error => {
        console.error('Error fetching roles on navigation:', error);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, user?.id]);

  // Fetch roles/permissions when tab becomes visible again
  useEffect(() => {
    if (!user?.id) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isPollingEnabledRef.current) {
        const now = Date.now();
        const timeSinceLastFetch = lastFetchedRef.current ? now - lastFetchedRef.current : Infinity;
        
        // Only fetch if it's been more than 1 minute since last fetch
        if (timeSinceLastFetch > 60000) {
          console.log('🔄 AuthContext: Tab became visible, fetching latest roles/permissions');
          refreshUserProfile(true).catch(error => {
            console.error('Error fetching roles on visibility change:', error);
          });
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const isAuthenticated = () => {
    return !!user;
  };

  const value = {
    user,
    loading,
    login,
    loginWithGoogle,
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