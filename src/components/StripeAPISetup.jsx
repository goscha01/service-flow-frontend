import React, { useState, useEffect } from 'react';
import { CreditCard, CheckCircle, AlertCircle, Loader, Eye, EyeOff } from 'lucide-react';
import { stripeAPI } from '../services/api';
import Modal from './Modal';

const StripeAPISetup = ({ onSuccess, onError }) => {
  const [loading, setLoading] = useState(false);
  const [checkingConnection, setCheckingConnection] = useState(true);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState('');
  const [showCredentials, setShowCredentials] = useState(false);
  const [modal, setModal] = useState({ isOpen: false, title: '', message: '', type: 'info' });
  
  // Form state
  const [formData, setFormData] = useState({
    publishableKey: '',
    secretKey: ''
  });

  useEffect(() => {
    checkConnectionStatus();
  }, []);

  const checkConnectionStatus = async () => {
    setCheckingConnection(true);
    try {
      const response = await stripeAPI.testConnection();
      if (response.connected) {
        setConnected(true);
      }
    } catch (error) {
      console.error('Error checking Stripe status:', error);
      // If it's a 400 error, it means Stripe is not configured yet - this is normal
      if (error.response?.status !== 400) {
        setError('Failed to check Stripe connection status');
      }
    } finally {
      setCheckingConnection(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSetupCredentials = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await stripeAPI.setupCredentials(
        formData.publishableKey,
        formData.secretKey
      );
      
      setConnected(true);
      
      if (onSuccess) {
        onSuccess(response);
      }
    } catch (error) {
      console.error('Stripe setup error:', error);
      setError(error.response?.data?.error || 'Failed to setup Stripe credentials');
      
      if (onError) {
        onError(error);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async () => {
    setLoading(true);
    try {
      await stripeAPI.testConnection();
      setModal({
        isOpen: true,
        title: 'Connection Test Successful',
        message: 'Stripe connection test successful! Your credentials are working properly.',
        type: 'success'
      });
    } catch (error) {
      setModal({
        isOpen: true,
        title: 'Connection Test Failed',
        message: 'Failed to test Stripe connection. Please check your credentials.',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setLoading(true);
    try {
      await stripeAPI.disconnect();
      setConnected(false);
      setFormData({ publishableKey: '', secretKey: '' });
    } catch (error) {
      setError('Failed to disconnect');
    } finally {
      setLoading(false);
    }
  };

  if (checkingConnection) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center space-x-3">
          <Loader className="w-5 h-5 text-blue-600 animate-spin" />
          <div>
            <h3 className="text-sm font-medium text-blue-800">Checking Connection</h3>
            <p className="text-sm text-blue-700">
              Verifying your Stripe connection status...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (connected) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <div>
              <h3 className="text-sm font-medium text-green-800">Stripe Connected</h3>
              <p className="text-sm text-green-700">
                Your Stripe account is connected and ready to process payments and send invoices.
              </p>
            </div>
          </div>
          <button
            onClick={handleDisconnect}
            className="text-sm text-red-600 hover:text-red-800"
          >
            Disconnect
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          <CreditCard className="w-6 h-6 text-purple-600" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Setup Stripe Payment Integration
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Enter your Stripe API keys to process payments and send invoices. 
            You'll use your own Stripe account and handle all transactions directly.
          </p>
          
          <div className="space-y-3 mb-4">
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span>Send invoices to customers</span>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span>Process payments directly</span>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span>Use your own Stripe account</span>
            </div>
          </div>
          
          <form onSubmit={handleSetupCredentials} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Publishable Key
              </label>
              <input
                type="text"
                name="publishableKey"
                value={formData.publishableKey}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="pk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Secret Key
              </label>
              <div className="relative">
                <input
                  type={showCredentials ? "text" : "password"}
                  name="secretKey"
                  value={formData.secretKey}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="sk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowCredentials(!showCredentials)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showCredentials ? (
                    <EyeOff className="w-4 h-4 text-gray-400" />
                  ) : (
                    <Eye className="w-4 h-4 text-gray-400" />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 text-red-600" />
                  <span className="text-sm text-red-600">{error}</span>
                </div>
              </div>
            )}

            <div className="flex space-x-3">
              <button
                type="submit"
                disabled={loading}
                className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? (
                  <Loader className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4" />
                )}
                <span>
                  {loading ? 'Connecting...' : 'Connect Stripe'}
                </span>
              </button>

              <button
                type="button"
                onClick={handleTestConnection}
                disabled={loading}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Test Connection
              </button>
            </div>
          </form>

          <div className="mt-4 text-xs text-gray-500">
            <p>
              Your API keys are stored securely and only used to process payments through your Stripe account.
            </p>
          </div>
        </div>
      </div>
      
      <Modal
        isOpen={modal.isOpen}
        onClose={() => setModal({ ...modal, isOpen: false })}
        title={modal.title}
        message={modal.message}
        type={modal.type}
      />
    </div>
  );
};

export default StripeAPISetup;
