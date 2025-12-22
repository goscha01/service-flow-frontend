import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { FileSpreadsheet, CheckCircle, AlertCircle, Download, Upload, ArrowLeft } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import SheetsExport from '../../components/SheetsExport';
import GoogleSheetsImport from '../../components/GoogleSheetsImport';
import GoogleConnect from '../../components/GoogleConnect';
import api from '../../services/api';

const GoogleSheetsSettings = () => {
  const { user, refreshUserProfile } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('export'); // 'export' or 'import'

  useEffect(() => {
    // Check if Google account is connected
    const isConnected = !!user?.google_access_token;
    setConnected(isConnected);
    console.log('Google connection status:', { isConnected, hasToken: !!user?.google_access_token, userId: user?.id });
  }, [user]);

  // Handle OAuth callback from Google redirect
  useEffect(() => {
    const successParam = searchParams.get('success');
    const errorParam = searchParams.get('error');
    
    if (successParam === 'true') {
      setSuccess('Google account connected successfully!');
      // Refresh user profile to get updated Google token
      if (refreshUserProfile) {
        // Refresh user profile - this will update the user state in AuthContext
        refreshUserProfile(false).catch((error) => {
          console.error('Error refreshing user profile:', error);
        });
      }
      // Clear URL params
      navigate('/settings/google-sheets', { replace: true });
      setTimeout(() => setSuccess(''), 5000);
    } else if (errorParam) {
      const errorMessages = {
        'user_not_authenticated': 'You must be logged in to connect your Google account.',
        'invalid_client_credentials': 'Google OAuth configuration error. Please contact support.',
        'access_denied': 'Google account connection was cancelled.',
      };
      setError(errorMessages[errorParam] || 'Failed to connect Google account. Please try again.');
      // Clear URL params
      navigate('/settings/google-sheets', { replace: true });
      setTimeout(() => setError(''), 5000);
    }
  }, [searchParams, navigate]);

  const handleConnectError = (error) => {
    setError(error.message || 'Failed to connect Google account');
    setTimeout(() => setError(''), 5000);
  };

  const handleDisconnect = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Clear Google tokens from database
      await api.put('/user/google-disconnect', {});
      
      setConnected(false);
      setSuccess('Google account disconnected successfully');
      setTimeout(() => setSuccess(''), 5000);
      
      // Refresh user data
      window.location.reload();
    } catch (error) {
      console.error('Disconnect error:', error);
      setError('Failed to disconnect Google account');
      setTimeout(() => setError(''), 5000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/settings')}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Settings</span>
          </button>
          <div className="flex items-center space-x-3 mb-2">
            <FileSpreadsheet className="w-8 h-8 text-green-600" />
            <h1 className="text-3xl font-bold text-gray-900">Google Sheets Integration</h1>
          </div>
          <p className="text-gray-600">
            Export your data to Google Sheets or import data from existing spreadsheets.
          </p>
        </div>

        {/* Connection Status */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className={`w-3 h-3 rounded-full ${connected ? 'bg-green-500' : 'bg-gray-400'}`} />
              <h3 className="text-lg font-semibold text-gray-900">
                {connected ? 'Connected' : 'Not Connected'}
              </h3>
            </div>
            {connected ? (
              <button
                onClick={handleDisconnect}
                disabled={loading}
                className="px-4 py-2 text-sm text-red-600 hover:text-red-800 border border-red-300 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
              >
                {loading ? 'Disconnecting...' : 'Disconnect'}
              </button>
            ) : (
              <div>
                {process.env.REACT_APP_GOOGLE_CLIENT_ID ? (
                  <>
                    <GoogleConnect
                      onSuccess={async () => {
                        // This won't be called with authorization code flow (redirect)
                        // The success is handled via URL query params above
                      }}
                      onError={handleConnectError}
                      buttonText="Connect Google Account"
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      Clicking the button will redirect you to Google to authorize access. 
                      You'll be redirected back after authorization.
                    </p>
                  </>
                ) : (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-sm font-medium text-red-800 mb-1">Configuration Required</h4>
                        <p className="text-sm text-red-700">
                          Google Client ID is not configured. Please set <code className="bg-red-100 px-1 rounded">REACT_APP_GOOGLE_CLIENT_ID</code> in your environment variables to enable Google Sheets integration.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {connected ? (
            <div className="flex items-center space-x-2 text-green-600">
              <CheckCircle className="w-5 h-5" />
              <span className="text-sm">Your Google account is connected and ready to use.</span>
            </div>
          ) : (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-yellow-800 mb-1">Connect Your Google Account</h4>
                  <p className="text-sm text-yellow-700">
                    To use Google Sheets integration, you need to connect your Google account. 
                    This will allow you to export data to Google Sheets and import data from existing spreadsheets.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Success/Error Messages */}
        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center space-x-2 text-green-700">
              <CheckCircle className="w-5 h-5" />
              <span>{success}</span>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center space-x-2 text-red-700">
              <AlertCircle className="w-5 h-5" />
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              <button
                onClick={() => setActiveTab('export')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'export'
                    ? 'border-green-600 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Download className="w-4 h-4" />
                  <span>Export to Sheets</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('import')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'import'
                    ? 'border-green-600 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Upload className="w-4 h-4" />
                  <span>Import from Sheets</span>
                </div>
              </button>
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'export' ? (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Export Data to Google Sheets</h3>
                  <p className="text-gray-600 text-sm mb-6">
                    Export your customers or jobs data directly to a new Google Spreadsheet.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Export Customers */}
                  <div className="border border-gray-200 rounded-lg p-6">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Download className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">Export Customers</h4>
                        <p className="text-sm text-gray-600">Export all customer data</p>
                      </div>
                    </div>
                    <SheetsExport
                      exportType="customers"
                      onSuccess={(result) => {
                        setSuccess(`Customers exported successfully! Opening spreadsheet...`);
                        if (result.spreadsheetUrl) {
                          window.open(result.spreadsheetUrl, '_blank');
                        }
                        setTimeout(() => setSuccess(''), 5000);
                      }}
                      onError={(error) => {
                        setError(error.response?.data?.error || 'Failed to export customers');
                        setTimeout(() => setError(''), 5000);
                      }}
                    />
                  </div>

                  {/* Export Jobs */}
                  <div className="border border-gray-200 rounded-lg p-6">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                        <Download className="w-5 h-5 text-purple-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">Export Jobs</h4>
                        <p className="text-sm text-gray-600">Export all job data</p>
                      </div>
                    </div>
                    <SheetsExport
                      exportType="jobs"
                      onSuccess={(result) => {
                        setSuccess(`Jobs exported successfully! Opening spreadsheet...`);
                        if (result.spreadsheetUrl) {
                          window.open(result.spreadsheetUrl, '_blank');
                        }
                        setTimeout(() => setSuccess(''), 5000);
                      }}
                      onError={(error) => {
                        setError(error.response?.data?.error || 'Failed to export jobs');
                        setTimeout(() => setError(''), 5000);
                      }}
                    />
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-blue-800 mb-2">How Export Works</h4>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>• A new Google Spreadsheet will be created automatically</li>
                    <li>• All your data will be formatted and organized in columns</li>
                    <li>• The spreadsheet will be accessible in your Google Drive</li>
                    <li>• You can share, edit, or download the spreadsheet anytime</li>
                  </ul>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Import Data from Google Sheets</h3>
                  <p className="text-gray-600 text-sm mb-6">
                    Import customers or jobs from an existing Google Spreadsheet. You'll be able to map fields manually.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Import Customers */}
                  <div className="border border-gray-200 rounded-lg p-6">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Upload className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">Import Customers</h4>
                        <p className="text-sm text-gray-600">Import customer data from a spreadsheet</p>
                      </div>
                    </div>
                    <GoogleSheetsImport
                      importType="customers"
                      onSuccess={(result) => {
                        setSuccess(`Successfully imported ${result.imported || 0} customers!`);
                        setTimeout(() => setSuccess(''), 5000);
                      }}
                      onError={(error) => {
                        setError(error.response?.data?.error || 'Failed to import customers');
                        setTimeout(() => setError(''), 5000);
                      }}
                    />
                  </div>

                  {/* Import Jobs */}
                  <div className="border border-gray-200 rounded-lg p-6">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                        <Upload className="w-5 h-5 text-purple-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">Import Jobs</h4>
                        <p className="text-sm text-gray-600">Import job data from a spreadsheet</p>
                      </div>
                    </div>
                    <GoogleSheetsImport
                      importType="jobs"
                      onSuccess={(result) => {
                        setSuccess(`Successfully imported ${result.imported || 0} jobs!`);
                        setTimeout(() => setSuccess(''), 5000);
                      }}
                      onError={(error) => {
                        setError(error.response?.data?.error || 'Failed to import jobs');
                        setTimeout(() => setError(''), 5000);
                      }}
                    />
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-blue-800 mb-2">How Import Works</h4>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>• Select a Google Spreadsheet from your Google Drive</li>
                    <li>• Preview the data to verify it looks correct</li>
                    <li>• Map spreadsheet columns to Serviceflow fields</li>
                    <li>• Choose to skip duplicates or update existing records</li>
                    <li>• Import your data with one click</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Help Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Need Help?</h3>
          <div className="space-y-3 text-sm text-gray-600">
            <p>
              <strong>Export:</strong> Your data will be exported to a new Google Spreadsheet. 
              The spreadsheet will be created in your Google Drive and you'll receive a link to open it.
            </p>
            <p>
              <strong>Import:</strong> You can import data from any Google Spreadsheet you have access to. 
              The import wizard will guide you through selecting the spreadsheet, previewing data, and mapping fields.
            </p>
            <p>
              <strong>Permissions:</strong> This integration requires access to your Google Sheets and Google Drive. 
              You can revoke access at any time in your Google account settings.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GoogleSheetsSettings;

