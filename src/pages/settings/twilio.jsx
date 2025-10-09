import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Phone, Settings, CheckCircle, AlertCircle, ExternalLink, ChevronLeft } from 'lucide-react';
import TwilioAPISetup from '../../components/TwilioAPISetup';
import Sidebar from '../../components/sidebar';
import MobileHeader from '../../components/mobile-header';

const TwilioSettings = () => {
  const [error, setError] = useState('');
  const [searchParams] = useSearchParams();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Handle OAuth callback
    const connected = searchParams.get('connected');
    const errorParam = searchParams.get('error');
    
    if (connected === 'true') {
      setError('');
    } else if (errorParam) {
      setError('Failed to connect Twilio account. Please try again.');
    }
  }, [searchParams]);

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <div className="flex-1 flex flex-col min-w-0 lg:ml-64 xl:ml-72">
        <MobileHeader onMenuClick={() => setSidebarOpen(true)} />
        
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate("/settings")}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
            >
              <ChevronLeft className="w-5 h-5" />
              <span className="text-sm">Settings</span>
            </button>
            <div className="flex items-center space-x-3">
              <Phone className="w-6 h-6 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900">SMS Notification Settings</h1>
            </div>
          </div>
          <p className="text-gray-600 mt-2">
            Configure SMS notifications by connecting your Twilio account. This allows you to send automated SMS messages to customers for job confirmations, reminders, and updates.
          </p>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto p-6">

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <span className="text-red-600">{error}</span>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {/* Twilio API Setup */}
        <TwilioAPISetup
          onSuccess={() => {
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
    </div>
    </div>
    </div>
  );
};

export default TwilioSettings;
