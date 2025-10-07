import React, { useState, useEffect } from 'react';
import { Calendar, Download, CheckCircle, AlertCircle, Loader, ArrowRight, ArrowLeft } from 'lucide-react';
import api from '../services/api';

const GoogleCalendarImport = ({ onSuccess, onError }) => {
  const [step, setStep] = useState(1); // 1: Select Calendar, 2: Preview Events, 3: Map Fields, 4: Import
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Step 1: Calendar selection
  const [calendars, setCalendars] = useState([]);
  const [selectedCalendar, setSelectedCalendar] = useState(null);
  
  // Step 2: Event preview
  const [events, setEvents] = useState([]);
  const [calendarInfo, setCalendarInfo] = useState(null);
  
  // Step 3: Field mapping
  const [fieldMappings, setFieldMappings] = useState({});
  const [targetFields, setTargetFields] = useState([
    { key: 'service_name', label: 'Service Name', required: true },
    { key: 'scheduled_date', label: 'Scheduled Date', required: true },
    { key: 'scheduled_time', label: 'Scheduled Time', required: false },
    { key: 'customer_name', label: 'Customer Name', required: true },
    { key: 'customer_email', label: 'Customer Email', required: false },
    { key: 'customer_phone', label: 'Customer Phone', required: false },
    { key: 'notes', label: 'Notes', required: false },
    { key: 'price', label: 'Price', required: false }
  ]);
  
  // Step 4: Import settings
  const [importSettings, setImportSettings] = useState({
    updateExisting: false,
    skipDuplicates: true,
    dateRange: {
      start: new Date().toISOString().split('T')[0],
      end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    }
  });

  useEffect(() => {
    if (step === 1) {
      loadCalendars();
    }
  }, [step]);

  const loadCalendars = async () => {
    try {
      setLoading(true);
      const response = await api.get('/google/calendar/list');
      setCalendars(response.data.calendars);
    } catch (error) {
      console.error('Error loading calendars:', error);
      setError('Failed to load Google Calendars. Please make sure your Google account is connected.');
    } finally {
      setLoading(false);
    }
  };

  const selectCalendar = async (calendar) => {
    try {
      setLoading(true);
      setSelectedCalendar(calendar);
      
      const response = await api.get(`/google/calendar/${calendar.id}/events`, {
        params: {
          start: importSettings.dateRange.start,
          end: importSettings.dateRange.end
        }
      });
      
      setEvents(response.data.events);
      setCalendarInfo(response.data.calendar);
      
      setStep(2);
    } catch (error) {
      console.error('Error loading calendar events:', error);
      setError('Failed to load calendar events');
    } finally {
      setLoading(false);
    }
  };

  const handleFieldMapping = (targetField, sourceField) => {
    setFieldMappings(prev => ({
      ...prev,
      [targetField]: sourceField
    }));
  };

  const validateMappings = () => {
    const requiredFields = targetFields.filter(field => field.required);
    const missingFields = requiredFields.filter(field => !fieldMappings[field.key]);
    
    if (missingFields.length > 0) {
      setError(`Please map the following required fields: ${missingFields.map(f => f.label).join(', ')}`);
      return false;
    }
    
    return true;
  };

  const startImport = async () => {
    if (!validateMappings()) return;
    
    try {
      setLoading(true);
      setError('');
      
      const response = await api.post('/google/calendar/import', {
        calendarId: selectedCalendar.id,
        fieldMappings: fieldMappings,
        importSettings: importSettings
      });
      
      if (onSuccess) {
        onSuccess(response.data);
      }
      
      setStep(4);
    } catch (error) {
      console.error('Import error:', error);
      setError(error.response?.data?.error || 'Failed to import data');
      
      if (onError) {
        onError(error);
      }
    } finally {
      setLoading(false);
    }
  };

  const renderStep1 = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">Select Google Calendar</h3>
      <p className="text-sm text-gray-600">
        Choose the Google Calendar you want to import events from.
      </p>
      
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader className="w-6 h-6 animate-spin text-blue-600" />
          <span className="ml-2 text-gray-600">Loading calendars...</span>
        </div>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {calendars.map((calendar) => (
            <button
              key={calendar.id}
              onClick={() => selectCalendar(calendar)}
              className="w-full text-left p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <div 
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: calendar.backgroundColor }}
                />
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">{calendar.summary}</h4>
                  <p className="text-sm text-gray-500">
                    {calendar.description || 'No description'}
                  </p>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-400" />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Preview Events</h3>
        <button
          onClick={() => setStep(1)}
          className="flex items-center space-x-2 text-sm text-gray-600 hover:text-gray-800"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Calendars</span>
        </button>
      </div>
      
      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="font-medium text-gray-900 mb-2">{selectedCalendar?.summary}</h4>
        <p className="text-sm text-gray-600">
          {events.length} events found in selected date range
        </p>
      </div>
      
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
          <h4 className="font-medium text-gray-900">Event Preview</h4>
        </div>
        <div className="max-h-64 overflow-y-auto">
          {events.slice(0, 10).map((event, index) => (
            <div key={index} className="p-4 border-b border-gray-200 last:border-b-0">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <Calendar className="w-4 h-4 text-blue-600 mt-1" />
                </div>
                <div className="flex-1">
                  <h5 className="font-medium text-gray-900">{event.summary || 'No Title'}</h5>
                  <p className="text-sm text-gray-600">
                    {event.start?.dateTime ? 
                      new Date(event.start.dateTime).toLocaleString() : 
                      event.start?.date || 'No date'
                    }
                  </p>
                  {event.description && (
                    <p className="text-sm text-gray-500 mt-1">{event.description}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <button
        onClick={() => setStep(3)}
        className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        <span>Continue to Field Mapping</span>
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Map Fields</h3>
        <button
          onClick={() => setStep(2)}
          className="flex items-center space-x-2 text-sm text-gray-600 hover:text-gray-800"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Preview</span>
        </button>
      </div>
      
      <p className="text-sm text-gray-600">
        Map the event properties from your Google Calendar to job fields in Serviceflow.
      </p>
      
      <div className="space-y-4">
        {targetFields.map((targetField) => (
          <div key={targetField.key} className="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-900">
                {targetField.label}
                {targetField.required && <span className="text-red-500 ml-1">*</span>}
              </label>
              <p className="text-xs text-gray-500">
                {targetField.key}
              </p>
            </div>
            <div className="flex-1">
              <select
                value={fieldMappings[targetField.key] || ''}
                onChange={(e) => handleFieldMapping(targetField.key, e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select event property...</option>
                <option value="summary">Event Title</option>
                <option value="description">Event Description</option>
                <option value="start.dateTime">Start Date/Time</option>
                <option value="start.date">Start Date</option>
                <option value="location">Location</option>
                <option value="attendees">Attendees</option>
              </select>
            </div>
          </div>
        ))}
      </div>
      
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">
          {Object.values(fieldMappings).filter(Boolean).length} of {targetFields.length} fields mapped
        </div>
        <button
          onClick={() => setStep(4)}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <span>Continue to Import</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">Import Settings</h3>
      
      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
          <div>
            <h4 className="font-medium text-gray-900">Skip Duplicates</h4>
            <p className="text-sm text-gray-600">Skip events that already exist as jobs</p>
          </div>
          <input
            type="checkbox"
            checked={importSettings.skipDuplicates}
            onChange={(e) => setImportSettings(prev => ({ ...prev, skipDuplicates: e.target.checked }))}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
        </div>
        
        <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
          <div>
            <h4 className="font-medium text-gray-900">Update Existing</h4>
            <p className="text-sm text-gray-600">Update existing jobs instead of skipping</p>
          </div>
          <input
            type="checkbox"
            checked={importSettings.updateExisting}
            onChange={(e) => setImportSettings(prev => ({ ...prev, updateExisting: e.target.checked }))}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
        </div>
      </div>
      
      <button
        onClick={startImport}
        disabled={loading}
        className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? (
          <Loader className="w-4 h-4 animate-spin" />
        ) : (
          <Download className="w-4 h-4" />
        )}
        <span>{loading ? 'Importing...' : 'Import Jobs'}</span>
      </button>
    </div>
  );

  if (step === 4 && !loading) {
    return (
      <div className="text-center py-8">
        <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Import Complete!</h3>
        <p className="text-gray-600">
          Your calendar events have been successfully imported as jobs.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress Steps */}
      <div className="flex items-center space-x-4">
        {[1, 2, 3, 4].map((stepNumber) => (
          <div key={stepNumber} className="flex items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              step >= stepNumber 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-200 text-gray-600'
            }`}>
              {stepNumber}
            </div>
            {stepNumber < 4 && (
              <div className={`w-8 h-0.5 ${
                step > stepNumber ? 'bg-blue-600' : 'bg-gray-200'
              }`} />
            )}
          </div>
        ))}
      </div>
      
      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <span className="text-red-600">{error}</span>
          </div>
        </div>
      )}
      
      {/* Step Content */}
      {step === 1 && renderStep1()}
      {step === 2 && renderStep2()}
      {step === 3 && renderStep3()}
      {step === 4 && renderStep4()}
    </div>
  );
};

export default GoogleCalendarImport;
