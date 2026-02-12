import React, { useState, useEffect } from 'react';
import { Phone, Send, MessageSquare, Settings, CheckCircle, AlertCircle } from 'lucide-react';
import { twilioAPI } from '../services/api';

const TwilioSMSManager = ({ onSMSSent, onNotificationSetup }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [phoneNumbers, setPhoneNumbers] = useState([]);
  const [selectedPhoneNumber, setSelectedPhoneNumber] = useState('');
  
  // SMS form state
  const [smsData, setSmsData] = useState({
    to: '',
    message: ''
  });

  // Notification setup state
  const [notificationTypes, setNotificationTypes] = useState({
    jobConfirmations: false,
    paymentReminders: false,
    appointmentReminders: false,
    statusUpdates: false
  });

  useEffect(() => {
    loadPhoneNumbers();
  }, []);

  const loadPhoneNumbers = async () => {
    try {
      const response = await twilioAPI.getPhoneNumbers();
      setPhoneNumbers(response.phoneNumbers || []);
      if (response.phoneNumbers && response.phoneNumbers.length > 0) {
        setSelectedPhoneNumber(response.phoneNumbers[0].phoneNumber);
      }
    } catch (error) {
      console.error('Error loading phone numbers:', error);
    }
  };

  const handleSMSInputChange = (e) => {
    const { name, value } = e.target;
    setSmsData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleNotificationTypeChange = (type) => {
    setNotificationTypes(prev => ({
      ...prev,
      [type]: !prev[type]
    }));
  };

  const handleSendSMS = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await twilioAPI.sendSMS(smsData.to, smsData.message);
      setSuccess('SMS sent successfully!');
      if (onSMSSent) {
        onSMSSent(response);
      }
      
      // Reset form
      setSmsData({
        to: '',
        message: ''
      });
    } catch (error) {
      console.error('SMS sending error:', error);
      setError(error.response?.data?.error || 'Failed to send SMS');
    } finally {
      setLoading(false);
    }
  };

  const handleSetupNotifications = async () => {
    setLoading(true);
    setError('');

    try {
      const enabledTypes = Object.entries(notificationTypes)
        .filter(([_, enabled]) => enabled)
        .map(([type, _]) => type);

      const response = await twilioAPI.setupSMSNotifications(
        selectedPhoneNumber,
        enabledTypes
      );
      
      setSuccess('SMS notifications configured successfully!');
      if (onNotificationSetup) {
        onNotificationSetup(response);
      }
    } catch (error) {
      console.error('Notification setup error:', error);
      setError(error.response?.data?.error || 'Failed to setup notifications');
    } finally {
      setLoading(false);
    }
  };

  const handleTestSMS = async () => {
    if (!smsData.to) {
      setError('Please enter a phone number to test');
      return;
    }

    setLoading(true);
    try {
      await twilioAPI.testSMS(smsData.to);
      setSuccess('Test SMS sent successfully!');
    } catch (error) {
      setError('Failed to send test SMS');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Success/Error Messages */}
      {success && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-md">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <span className="text-sm text-green-600">{success}</span>
          </div>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-red-600" />
            <span className="text-sm text-red-600">{error}</span>
          </div>
        </div>
      )}

      {/* Phone Numbers Display */}
      {phoneNumbers.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <Phone className="w-5 h-5 text-blue-600" />
            <div>
              <h3 className="text-sm font-medium text-blue-800">Available Phone Numbers</h3>
              <div className="mt-1 space-y-1">
                {phoneNumbers.map((number, index) => (
                  <div key={index} className="text-sm text-blue-700">
                    {number.phoneNumber} {number.friendlyName && `(${number.friendlyName})`}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Send SMS Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center space-x-3 mb-4">
          <MessageSquare className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-medium text-gray-900">Send SMS Message</h3>
        </div>
        
        <form onSubmit={handleSendSMS} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                To Phone Number
              </label>
              <input
                type="tel"
                name="to"
                value={smsData.to}
                onChange={handleSMSInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="+1234567890"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                From Phone Number
              </label>
              <select
                value={selectedPhoneNumber}
                onChange={(e) => setSelectedPhoneNumber(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {phoneNumbers.map((number, index) => (
                  <option key={index} value={number.phoneNumber}>
                    {number.phoneNumber} {number.friendlyName && `(${number.friendlyName})`}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Message
            </label>
            <textarea
              name="message"
              value={smsData.message}
              onChange={handleSMSInputChange}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter your message here..."
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Character count: {smsData.message.length}/1600
            </p>
          </div>

          <div className="flex space-x-3">
            <button
              type="submit"
              disabled={loading}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="w-4 h-4" />
              <span>{loading ? 'Sending...' : 'Send SMS'}</span>
            </button>

            <button
              type="button"
              onClick={handleTestSMS}
              disabled={loading || !smsData.to}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Test SMS
            </button>
          </div>
        </form>
      </div>

      {/* SMS Notifications Setup */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center space-x-3 mb-4">
          <Settings className="w-5 h-5 text-green-600" />
          <h3 className="text-lg font-medium text-gray-900">Setup SMS Notifications</h3>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Select notification types to enable:
            </label>
            <div className="space-y-3">
              {Object.entries(notificationTypes).map(([type, enabled]) => (
                <label key={type} className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={enabled}
                    onChange={() => handleNotificationTypeChange(type)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 capitalize">
                    {type.replace(/([A-Z])/g, ' $1').trim()}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <button
            onClick={handleSetupNotifications}
            disabled={loading}
            className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Settings className="w-4 h-4" />
            <span>{loading ? 'Setting up...' : 'Setup Notifications'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default TwilioSMSManager;
