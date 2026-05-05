import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Calendar, FileSpreadsheet, Settings, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react';

const GoogleIntegrationSettings = () => {
  const { user } = useAuth();
  const [calendarConnected, setCalendarConnected] = useState(false);
  const [sheetsConnected, setSheetsConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    // Check if Google services are connected
    setCalendarConnected(!!user?.google_access_token);
    setSheetsConnected(!!user?.google_access_token);
  }, [user]);

  const handleConnectGoogle = () => {
    // This would trigger Google OAuth flow with additional scopes
    setMessage('Redirecting to Google for additional permissions...');
    // Implementation would go here
  };

  const handleDisconnectGoogle = () => {
    setLoading(true);
    // This would revoke Google tokens
    setMessage('Disconnecting Google services...');
    // Implementation would go here
    setLoading(false);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-[var(--sf-border-light)] p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-[var(--sf-text-primary)] mb-2">Google Integration</h3>
        <p className="text-sm text-[var(--sf-text-secondary)]">
          Connect your Google account to sync jobs with Google Calendar and export data to Google Sheets.
        </p>
      </div>

      <div className="space-y-6">
        {/* Google Calendar Integration */}
        <div className="border border-[var(--sf-border-light)] rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-3">
              <Calendar className="w-5 h-5 text-[var(--sf-blue-500)]" />
              <div>
                <h4 className="font-medium text-[var(--sf-text-primary)]">Google Calendar</h4>
                <p className="text-sm text-[var(--sf-text-secondary)]">Sync jobs with your Google Calendar</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {calendarConnected ? (
                <div className="flex items-center space-x-1 text-green-600">
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-sm font-medium">Connected</span>
                </div>
              ) : (
                <div className="flex items-center space-x-1 text-[var(--sf-text-muted)]">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm">Not Connected</span>
                </div>
              )}
            </div>
          </div>
          
          <div className="text-sm text-[var(--sf-text-secondary)] space-y-1">
            <p>• Automatically create calendar events for scheduled jobs</p>
            <p>• Set reminders and notifications</p>
            <p>• Sync job status changes</p>
          </div>
        </div>

        {/* Google Sheets Integration */}
        <div className="border border-[var(--sf-border-light)] rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-3">
              <FileSpreadsheet className="w-5 h-5 text-green-600" />
              <div>
                <h4 className="font-medium text-[var(--sf-text-primary)]">Google Sheets</h4>
                <p className="text-sm text-[var(--sf-text-secondary)]">Export data to Google Sheets</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {sheetsConnected ? (
                <div className="flex items-center space-x-1 text-green-600">
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-sm font-medium">Connected</span>
                </div>
              ) : (
                <div className="flex items-center space-x-1 text-[var(--sf-text-muted)]">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm">Not Connected</span>
                </div>
              )}
            </div>
          </div>
          
          <div className="text-sm text-[var(--sf-text-secondary)] space-y-1">
            <p>• Export customer data to spreadsheets</p>
            <p>• Export job reports and analytics</p>
            <p>• Create automated data backups</p>
          </div>
        </div>

        {/* Connection Status */}
        <div className="bg-[var(--sf-bg-page)] rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-[var(--sf-text-primary)]">Google Account</h4>
              <p className="text-sm text-[var(--sf-text-secondary)]">
                {user?.email || 'No Google account connected'}
              </p>
            </div>
            <div className="flex space-x-2">
              {calendarConnected || sheetsConnected ? (
                <button
                  onClick={handleDisconnectGoogle}
                  disabled={loading}
                  className="px-4 py-2 text-sm text-red-600 hover:text-red-800 border border-red-300 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Disconnecting...' : 'Disconnect'}
                </button>
              ) : (
                <button
                  onClick={handleConnectGoogle}
                  className="px-4 py-2 text-sm bg-[var(--sf-blue-500)] text-white rounded-lg hover:bg-[var(--sf-blue-600)] transition-colors"
                >
                  Connect Google Account
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Message Display */}
        {message && (
          <div className={`p-3 rounded-lg text-sm ${
            message.includes('error') || message.includes('Error') 
              ? 'bg-red-50 text-red-700 border border-red-200' 
              : 'bg-[var(--sf-blue-50)] text-[var(--sf-blue-500)] border border-blue-200'
          }`}>
            {message}
          </div>
        )}

        {/* Help Text */}
        <div className="text-xs text-[var(--sf-text-muted)] space-y-1">
          <p>• Google Calendar sync requires calendar and events permissions</p>
          <p>• Google Sheets export requires spreadsheet and drive permissions</p>
          <p>• You can revoke access at any time in your Google account settings</p>
        </div>
      </div>
    </div>
  );
};

export default GoogleIntegrationSettings;
