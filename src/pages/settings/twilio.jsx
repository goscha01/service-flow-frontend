import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Phone, Settings, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react';
import TwilioConnectOnboarding from '../../components/TwilioConnectOnboarding';
import { twilioConnectAPI } from '../../services/api';

const TwilioSettings = () => {
  const [loading, setLoading] = useState(false);
  const [twilioStatus, setTwilioStatus] = useState(null);
  const [error, setError] = useState('');
  const [searchParams] = useSearchParams();

  useEffect(() => {
    checkTwilioStatus();
    
    // Handle OAuth callback
    const connected = searchParams.get('connected');
    const errorParam = searchParams.get('error');
    
    if (connected === 'true') {
      setError('');
      checkTwilioStatus();
    } else if (errorParam) {
      setError('Failed to connect Twilio account. Please try again.');
    }
  }, [searchParams]);

  const checkTwilioStatus = async () => {
    try {
      setLoading(true);
      const response = await twilioConnectAPI.getAccountStatus();
      setTwilioStatus(response);
    } catch (error) {
      console.error('Error checking Twilio status:', error);
      setError('Failed to check Twilio connection status');
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!window.confirm('Are you sure you want to disconnect your Twilio account? This will stop SMS notifications.')) {
      return;
    }

    try {
      setLoading(true);
      await twilioConnectAPI.disconnect();
      setTwilioStatus({ connected: false });
    } catch (error) {
      console.error('Error disconnecting Twilio:', error);
      setError('Failed to disconnect Twilio account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <div className="flex items-center space-x-3 mb-2">
          <Phone className="w-6 h-6 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900">SMS Notification Settings</h1>
        </div>
        <p className="text-gray-600">
          Configure SMS notifications by connecting your Twilio account. This allows you to send automated SMS messages to customers for job confirmations, reminders, and updates.
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <span className="text-red-600">{error}</span>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {/* Connection Status */}
        {twilioStatus && (
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Connection Status</h2>
            
            {twilioStatus.connected ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="text-sm font-medium text-green-800">Twilio Connected</p>
                    <p className="text-sm text-green-600">
                      Account: {twilioStatus.friendlyName || 'Connected'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleDisconnect}
                  disabled={loading}
                  className="px-4 py-2 text-red-600 hover:text-red-800 border border-red-300 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-3">
                <AlertCircle className="w-5 h-5 text-yellow-600" />
                <div>
                  <p className="text-sm font-medium text-yellow-800">Not Connected</p>
                  <p className="text-sm text-yellow-600">
                    Connect your Twilio account to enable SMS notifications
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Twilio Connect Onboarding */}
        <TwilioConnectOnboarding
          onSuccess={() => {
            checkTwilioStatus();
            setError('');
          }}
          onError={(error) => {
            setError(error.message || 'Failed to connect Twilio account');
          }}
        />

        {/* Features */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">SMS Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start space-x-3">
              <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
              <div>
                <h3 className="text-sm font-medium text-gray-900">Job Confirmations</h3>
                <p className="text-sm text-gray-600">
                  Automatically send SMS when jobs are confirmed
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
              <div>
                <h3 className="text-sm font-medium text-gray-900">Payment Reminders</h3>
                <p className="text-sm text-gray-600">
                  Send SMS reminders for overdue invoices
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
              <div>
                <h3 className="text-sm font-medium text-gray-900">Custom Messages</h3>
                <p className="text-sm text-gray-600">
                  Send custom SMS messages to customers
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
              <div>
                <h3 className="text-sm font-medium text-gray-900">Your Phone Number</h3>
                <p className="text-sm text-gray-600">
                  Use your own Twilio phone number for SMS
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Help */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-blue-900 mb-2">Need Help?</h2>
          <p className="text-sm text-blue-800 mb-4">
            Twilio Connect allows you to use your own Twilio account for SMS messaging. 
            You'll be billed directly by Twilio for SMS usage.
          </p>
          <div className="space-y-2">
            <a
              href="https://www.twilio.com/docs/connect"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-2 text-blue-600 hover:text-blue-800 text-sm"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Learn about Twilio Connect</span>
            </a>
            <a
              href="https://www.twilio.com/pricing"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-2 text-blue-600 hover:text-blue-800 text-sm"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Twilio SMS Pricing</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TwilioSettings;
