import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, ChevronLeft, AlertCircle } from 'lucide-react';
import NotificationTesting from '../../components/NotificationTesting';
import Sidebar from '../../components/sidebar';

const NotificationTestingSettings = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <div className="flex-1 flex flex-col min-w-0 lg:ml-64 xl:ml-72">
        
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate("/settings/client-team-notifications")}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
            >
              <ChevronLeft className="w-5 h-5" />
              <span className="text-sm">Client & Team Notifications</span>
            </button>
            <div className="flex items-center space-x-3">
              <Bell className="w-6 h-6 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900">Notification Testing</h1>
            </div>
          </div>
          <p className="text-gray-600 mt-2">
            Test your email and SMS notifications to ensure they're working correctly. 
            Send test messages to verify your notification setup and team member communications.
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

            <NotificationTesting />
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationTestingSettings;
