import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';

const GoogleOAuth = ({ onSuccess, onError, buttonText = 'signin_with' }) => {
  const [isLoading, setIsLoading] = useState(false);
  const { loginWithGoogle } = useAuth();

  useEffect(() => {
    // Load Google Identity Services script
    const loadGoogleScript = () => {
      if (window.google) {
        initializeGoogleAuth();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = initializeGoogleAuth;
      document.head.appendChild(script);
    };

    const initializeGoogleAuth = () => {
      if (window.google && window.google.accounts) {
        window.google.accounts.id.initialize({
          client_id: process.env.REACT_APP_GOOGLE_CLIENT_ID,
          callback: handleCredentialResponse,
          auto_select: false,
          cancel_on_tap_outside: true
        });

        // Render the button
        window.google.accounts.id.renderButton(
          document.getElementById('google-signin-button'),
          {
            theme: 'outline',
            size: 'large',
            text: buttonText,
            shape: 'rectangular'
          }
        );
      }
    };

    loadGoogleScript();
  }, []);

  const handleCredentialResponse = async (response) => {
    setIsLoading(true);
    
    try {
      console.log('🔍 Google OAuth response received');
      
      // Send the ID token to your backend
      const result = await authAPI.googleAuth(response.credential);
      
      console.log('✅ Google OAuth successful:', result);
      
      // Update auth context with Google OAuth response
      loginWithGoogle(result);
      
      if (onSuccess) {
        onSuccess(result);
      }
      
    } catch (error) {
      console.error('❌ Google OAuth error:', error);
      
      if (onError) {
        onError(error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full">
      <div 
        id="google-signin-button" 
        className={`w-full ${isLoading ? 'opacity-50 pointer-events-none' : ''}`}
      />
      {isLoading && (
        <div className="flex items-center justify-center mt-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-sm text-gray-600">Signing in...</span>
        </div>
      )}
    </div>
  );
};

export default GoogleOAuth;
