import React, { useState } from 'react';
import { ArrowLeft, FileText, AlertCircle, CheckCircle, Loader2, Upload, Download } from 'lucide-react';
import { customersAPI } from '../services/api';
import { Link } from 'react-router-dom';

const ImportCustomersPage = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [error, setError] = useState('');
  const [previewData, setPreviewData] = useState(null);
  const [showPreview, setShowPreview] = useState(false);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (file && file.type === "text/csv") {
      setSelectedFile(file);
      setError('');
      setImportResult(null);
      setShowPreview(false);
      setPreviewData(null);
      
      try {
        const text = await file.text();
        const customers = parseCSV(text);
        
        if (customers.length === 0) {
          setError("No valid customers found in the CSV file");
          return;
        }
        
        setPreviewData(customers);
        setShowPreview(true);
      } catch (error) {
        setError("Failed to read the CSV file. Please check the file format.");
      }
    }
  };

  const parseCSV = (csvText) => {
    const lines = csvText.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];
    
    // Parse CSV header
    const headers = parseCSVLine(lines[0]);
    const customers = [];
    
    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim()) {
        const values = parseCSVLine(lines[i]);
        const customer = {};
        
        headers.forEach((header, index) => {
          const value = values[index] || '';
          const headerLower = header.toLowerCase().trim();
          
          switch (headerLower) {
            case 'first name':
            case 'firstname':
              customer.firstName = value;
              break;
            case 'last name':
            case 'lastname':
              customer.lastName = value;
              break;
            case 'email':
              customer.email = value;
              break;
            case 'phone':
              customer.phone = value;
              break;
            case 'address':
              customer.address = value;
              break;
            case 'suite':
              customer.suite = value;
              break;
            case 'city':
              customer.city = value;
              break;
            case 'state':
              customer.state = value;
              break;
            case 'zip code':
            case 'zipcode':
            case 'zip':
              customer.zipCode = value;
              break;
            case 'notes':
              customer.notes = value;
              break;
            case 'status':
              // Only set status if it's a valid value
              if (value && ['active', 'inactive', 'pending'].includes(value.toLowerCase())) {
                customer.status = value.toLowerCase();
              } else {
                customer.status = 'active'; // default
              }
              break;
          }
        });
        
        if (customer.firstName && customer.lastName) {
          customers.push(customer);
        }
      }
    }
    
    return customers;
  };

  // Helper function to parse CSV line properly handling quoted values
  const parseCSVLine = (line) => {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current.trim());
    return result;
  };

  const handleImport = async () => {
    if (!previewData) return;
    
    setIsImporting(true);
    setError('');
    setImportResult(null);
    
    try {
      const result = await customersAPI.importCustomers(previewData);
      setImportResult(result);
    } catch (error) {
      console.error('Import error:', error);
      if (error.response?.data?.error) {
        setError(error.response.data.error);
      } else {
        setError("Failed to import customers. Please check your file format.");
      }
    } finally {
      setIsImporting(false);
    }
  };

  const downloadTemplate = () => {
    const templateData = [
      'First Name,Last Name,Email,Phone,Address,Suite,City,State,Zip Code,Notes,Status',
      'John,Doe,john@example.com,555-1234,123 Main St,Apt 1,Anytown,CA,12345,Customer notes,active',
      'Jane,Smith,jane@example.com,555-5678,456 Oak Ave,,Somewhere,NY,67890,Another customer,inactive'
    ].join('\n');
    
    const blob = new Blob([templateData], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'customers_template.csv';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  if (importResult) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center py-12">
            <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-6" />
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Import Complete!</h1>
            <p className="text-lg text-gray-600 mb-8">
              Your customer data has been successfully imported.
            </p>
            
            <div className="bg-green-50 border border-green-200 rounded-xl p-6 mb-8 max-w-2xl mx-auto">
              <h3 className="text-lg font-semibold text-green-800 mb-4">Import Summary</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                <div className="bg-white rounded-lg p-4">
                  <div className="text-2xl font-bold text-green-600">{importResult.imported}</div>
                  <div className="text-green-700">Imported</div>
                </div>
                {importResult.skipped > 0 && (
                  <div className="bg-white rounded-lg p-4">
                    <div className="text-2xl font-bold text-yellow-600">{importResult.skipped}</div>
                    <div className="text-yellow-700">Skipped</div>
                  </div>
                )}
                {importResult.errors && importResult.errors.length > 0 && (
                  <div className="bg-white rounded-lg p-4">
                    <div className="text-2xl font-bold text-red-600">{importResult.errors.length}</div>
                    <div className="text-red-700">Errors</div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/customers"
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
              >
                View Customers
              </Link>
              <button
                onClick={() => {
                  setImportResult(null);
                  setPreviewData(null);
                  setShowPreview(false);
                  setSelectedFile(null);
                }}
                className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Import More
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <Link
              to="/customers"
              className="flex items-center text-gray-600 hover:text-gray-800 transition-colors mr-4"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back to Customers
            </Link>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Import Customers</h1>
          <p className="text-gray-600 mt-2">
            Import your customer data from a CSV file into Serviceflow.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Instructions */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sticky top-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">How to Import</h2>
              
              <div className="space-y-6">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold">
                    1
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">Download Template</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Get our CSV template to see the correct format.
                    </p>
                    <button
                      onClick={downloadTemplate}
                      className="mt-2 inline-flex items-center text-sm text-blue-600 hover:text-blue-700"
                    >
                      <Download className="w-4 h-4 mr-1" />
                      Download Template
                    </button>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold">
                    2
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">Fill Template</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Add your customer data to the template file.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold">
                    3
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">Upload & Preview</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Upload your CSV file and review the data.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold">
                    4
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">Import Data</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Confirm the import to add customers to Serviceflow.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <h4 className="font-medium text-yellow-800 mb-2">Important Notes</h4>
                <ul className="text-sm text-yellow-700 space-y-1">
                  <li>• First Name and Last Name are required</li>
                  <li>• Email addresses should be valid</li>
                  <li>• Phone numbers should be at least 10 digits</li>
                  <li>• Status should be: active, inactive, or pending</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              {/* File Upload */}
              <div className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Upload CSV File</h2>
                
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors">
                  <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Choose CSV file</h3>
                  <p className="text-gray-600 mb-4">
                    Select a CSV file with your customer data
                  </p>
                  
                  <input
                    id="file-upload"
                    name="file-upload"
                    type="file"
                    accept=".csv"
                    onChange={handleFileChange}
                    className="sr-only"
                  />
                  <label
                    htmlFor="file-upload"
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer transition-colors"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Choose File
                  </label>
                  
                  {selectedFile && (
                    <p className="mt-4 text-sm text-gray-600">
                      Selected: {selectedFile.name}
                    </p>
                  )}
                </div>
              </div>

              {/* Error Display */}
              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="w-5 h-5 text-red-500" />
                    <p className="text-red-700 text-sm">{error}</p>
                  </div>
                </div>
              )}

              {/* Data Preview */}
              {showPreview && previewData && (
                <div className="mb-8">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold text-gray-900">Data Preview</h2>
                    <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                      {previewData.length} customers
                    </div>
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-6">
                    Review the data below before importing. Only customers with valid first and last names will be imported.
                  </p>
                  
                  <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b border-gray-200">
                          <tr>
                            <th className="px-4 py-3 text-left font-semibold text-gray-700 min-w-[100px]">First Name</th>
                            <th className="px-4 py-3 text-left font-semibold text-gray-700 min-w-[100px]">Last Name</th>
                            <th className="px-4 py-3 text-left font-semibold text-gray-700 min-w-[150px]">Email</th>
                            <th className="px-4 py-3 text-left font-semibold text-gray-700 min-w-[120px]">Phone</th>
                            <th className="px-4 py-3 text-left font-semibold text-gray-700 min-w-[200px]">Address</th>
                            <th className="px-4 py-3 text-left font-semibold text-gray-700 min-w-[100px]">City</th>
                            <th className="px-4 py-3 text-left font-semibold text-gray-700 min-w-[80px]">State</th>
                            <th className="px-4 py-3 text-left font-semibold text-gray-700 min-w-[100px]">Zip Code</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {previewData.slice(0, 20).map((customer, index) => (
                            <tr key={index} className="hover:bg-gray-50 transition-colors">
                              <td className="px-4 py-3 text-gray-900 font-medium">{customer.firstName || '-'}</td>
                              <td className="px-4 py-3 text-gray-900 font-medium">{customer.lastName || '-'}</td>
                              <td className="px-4 py-3 text-gray-700">{customer.email || '-'}</td>
                              <td className="px-4 py-3 text-gray-700">{customer.phone || '-'}</td>
                              <td className="px-4 py-3 text-gray-700 max-w-[200px] truncate" title={customer.address || ''}>
                                {customer.address || '-'}
                              </td>
                              <td className="px-4 py-3 text-gray-700">{customer.city || '-'}</td>
                              <td className="px-4 py-3 text-gray-700">{customer.state || '-'}</td>
                              <td className="px-4 py-3 text-gray-700">{customer.zipCode || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    
                    {previewData.length > 20 && (
                      <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
                        <div className="flex items-center justify-center text-sm text-gray-600">
                          <span className="bg-gray-200 rounded-full px-3 py-1">
                            ... and {previewData.length - 20} more customers
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <button
                      onClick={() => {
                        setShowPreview(false);
                        setPreviewData(null);
                        setSelectedFile(null);
                        document.getElementById('file-upload').value = '';
                      }}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
                    >
                      Choose Different File
                    </button>
                    
                    <div className="flex items-center space-x-4">
                      <div className="text-sm text-gray-600">
                        <span className="font-medium">{previewData.length}</span> customers ready to import
                      </div>
                      <button
                        onClick={handleImport}
                        disabled={isImporting}
                        className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 transition-colors"
                      >
                        {isImporting ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Importing...</span>
                          </>
                        ) : (
                          <>
                            <FileText className="w-4 h-4" />
                            <span>Import {previewData.length} Customers</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImportCustomersPage;
