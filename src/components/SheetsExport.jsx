import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { sheetsAPI } from '../services/api';
import { FileSpreadsheet, ExternalLink, Download, CheckCircle, AlertCircle } from 'lucide-react';

const SheetsExport = ({ exportType = 'customers', dateRange = null, onSuccess, onError }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [exported, setExported] = useState(false);
  const [error, setError] = useState('');
  const [exportUrl, setExportUrl] = useState('');

  const handleExport = async () => {
    setLoading(true);
    setError('');

    try {
      let result;
      
      if (exportType === 'customers') {
        result = await sheetsAPI.exportCustomers(user.id);
      } else if (exportType === 'jobs') {
        result = await sheetsAPI.exportJobs(user.id, dateRange);
      }

      console.log('✅ Sheets export successful:', result);
      setExported(true);
      setExportUrl(result.spreadsheetUrl);
      
      if (onSuccess) {
        onSuccess(result);
      }

    } catch (error) {
      console.error('❌ Sheets export error:', error);
      const errorMessage = error.response?.data?.error || 'Failed to export to Google Sheets';
      setError(errorMessage);
      
      if (onError) {
        onError(error);
      }
    } finally {
      setLoading(false);
    }
  };

  const getExportTitle = () => {
    switch (exportType) {
      case 'customers':
        return 'Export Customers to Google Sheets';
      case 'jobs':
        return 'Export Jobs to Google Sheets';
      default:
        return 'Export to Google Sheets';
    }
  };

  if (exported) {
    return (
      <div className="space-y-3">
        <div className="flex items-center space-x-2 text-green-600 bg-green-50 p-3 rounded-lg">
          <CheckCircle className="w-5 h-5" />
          <span className="text-sm font-medium">Exported to Google Sheets</span>
        </div>
        
        {exportUrl && (
          <a
            href={exportUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center space-x-2 text-blue-600 hover:text-blue-800 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            <span className="text-sm">Open in Google Sheets</span>
          </a>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <button
        onClick={handleExport}
        disabled={loading || !user?.google_access_token}
        className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <FileSpreadsheet className="w-4 h-4" />
        <span>{loading ? 'Exporting...' : getExportTitle()}</span>
      </button>

      {error && (
        <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-3 rounded-lg">
          <AlertCircle className="w-4 h-4" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {!user?.google_access_token && (
        <div className="text-sm text-gray-600 bg-yellow-50 p-3 rounded-lg">
          <p>⚠️ Google Sheets not connected. Please sign in with Google or connect your Google account in settings to export data to Google Sheets.</p>
          <div className="mt-2">
            <a 
              href="/signin" 
              className="text-blue-600 hover:text-blue-800 underline"
            >
              Sign in with Google
            </a>
            <span className="mx-2">or</span>
            <a 
              href="/settings" 
              className="text-blue-600 hover:text-blue-800 underline"
            >
              Connect Google Account
            </a>
          </div>
        </div>
      )}
    </div>
  );
};

export default SheetsExport;
