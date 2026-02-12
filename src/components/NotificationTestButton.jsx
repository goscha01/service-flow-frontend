import React, { useState } from 'react';
import { Send, Mail, Phone, Loader, CheckCircle, AlertCircle } from 'lucide-react';
import { notificationAPI, twilioAPI } from '../services/api';
import Modal from './Modal';

const NotificationTestButton = ({ 
  notificationType, 
  testEmail = null, 
  testPhone = null, 
  messageType = 'both', // 'email', 'sms', or 'both'
  templateContent = null // SMS template content to use for testing
}) => {
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState({ isOpen: false, title: '', message: '', type: 'info' });
  const [customEmail, setCustomEmail] = useState(testEmail || '');
  const [customPhone, setCustomPhone] = useState(testPhone || '');
  const [smsTemplate, setSmsTemplate] = useState(templateContent || '');
  const [emailTemplate, setEmailTemplate] = useState(templateContent || '');

  const handleTestEmail = async () => {
    const emailToUse = customEmail || testEmail;
    if (!emailToUse) {
      setModal({
        isOpen: true,
        title: 'Test Email Failed',
        message: 'Please enter a test email address.',
        type: 'error'
      });
      return;
    }

    if (!emailTemplate.trim()) {
      setModal({
        isOpen: true,
        title: 'Test Email Failed',
        message: 'Please enter email template content.',
        type: 'error'
      });
      return;
    }

    setLoading(true);
    try {
      await notificationAPI.sendEmail(
        emailToUse,
        `Test ${notificationType} Email`,
        emailTemplate,
        emailTemplate.replace(/<[^>]*>/g, '') // Strip HTML tags for text version
      );
      
      setModal({
        isOpen: true,
        title: 'Email Test Successful',
        message: `Test email sent successfully to ${emailToUse}!`,
        type: 'success'
      });
    } catch (error) {
      console.error('Email test error:', error);
      setModal({
        isOpen: true,
        title: 'Email Test Failed',
        message: 'Failed to send test email. Please check your email configuration.',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTestSMS = async () => {
    const phoneToUse = customPhone || testPhone;
    if (!phoneToUse) {
      setModal({
        isOpen: true,
        title: 'Test SMS Failed',
        message: 'Please enter a test phone number.',
        type: 'error'
      });
      return;
    }

    if (!smsTemplate.trim()) {
      setModal({
        isOpen: true,
        title: 'Test SMS Failed',
        message: 'Please enter SMS template content.',
        type: 'error'
      });
      return;
    }

    setLoading(true);
    try {
      await twilioAPI.sendSMS(phoneToUse, smsTemplate);
      
      setModal({
        isOpen: true,
        title: 'SMS Test Successful',
        message: `Test SMS sent successfully to ${phoneToUse}!`,
        type: 'success'
      });
    } catch (error) {
      console.error('SMS test error:', error);
      setModal({
        isOpen: true,
        title: 'SMS Test Failed',
        message: 'Failed to send test SMS. Please check your Twilio configuration.',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-4 p-4 bg-gray-50 rounded-lg border">
      <h4 className="text-sm font-medium text-gray-900 mb-3">Test Notification</h4>
      <p className="text-xs text-gray-600 mb-3">
        Send a test message to verify this notification is working correctly.
      </p>
      
      <div className="space-y-3">
        {/* Email Input */}
        {(messageType === 'email' || messageType === 'both') && (
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Test Email Address
            </label>
            <input
              type="email"
              value={customEmail}
              onChange={(e) => setCustomEmail(e.target.value)}
              placeholder="test@example.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}

        {/* Email Template Input */}
        {(messageType === 'email' || messageType === 'both') && (
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Email Template Content
            </label>
            <textarea
              value={emailTemplate}
              onChange={(e) => setEmailTemplate(e.target.value)}
              placeholder="Enter the email template content that will be sent..."
              rows="4"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              This content will be sent as the email message. You can use HTML tags for formatting.
            </p>
          </div>
        )}

        {/* Phone Input */}
        {(messageType === 'sms' || messageType === 'both') && (
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Test Phone Number
            </label>
            <input
              type="tel"
              value={customPhone}
              onChange={(e) => setCustomPhone(e.target.value)}
              placeholder="+1234567890"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
        )}

        {/* SMS Template Input */}
        {(messageType === 'sms' || messageType === 'both') && (
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              SMS Template Content
            </label>
            <textarea
              value={smsTemplate}
              onChange={(e) => setSmsTemplate(e.target.value)}
              placeholder="Enter the SMS template content that will be sent..."
              rows="3"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              This content will be sent as the SMS message. Edit it to test different variations.
            </p>
          </div>
        )}

        {/* Test Buttons */}
        <div className="flex space-x-3">
          {messageType === 'email' || messageType === 'both' ? (
            <button
              onClick={handleTestEmail}
              disabled={loading}
              className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {loading ? (
                <Loader className="w-4 h-4 animate-spin" />
              ) : (
                <Mail className="w-4 h-4" />
              )}
              <span>Test Email</span>
            </button>
          ) : null}

          {messageType === 'sms' || messageType === 'both' ? (
            <button
              onClick={handleTestSMS}
              disabled={loading}
              className="flex items-center space-x-2 px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {loading ? (
                <Loader className="w-4 h-4 animate-spin" />
              ) : (
                <Phone className="w-4 h-4" />
              )}
              <span>Test SMS</span>
            </button>
          ) : null}
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

export default NotificationTestButton;
