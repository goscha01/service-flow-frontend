import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import { authAPI } from '../services/api';

const GoogleConnect = ({ onSuccess, onError, buttonText = 'Continue with Google' }) => {
  const [isLoading, setIsLoading] = useState(false);
  const isInitializedRef = useRef(false);

  const handleCredentialResponse = useCallback(async (response) => {
    setIsLoading(true);
    
    try {
      console.log('🔗 Google Connect response received:', response);
      
      // Handle both credential string and object formats
      let credential = '';
      if (typeof response === 'string') {
        credential = response;
      } else if (response && response.credential) {
        credential = response.credential;
      } else {
        throw new Error('Invalid response format from Google');
      }

      console.log('🔗 Using credential:', credential.substring(0, 50) + '...');
      
      // Call the API to connect Google account (similar to login but for existing user)
      const connectResponse = await authAPI.connectGoogle({ idToken: credential });
      console.log('✅ Google account connected:', connectResponse);
      
      if (onSuccess) {
        onSuccess(connectResponse);
      }
    } catch (error) {
      console.error('❌ Google Connect error:', error);
      if (onError) {
        onError(error);
      }
    } finally {
      setIsLoading(false);
    }
  }, [onSuccess, onError]);

  useEffect(() => {
    // Only initialize once to prevent re-rendering/shaking
    if (isInitializedRef.current) return;

    // Load Google Identity Services script
    const loadGoogleScript = () => {
      if (window.google && window.google.accounts) {
        // Small delay to ensure DOM is ready
        setTimeout(initializeGoogleAuth, 100);
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => {
        // Small delay to ensure DOM is ready
        setTimeout(initializeGoogleAuth, 100);
      };
      document.head.appendChild(script);
    };

    const initializeGoogleAuth = () => {
      if (!window.google || !window.google.accounts) return;
      
      // Check if already initialized
      if (isInitializedRef.current) return;
      
      const buttonElement = document.getElementById('google-connect-button');
      if (!buttonElement) {
        // Retry if element not ready yet
        setTimeout(initializeGoogleAuth, 100);
        return;
      }

      // Check if Google Client ID is configured
      const clientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;
      if (!clientId) {
        console.error('❌ REACT_APP_GOOGLE_CLIENT_ID is not configured');
        buttonElement.innerHTML = '<div class="text-red-600 text-sm p-2">Google Client ID not configured. Please set REACT_APP_GOOGLE_CLIENT_ID in your environment variables.</div>';
        if (onError) {
          onError(new Error('Google Client ID not configured'));
        }
        return;
      }

      // Clear any existing content to prevent duplicates
      buttonElement.innerHTML = '';

      // Use the same simple approach as GoogleOAuth (which works during login)
      // This uses ID token flow which is simpler and more reliable
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: handleCredentialResponse,
        auto_select: false,
        cancel_on_tap_outside: true,
        // Request additional scopes for Sheets and Calendar
        scope: 'openid email profile https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/calendar'
      });

      // Render the button
      try {
        window.google.accounts.id.renderButton(buttonElement, {
          theme: 'outline',
          size: 'large',
          text: buttonText === 'Connect Google Account' ? 'signin_with' : buttonText,
          shape: 'rectangular'
        });
        isInitializedRef.current = true;
      } catch (error) {
        console.error('Error rendering Google connect button:', error);
      }
    };

    loadGoogleScript();
  }, [buttonText, handleCredentialResponse, onError]);

  return (
    <div className="w-full">
      <style>
        {`
          #google-connect-button {
            display: flex !important;
            justify-content: center !important;
            min-height: 40px !important;
          }
          #google-connect-button > div {
            margin: 0 auto !important;
          }
        `}
      </style>
      <div className="w-full">
        <div 
          id="google-connect-button" 
          className={`w-full flex justify-center transition-opacity duration-200 ${
            isLoading ? 'opacity-50 pointer-events-none' : 'opacity-100'
          }`}
          style={{
            display: 'flex',
            justifyContent: 'center'
          }}
        />
        {isLoading && (
          <div className="mt-2 flex items-center justify-center">
            <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
            <span className="ml-2 text-sm text-gray-600">Connecting...</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default GoogleConnect;
