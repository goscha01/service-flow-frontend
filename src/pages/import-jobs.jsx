import React, { useState } from 'react';
import { ArrowLeft, FileText, AlertCircle, CheckCircle, Loader2, Upload, Download } from 'lucide-react';
import { jobsAPI } from '../services/api';
import { Link } from 'react-router-dom';

const ImportJobsPage = () => {
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
        const jobs = parseCSV(text);
        
        if (jobs.length === 0) {
          setError("No valid jobs found in the CSV file");
          return;
        }
        
        setPreviewData(jobs);
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
    const jobs = [];
    
    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim()) {
        const values = parseCSVLine(lines[i]);
        const job = {};
        
        headers.forEach((header, index) => {
          const value = values[index] || '';
          const headerLower = header.toLowerCase().trim();
          
          switch (headerLower) {
            case 'job id':
            case 'jobid':
              job.jobId = value;
              break;
            case 'customer name':
            case 'customername':
              job.customerName = value;
              break;
            case 'customer email':
            case 'customeremail':
              job.customerEmail = value;
              break;
            case 'customer phone':
            case 'customerphone':
              job.customerPhone = value;
              break;
            case 'service name':
            case 'servicename':
              job.serviceName = value;
              break;
            case 'service price':
            case 'serviceprice':
              job.servicePrice = value;
              break;
            case 'duration':
              job.duration = value;
              break;
            case 'status':
              job.status = value;
              break;
            case 'scheduled date':
            case 'scheduleddate':
              job.scheduledDate = value;
              break;
            case 'team member':
            case 'teammember':
              job.teamMemberName = value;
              break;
            case 'priority':
              job.priority = value;
              break;
            case 'invoice status':
            case 'invoicestatus':
              job.invoiceStatus = value;
              break;
            case 'payment status':
            case 'paymentstatus':
              job.paymentStatus = value;
              break;
            case 'total amount':
            case 'totalamount':
              job.total = value;
              break;
            case 'notes':
              job.notes = value;
              break;
            case 'service address':
            case 'serviceaddress':
              job.serviceAddress = value;
              break;
            case 'city':
              job.serviceAddressCity = value;
              break;
            case 'state':
              job.serviceAddressState = value;
              break;
            case 'service address zip':
            case 'serviceaddresszip':
            case 'zip code':
            case 'zipcode':
              job.serviceAddressZip = value;
              break;
            case 'service address country':
            case 'serviceaddresscountry':
              job.serviceAddressCountry = value;
              break;
            case 'price':
              job.price = value;
              break;
            case 'discount':
              job.discount = value;
              break;
            case 'additional fees':
            case 'additionalfees':
              job.additionalFees = value;
              break;
            case 'taxes':
              job.taxes = value;
              break;
            case 'payment method':
            case 'paymentmethod':
              job.paymentMethod = value;
              break;
            case 'territory':
              job.territory = value;
              break;
            case 'is recurring':
            case 'isrecurring':
              job.isRecurring = value.toLowerCase() === 'true';
              break;
            case 'schedule type':
            case 'scheduletype':
              job.scheduleType = value;
              break;
            case 'internal notes':
            case 'internalnotes':
              job.internalNotes = value;
              break;
            case 'special instructions':
            case 'specialinstructions':
              job.specialInstructions = value;
              break;
            case 'customer notes':
            case 'customernotes':
              job.customerNotes = value;
              break;
            case 'workers needed':
            case 'workersneeded':
              job.workersNeeded = value;
              break;
            case 'estimated duration':
            case 'estimatedduration':
              job.estimatedDuration = value;
              break;
            case 'quality check':
            case 'qualitycheck':
              job.qualityCheck = value.toLowerCase() === 'true';
              break;
            case 'photos required':
            case 'photosrequired':
              job.photosRequired = value.toLowerCase() === 'true';
              break;
            case 'customer signature':
            case 'customersignature':
              job.customerSignature = value.toLowerCase() === 'true';
              break;
            case 'auto invoice':
            case 'autoinvoice':
              job.autoInvoice = value.toLowerCase() === 'true';
              break;
            case 'auto reminders':
            case 'autoreminders':
              job.autoReminders = value.toLowerCase() === 'true';
              break;
            case 'tags':
              job.tags = value;
              break;
            case 'recurring frequency':
            case 'recurringfrequency':
              job.recurringFrequency = value;
              break;
            case 'recurring end date':
            case 'recurringenddate':
              job.recurringEndDate = value;
              break;
            default:
              // Unknown header, skip
              break;
          }
        });
        
        // Validate required fields
        if (!job.customerEmail && !job.customerName) {
          console.warn(`Row ${i + 1}: Skipping job - no customer email or name provided`);
          continue;
        }
        
        // Validate status
        const validStatuses = ['pending', 'in-progress', 'completed', 'cancelled'];
        if (job.status && !validStatuses.includes(job.status.toLowerCase())) {
          console.warn(`Row ${i + 1}: Invalid status "${job.status}", defaulting to "pending"`);
          job.status = 'pending';
        }
        
        // Validate priority
        const validPriorities = ['low', 'normal', 'high', 'urgent'];
        if (job.priority && !validPriorities.includes(job.priority.toLowerCase())) {
          console.warn(`Row ${i + 1}: Invalid priority "${job.priority}", defaulting to "normal"`);
          job.priority = 'normal';
        }
        
        // Validate numeric fields
        if (job.price && isNaN(parseFloat(job.price))) {
          console.warn(`Row ${i + 1}: Invalid price "${job.price}", defaulting to 0`);
          job.price = '0';
        }
        
        if (job.total && isNaN(parseFloat(job.total))) {
          console.warn(`Row ${i + 1}: Invalid total "${job.total}", defaulting to price`);
          job.total = job.price || '0';
        }
        
        jobs.push(job);
      }
    }
    
    return jobs;
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
      const result = await jobsAPI.importJobs(previewData);
      setImportResult(result);
    } catch (error) {
      console.error('Import error:', error);
      if (error.response?.data?.error) {
        setError(error.response.data.error);
      } else {
        setError("Failed to import jobs. Please check your file format.");
      }
    } finally {
      setIsImporting(false);
    }
  };

  const downloadTemplate = () => {
    const templateData = [
      'Customer Email,Service Name,Service Price,Duration,Status,Scheduled Date,Team Member,Priority,Invoice Status,Payment Status,Total Amount,Notes,Service Address Street,Service Address City,Service Address State,Service Address Zip,Service Address Country,Price,Discount,Additional Fees,Taxes,Total,Payment Method,Schedule Type,Is Recurring,Recurring Frequency,Recurring End Date,Internal Notes,Customer Notes,Special Instructions,Workers Needed,Estimated Duration,Quality Check,Photos Required,Customer Signature,Auto Invoice,Auto Reminders,Tags',
      'john@example.com,House Cleaning,150,120,completed,2024-01-15 10:00:00,John Smith,normal,paid,paid,150,Regular cleaning service,123 Main St,Anytown,CA,12345,USA,150,0,0,0,150,cash,one-time,false,weekly,,Internal notes for staff,Customer special requests,Use eco-friendly products,1,120,true,true,false,true,true,["cleaning","residential"]',
      'jane@example.com,Lawn Care,75,60,pending,2024-01-20 14:00:00,Jane Doe,high,draft,pending,75,Weekly lawn maintenance,456 Oak Ave,Somewhere,NY,67890,USA,75,0,0,0,75,card,weekly,true,weekly,2024-12-31,Weekly service notes,Customer prefers morning service,Trim hedges weekly,1,60,true,false,false,true,true,["landscaping","weekly"]'
    ].join('\n');
    
    const blob = new Blob([templateData], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'jobs_template.csv';
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
              Your job data has been successfully imported.
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
                to="/jobs"
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
              >
                View Jobs
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
              to="/jobs"
              className="flex items-center text-gray-600 hover:text-gray-800 transition-colors mr-4"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back to Jobs
            </Link>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Import Jobs</h1>
          <p className="text-gray-600 mt-2">
            Import your job data from a CSV file into Serviceflow.
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
                      Add your job data to the template file.
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
                      Confirm the import to add jobs to Serviceflow.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <h4 className="font-medium text-yellow-800 mb-2">Important Notes</h4>
                <ul className="text-sm text-yellow-700 space-y-1">
                  <li>• Customer email is required</li>
                  <li>• Service name should match existing services</li>
                  <li>• Team member name should match existing team members</li>
                  <li>• Status should be: pending, in-progress, completed, cancelled</li>
                  <li>• Priority should be: low, normal, high, urgent</li>
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
                    Select a CSV file with your job data
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
                      {previewData.length} jobs
                    </div>
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-6">
                    Review the data below before importing. Only jobs with valid customer information will be imported.
                  </p>
                  
                  <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b border-gray-200">
                          <tr>
                            <th className="px-4 py-3 text-left font-semibold text-gray-700 min-w-[120px]">Customer Email</th>
                            <th className="px-4 py-3 text-left font-semibold text-gray-700 min-w-[150px]">Service Name</th>
                            <th className="px-4 py-3 text-left font-semibold text-gray-700 min-w-[100px]">Status</th>
                            <th className="px-4 py-3 text-left font-semibold text-gray-700 min-w-[120px]">Scheduled Date</th>
                            <th className="px-4 py-3 text-left font-semibold text-gray-700 min-w-[100px]">Team Member</th>
                            <th className="px-4 py-3 text-left font-semibold text-gray-700 min-w-[80px]">Priority</th>
                            <th className="px-4 py-3 text-left font-semibold text-gray-700 min-w-[100px]">Total</th>
                            <th className="px-4 py-3 text-left font-semibold text-gray-700 min-w-[120px]">Address</th>
                            <th className="px-4 py-3 text-left font-semibold text-gray-700 min-w-[100px]">Notes</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {previewData.slice(0, 20).map((job, index) => (
                            <tr key={index} className="hover:bg-gray-50 transition-colors">
                              <td className="px-4 py-3 text-gray-700">
                                <div className="max-w-[120px] truncate" title={job.customerEmail || '-'}>
                                  {job.customerEmail || '-'}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-gray-700">
                                <div className="max-w-[150px] truncate" title={job.serviceName || '-'}>
                                  {job.serviceName || '-'}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-gray-700">
                                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                                  job.status === 'completed' ? 'bg-green-100 text-green-800' :
                                  job.status === 'in-progress' ? 'bg-blue-100 text-blue-800' :
                                  job.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                  job.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {job.status || 'pending'}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-gray-700">
                                <div className="max-w-[120px] truncate" title={job.scheduledDate || '-'}>
                                  {job.scheduledDate || '-'}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-gray-700">
                                <div className="max-w-[100px] truncate" title={job.teamMemberName || '-'}>
                                  {job.teamMemberName || '-'}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-gray-700">
                                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                                  job.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                                  job.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                                  job.priority === 'normal' ? 'bg-blue-100 text-blue-800' :
                                  job.priority === 'low' ? 'bg-gray-100 text-gray-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {job.priority || 'normal'}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-gray-700 font-medium">
                                ${job.total || job.price || '0'}
                              </td>
                              <td className="px-4 py-3 text-gray-700">
                                <div className="max-w-[120px] truncate" title={`${job.serviceAddressStreet || ''} ${job.serviceAddressCity || ''} ${job.serviceAddressState || ''}`.trim() || '-'}>
                                  {`${job.serviceAddressStreet || ''} ${job.serviceAddressCity || ''} ${job.serviceAddressState || ''}`.trim() || '-'}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-gray-700">
                                <div className="max-w-[100px] truncate" title={job.notes || '-'}>
                                  {job.notes || '-'}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    
                    {previewData.length > 20 && (
                      <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
                        <div className="flex items-center justify-center text-sm text-gray-600">
                          <span className="bg-gray-200 rounded-full px-3 py-1">
                            ... and {previewData.length - 20} more jobs
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
                        <span className="font-medium">{previewData.length}</span> jobs ready to import
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
                            <span>Import {previewData.length} Jobs</span>
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

export default ImportJobsPage;
