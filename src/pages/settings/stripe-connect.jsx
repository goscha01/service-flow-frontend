import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CreditCard, Settings, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react';
import { stripeConnectAPI } from '../../services/api';

const StripeConnectSettings = () => {
  const [loading, setLoading] = useState(false);
  const [stripeStatus, setStripeStatus] = useState(null);
  const [error, setError] = useState('');
  const [searchParams] = useSearchParams();

  useEffect(() => {
    checkStripeStatus();
    
    // Handle OAuth callback
    const connected = searchParams.get('connected');
    const errorParam = searchParams.get('error');
    
    if (connected === 'true') {
      setError('');
      checkStripeStatus();
    } else if (errorParam) {
      setError('Failed to connect Stripe account. Please try again.');
    }
  }, [searchParams]);

  const checkStripeStatus = async () => {
    try {
      setLoading(true);
      const response = await stripeConnectAPI.getAccountStatus();
      setStripeStatus(response);
    } catch (error) {
      console.error('Error checking Stripe status:', error);
      setError('Failed to check Stripe connection status');
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!window.confirm('Are you sure you want to disconnect your Stripe account? This will stop payment processing.')) {
      return;
    }

    try {
      setLoading(true);
      await stripeConnectAPI.disconnect();
      setStripeStatus({ connected: false });
    } catch (error) {
      console.error('Error disconnecting Stripe:', error);
      setError('Failed to disconnect Stripe account');
    } finally {
      setLoading(false);
    }
  };

  const handleConnectAccount = async () => {
    try {
      setLoading(true);
      const response = await stripeConnectAPI.createAccountLink();
      
      if (response.authUrl) {
        // Redirect to Stripe Connect authorization
        window.location.href = response.authUrl;
      } else {
        throw new Error('No authorization URL received');
      }
    } catch (error) {
      console.error('Stripe Connect error:', error);
      setError(error.response?.data?.error || 'Failed to connect Stripe account');
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <div className="flex items-center space-x-3 mb-2">
          <CreditCard className="w-6 h-6 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900">Stripe Connect Settings</h1>
        </div>
        <p className="text-gray-600">
          Configure Stripe Connect to process payments and accept online payments from customers. 
          You'll use your own Stripe account for payment processing.
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
        {stripeStatus && (
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Connection Status</h2>
            
            {stripeStatus.connected ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="text-sm font-medium text-green-800">Stripe Connected</p>
                    <p className="text-sm text-green-600">
                      Account: {stripeStatus.friendlyName || 'Connected'}
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
                    Connect your Stripe account to enable payment processing
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Stripe Connect Onboarding */}
        {!stripeStatus?.connected && (
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <CreditCard className="w-6 h-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Connect Your Stripe Account
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Connect your Stripe account to process payments from customers. 
                  You'll use your own Stripe account and receive payments directly.
                </p>
                
                <div className="space-y-3">
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>Accept credit card payments</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>Process online payments</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>Receive payments directly to your account</span>
                  </div>
                </div>

                <div className="mt-6">
                  <button
                    onClick={handleConnectAccount}
                    disabled={loading}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>
                      {loading ? 'Connecting...' : 'Connect Stripe Account'}
                    </span>
                  </button>
                </div>

                <div className="mt-4 text-xs text-gray-500">
                  <p>
                    You'll be redirected to Stripe to authorize the connection. 
                    This is secure and uses Stripe's official OAuth flow.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Features */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start space-x-3">
              <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
              <div>
                <h3 className="text-sm font-medium text-gray-900">Online Payments</h3>
                <p className="text-sm text-gray-600">
                  Accept credit card payments from customers online
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
              <div>
                <h3 className="text-sm font-medium text-gray-900">Invoice Payments</h3>
                <p className="text-sm text-gray-600">
                  Customers can pay invoices directly online
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
              <div>
                <h3 className="text-sm font-medium text-gray-900">Recurring Payments</h3>
                <p className="text-sm text-gray-600">
                  Set up automatic recurring payments for subscriptions
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
              <div>
                <h3 className="text-sm font-medium text-gray-900">Your Stripe Account</h3>
                <p className="text-sm text-gray-600">
                  Use your own Stripe account and receive payments directly
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Help */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-blue-900 mb-2">Need Help?</h2>
          <p className="text-sm text-blue-800 mb-4">
            Stripe Connect allows you to use your own Stripe account for payment processing. 
            You'll be billed directly by Stripe for payment processing fees.
          </p>
          <div className="space-y-2">
            <a
              href="https://stripe.com/docs/connect"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-2 text-blue-600 hover:text-blue-800 text-sm"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Learn about Stripe Connect</span>
            </a>
            <a
              href="https://stripe.com/pricing"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-2 text-blue-600 hover:text-blue-800 text-sm"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Stripe Pricing</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StripeConnectSettings;
