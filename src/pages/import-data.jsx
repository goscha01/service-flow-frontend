import React, { useState } from 'react';
import { FileSpreadsheet, Calendar, Download, CheckCircle, AlertCircle, Upload } from 'lucide-react';
import GoogleSheetsImport from '../components/GoogleSheetsImport';
import GoogleCalendarImport from '../components/GoogleCalendarImport';
import BookingKoalaImport from '../components/BookingKoalaImport';

const ImportDataPage = () => {
  const [importType, setImportType] = useState(null); // 'sheets-customers', 'sheets-jobs', 'calendar'
  const [importResult, setImportResult] = useState(null);
  const [error, setError] = useState('');

  const importOptions = [
    {
      id: 'sheets-customers',
      title: 'Import Customers from Google Sheets',
      description: 'Import customer data from a Google Spreadsheet',
      icon: FileSpreadsheet,
      color: 'green'
    },
    {
      id: 'sheets-jobs',
      title: 'Import Jobs from Google Sheets',
      description: 'Import job data from a Google Spreadsheet',
      icon: FileSpreadsheet,
      color: 'blue'
    },
    {
      id: 'calendar',
      title: 'Import Jobs from Google Calendar',
      description: 'Import calendar events as jobs',
      icon: Calendar,
      color: 'purple'
    },
    {
      id: 'booking-koala',
      title: 'Import from Booking Koala',
      description: 'Import customers and jobs from Booking Koala CSV/Excel export',
      icon: Upload,
      color: 'orange'
    }
  ];

  const handleImportSuccess = (result) => {
    setImportResult(result);
    setError('');
  };

  const handleImportError = (error) => {
    setError(error.message || 'Import failed');
    setImportResult(null);
  };

  const resetImport = () => {
    setImportType(null);
    setImportResult(null);
    setError('');
  };

  if (importResult) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center py-8">
          <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Import Successful!</h1>
          <p className="text-gray-600 mb-6">
            Your data has been successfully imported.
          </p>
          
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-green-800 mb-2">Import Summary</h3>
            <div className="space-y-2 text-sm text-green-700">
              <p><strong>Imported:</strong> {importResult.imported} records</p>
              {importResult.skipped > 0 && (
                <p><strong>Skipped:</strong> {importResult.skipped} duplicates</p>
              )}
              {importResult.errors && importResult.errors.length > 0 && (
                <p><strong>Errors:</strong> {importResult.errors.length} records failed</p>
              )}
            </div>
          </div>
          
          <div className="flex space-x-4 justify-center">
            <button
              onClick={resetImport}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Import More Data
            </button>
            <button
              onClick={() => window.location.href = '/dashboard'}
              className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (importType) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="mb-6">
          <button
            onClick={resetImport}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 mb-4"
          >
            <span>← Back to Import Options</span>
          </button>
          <h1 className="text-2xl font-bold text-gray-900">
            {importOptions.find(opt => opt.id === importType)?.title}
          </h1>
          <p className="text-gray-600">
            {importOptions.find(opt => opt.id === importType)?.description}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <span className="text-red-600">{error}</span>
            </div>
          </div>
        )}

        {importType === 'sheets-customers' && (
          <GoogleSheetsImport
            importType="customers"
            onSuccess={handleImportSuccess}
            onError={handleImportError}
          />
        )}

        {importType === 'sheets-jobs' && (
          <GoogleSheetsImport
            importType="jobs"
            onSuccess={handleImportSuccess}
            onError={handleImportError}
          />
        )}

        {importType === 'calendar' && (
          <GoogleCalendarImport
            onSuccess={handleImportSuccess}
            onError={handleImportError}
          />
        )}

        {importType === 'booking-koala' && (
          <BookingKoalaImport
            onSuccess={handleImportSuccess}
            onError={handleImportError}
          />
        )}
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Import Data</h1>
        <p className="text-gray-600">
          Import your existing data from Google Sheets or Google Calendar into Serviceflow.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {importOptions.map((option) => {
          const IconComponent = option.icon;
          return (
            <button
              key={option.id}
              onClick={() => setImportType(option.id)}
              className="p-6 border border-gray-200 rounded-lg hover:border-gray-300 hover:shadow-md transition-all text-left"
            >
              <div className="flex items-center space-x-4 mb-4">
                <div className={`p-3 rounded-lg bg-${option.color}-100`}>
                  <IconComponent className={`w-6 h-6 text-${option.color}-600`} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{option.title}</h3>
                </div>
              </div>
              <p className="text-gray-600 text-sm">{option.description}</p>
            </button>
          );
        })}
      </div>

      <div className="mt-12 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-2">How It Works</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm text-blue-800">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">1</div>
            <span>Connect your Google account</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">2</div>
            <span>Select your data source</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">3</div>
            <span>Map fields manually</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">4</div>
            <span>Import to Serviceflow</span>
          </div>
        </div>
      </div>

      <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-yellow-900 mb-2">Important Notes</h3>
        <ul className="text-sm text-yellow-800 space-y-1">
          <li>• You need to connect your Google account first</li>
          <li>• Field mapping is manual - you choose how to map your data</li>
          <li>• Duplicate records can be skipped or updated</li>
          <li>• Import history is saved for reference</li>
        </ul>
      </div>
    </div>
  );
};

export default ImportDataPage;
