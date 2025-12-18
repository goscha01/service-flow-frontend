import React, { useState } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, Loader2, X, Eye, EyeOff } from 'lucide-react';
import * as XLSX from 'xlsx';
import api from '../services/api';

const BookingKoalaImport = ({ onSuccess, onError }) => {
  const [step, setStep] = useState(1); // 1: Upload, 2: Preview, 3: Import Settings, 4: Importing
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileData, setFileData] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [importSettings, setImportSettings] = useState({
    updateExisting: false,
    skipDuplicates: true
  });
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState('');

  // Booking Koala field mappings
  const customerFieldMappings = {
    'firstName': ['First Name', 'first_name', 'First Name', 'Customer First Name'],
    'lastName': ['Last Name', 'last_name', 'Last Name', 'Customer Last Name'],
    'email': ['Email', 'email', 'Email Address', 'Customer Email'],
    'phone': ['Phone', 'phone', 'Phone Number', 'Mobile', 'Customer Phone'],
    'address': ['Address', 'address', 'Street Address', 'Customer Address'],
    'city': ['City', 'city', 'Customer City'],
    'state': ['State', 'state', 'Customer State'],
    'zipCode': ['Zip Code', 'zip_code', 'Postal Code', 'Customer Zip'],
    'notes': ['Notes', 'notes', 'Comments', 'Customer Notes']
  };

  const jobFieldMappings = {
    'customerEmail': ['Customer Email', 'customer_email', 'Email'],
    'customerName': ['Customer Name', 'customer_name', 'Customer'],
    'serviceName': ['Service Name', 'service_name', 'Service', 'Service Type'],
    'scheduledDate': ['Scheduled Date', 'scheduled_date', 'Date', 'Appointment Date'],
    'scheduledTime': ['Scheduled Time', 'scheduled_time', 'Time', 'Appointment Time'],
    'status': ['Status', 'status', 'Job Status'],
    'price': ['Price', 'price', 'Amount', 'Total', 'Cost'],
    'address': ['Address', 'address', 'Service Address'],
    'city': ['City', 'city', 'Service City'],
    'state': ['State', 'state', 'Service State'],
    'zipCode': ['Zip Code', 'zip_code', 'Service Zip'],
    'notes': ['Notes', 'notes', 'Description', 'Job Notes'],
    'duration': ['Duration', 'duration', 'Estimated Duration'],
    'isRecurring': ['Is Recurring', 'is_recurring', 'Recurring'],
    'recurringFrequency': ['Recurring Frequency', 'recurring_frequency', 'Frequency']
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setSelectedFile(file);
    setError('');
    setFileData(null);
    setPreviewData(null);

    try {
      if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
        const text = await file.text();
        const data = parseCSV(text);
        setFileData(data);
        setPreviewData(data.slice(0, 10)); // Preview first 10 rows
        setStep(2);
      } else if (
        file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        file.type === 'application/vnd.ms-excel' ||
        file.name.endsWith('.xlsx') ||
        file.name.endsWith('.xls')
      ) {
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(firstSheet);
        setFileData(data);
        setPreviewData(data.slice(0, 10)); // Preview first 10 rows
        setStep(2);
      } else {
        setError('Please upload a CSV or Excel file (.csv, .xlsx, .xls)');
      }
    } catch (err) {
      console.error('Error reading file:', err);
      setError('Failed to read file. Please check the file format.');
    }
  };

  const parseCSV = (text) => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length === 0) return [];

    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    const data = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
      const row = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      data.push(row);
    }

    return data;
  };

  const detectDataType = () => {
    if (!fileData || fileData.length === 0) return null;

    const firstRow = fileData[0];
    const keys = Object.keys(firstRow);

    // Check if it looks like customer data
    const customerIndicators = ['email', 'Email', 'first_name', 'First Name', 'customer_email', 'Customer Email'];
    const hasCustomerFields = customerIndicators.some(indicator => keys.some(k => k.toLowerCase().includes(indicator.toLowerCase())));

    // Check if it looks like job data
    const jobIndicators = ['service', 'Service', 'scheduled_date', 'Scheduled Date', 'appointment', 'Appointment'];
    const hasJobFields = jobIndicators.some(indicator => keys.some(k => k.toLowerCase().includes(indicator.toLowerCase())));

    if (hasCustomerFields && hasJobFields) {
      return 'both'; // Contains both customers and jobs
    } else if (hasCustomerFields) {
      return 'customers';
    } else if (hasJobFields) {
      return 'jobs';
    }

    return 'unknown';
  };

  const mapFields = (data, dataType) => {
    const mapped = [];
    const mappings = dataType === 'customers' ? customerFieldMappings : jobFieldMappings;

    data.forEach(row => {
      const mappedRow = {};
      Object.entries(mappings).forEach(([targetField, possibleSources]) => {
        for (const source of possibleSources) {
          if (row[source] !== undefined && row[source] !== null && row[source] !== '') {
            mappedRow[targetField] = row[source];
            break;
          }
        }
      });
      mapped.push(mappedRow);
    });

    return mapped;
  };

  const handleImport = async () => {
    if (!fileData || fileData.length === 0) {
      setError('No data to import');
      return;
    }

    setIsImporting(true);
    setError('');
    setStep(4);

    try {
      const dataType = detectDataType();
      let customers = [];
      let jobs = [];

      if (dataType === 'customers' || dataType === 'both') {
        const customerData = dataType === 'both' 
          ? fileData.filter(row => {
              const keys = Object.keys(row);
              return keys.some(k => k.toLowerCase().includes('email') || k.toLowerCase().includes('first name'));
            })
          : fileData;
        customers = mapFields(customerData, 'customers');
      }

      if (dataType === 'jobs' || dataType === 'both') {
        const jobData = dataType === 'both'
          ? fileData.filter(row => {
              const keys = Object.keys(row);
              return keys.some(k => k.toLowerCase().includes('service') || k.toLowerCase().includes('scheduled'));
            })
          : fileData;
        jobs = mapFields(jobData, 'jobs');
      }

      const response = await api.post('/booking-koala/import', {
        customers: customers.length > 0 ? customers : undefined,
        jobs: jobs.length > 0 ? jobs : undefined,
        importSettings
      });

      if (response.data.success) {
        onSuccess({
          imported: (response.data.results.customers.imported || 0) + (response.data.results.jobs.imported || 0),
          skipped: (response.data.results.customers.skipped || 0) + (response.data.results.jobs.skipped || 0),
          errors: [
            ...(response.data.results.customers.errors || []),
            ...(response.data.results.jobs.errors || [])
          ]
        });
      } else {
        throw new Error('Import failed');
      }
    } catch (err) {
      console.error('Import error:', err);
      setError(err.response?.data?.error || err.message || 'Failed to import data');
      setStep(3);
    } finally {
      setIsImporting(false);
    }
  };

  if (step === 1) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Upload Booking Koala Export File</h2>
        <p className="text-gray-600 mb-6">
          Upload a CSV or Excel file exported from Booking Koala. The system will automatically detect and map customer and job data.
        </p>

        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors">
          <input
            type="file"
            id="file-upload"
            accept=".csv,.xlsx,.xls"
            onChange={handleFileChange}
            className="hidden"
          />
          <label htmlFor="file-upload" className="cursor-pointer">
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-2">
              <span className="text-blue-600 hover:text-blue-700">Click to upload</span> or drag and drop
            </p>
            <p className="text-sm text-gray-500">CSV or Excel files only</p>
          </label>
        </div>

        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <span className="text-red-600">{error}</span>
            </div>
          </div>
        )}

        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">Supported Fields</h3>
          <div className="grid grid-cols-2 gap-4 text-sm text-blue-800">
            <div>
              <p className="font-medium mb-1">Customer Fields:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>First Name, Last Name</li>
                <li>Email, Phone</li>
                <li>Address, City, State, Zip</li>
              </ul>
            </div>
            <div>
              <p className="font-medium mb-1">Job Fields:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Service Name, Scheduled Date/Time</li>
                <li>Status, Price, Address</li>
                <li>Notes, Duration</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (step === 2) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Preview Data</h2>
          <button
            onClick={() => {
              setStep(1);
              setSelectedFile(null);
              setFileData(null);
              setPreviewData(null);
            }}
            className="text-gray-600 hover:text-gray-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-gray-600 mb-4">
          Found {fileData?.length || 0} rows. Showing first 10 rows for preview.
        </p>

        {previewData && previewData.length > 0 && (
          <div className="overflow-x-auto mb-6">
            <table className="min-w-full divide-y divide-gray-200 border border-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {Object.keys(previewData[0]).map((key) => (
                    <th key={key} className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      {key}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {previewData.map((row, index) => (
                  <tr key={index}>
                    {Object.keys(previewData[0]).map((key) => (
                      <td key={key} className="px-4 py-2 text-sm text-gray-600">
                        {row[key] || '-'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex space-x-4">
          <button
            onClick={() => setStep(1)}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            Back
          </button>
          <button
            onClick={() => setStep(3)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Continue to Import Settings
          </button>
        </div>
      </div>
    );
  }

  if (step === 3) {
    const dataType = detectDataType();
    
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Import Settings</h2>
          <button
            onClick={() => setStep(2)}
            className="text-gray-600 hover:text-gray-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-6">
          <p className="text-gray-600 mb-4">
            Detected data type: <span className="font-semibold">
              {dataType === 'customers' ? 'Customers' : 
               dataType === 'jobs' ? 'Jobs' : 
               dataType === 'both' ? 'Customers & Jobs' : 
               'Unknown - will attempt to import'}
            </span>
          </p>

          <div className="space-y-4">
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={importSettings.skipDuplicates}
                onChange={(e) => setImportSettings({ ...importSettings, skipDuplicates: e.target.checked })}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-gray-700">Skip duplicate records</span>
            </label>

            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={importSettings.updateExisting}
                onChange={(e) => setImportSettings({ ...importSettings, updateExisting: e.target.checked })}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-gray-700">Update existing records (if duplicates found)</span>
            </label>
          </div>
        </div>

        <div className="flex space-x-4">
          <button
            onClick={() => setStep(2)}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            Back
          </button>
          <button
            onClick={handleImport}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2"
          >
            <span>Start Import</span>
          </button>
        </div>
      </div>
    );
  }

  if (step === 4) {
    return (
      <div className="bg-white rounded-lg shadow p-6 text-center">
        <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Importing Data...</h2>
        <p className="text-gray-600">Please wait while we import your Booking Koala data.</p>
      </div>
    );
  }

  return null;
};

export default BookingKoalaImport;

