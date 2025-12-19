import React, { useState, useEffect } from 'react';
import { Calendar, CheckCircle, AlertCircle, Loader2, Settings } from 'lucide-react';
import { calendarAPI, authAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import GoogleConnect from './GoogleConnect';

const CalendarSyncSettings = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    enabled: false,
    calendarId: 'primary',
    connected: false,
    hasAccessToken: false,
    migrationRequired: false
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (user?.id) {
      fetchSettings();
    }
  }, [user]);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await calendarAPI.getSettings();
      setSettings(data);
    } catch (err) {
      console.error('Error fetching calendar settings:', err);
      setError('Failed to load calendar settings');
    } finally {
      setLoading(false);
    }
  };

  // Refresh settings after OAuth callback
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('success') === 'connected') {
      fetchSettings();
    }
  }, []);

  const handleToggle = async (newEnabled) => {
    // Optimistically update UI
    const previousEnabled = settings.enabled;
    setSettings(prev => ({ ...prev, enabled: newEnabled }));
    
    try {
      setSaving(true);
      setError('');
      setSuccess('');
      
      console.log('🔄 Toggling calendar sync to:', newEnabled);
      const response = await calendarAPI.updateSettings({ enabled: newEnabled });
      console.log('✅ Calendar sync updated:', response);
      
      // Refresh settings from server to ensure we have the latest
      await fetchSettings();
      
      setSuccess(`Calendar sync ${newEnabled ? 'enabled' : 'disabled'} successfully`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('❌ Error updating calendar settings:', err);
      
      // Revert optimistic update
      setSettings(prev => ({ ...prev, enabled: previousEnabled }));
      
      const errorMessage = err.response?.data?.error || 'Failed to update calendar settings';
      setError(errorMessage);
      
      // If migration is required, show helpful message
      if (err.response?.data?.migrationRequired) {
        setError('Database migration required. Please run the migration SQL file to enable calendar sync settings.');
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center space-x-3 mb-6">
        <Calendar className="w-6 h-6 text-blue-600" />
        <h2 className="text-xl font-semibold text-gray-900">Google Calendar Sync</h2>
      </div>

      {settings.migrationRequired && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-800">Database Migration Required</p>
              <p className="text-sm text-red-700 mt-1">
                Please run the database migration file <code className="bg-red-100 px-1 rounded">google-calendar-sync-migration.sql</code> in your Supabase SQL editor to enable calendar sync settings.
              </p>
            </div>
          </div>
        </div>
      )}

      {!settings.migrationRequired && (
        <div className="space-y-4">
          {/* Main Toggle Section */}
          <div className={`p-5 border-2 rounded-lg transition-all ${
            settings.enabled 
              ? 'border-blue-200 bg-blue-50' 
              : 'border-gray-200 bg-white'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${
                    settings.enabled ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
                  }`}></div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Automatic Calendar Sync
                  </h3>
                </div>
                <p className="text-sm text-gray-600 ml-5">
                  {settings.enabled 
                    ? 'Jobs will be automatically synced to Google Calendar when created or updated'
                    : 'Enable to automatically sync jobs to Google Calendar when created or updated'
                  }
                </p>
                {(!settings.connected || !settings.hasAccessToken) && (
                  <p className="text-xs text-amber-600 mt-2 ml-5 flex items-center space-x-1">
                    <AlertCircle className="w-3 h-3" />
                    <span>
                      {settings.connected && !settings.hasAccessToken
                        ? 'Reconnect your Google account with calendar permissions to use this feature'
                        : 'Connect your Google account first to use this feature'}
                    </span>
                  </p>
                )}
              </div>
              
              {/* Toggle Switch */}
              <div className="relative">
                <button
                  onClick={() => {
                    if (!settings.connected || !settings.hasAccessToken) {
                      setError('Please connect your Google account with calendar permissions first to enable calendar syncing.');
                      return;
                    }
                    if (saving) return;
                    handleToggle(!settings.enabled);
                  }}
                  disabled={saving || !settings.connected || !settings.hasAccessToken}
                  className={`relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-all duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                    settings.enabled 
                      ? 'bg-blue-600 shadow-lg shadow-blue-200' 
                      : 'bg-gray-300'
                  } ${
                    saving || !settings.connected || !settings.hasAccessToken
                      ? 'opacity-50 cursor-not-allowed' 
                      : 'hover:bg-opacity-80 active:scale-95'
                  }`}
                  aria-label={settings.enabled ? 'Disable calendar sync' : 'Enable calendar sync'}
                >
                  <span
                    className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition-all duration-300 ease-in-out flex items-center justify-center ${
                      settings.enabled 
                        ? 'translate-x-5' 
                        : 'translate-x-0'
                    }`}
                  >
                    {saving && (
                      <Loader2 className="w-3 h-3 text-gray-400 animate-spin" />
                    )}
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Status Info */}
          {settings.connected && (
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1">
                    Calendar Configuration
                  </p>
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Calendar ID:</span>{' '}
                    <code className="bg-gray-200 px-2 py-0.5 rounded text-xs font-mono">
                      {settings.calendarId}
                    </code>
                  </p>
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                  settings.enabled
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-200 text-gray-600'
                }`}>
                  {settings.enabled ? 'Active' : 'Inactive'}
                </div>
              </div>
            </div>
          )}

          {/* Google Connection Section */}
          {(!settings.connected || (settings.connected && !settings.hasAccessToken)) && (
            <div className={`p-5 border-2 rounded-lg ${
              settings.connected && !settings.hasAccessToken
                ? 'bg-red-50 border-red-200'
                : 'bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-200'
            }`}>
              <div className="flex items-start space-x-3 mb-4">
                <AlertCircle className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
                  settings.connected && !settings.hasAccessToken
                    ? 'text-red-600'
                    : 'text-amber-600'
                }`} />
                <div className="flex-1">
                  <p className={`text-sm font-semibold ${
                    settings.connected && !settings.hasAccessToken
                      ? 'text-red-900'
                      : 'text-amber-900'
                  }`}>
                    {settings.connected && !settings.hasAccessToken
                      ? 'Reconnect Your Google Account'
                      : 'Connect Your Google Account'}
                  </p>
                  <p className={`text-sm mt-1 ${
                    settings.connected && !settings.hasAccessToken
                      ? 'text-red-700'
                      : 'text-amber-700'
                  }`}>
                    {settings.connected && !settings.hasAccessToken
                      ? 'Your Google account is connected but missing calendar permissions. Please reconnect to grant access to sync jobs to your Google Calendar.'
                      : 'Connect your Google account to enable automatic calendar syncing. This allows jobs to be automatically synced to your Google Calendar.'}
                  </p>
                </div>
              </div>
              <div className="mt-4">
                <GoogleConnect
                  onSuccess={async () => {
                    // This won't be called with authorization code flow (redirect)
                    // The success is handled via URL query params in the calendar-syncing page
                  }}
                  onError={(error) => {
                    console.error('❌ Google Connect error:', error);
                    setError('Failed to connect Google account. Please try again.');
                  }}
                  buttonText="connect_with"
                />
                <p className="text-xs text-gray-500 mt-2">
                  Clicking the button will redirect you to Google to authorize calendar access. 
                  You'll be redirected back after authorization.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <span className="text-sm text-red-600">{error}</span>
          </div>
        </div>
      )}

      {success && (
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="text-sm text-green-600">{success}</span>
          </div>
        </div>
      )}

      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="text-sm font-semibold text-blue-900 mb-2">How It Works</h3>
        <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
          <li>When enabled, jobs are automatically synced to Google Calendar when created or updated</li>
          <li>Calendar events are updated if the job was previously synced</li>
          <li>You can also manually sync individual jobs using the "Sync to Calendar" button</li>
          <li>Calendar events include job details, customer name, service, and address</li>
        </ul>
      </div>
    </div>
  );
};

export default CalendarSyncSettings;

