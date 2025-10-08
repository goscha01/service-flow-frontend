import React, { useState, useEffect } from 'react';
import { Phone, ExternalLink, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import api from '../services/api';

const TwilioConnectOnboarding = ({ onSuccess, onError }) => {
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(false);
  const [accountStatus, setAccountStatus] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    checkConnectionStatus();
  }, []);

  const checkConnectionStatus = async () => {
    try {
      const response = await api.get('/twilio/connect/account-status');
      setAccountStatus(response.data);
      setConnected(response.data.connected);
    } catch (error) {
      console.error('Error checking Twilio Connect status:', error);
    }
  };

  const handleConnectAccount = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await api.post('/twilio/connect/account-link');
      
      if (response.data.accountLinkUrl) {
        // Open Twilio Connect authorization in new window
        const authWindow = window.open(
          response.data.accountLinkUrl,
          'twilio-connect',
          'width=600,height=700,scrollbars=yes,resizable=yes'
        );

        // Poll for completion
        const pollInterval = setInterval(async () => {
          if (authWindow.closed) {
            clearInterval(pollInterval);
            setLoading(false);
            
            // Check connection status
            await checkConnectionStatus();
            
            if (onSuccess) {
              onSuccess();
            }
          }
        }, 1000);

        // Timeout after 5 minutes
        setTimeout(() => {
          if (!authWindow.closed) {
            authWindow.close();
            clearInterval(pollInterval);
            setLoading(false);
            setError('Connection timed out. Please try again.');
          }
        }, 300000);

      } else {
        throw new Error('No account link URL received');
      }

    } catch (error) {
      console.error('Twilio Connect error:', error);
      setError(error.response?.data?.error || 'Failed to connect Twilio account');
      setLoading(false);
      
      if (onError) {
        onError(error);
      }
    }
  };

  if (connected) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-center space-x-3">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <div>
            <h3 className="text-sm font-medium text-green-800">Twilio Connected</h3>
            <p className="text-sm text-green-700">
              Your Twilio account is connected and ready to send SMS messages.
            </p>
            {accountStatus?.friendlyName && (
              <p className="text-xs text-green-600 mt-1">
                Account: {accountStatus.friendlyName}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          <Phone className="w-6 h-6 text-blue-600" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Connect Your Twilio Account
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Connect your Twilio account to send SMS notifications to customers. 
            You'll use your own Twilio phone number and billing.
          </p>
          
          <div className="space-y-3">
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span>Send job confirmations via SMS</span>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span>Send payment reminders</span>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span>Use your own Twilio phone number</span>
            </div>
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-red-600" />
                <span className="text-sm text-red-600">{error}</span>
              </div>
            </div>
          )}

          <div className="mt-6">
            <button
              onClick={handleConnectAccount}
              disabled={loading}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <Loader className="w-4 h-4 animate-spin" />
              ) : (
                <ExternalLink className="w-4 h-4" />
              )}
              <span>
                {loading ? 'Connecting...' : 'Connect Twilio Account'}
              </span>
            </button>
          </div>

          <div className="mt-4 text-xs text-gray-500">
            <p>
              You'll be redirected to Twilio to authorize the connection. 
              This is secure and uses Twilio's official OAuth flow.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TwilioConnectOnboarding;
