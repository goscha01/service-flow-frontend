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

      // Use OAuth2 flow to get access token with calendar scopes
      if (window.google.accounts.oauth2) {
        // Create OAuth2 token client for calendar access
        const tokenClient = window.google.accounts.oauth2.initTokenClient({
          client_id: process.env.REACT_APP_GOOGLE_CLIENT_ID,
          scope: 'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events',
          callback: async (tokenResponse) => {
            console.log('🔗 OAuth2 token received:', {
              hasAccessToken: !!tokenResponse.access_token,
              hasRefreshToken: !!tokenResponse.refresh_token,
              expiresIn: tokenResponse.expires_in,
              scope: tokenResponse.scope
            });
            
            if (tokenResponse.access_token) {
              // Get ID token for user identification
              try {
                // Request user info to get email for ID token
                const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
                  headers: {
                    'Authorization': `Bearer ${tokenResponse.access_token}`
                  }
                });
                
                if (!userInfoResponse.ok) {
                  throw new Error(`Failed to get user info: ${userInfoResponse.status}`);
                }
                
                const userInfo = await userInfoResponse.json();
                
                console.log('🔗 User info retrieved:', { email: userInfo.email, id: userInfo.id });
                
                // Call success with both tokens
                if (onSuccess) {
                  await onSuccess({
                    accessToken: tokenResponse.access_token,
                    refreshToken: tokenResponse.refresh_token || null, // May be null on first request
                    idToken: null, // We'll use the access token to verify
                    email: userInfo.email,
                    googleId: userInfo.id
                  });
                }
              } catch (err) {
                console.error('❌ Error getting user info:', err);
                if (onError) {
                  onError(err);
                }
              }
            } else if (tokenResponse.error) {
              console.error('❌ OAuth2 error:', tokenResponse.error);
              if (onError) {
                onError(new Error(tokenResponse.error));
              }
            }
          }
        });

        // Create a custom button that triggers OAuth2 flow
        const customButton = document.createElement('button');
        customButton.className = 'w-full flex items-center justify-center gap-3 px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors';
        customButton.innerHTML = `
          <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
            <g fill="#000" fill-rule="evenodd">
              <path d="M9 3.48c1.69 0 2.83.73 3.48 1.34l2.54-2.48C13.46.89 11.43 0 9 0 5.48 0 2.44 2.02.96 4.96l2.91 2.26C4.6 5.05 6.62 3.48 9 3.48z" fill="#EA4335"/>
              <path d="M17.64 9.2c0-.74-.06-1.28-.19-1.84H9v3.34h4.96c-.21 1.18-.84 2.08-1.79 2.68l2.85 2.2c2.02-1.86 3.62-4.6 3.62-7.38z" fill="#4285F4"/>
              <path d="M3.88 10.78A5.54 5.54 0 0 1 3.58 9c0-.62.11-1.22.29-1.78L.96 4.96A9.008 9.008 0 0 0 0 9c0 1.45.35 2.82.96 4.04l2.92-2.26z" fill="#FBBC05"/>
              <path d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.85-2.2c-.76.53-1.78.9-3.11.9-2.38 0-4.4-1.57-5.12-3.74L.96 13.04C2.45 15.98 5.48 18 9 18z" fill="#34A853"/>
            </g>
          </svg>
          <span class="text-sm font-medium text-gray-700">Continue with Google</span>
        `;
        customButton.onclick = async (e) => {
          e.preventDefault();
          setIsLoading(true);
          
          try {
            // Use authorization code flow to get refresh token
            // Import authAPI dynamically to avoid circular dependencies
            const { authAPI } = await import('../services/api');
            console.log('🔗 Requesting Google OAuth authorization URL...');
            const response = await authAPI.getGoogleAuthUrl();
            console.log('🔗 Authorization URL response:', response);
            
            // Handle different response structures
            const authUrl = response?.authUrl || response?.data?.authUrl;
            
            if (authUrl) {
              console.log('✅ Got authorization URL, redirecting...');
              // Redirect to Google OAuth authorization page
              window.location.href = authUrl;
            } else {
              console.error('❌ No authUrl in response:', response);
              throw new Error('Failed to get authorization URL. Please check your Google OAuth configuration.');
            }
          } catch (err) {
            console.error('❌ Error initiating Google OAuth:', err);
            setIsLoading(false);
            const errorMessage = err.response?.data?.error || err.message || 'Failed to get authorization URL';
            if (onError) {
              onError(new Error(errorMessage));
            }
          }
        };
        buttonElement.appendChild(customButton);
        isInitializedRef.current = true;
      } else {
        // Fallback to ID token flow if OAuth2 not available
        window.google.accounts.id.initialize({
          client_id: process.env.REACT_APP_GOOGLE_CLIENT_ID,
          callback: handleCredentialResponse,
          auto_select: false,
          cancel_on_tap_outside: true
        });

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

