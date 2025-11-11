import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';

const GoogleOAuth = ({ onSuccess, onError, buttonText = 'signin_with' }) => {
  const [isLoading, setIsLoading] = useState(false);
  const { loginWithGoogle } = useAuth();

  const handleCredentialResponse = useCallback(async (response) => {
    setIsLoading(true);
    
    try {
      console.log('🔍 Google OAuth response received:', response);
      console.log('🔍 Response type:', typeof response);
      console.log('🔍 Response keys:', Object.keys(response || {}));
      
      // Handle both credential string and object formats
      let credential = '';
      if (typeof response === 'string') {
        credential = response;
      } else if (response && response.credential) {
        credential = response.credential;
      } else {
        throw new Error('Invalid response format from Google');
      }

      console.log('🔍 Using credential:', credential.substring(0, 50) + '...');
      
      // Call the login function from AuthContext
      await loginWithGoogle(credential);
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('❌ Google OAuth error:', error);
      if (onError) {
        onError(error);
      }
    } finally {
      setIsLoading(false);
    }
  }, [loginWithGoogle, onSuccess, onError]);

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
          cancel_on_tap_outside: true,
          // Request additional scopes for Sheets and Calendar
          scope: 'openid email profile https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/calendar'
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
  }, [buttonText, handleCredentialResponse]);

  return (
    <div className="w-full">
      <style>
        {`
          #google-signin-button {
            display: flex !important;
            justify-content: center !important;
          }
          #google-signin-button > div {
            margin: 0 auto !important;
          }
        `}
      </style>
      <div 
        id="google-signin-button" 
        className={`w-full flex justify-center ${isLoading ? 'opacity-50 pointer-events-none' : ''}`}
        style={{
          display: 'flex',
          justifyContent: 'center'
        }}
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
