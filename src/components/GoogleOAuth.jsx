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
  }, []);

  const handleCredentialResponse = async (response) => {
    setIsLoading(true);
    
    try {
      console.log('🔍 Google OAuth response received:', response);
      console.log('🔍 Response type:', typeof response);
      console.log('🔍 Response keys:', Object.keys(response || {}));
      
      // For Google Identity Services (GSI), the response should be an object with a 'credential' property
      // The credential is the JWT ID token
      let idToken = null;
      
      if (response && typeof response === 'object' && response.credential) {
        // This is the correct format for Google Identity Services
        idToken = response.credential;
        console.log('✅ Found credential in response');
      } else if (typeof response === 'string') {
        // Fallback if response is already a string
        idToken = response;
        console.log('✅ Using response as string');
      } else {
        console.error('❌ Unexpected response format:', response);
        throw new Error('Invalid Google OAuth response format');
      }
      
      console.log('🔍 Extracted ID token type:', typeof idToken);
      console.log('🔍 ID token length:', idToken ? idToken.length : 'null');
      
      // Validate that we have a string ID token
      if (!idToken || typeof idToken !== 'string') {
        console.error('❌ Invalid ID token:', { idToken, type: typeof idToken });
        throw new Error(`Invalid Google OAuth response: ID token is ${typeof idToken}, expected string`);
      }
      
      // Extract access token from the response if available
      const accessToken = response.access_token || null;
      const refreshToken = response.refresh_token || null;
      
      // Send the ID token and access tokens to your backend
      const result = await authAPI.googleAuth({
        idToken: idToken,
        accessToken: accessToken,
        refreshToken: refreshToken
      });
      
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
