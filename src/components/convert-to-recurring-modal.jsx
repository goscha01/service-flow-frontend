import React, { useState, useEffect } from 'react';
import { X, RotateCw, Calendar, AlertCircle } from 'lucide-react';
import { formatRecurringFrequency } from '../utils/recurringUtils';

const ConvertToRecurringModal = ({ 
  isOpen, 
  onClose, 
  job, 
  onConvert
}) => {
  const [frequency, setFrequency] = useState('weekly');
  const [customFrequency, setCustomFrequency] = useState({
    type: 'weekly', // 'daily', 'weekly', 'monthly'
    interval: 1, // e.g., every 2 weeks, every 3 months
    dayOfWeek: '', // for weekly: 'monday', 'tuesday', etc.
    dayOfMonth: '', // for monthly: day number (1-31)
    ordinal: '', // for monthly: '1st', '2nd', '3rd', '4th', 'last'
    weekday: '' // for monthly ordinal: 'monday', 'tuesday', etc.
  });
  const [endDate, setEndDate] = useState('');
  const [hasEndDate, setHasEndDate] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  
  useEffect(() => {
    if (isOpen && job) {
      // Reset form when modal opens
      setFrequency('weekly');
      setCustomFrequency({
        type: 'weekly',
        interval: 1,
        dayOfWeek: '',
        dayOfMonth: '',
        ordinal: '',
        weekday: ''
      });
      setEndDate('');
      setHasEndDate(false);
      setErrors({});
      
      // Pre-fill day of week based on job's scheduled date
      if (job.scheduled_date) {
        const scheduledDate = new Date(job.scheduled_date);
        const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const dayOfWeek = dayNames[scheduledDate.getDay()];
        setCustomFrequency(prev => ({ ...prev, dayOfWeek: dayOfWeek }));
        
        // Pre-fill day of month
        setCustomFrequency(prev => ({ ...prev, dayOfMonth: scheduledDate.getDate().toString() }));
      }
    }
  }, [isOpen, job]);
  
  const buildFrequencyString = () => {
    if (frequency === 'daily') {
      return 'daily';
    }
    
    if (frequency === 'weekly') {
      if (customFrequency.dayOfWeek) {
        if (customFrequency.interval === 1) {
          return `weekly-${customFrequency.dayOfWeek}`;
        } else {
          return `${customFrequency.interval} weeks-${customFrequency.dayOfWeek}`;
        }
      } else {
        if (customFrequency.interval === 1) {
          return 'weekly';
        } else {
          return `${customFrequency.interval} weeks`;
        }
      }
    }
    
    if (frequency === 'monthly') {
      if (customFrequency.ordinal && customFrequency.weekday) {
        // Format: monthly-2nd-friday
        if (customFrequency.interval === 1) {
          return `monthly-${customFrequency.ordinal}-${customFrequency.weekday}`;
        } else {
          return `${customFrequency.interval} months-${customFrequency.ordinal}-${customFrequency.weekday}`;
        }
      } else if (customFrequency.dayOfMonth) {
        // Format: monthly-day-15
        if (customFrequency.interval === 1) {
          return `monthly-day-${customFrequency.dayOfMonth}`;
        } else {
          return `${customFrequency.interval} months-day-${customFrequency.dayOfMonth}`;
        }
      } else {
        if (customFrequency.interval === 1) {
          return 'monthly';
        } else {
          return `${customFrequency.interval} months`;
        }
      }
    }
    
    return 'weekly';
  };
  
  const validateForm = () => {
    const newErrors = {};
    
    if (frequency === 'weekly' && customFrequency.interval < 1) {
      newErrors.interval = 'Interval must be at least 1';
    }
    
    if (frequency === 'monthly' && customFrequency.interval < 1) {
      newErrors.interval = 'Interval must be at least 1';
    }
    
    if (hasEndDate && endDate) {
      const end = new Date(endDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (end < today) {
        newErrors.endDate = 'End date cannot be in the past';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleConvert = async () => {
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    try {
      const frequencyString = buildFrequencyString();
      await onConvert({
        frequency: frequencyString,
        endDate: hasEndDate && endDate ? endDate : null
      });
      onClose();
    } catch (err) {
      console.error('Error converting to recurring:', err);
      // Error handling is done in parent component
    } finally {
      setLoading(false);
    }
  };
  
  if (!isOpen || !job) return null;
  
  const scheduledDate = job.scheduled_date ? new Date(job.scheduled_date) : null;
  const previewFrequency = buildFrequencyString();
  const previewDate = scheduledDate || new Date();
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[99999] p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center space-x-2">
            <RotateCw className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg sm:text-xl font-bold text-gray-900">
              Convert to Recurring Job
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            disabled={loading}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="overflow-y-auto flex-1 p-4 sm:p-6">
          {/* Job Information Preview */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Job Information</h3>
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div className="text-sm text-gray-900">
                <span className="font-medium">Service:</span> {job.service_name || 'N/A'}
              </div>
              {scheduledDate && (
                <div className="text-sm text-gray-900">
                  <span className="font-medium">Current Date:</span>{' '}
                  {scheduledDate.toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </div>
              )}
            </div>
          </div>
          
          {/* Frequency Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Recurring Frequency *
            </label>
            
            <div className="space-y-3">
              {/* Quick Options */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => setFrequency('daily')}
                  className={`px-3 py-2 text-sm rounded-lg border ${
                    frequency === 'daily'
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                  disabled={loading}
                >
                  Daily
                </button>
                <button
                  type="button"
                  onClick={() => setFrequency('weekly')}
                  className={`px-3 py-2 text-sm rounded-lg border ${
                    frequency === 'weekly'
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                  disabled={loading}
                >
                  Weekly
                </button>
                <button
                  type="button"
                  onClick={() => setFrequency('monthly')}
                  className={`px-3 py-2 text-sm rounded-lg border ${
                    frequency === 'monthly'
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                  disabled={loading}
                >
                  Monthly
                </button>
              </div>
              
              {/* Weekly Options */}
              {frequency === 'weekly' && (
                <div className="space-y-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Every
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="number"
                        min="1"
                        value={customFrequency.interval}
                        onChange={(e) => setCustomFrequency({ ...customFrequency, interval: parseInt(e.target.value) || 1 })}
                        className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        disabled={loading}
                      />
                      <span className="text-sm text-gray-700">week(s)</span>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Day of Week (Optional)
                    </label>
                    <select
                      value={customFrequency.dayOfWeek}
                      onChange={(e) => setCustomFrequency({ ...customFrequency, dayOfWeek: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      disabled={loading}
                    >
                      <option value="">Any day</option>
                      <option value="monday">Monday</option>
                      <option value="tuesday">Tuesday</option>
                      <option value="wednesday">Wednesday</option>
                      <option value="thursday">Thursday</option>
                      <option value="friday">Friday</option>
                      <option value="saturday">Saturday</option>
                      <option value="sunday">Sunday</option>
                    </select>
                  </div>
                </div>
              )}
              
              {/* Monthly Options */}
              {frequency === 'monthly' && (
                <div className="space-y-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Every
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="number"
                        min="1"
                        value={customFrequency.interval}
                        onChange={(e) => setCustomFrequency({ ...customFrequency, interval: parseInt(e.target.value) || 1 })}
                        className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        disabled={loading}
                      />
                      <span className="text-sm text-gray-700">month(s)</span>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Schedule Type
                    </label>
                    <div className="space-y-2">
                      <label className="flex items-center space-x-2">
                        <input
                          type="radio"
                          name="monthlyType"
                          value="day"
                          checked={!customFrequency.ordinal}
                          onChange={() => setCustomFrequency({ ...customFrequency, ordinal: '', weekday: '' })}
                          className="text-blue-600"
                          disabled={loading}
                        />
                        <span className="text-sm text-gray-700">Specific day of month</span>
                      </label>
                      {!customFrequency.ordinal && (
                        <div className="ml-6">
                          <input
                            type="number"
                            min="1"
                            max="31"
                            value={customFrequency.dayOfMonth}
                            onChange={(e) => setCustomFrequency({ ...customFrequency, dayOfMonth: e.target.value })}
                            placeholder="Day (1-31)"
                            className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            disabled={loading}
                          />
                        </div>
                      )}
                      
                      <label className="flex items-center space-x-2">
                        <input
                          type="radio"
                          name="monthlyType"
                          value="ordinal"
                          checked={!!customFrequency.ordinal}
                          onChange={() => setCustomFrequency({ ...customFrequency, dayOfMonth: '' })}
                          className="text-blue-600"
                          disabled={loading}
                        />
                        <span className="text-sm text-gray-700">Ordinal weekday (e.g., 2nd Friday)</span>
                      </label>
                      {customFrequency.ordinal && (
                        <div className="ml-6 space-y-2">
                          <select
                            value={customFrequency.ordinal}
                            onChange={(e) => setCustomFrequency({ ...customFrequency, ordinal: e.target.value })}
                            className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            disabled={loading}
                          >
                            <option value="">Select...</option>
                            <option value="1st">1st</option>
                            <option value="2nd">2nd</option>
                            <option value="3rd">3rd</option>
                            <option value="4th">4th</option>
                            <option value="last">Last</option>
                          </select>
                          <select
                            value={customFrequency.weekday}
                            onChange={(e) => setCustomFrequency({ ...customFrequency, weekday: e.target.value })}
                            className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ml-2"
                            disabled={loading}
                          >
                            <option value="">Day...</option>
                            <option value="monday">Monday</option>
                            <option value="tuesday">Tuesday</option>
                            <option value="wednesday">Wednesday</option>
                            <option value="thursday">Thursday</option>
                            <option value="friday">Friday</option>
                            <option value="saturday">Saturday</option>
                            <option value="sunday">Sunday</option>
                          </select>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* End Date Option */}
          <div className="mb-6">
            <div className="flex items-start space-x-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <input
                type="checkbox"
                id="hasEndDate"
                checked={hasEndDate}
                onChange={(e) => setHasEndDate(e.target.checked)}
                className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                disabled={loading}
              />
              <div className="flex-1">
                <label htmlFor="hasEndDate" className="text-sm font-medium text-gray-900 cursor-pointer">
                  Set end date (Optional)
                </label>
                <p className="text-xs text-gray-600 mt-1">
                  Stop creating recurring jobs after a specific date
                </p>
                {hasEndDate && (
                  <div className="mt-3">
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        errors.endDate ? 'border-red-300' : 'border-gray-300'
                      }`}
                      disabled={loading}
                    />
                    {errors.endDate && (
                      <p className="mt-1 text-sm text-red-600 flex items-center">
                        <AlertCircle className="w-4 h-4 mr-1" />
                        {errors.endDate}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Preview */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start space-x-2">
              <Calendar className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Preview:</p>
                <p className="text-xs">
                  This job will repeat: <strong>{formatRecurringFrequency(previewFrequency, previewDate)}</strong>
                </p>
                {hasEndDate && endDate && (
                  <p className="text-xs mt-1">
                    Ending on: <strong>{new Date(endDate).toLocaleDateString()}</strong>
                  </p>
                )}
              </div>
            </div>
          </div>
          
          {/* Info Message */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-4">
            <div className="flex items-start space-x-2">
              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-yellow-800">
                <p className="font-medium mb-1">What happens when you convert?</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>This job will be marked as recurring</li>
                  <li>Future jobs will be automatically created based on the schedule</li>
                  <li>You can manage all recurring jobs in the Recurring Bookings page</li>
                  {hasEndDate && endDate && (
                    <li>Recurring jobs will stop being created after the end date</li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 p-4 sm:p-6 border-t border-gray-200 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={handleConvert}
            disabled={loading}
            className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Converting...
              </>
            ) : (
              <>
                <RotateCw className="w-4 h-4 mr-2" />
                Convert to Recurring
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConvertToRecurringModal;

