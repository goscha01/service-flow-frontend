import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Loader2 } from 'lucide-react';

const GoogleConnect = ({ onSuccess, onError, buttonText = 'Continue with Google' }) => {
  const [isLoading, setIsLoading] = useState(false);
  const isInitializedRef = useRef(false);

  const handleCredentialResponse = useCallback(async (response) => {
    setIsLoading(true);
    
    try {
      console.log('🔗 Google Connect response received:', response);
      
      // Handle both credential string and object formats
      let credential = '';
      let accessToken = null;
      let refreshToken = null;
      
      if (typeof response === 'string') {
        credential = response;
      } else if (response && response.credential) {
        credential = response.credential;
      } else if (response && response.idToken) {
        credential = response.idToken;
        accessToken = response.accessToken;
        refreshToken = response.refreshToken;
      } else {
        throw new Error('Invalid response format from Google');
      }

      console.log('🔗 Using credential:', credential.substring(0, 50) + '...');
      
      // Call the success callback with the credential data
      if (onSuccess) {
        await onSuccess({
          idToken: credential,
          accessToken: accessToken,
          refreshToken: refreshToken
        });
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

      // Clear any existing content to prevent duplicates
      buttonElement.innerHTML = '';

      window.google.accounts.id.initialize({
        client_id: process.env.REACT_APP_GOOGLE_CLIENT_ID,
        callback: handleCredentialResponse,
        auto_select: false,
        cancel_on_tap_outside: true
      });

      // Render the button
      try {
        window.google.accounts.id.renderButton(buttonElement, {
          theme: 'outline',
          size: 'large',
          text: 'signin_with',
          shape: 'rectangular',
          type: 'standard'
        });
        isInitializedRef.current = true;
      } catch (error) {
        console.error('Error rendering Google connect button:', error);
      }
    };

    loadGoogleScript();
  }, [buttonText, handleCredentialResponse]);

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

