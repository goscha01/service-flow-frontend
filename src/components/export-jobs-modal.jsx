import React, { useState, useEffect } from 'react';
import { X, Download, Filter, Calendar, User, Building, FileText, AlertCircle } from 'lucide-react';
import { jobsAPI } from '../services/api';

const ExportJobsModal = ({ isOpen, onClose, initialFilters = {} }) => {
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    status: initialFilters.status || '',
    dateFrom: initialFilters.dateFrom || '',
    dateTo: initialFilters.dateTo || '',
    customerId: initialFilters.customerId || '',
    teamMemberId: initialFilters.teamMemberId || initialFilters.teamMember || '',
    territoryId: initialFilters.territoryId || '',
    invoiceStatus: initialFilters.invoiceStatus || '',
    paymentStatus: initialFilters.paymentStatus || initialFilters.paymentMethod || '',
    priority: initialFilters.priority || ''
  });

  // Update filters when initialFilters change
  useEffect(() => {
    if (isOpen && initialFilters) {
      setFilters({
        status: initialFilters.status || '',
        dateFrom: initialFilters.dateFrom || '',
        dateTo: initialFilters.dateTo || '',
        customerId: initialFilters.customerId || '',
        teamMemberId: initialFilters.teamMemberId || initialFilters.teamMember || '',
        territoryId: initialFilters.territoryId || '',
        invoiceStatus: initialFilters.invoiceStatus || '',
        paymentStatus: initialFilters.paymentStatus || initialFilters.paymentMethod || '',
        priority: initialFilters.priority || ''
      });
    }
  }, [isOpen, initialFilters]);

  // Options for filters
  const statusOptions = [
    { value: '', label: 'All Statuses' },
    { value: 'pending', label: 'Pending' },
    { value: 'in-progress', label: 'In Progress' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' }
  ];

  const invoiceStatusOptions = [
    { value: '', label: 'All Invoice Statuses' },
    { value: 'draft', label: 'Draft' },
    { value: 'sent', label: 'Sent' },
    { value: 'paid', label: 'Paid' },
    { value: 'overdue', label: 'Overdue' }
  ];

  const paymentStatusOptions = [
    { value: '', label: 'All Payment Statuses' },
    { value: 'pending', label: 'Pending' },
    { value: 'paid', label: 'Paid' },
    { value: 'partial', label: 'Partial' },
    { value: 'refunded', label: 'Refunded' }
  ];

  const priorityOptions = [
    { value: '', label: 'All Priorities' },
    { value: 'low', label: 'Low' },
    { value: 'normal', label: 'Normal' },
    { value: 'high', label: 'High' },
    { value: 'urgent', label: 'Urgent' }
  ];

  if (!isOpen) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleExport = async () => {
    setIsExporting(true);
    setError('');

    try {
      const csvData = await jobsAPI.export(filters);
      
      // Create and download the file
      const blob = new Blob([csvData], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `jobs_export_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      onClose();
    } catch (error) {
      console.error('Export error:', error);
      setError('Failed to export jobs. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const clearFilters = () => {
    setFilters({
      status: '',
      dateFrom: '',
      dateTo: '',
      customerId: '',
      teamMemberId: '',
      territoryId: '',
      invoiceStatus: '',
      paymentStatus: '',
      priority: ''
    });
  };

  const hasActiveFilters = Object.values(filters).some(value => value !== '');

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-xl w-full max-w-4xl relative my-6 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Export Jobs</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500 hover:bg-gray-100 p-1 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <p className="text-gray-600 text-sm mb-6">
            Choose filters to export specific jobs, or leave filters empty to export all jobs.
          </p>

          {/* Filters */}
          <div className="space-y-6 mb-8">
            <div className="flex items-center space-x-2 mb-4">
              <Filter className="w-5 h-5 text-gray-500" />
              <h3 className="text-lg font-medium text-gray-900">Export Filters (Optional)</h3>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="text-sm text-blue-600 hover:text-blue-700 ml-auto"
                >
                  Clear All Filters
                </button>
              )}
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 text-sm font-semibold">i</span>
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-blue-800 mb-1">Export Options</h4>
                  <p className="text-sm text-blue-700">
                    <strong>Export All Jobs:</strong> Leave all filters empty and click "Export Jobs"<br/>
                    <strong>Filtered Export:</strong> Use the filters below to export specific jobs
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Status Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Job Status
                </label>
                <select
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {statusOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date Range */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  From Date
                </label>
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  To Date
                </label>
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Invoice Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Invoice Status
                </label>
                <select
                  value={filters.invoiceStatus}
                  onChange={(e) => handleFilterChange('invoiceStatus', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {invoiceStatusOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Payment Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Status
                </label>
                <select
                  value={filters.paymentStatus}
                  onChange={(e) => handleFilterChange('paymentStatus', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {paymentStatusOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Priority */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Priority
                </label>
                <select
                  value={filters.priority}
                  onChange={(e) => handleFilterChange('priority', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {priorityOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Advanced Filters */}
            <div className="border-t pt-4">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Advanced Filters</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Customer ID
                  </label>
                  <input
                    type="text"
                    value={filters.customerId}
                    onChange={(e) => handleFilterChange('customerId', e.target.value)}
                    placeholder="Enter customer ID"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Team Member ID
                  </label>
                  <input
                    type="text"
                    value={filters.teamMemberId}
                    onChange={(e) => handleFilterChange('teamMemberId', e.target.value)}
                    placeholder="Enter team member ID"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Territory ID
                  </label>
                  <input
                    type="text"
                    value={filters.territoryId}
                    onChange={(e) => handleFilterChange('territoryId', e.target.value)}
                    placeholder="Enter territory ID"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
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

          {/* Export Summary */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h4 className="text-sm font-medium text-blue-800 mb-2">Export Summary</h4>
            <p className="text-sm text-blue-700">
              {hasActiveFilters 
                ? `Jobs matching your selected filters will be exported as a CSV file.`
                : `All jobs will be exported as a CSV file.`
              }
            </p>
            <p className="text-xs text-blue-600 mt-1">
              The export will include all job fields: Job ID, Customer Info, Service Details, Status, Dates, Team Member, Priority, Invoice/Payment Status, Financial Details, Address, Recurring Settings, and more.
            </p>
            {!hasActiveFilters && (
              <div className="mt-2 p-2 bg-green-100 border border-green-200 rounded text-xs text-green-700">
                <strong>Exporting All Jobs:</strong> No filters applied - all jobs in your account will be exported.
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between items-center">
            <div className="flex space-x-2">
              <button
                onClick={() => {
                  clearFilters();
                  handleExport();
                }}
                disabled={isExporting}
                className="px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                <Download className="w-4 h-4" />
                <span>Export All Jobs</span>
              </button>
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                disabled={isExporting}
              >
                Cancel
              </button>
              <button
                onClick={handleExport}
                disabled={isExporting}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {isExporting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Exporting...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>Export Jobs</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExportJobsModal;
