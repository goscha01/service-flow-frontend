import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { calendarAPI } from '../services/api';
import { Calendar, ExternalLink, CheckCircle, AlertCircle } from 'lucide-react';

const CalendarSync = ({ jobData, onSuccess, onError }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [synced, setSynced] = useState(false);
  const [error, setError] = useState('');

  const handleSyncToCalendar = async () => {
    if (!jobData) {
      setError('No job data provided');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await calendarAPI.syncJob({
        jobId: jobData.id,
        customerName: jobData.customer_name || jobData.customer?.name,
        serviceName: jobData.service_name || jobData.service?.name,
        scheduledDate: jobData.scheduled_date,
        scheduledTime: jobData.scheduled_time,
        duration: jobData.duration || 60,
        address: jobData.address
      });

      console.log('✅ Calendar sync successful:', result);
      setSynced(true);
      
      if (onSuccess) {
        onSuccess(result);
      }

    } catch (error) {
      console.error('❌ Calendar sync error:', error);
      const errorMessage = error.response?.data?.error || 'Failed to sync to Google Calendar';
      setError(errorMessage);
      
      if (onError) {
        onError(error);
      }
    } finally {
      setLoading(false);
    }
  };

  if (synced) {
    return (
      <div className="flex items-center space-x-2 text-green-600 bg-green-50 p-3 rounded-lg">
        <CheckCircle className="w-5 h-5" />
        <span className="text-sm font-medium">Synced to Google Calendar</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <button
        onClick={handleSyncToCalendar}
        disabled={loading || !jobData}
        className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <Calendar className="w-4 h-4" />
        <span>{loading ? 'Syncing...' : 'Sync to Google Calendar'}</span>
      </button>

      {error && (
        <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-3 rounded-lg">
          <AlertCircle className="w-4 h-4" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {!user?.google_access_token && (
        <div className="text-sm text-gray-600 bg-yellow-50 p-3 rounded-lg">
          <p>⚠️ Google Calendar not connected. Please connect your Google account in settings to sync jobs to your calendar.</p>
        </div>
      )}
    </div>
  );
};

export default CalendarSync;
