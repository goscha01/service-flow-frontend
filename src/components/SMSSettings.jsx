import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { smsAPI } from '../services/api';

const SMSSettings = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState({
    smsEnabled: true,
    jobConfirmationSMS: true,
    paymentReminderSMS: true
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [testPhone, setTestPhone] = useState('');

  const handleSaveSettings = async () => {
    setLoading(true);
    try {
      // Here you would save settings to your backend
      console.log('SMS Settings saved:', settings);
      setMessage('SMS settings saved successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error saving SMS settings:', error);
      setMessage('Error saving settings');
    } finally {
      setLoading(false);
    }
  };

  const sendTestSMS = async () => {
    if (!testPhone) {
      setMessage('Please enter a phone number');
      return;
    }

    setLoading(true);
    try {
      await smsAPI.sendSMS(testPhone, `Test SMS from ${user?.businessName || 'ZenBooker'}. SMS notifications are working!`);
      setMessage('Test SMS sent successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error sending test SMS:', error);
      setMessage('Error sending test SMS');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">SMS Notifications</h3>
        <p className="text-sm text-gray-600">
          Configure SMS notifications for your customers and team members.
        </p>
      </div>

      <div className="space-y-4">
        {/* SMS Enabled Toggle */}
        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-medium text-gray-700">Enable SMS Notifications</label>
            <p className="text-xs text-gray-500">Turn SMS notifications on or off</p>
          </div>
          <button
            onClick={() => setSettings(prev => ({ ...prev, smsEnabled: !prev.smsEnabled }))}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              settings.smsEnabled ? 'bg-blue-600' : 'bg-gray-200'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                settings.smsEnabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Job Confirmation SMS */}
        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-medium text-gray-700">Job Confirmation SMS</label>
            <p className="text-xs text-gray-500">Send SMS when jobs are confirmed</p>
          </div>
          <button
            onClick={() => setSettings(prev => ({ ...prev, jobConfirmationSMS: !prev.jobConfirmationSMS }))}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              settings.jobConfirmationSMS ? 'bg-blue-600' : 'bg-gray-200'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                settings.jobConfirmationSMS ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Payment Reminder SMS */}
        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-medium text-gray-700">Payment Reminder SMS</label>
            <p className="text-xs text-gray-500">Send SMS for payment reminders</p>
          </div>
          <button
            onClick={() => setSettings(prev => ({ ...prev, paymentReminderSMS: !prev.paymentReminderSMS }))}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              settings.paymentReminderSMS ? 'bg-blue-600' : 'bg-gray-200'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                settings.paymentReminderSMS ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Test SMS Section */}
        <div className="border-t pt-4">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Test SMS</h4>
          <div className="flex space-x-2">
            <input
              type="tel"
              placeholder="+1234567890"
              value={testPhone}
              onChange={(e) => setTestPhone(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={sendTestSMS}
              disabled={loading || !testPhone}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Sending...' : 'Send Test'}
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Enter a phone number in E.164 format (e.g., +1234567890)
          </p>
        </div>

        {/* Message Display */}
        {message && (
          <div className={`p-3 rounded-md text-sm ${
            message.includes('Error') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
          }`}>
            {message}
          </div>
        )}

        {/* Save Button */}
        <div className="flex justify-end pt-4">
          <button
            onClick={handleSaveSettings}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SMSSettings;
