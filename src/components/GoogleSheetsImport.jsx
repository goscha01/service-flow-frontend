import React, { useState, useEffect } from 'react';
import { FileSpreadsheet, Download, CheckCircle, AlertCircle, Loader, ArrowRight, ArrowLeft } from 'lucide-react';
import api from '../services/api';

const GoogleSheetsImport = ({ importType = 'customers', onSuccess, onError }) => {
  const [step, setStep] = useState(1); // 1: Select Sheet, 2: Preview Data, 3: Map Fields, 4: Import
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Step 1: Spreadsheet selection
  const [spreadsheets, setSpreadsheets] = useState([]);
  const [selectedSpreadsheet, setSelectedSpreadsheet] = useState(null);
  
  // Step 2: Data preview
  const [spreadsheetData, setSpreadsheetData] = useState(null);
  const [headers, setHeaders] = useState([]);
  const [rows, setRows] = useState([]);
  
  // Step 3: Field mapping
  const [fieldMappings, setFieldMappings] = useState({});
  const [targetFields, setTargetFields] = useState([]);
  
  // Step 4: Import settings
  const [importSettings, setImportSettings] = useState({
    updateExisting: false,
    skipDuplicates: true
  });

  useEffect(() => {
    if (step === 1) {
      loadSpreadsheets();
    }
  }, [step]);

  useEffect(() => {
    if (importType === 'customers') {
      setTargetFields([
        { key: 'first_name', label: 'First Name', required: true },
        { key: 'last_name', label: 'Last Name', required: false },
        { key: 'email', label: 'Email', required: true },
        { key: 'phone', label: 'Phone', required: false },
        { key: 'address', label: 'Address', required: false },
        { key: 'city', label: 'City', required: false },
        { key: 'state', label: 'State', required: false },
        { key: 'zip_code', label: 'Zip Code', required: false }
      ]);
    } else if (importType === 'jobs') {
      setTargetFields([
        { key: 'service_name', label: 'Service Name', required: true },
        { key: 'scheduled_date', label: 'Scheduled Date', required: true },
        { key: 'scheduled_time', label: 'Scheduled Time', required: false },
        { key: 'customer_name', label: 'Customer Name', required: true },
        { key: 'customer_email', label: 'Customer Email', required: false },
        { key: 'customer_phone', label: 'Customer Phone', required: false },
        { key: 'notes', label: 'Notes', required: false },
        { key: 'price', label: 'Price', required: false }
      ]);
    }
  }, [importType]);

  const loadSpreadsheets = async () => {
    try {
      setLoading(true);
      setError(''); // Clear any previous errors
      const response = await api.get('/google/sheets/list');
      setSpreadsheets(response.data.spreadsheets);
    } catch (error) {
      console.error('Error loading spreadsheets:', error);
      
      // Check for specific error types
      if (error.response?.data?.error === 'drive_api_not_enabled') {
        setError(
          'Google Drive API is not enabled. Please enable it in Google Cloud Console. ' +
          'This is a server configuration issue that needs to be fixed by an administrator.'
        );
      } else if (error.response?.data?.error === 'insufficient_scopes') {
        setError(error.response.data.message || 'Your Google account connection does not have the required permissions. Please disconnect and reconnect your Google account.');
      } else {
        setError(error.response?.data?.message || 'Failed to load Google Sheets. Please make sure your Google account is connected.');
      }
    } finally {
      setLoading(false);
    }
  };

  const selectSpreadsheet = async (spreadsheet) => {
    try {
      setLoading(true);
      setSelectedSpreadsheet(spreadsheet);
      
      const response = await api.get(`/google/sheets/${spreadsheet.id}/data`);
      setSpreadsheetData(response.data);
      setHeaders(response.data.headers);
      setRows(response.data.rows);
      
      setStep(2);
    } catch (error) {
      console.error('Error loading spreadsheet data:', error);
      setError('Failed to load spreadsheet data');
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
      
      const response = await api.post('/google/sheets/import', {
        spreadsheetId: selectedSpreadsheet.id,
        importType: importType,
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
      <h3 className="text-lg font-semibold text-gray-900">Select Google Spreadsheet</h3>
      <p className="text-sm text-gray-600">
        Choose the Google Spreadsheet you want to import data from.
      </p>
      
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader className="w-6 h-6 animate-spin text-blue-600" />
          <span className="ml-2 text-gray-600">Loading spreadsheets...</span>
        </div>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {spreadsheets.map((spreadsheet) => (
            <button
              key={spreadsheet.id}
              onClick={() => selectSpreadsheet(spreadsheet)}
              className="w-full text-left p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <FileSpreadsheet className="w-5 h-5 text-green-600" />
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">{spreadsheet.name}</h4>
                  <p className="text-sm text-gray-500">
                    Modified: {new Date(spreadsheet.modifiedTime).toLocaleDateString()}
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
        <h3 className="text-lg font-semibold text-gray-900">Preview Data</h3>
        <button
          onClick={() => setStep(1)}
          className="flex items-center space-x-2 text-sm text-gray-600 hover:text-gray-800"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Sheets</span>
        </button>
      </div>
      
      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="font-medium text-gray-900 mb-2">{selectedSpreadsheet?.name}</h4>
        <p className="text-sm text-gray-600">
          {spreadsheetData?.totalRows} rows found
        </p>
      </div>
      
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
          <h4 className="font-medium text-gray-900">Data Preview (first 10 rows)</h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                {headers.map((header, index) => (
                  <th key={index} className="px-3 py-2 text-left font-medium text-gray-700 border-r border-gray-200">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIndex) => (
                <tr key={rowIndex} className="border-b border-gray-200">
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex} className="px-3 py-2 text-gray-900 border-r border-gray-200">
                      {cell || '-'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
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
        Map the columns from your spreadsheet to the {importType} fields in Serviceflow.
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
                <option value="">Select column...</option>
                {headers.map((header, index) => (
                  <option key={index} value={header}>
                    {header}
                  </option>
                ))}
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
            <p className="text-sm text-gray-600">Skip rows that already exist</p>
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
            <p className="text-sm text-gray-600">Update existing records instead of skipping</p>
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
        <span>{loading ? 'Importing...' : `Import ${importType}`}</span>
      </button>
    </div>
  );

  if (step === 4 && !loading) {
    return (
      <div className="text-center py-8">
        <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Import Complete!</h3>
        <p className="text-gray-600">
          Your data has been successfully imported from Google Sheets.
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

export default GoogleSheetsImport;
