import React, { useState, useEffect } from 'react';
import { Mail, Phone, Send, CheckCircle, AlertCircle, Loader, User, MessageSquare, Bell } from 'lucide-react';
import { notificationAPI, twilioAPI, teamAPI } from '../services/api';
import Modal from './Modal';

const NotificationTesting = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [modal, setModal] = useState({ isOpen: false, title: '', message: '', type: 'info' });
  
  // Email testing state
  const [emailData, setEmailData] = useState({
    to: '',
    subject: 'Test Email from ZenBooker',
    message: 'This is a test email to verify your email notifications are working correctly.'
  });
  
  // SMS testing state
  const [smsData, setSmsData] = useState({
    to: '',
    message: 'This is a test SMS from ZenBooker to verify your SMS notifications are working correctly.'
  });
  
  // Team member selection state
  const [teamMembers, setTeamMembers] = useState([]);
  const [selectedTeamMember, setSelectedTeamMember] = useState('');
  const [phoneNumbers, setPhoneNumbers] = useState([]);
  const [selectedPhoneNumber, setSelectedPhoneNumber] = useState('');

  useEffect(() => {
    loadTeamMembers();
    loadPhoneNumbers();
  }, []);

  const loadTeamMembers = async () => {
    try {
      const response = await teamAPI.getAll();
      setTeamMembers(response.teamMembers || []);
    } catch (error) {
      console.error('Error loading team members:', error);
    }
  };

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

  const handleEmailInputChange = (e) => {
    const { name, value } = e.target;
    setEmailData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSMSInputChange = (e) => {
    const { name, value } = e.target;
    setSmsData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSendTestEmail = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await notificationAPI.sendEmail(
        emailData.to,
        emailData.subject,
        `<p>${emailData.message}</p>`,
        emailData.message
      );
      
      setModal({
        isOpen: true,
        title: 'Email Test Successful',
        message: 'Test email sent successfully! Check the recipient\'s inbox.',
        type: 'success'
      });
      
      setSuccess('Test email sent successfully!');
    } catch (error) {
      console.error('Email sending error:', error);
      setModal({
        isOpen: true,
        title: 'Email Test Failed',
        message: 'Failed to send test email. Please check your email configuration.',
        type: 'error'
      });
      setError('Failed to send test email');
    } finally {
      setLoading(false);
    }
  };

  const handleSendTestSMS = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await twilioAPI.sendSMS(smsData.to, smsData.message);
      
      setModal({
        isOpen: true,
        title: 'SMS Test Successful',
        message: 'Test SMS sent successfully! Check the recipient\'s phone.',
        type: 'success'
      });
      
      setSuccess('Test SMS sent successfully!');
    } catch (error) {
      console.error('SMS sending error:', error);
      setModal({
        isOpen: true,
        title: 'SMS Test Failed',
        message: 'Failed to send test SMS. Please check your Twilio configuration.',
        type: 'error'
      });
      setError('Failed to send test SMS');
    } finally {
      setLoading(false);
    }
  };

  const handleSendToTeamMember = async () => {
    if (!selectedTeamMember || !smsData.message) {
      setError('Please select a team member and enter a message');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const member = teamMembers.find(m => m.id === selectedTeamMember);
      if (!member || !member.phone) {
        throw new Error('Selected team member does not have a phone number');
      }

      await twilioAPI.sendSMS(member.phone, smsData.message);
      
      setModal({
        isOpen: true,
        title: 'Team SMS Sent',
        message: `SMS sent successfully to ${member.first_name} ${member.last_name}!`,
        type: 'success'
      });
      
      setSuccess(`SMS sent to ${member.first_name} ${member.last_name}!`);
    } catch (error) {
      console.error('Team SMS sending error:', error);
      setModal({
        isOpen: true,
        title: 'Team SMS Failed',
        message: 'Failed to send SMS to team member. Please check their phone number.',
        type: 'error'
      });
      setError('Failed to send SMS to team member');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Email Testing */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center space-x-3 mb-4">
          <Mail className="w-6 h-6 text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-900">Email Testing</h2>
        </div>
        
        <form onSubmit={handleSendTestEmail} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Recipient Email
            </label>
            <input
              type="email"
              name="to"
              value={emailData.to}
              onChange={handleEmailInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="test@example.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Subject
            </label>
            <input
              type="text"
              name="subject"
              value={emailData.subject}
              onChange={handleEmailInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Message
            </label>
            <textarea
              name="message"
              value={emailData.message}
              onChange={handleEmailInputChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <Loader className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            <span>Send Test Email</span>
          </button>
        </form>
      </div>

      {/* SMS Testing */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center space-x-3 mb-4">
          <Phone className="w-6 h-6 text-green-600" />
          <h2 className="text-lg font-semibold text-gray-900">SMS Testing</h2>
        </div>
        
        <div className="space-y-4">
          {/* Phone Number Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              From Phone Number
            </label>
            <select
              value={selectedPhoneNumber}
              onChange={(e) => setSelectedPhoneNumber(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              {phoneNumbers.map((number) => (
                <option key={number.phoneNumber} value={number.phoneNumber}>
                  {number.phoneNumber} {number.friendlyName && `(${number.friendlyName})`}
                </option>
              ))}
            </select>
          </div>

          <form onSubmit={handleSendTestSMS} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Recipient Phone Number
              </label>
              <input
                type="tel"
                name="to"
                value={smsData.to}
                onChange={handleSMSInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="+1234567890"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Message
              </label>
              <textarea
                name="message"
                value={smsData.message}
                onChange={handleSMSInputChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <Loader className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              <span>Send Test SMS</span>
            </button>
          </form>
        </div>
      </div>

      {/* Team Member SMS Testing */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center space-x-3 mb-4">
          <User className="w-6 h-6 text-purple-600" />
          <h2 className="text-lg font-semibold text-gray-900">Team Member SMS Testing</h2>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select Team Member (Top 3)
            </label>
            <select
              value={selectedTeamMember}
              onChange={(e) => setSelectedTeamMember(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">Choose a team member...</option>
              {teamMembers.slice(0, 3).map((member) => (
                <option key={member.id} value={member.id}>
                  {member.first_name} {member.last_name} {member.phone && `(${member.phone})`}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Message
            </label>
            <textarea
              value={smsData.message}
              onChange={(e) => setSmsData(prev => ({ ...prev, message: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Enter your message here..."
            />
          </div>

          <button
            onClick={handleSendToTeamMember}
            disabled={loading || !selectedTeamMember}
            className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <Loader className="w-4 h-4 animate-spin" />
            ) : (
              <MessageSquare className="w-4 h-4" />
            )}
            <span>Send to Team Member</span>
          </button>
        </div>
      </div>

      {/* Status Messages */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <span className="text-red-600">{error}</span>
          </div>
        </div>
      )}

      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="text-green-600">{success}</span>
          </div>
        </div>
      )}

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

export default NotificationTesting;
