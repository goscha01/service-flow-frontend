import React, { useState, useEffect } from 'react';
import { Phone, CheckCircle, AlertCircle, Loader, Eye, EyeOff } from 'lucide-react';
import { twilioAPI } from '../services/api';
import Modal from './Modal';

const TwilioAPISetup = ({ onSuccess, onError }) => {
  const [loading, setLoading] = useState(false);
  const [checkingConnection, setCheckingConnection] = useState(true);
  const [connected, setConnected] = useState(false);
  const [phoneNumbers, setPhoneNumbers] = useState([]);
  const [error, setError] = useState('');
  const [showCredentials, setShowCredentials] = useState(false);
  const [modal, setModal] = useState({ isOpen: false, title: '', message: '', type: 'info' });
  
  // Form state
  const [formData, setFormData] = useState({
    accountSid: '',
    authToken: '',
    phoneNumber: ''
  });

  useEffect(() => {
    checkConnectionStatus();
  }, []);

  const checkConnectionStatus = async () => {
    setCheckingConnection(true);
    try {
      const response = await twilioAPI.getPhoneNumbers();
      if (response.phoneNumbers && response.phoneNumbers.length > 0) {
        setConnected(true);
        setPhoneNumbers(response.phoneNumbers);
      }
    } catch (error) {
      console.error('Error checking Twilio status:', error);
      // If it's a 400 error, it means Twilio is not configured yet - this is normal
      if (error.response?.status !== 400) {
        setError('Failed to check Twilio connection status');
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
      const response = await twilioAPI.setupCredentials(
        formData.accountSid,
        formData.authToken,
        formData.phoneNumber
      );
      
      setConnected(true);
      setPhoneNumbers(response.phoneNumbers || []);
      
      if (onSuccess) {
        onSuccess(response);
      }
    } catch (error) {
      console.error('Twilio setup error:', error);
      setError(error.response?.data?.error || 'Failed to setup Twilio credentials');
      
      if (onError) {
        onError(error);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleTestSMS = async () => {
    if (!formData.phoneNumber) return;
    
    setLoading(true);
    try {
      await twilioAPI.testSMS(formData.phoneNumber);
      setModal({
        isOpen: true,
        title: 'SMS Test Successful',
        message: 'Test SMS sent successfully! Check your phone for the message.',
        type: 'success'
      });
    } catch (error) {
      setModal({
        isOpen: true,
        title: 'SMS Test Failed',
        message: 'Failed to send test SMS. Please check your credentials and phone number.',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setLoading(true);
    try {
      await twilioAPI.disconnect();
      setConnected(false);
      setPhoneNumbers([]);
      setFormData({ accountSid: '', authToken: '', phoneNumber: '' });
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
              Verifying your Twilio connection status...
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
              <h3 className="text-sm font-medium text-green-800">Twilio Connected</h3>
              <p className="text-sm text-green-700">
                Your Twilio account is connected and ready to send SMS messages.
              </p>
              {phoneNumbers.length > 0 && (
                <p className="text-xs text-green-600 mt-1">
                  Phone Numbers: {phoneNumbers.map(num => num.phoneNumber).join(', ')}
                </p>
              )}
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
          <Phone className="w-6 h-6 text-blue-600" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Setup Twilio SMS Integration
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Enter your Twilio credentials to send SMS notifications. 
            You'll use your own Twilio account and phone numbers.
          </p>
          
          <form onSubmit={handleSetupCredentials} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Account SID
              </label>
              <input
                type="text"
                name="accountSid"
                value={formData.accountSid}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Auth Token
              </label>
              <div className="relative">
                <input
                  type={showCredentials ? "text" : "password"}
                  name="authToken"
                  value={formData.authToken}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Your Twilio Auth Token"
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                name="phoneNumber"
                value={formData.phoneNumber}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="+1234567890"
                required
              />
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
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? (
                  <Loader className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4" />
                )}
                <span>
                  {loading ? 'Connecting...' : 'Connect Twilio'}
                </span>
              </button>

              <button
                type="button"
                onClick={handleTestSMS}
                disabled={loading || !formData.phoneNumber}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Test SMS
              </button>
            </div>
          </form>

          <div className="mt-4 text-xs text-gray-500">
            <p>
              Your credentials are stored securely and only used to send SMS messages through your Twilio account.
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

export default TwilioAPISetup;
