import React, { useState } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, Loader2, X, Download, Info, ExternalLink } from 'lucide-react';
import * as XLSX from 'xlsx';
import api from '../../services/api';
import { useNavigate } from 'react-router-dom';

const BookingKoalaIntegration = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1: Overview, 2: Upload, 3: Preview, 4: Import Settings, 5: Importing, 6: Results
  const [importType, setImportType] = useState(null); // 'customers' or 'jobs'
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileData, setFileData] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [importSettings, setImportSettings] = useState({
    updateExisting: false,
    skipDuplicates: true
  });
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState('');
  const [importResult, setImportResult] = useState(null);
  const [importProgress, setImportProgress] = useState({
    customers: { current: 0, total: 0, imported: 0, skipped: 0, errors: 0 },
    jobs: { current: 0, total: 0, imported: 0, skipped: 0, errors: 0 }
  });

  // Booking Koala customer field mappings - based on actual customer export structure
  const customerFieldMappings = {
    'firstName': ['First Name', 'First name', 'first_name', 'firstName'],
    'lastName': ['Last Name', 'Last name', 'last_name', 'lastName'],
    'email': ['Email Address', 'Email', 'email', 'email_address'],
    'phone': ['Phone Number', 'Phone', 'phone', 'phone_number', 'mobile'],
    'additionalPhone': ['Additional Phone Number(s)', 'Additional Phone Number', 'additional_phone'],
    'address': ['Address', 'address', 'street_address'],
    'apt': ['Apt. No.', 'Apt', 'apt', 'Apt. No', 'apartment'],
    'city': ['City', 'city'],
    'state': ['State', 'state'],
    'zipCode': ['Zip/Postal Code', 'Zip/Postal code', 'Zip Code', 'zip_code', 'postal_code', 'Zip'],
    'companyName': ['Company Name', 'Company', 'company_name'],
    'notes': ['Note', 'Notes', 'notes', 'Private customer note'],
    'status': ['Status', 'status'],
    'tags': ['Tags', 'tags']
  };

  const jobFieldMappings = {
    'customerEmail': ['Email', 'email', 'Email Address'],
    'customerFirstName': ['First name', 'First Name', 'first_name', 'First name'],
    'customerLastName': ['Last name', 'Last Name', 'last_name', 'Last name'],
    'phone': ['Phone', 'phone', 'Phone Number', 'phone_number'],
    'address': ['Address', 'address', 'serviceAddress'],
    'apt': ['Apt', 'apt', 'Apt.', 'Apt. No.', 'apartment'],
    'city': ['City', 'city'],
    'state': ['State', 'state'],
    'zipCode': ['Zip/Postal code', 'Zip/Postal code', 'Zip Code', 'zip_code', 'Zip/Postal Code'],
    'companyName': ['Company name', 'Company Name', 'company_name'],
    'serviceName': ['Service', 'service', 'Service Name', 'service_name'],
    'scheduledDate': ['Date', 'date', 'Booking start date time', 'Booking start date time'],
    'scheduledTime': ['Time', 'time', 'Booking start date time', 'Booking end date time'],
    'bookingStartDateTime': ['Booking start date time', 'Booking start date time'],
    'bookingEndDateTime': ['Booking end date time', 'Booking end date time'],
    'status': ['Booking status', 'Booking status', 'Status', 'status'],
    'price': ['Final amount (USD)', 'Final amount (USD)', 'Service total (USD)', 'Service total (USD)', 'Price', 'price', 'Amount', 'amount'],
    'serviceTotal': ['Service total (USD)', 'Service total (USD)'],
    'finalAmount': ['Final amount (USD)', 'Final amount (USD)'],
    'address': ['Address', 'address'],
    'city': ['City', 'city'],
    'state': ['State', 'state'],
    'zipCode': ['Zip/Postal code', 'Zip/Postal code', 'Zip Code', 'zip_code'],
    'apt': ['Apt', 'apt', 'Apt.'],
    'notes': ['Booking note', 'Booking note', 'Private customer note', 'Provider note', 'Special notes', 'Notes', 'notes'],
    'bookingNote': ['Booking note', 'Booking note'],
    'providerNote': ['Provider note', 'Provider note'],
    'specialNotes': ['Special notes', 'Special notes'],
    'duration': ['Estimated job length (HH:MM)', 'Estimated job length (HH:MM)', 'Duration', 'duration'],
    'isRecurring': ['Frequency', 'frequency', 'Is Recurring', 'is_recurring'],
    'recurringFrequency': ['Frequency', 'frequency', 'Recurring Frequency', 'recurring_frequency'],
    'extras': ['Extras', 'extras'],
    'excludes': ['Excludes', 'excludes'],
    'assignedCrewExternalId': ['Provider details', 'Provider/team', 'assignedCrewExternalId'],
    'assignedCrewIds': ['Provider details', 'Provider/team', 'assignedCrewIds'],
    'serviceRegionExternalId': ['Location', 'Location id', 'serviceRegionExternalId']
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'].includes(file.type) &&
          !file.name.endsWith('.csv') && !file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
        setError('Please upload a CSV or Excel file (.csv, .xlsx, .xls)');
        return;
      }
      setSelectedFile(file);
      setError('');
      parseFile(file);
    }
  };

  const parseFile = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target.result;
        let workbook;
        
        if (file.name.endsWith('.csv')) {
          const text = data;
          // Proper CSV parsing that handles multi-line quoted fields
          // This is critical because Booking Koala exports have JSON in Provider details field that spans multiple lines
          const parseCSV = (csvText) => {
            const rows = [];
            let currentRow = [];
            let currentField = '';
            let inQuotes = false;
            let i = 0;
            
            while (i < csvText.length) {
              const char = csvText[i];
              const nextChar = i < csvText.length - 1 ? csvText[i + 1] : null;
              
              if (char === '"') {
                if (inQuotes && nextChar === '"') {
                  // Escaped quote (double quote inside quoted field) - add single quote to field
                  currentField += '"';
                  i += 2;
                } else {
                  // Toggle quote state (start or end of quoted field)
                  inQuotes = !inQuotes;
                  i++;
                }
              } else if (char === ',' && !inQuotes) {
                // Field separator (outside quotes)
                currentRow.push(currentField);
                currentField = '';
                i++;
              } else if ((char === '\n' || (char === '\r' && nextChar === '\n')) && !inQuotes) {
                // End of row (outside quotes)
                currentRow.push(currentField);
                if (currentRow.length > 0 && currentRow.some(f => f.trim() !== '')) {
                  rows.push(currentRow);
                }
                currentRow = [];
                currentField = '';
                if (char === '\r' && nextChar === '\n') {
                  i += 2; // Skip both \r and \n
                } else {
                  i++;
                }
              } else {
                // Regular character - add to current field
                currentField += char;
                i++;
              }
            }
            
            // Handle last field and row (if file doesn't end with newline)
            if (currentField !== '' || currentRow.length > 0) {
              currentRow.push(currentField);
            }
            if (currentRow.length > 0 && currentRow.some(f => f.trim() !== '')) {
              rows.push(currentRow);
            }
            
            return rows;
          };
          
          const parsedRows = parseCSV(text);
          if (parsedRows.length === 0) {
            setError('CSV file appears to be empty');
            return;
          }
          
          const headers = parsedRows[0].map(h => h.replace(/^"|"$/g, '').trim());
          const rows = parsedRows.slice(1).map(row => {
            const obj = {};
            headers.forEach((header, i) => {
              const value = (row[i] || '').replace(/^"|"$/g, '').trim();
              obj[header] = value;
            });
            return obj;
          });
          
          setFileData(rows);
          // Set preview data as raw for now, will be mapped in the preview step
          setPreviewData(rows.slice(0, 10));
        } else {
          workbook = XLSX.read(data, { type: 'binary' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);
          setFileData(jsonData);
          // Set preview data as raw for now, will be mapped in the preview step
          setPreviewData(jsonData.slice(0, 10));
        }
        setStep(3); // Go to preview step
      } catch (err) {
        console.error('Error parsing file:', err);
        setError('Failed to parse file. Please ensure it is a valid CSV or Excel file.');
      }
    };
    reader.onerror = () => {
      setError('Failed to read file. Please try again.');
    };
    
    if (file.name.endsWith('.csv')) {
      reader.readAsText(file);
    } else {
      reader.readAsBinaryString(file);
    }
  };

  const parseDateTime = (dateTimeStr, dateStr, timeStr) => {
    // Try Booking start date time first (ISO format)
    if (dateTimeStr) {
      try {
        const dt = new Date(dateTimeStr);
        if (!isNaN(dt.getTime())) {
          return {
            date: dt.toISOString().split('T')[0],
            time: dt.toTimeString().split(' ')[0].substring(0, 5)
          };
        }
      } catch (e) {
        // Continue to other methods
      }
    }
    
    // Try Date and Time fields separately
    if (dateStr && timeStr) {
      try {
        // Handle date formats like "10/02/2025"
        const dateParts = dateStr.split('/');
        if (dateParts.length === 3) {
          const month = dateParts[0].padStart(2, '0');
          const day = dateParts[1].padStart(2, '0');
          const year = dateParts[2];
          const date = `${year}-${month}-${day}`;
          
          // Handle time formats like "09:00 AM"
          let time = timeStr;
          if (timeStr.includes('AM') || timeStr.includes('PM')) {
            const [timePart, period] = timeStr.split(' ');
            const [hours, minutes] = timePart.split(':');
            let hour24 = parseInt(hours);
            if (period === 'PM' && hour24 !== 12) hour24 += 12;
            if (period === 'AM' && hour24 === 12) hour24 = 0;
            time = `${hour24.toString().padStart(2, '0')}:${minutes}`;
          }
          
          return { date, time };
        }
      } catch (e) {
        // Continue
      }
    }
    
    return { date: null, time: null };
  };

  const parseDuration = (durationStr) => {
    // Handle "HH:MM" format like "05:45"
    if (durationStr && durationStr.includes(':')) {
      const [hours, minutes] = durationStr.split(':');
      return (parseInt(hours) || 0) * 60 + (parseInt(minutes) || 0);
    }
    return null;
  };

  const parseRecurring = (frequencyStr) => {
    if (!frequencyStr) return { isRecurring: false, frequency: null };
    
    const freq = frequencyStr.toLowerCase();
    if (freq === 'one-time' || freq === 'onetime') {
      return { isRecurring: false, frequency: null };
    }
    
    // Map Booking Koala frequencies to our format
    const frequencyMap = {
      'weekly': 'weekly',
      'every other week': 'bi-weekly',
      'every 4 weeks': 'monthly',
      'every 2 weeks': 'bi-weekly'
    };
    
    for (const [key, value] of Object.entries(frequencyMap)) {
      if (freq.includes(key)) {
        return { isRecurring: true, frequency: value };
      }
    }
    
    return { isRecurring: true, frequency: 'custom' };
  };

  const mapFields = (data, type) => {
    const mappings = type === 'customers' ? customerFieldMappings : jobFieldMappings;
    return data.map(row => {
      const mapped = {};
      Object.keys(mappings).forEach(key => {
        const possibleNames = mappings[key];
        for (const name of possibleNames) {
          if (row[name] !== undefined && row[name] !== null && row[name] !== '') {
            const value = row[name];
            
            // Special handling for specific fields
            if (type === 'jobs') {
              if (key === 'scheduledDate' || key === 'scheduledTime') {
                const dt = parseDateTime(
                  row['Booking start date time'],
                  row['Date'],
                  row['Time']
                );
                if (key === 'scheduledDate') mapped['scheduledDate'] = dt.date;
                if (key === 'scheduledTime') mapped['scheduledTime'] = dt.time;
                continue;
              }
              
              if (key === 'duration') {
                const duration = parseDuration(value);
                if (duration) mapped[key] = duration;
                continue;
              }
              
              if (key === 'isRecurring' || key === 'recurringFrequency') {
                const recurring = parseRecurring(row['Frequency'] || value);
                if (key === 'isRecurring') mapped['isRecurring'] = recurring.isRecurring;
                if (key === 'recurringFrequency') mapped['recurringFrequency'] = recurring.frequency;
                continue;
              }
              
              // Combine multiple note fields
              if (key === 'notes') {
                const notes = [
                  row['Booking note'],
                  row['Private customer note'],
                  row['Provider note'],
                  row['Special notes']
                ].filter(n => n && n.trim()).join('\n\n');
                if (notes) mapped[key] = notes;
                continue;
              }
              
              // Map Booking status to our status
              if (key === 'status') {
                const statusMap = {
                  'Completed': 'completed',
                  'Upcoming': 'pending',
                  'Unassigned': 'pending',
                  'Cancelled': 'cancelled'
                };
                mapped[key] = statusMap[value] || value.toLowerCase() || 'pending';
                continue;
              }
              
              // Extract provider/team member info from Provider details JSON
              if (key === 'assignedCrewExternalId' || key === 'assignedCrewIds') {
                const providerDetails = row['Provider details'];
                if (providerDetails) {
                  try {
                    // Provider details is a non-standard JSON string like: "[{Id: 16, Name: 'Andrii Polovyi', ...}]"
                    // First, try to convert it to valid JSON by replacing unquoted keys
                    let jsonStr = providerDetails.trim();
                    if (jsonStr.startsWith('[') && jsonStr.endsWith(']')) {
                      // Replace unquoted keys with quoted keys
                      jsonStr = jsonStr.replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":');
                      // Replace single quotes with double quotes for string values
                      jsonStr = jsonStr.replace(/'/g, '"');
                      
                      const providers = JSON.parse(jsonStr);
                      if (Array.isArray(providers) && providers.length > 0) {
                        const providerIds = providers.map(p => {
                          // Try different ID field names
                          return p.Id || p.id || p['Id'] || p['Email Id'] || p['EmailId'];
                        }).filter(id => id);
                        
                        if (providerIds.length > 0) {
                          mapped['assignedCrewExternalId'] = providerIds[0].toString(); // First provider as primary
                          mapped['assignedCrewIds'] = providerIds.map(id => id.toString()); // All providers
                        }
                      }
                    }
                  } catch (e) {
                    console.warn('Failed to parse Provider details:', e, 'Raw value:', providerDetails);
                    // Fallback: try to extract ID from Provider/team field which has format like "16: Andrii Polovyi"
                    const providerTeam = row['Provider/team'] || row['Provider/team (without ids)'];
                    if (providerTeam) {
                      const match = providerTeam.match(/^(\d+):/);
                      if (match) {
                        mapped['assignedCrewExternalId'] = match[1];
                        mapped['assignedCrewIds'] = [match[1]];
                      }
                    }
                  }
                }
                continue;
              }
              
              // Extract location/territory info from Location field
              if (key === 'serviceRegionExternalId') {
                const location = row['Location'] || row['Location id'];
                if (location) {
                  // Use Location as external ID for territory creation
                  mapped['serviceRegionExternalId'] = location.toString();
                }
                continue;
              }
            }
            
            mapped[key] = value;
            break;
          }
        }
      });
      
      // For jobs, ensure we have date/time from Booking start date time if not already set
      if (type === 'jobs' && !mapped.scheduledDate && row['Booking start date time']) {
        const dt = parseDateTime(row['Booking start date time'], row['Date'], row['Time']);
        if (dt.date) mapped.scheduledDate = dt.date;
        if (dt.time) mapped.scheduledTime = dt.time;
      }
      
      // For jobs, also extract customer fields from the row (Booking Koala jobs CSV includes customer data)
      // This is critical - the jobs CSV has customer data embedded in each row
      // IMPORTANT: Always extract these fields to ensure backend can create customers on-the-fly
      if (type === 'jobs') {
        // Extract customer fields directly from CSV columns (try all possible variations)
        // CSV has: "First name", "Last name", "Email", "Phone", "Address", "Apt", "City", "State", "Zip/Postal code"
        // We MUST extract these even if empty, so backend knows they were attempted
        const firstName = row['First name'] || row['First Name'] || row['first name'] || row['firstName'] || row['first_name'] || '';
        const lastName = row['Last name'] || row['Last Name'] || row['last name'] || row['lastName'] || row['last_name'] || '';
        const email = row['Email'] || row['email'] || row['Email Address'] || row['email address'] || '';
        const phone = row['Phone'] || row['phone'] || row['Phone Number'] || row['phone number'] || '';
        const address = row['Address'] || row['address'] || '';
        const apt = row['Apt'] || row['apt'] || row['Apt. No.'] || row['Apt. No'] || row['apartment'] || '';
        const city = row['City'] || row['city'] || '';
        const state = row['State'] || row['state'] || '';
        const zipCode = row['Zip/Postal code'] || row['Zip/Postal Code'] || row['zip/postal code'] || row['Zip Code'] || row['zip code'] || '';
        const companyName = row['Company name'] || row['Company Name'] || row['company name'] || row['companyName'] || '';
        
        // ALWAYS set customer fields (even if empty) so backend receives them
        // Backend will validate and show appropriate errors if required fields are missing
        mapped['customerFirstName'] = firstName;
        mapped['customerLastName'] = lastName;
        mapped['customerEmail'] = email;
        if (phone) mapped['phone'] = phone;
        if (address) mapped['address'] = address;
        if (apt) mapped['apt'] = apt;
        if (city) mapped['city'] = city;
        if (state) mapped['state'] = state;
        if (zipCode) mapped['zipCode'] = zipCode;
        
        // ALSO preserve raw CSV column names as fallback (backend can use these directly)
        // This ensures backend can find fields even if mapped names don't work
        if (row['First name'] !== undefined) mapped['First name'] = row['First name'];
        if (row['Last name'] !== undefined) mapped['Last name'] = row['Last name'];
        if (row['Email'] !== undefined) mapped['Email'] = row['Email'];
        if (row['Phone'] !== undefined) mapped['Phone'] = row['Phone'];
        if (row['Address'] !== undefined) mapped['Address'] = row['Address'];
        if (row['Apt'] !== undefined) mapped['Apt'] = row['Apt'];
        if (row['City'] !== undefined) mapped['City'] = row['City'];
        if (row['State'] !== undefined) mapped['State'] = row['State'];
        if (row['Zip/Postal code'] !== undefined) mapped['Zip/Postal code'] = row['Zip/Postal code'];
        
        // Note: companyName not stored in customers table, but we extract it for completeness
      }
      
      return mapped;
    });
  };

  const handleImport = async () => {
    if (!fileData || fileData.length === 0) {
      setError('No data to import');
      return;
    }

    setIsImporting(true);
    setError('');
    setStep(5); // Importing step

    try {
      // Detect data type - Booking Koala has separate customer and job exports
      const keys = Object.keys(fileData[0] || {});
      
      // Check for customer-specific fields (from customer export)
      const hasCustomerOnlyFields = keys.some(k => {
        const lower = k.toLowerCase();
        return lower === 'email address' || 
               lower === 'phone number' ||
               lower === 'number of bookings' ||
               lower === 'number of active bookings' ||
               lower === 'referral code' ||
               lower === 'created on';
      });
      
      // Check for job-specific fields (from bookings export)
      const hasJobOnlyFields = keys.some(k => {
        const lower = k.toLowerCase();
        return lower.includes('booking start date time') ||
               lower.includes('booking end date time') ||
               lower.includes('booking status') ||
               lower.includes('final amount') ||
               lower.includes('service total') ||
               lower.includes('provider details') ||
               lower.includes('estimated job length');
      });
      
      // Check for general customer fields
      const hasCustomerFields = keys.some(k => {
        const lower = k.toLowerCase();
        return lower.includes('email') || 
               lower.includes('first name') || 
               lower.includes('last name') ||
               lower.includes('phone');
      });
      
      // Check for general job fields
      const hasJobFields = keys.some(k => {
        const lower = k.toLowerCase();
        return lower.includes('service') || 
               lower.includes('booking') ||
               lower.includes('date') ||
               lower.includes('time') ||
               lower.includes('status');
      });

      // Use the selected import type, or auto-detect if not set
      let dataType = importType || 'unknown';
      
      if (!importType) {
        // Auto-detect if import type wasn't selected
        if (hasCustomerOnlyFields) {
          dataType = 'customers';
        } else if (hasJobOnlyFields) {
          dataType = 'jobs';
        } else if (hasCustomerFields && hasJobFields) {
          dataType = 'both'; // Combined export
        } else if (hasJobFields) {
          dataType = 'jobs';
        } else if (hasCustomerFields) {
          dataType = 'customers';
        }
      }

      let customers = [];
      let jobs = [];

      // Process based on selected import type
      if (dataType === 'customers' || (dataType === 'both' && importType === 'customers')) {
        // Customer-only file - all rows are customers
        customers = mapFields(fileData, 'customers');
      } else if (dataType === 'jobs' || (dataType === 'both' && importType === 'jobs')) {
        // Job-only file - all rows are jobs
        jobs = mapFields(fileData, 'jobs');
      } else if (dataType === 'both' && !importType) {
        // Combined file - extract both (fallback if no type selected)
        const customerMap = new Map();
        fileData.forEach(row => {
          const email = (row['Email Address'] || row['Email'] || row.email || '').toLowerCase().trim();
          const firstName = row['First Name'] || row['First name'] || row.firstName || '';
          const lastName = row['Last Name'] || row['Last name'] || row.lastName || '';
          
          if (email || (firstName && lastName)) {
            const key = email || `${firstName} ${lastName}`.toLowerCase();
            if (!customerMap.has(key)) {
              customerMap.set(key, row);
            }
          }
        });
        customers = mapFields(Array.from(customerMap.values()), 'customers');
        jobs = mapFields(fileData, 'jobs');
      } else {
        throw new Error(`Unable to determine file type. Please ensure you've selected the correct import type and uploaded a valid ${importType || 'Booking Koala'} export file.`);
      }

      // Initialize progress
      setImportProgress({
        customers: { current: 0, total: customers.length, imported: 0, skipped: 0, errors: 0 },
        jobs: { current: 0, total: jobs.length, imported: 0, skipped: 0, errors: 0 }
      });

      // Use fetch API for streaming response with progress updates
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      // Get base URL - api.defaults.baseURL already includes '/api', so we need to remove it
      let apiBaseUrl = process.env.REACT_APP_API_URL;
      if (!apiBaseUrl && api.defaults?.baseURL) {
        apiBaseUrl = api.defaults.baseURL.replace('/api', '');
      }
      if (!apiBaseUrl) {
        apiBaseUrl = 'http://localhost:3000';
      }
      const response = await fetch(`${apiBaseUrl}/api/booking-koala/import`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          customers: customers.length > 0 ? customers : undefined,
          jobs: jobs.length > 0 ? jobs : undefined,
          importSettings
        })
      });

      if (!response.ok) {
        // Try to read error message
        try {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Import failed');
        } catch (e) {
          throw new Error('Import failed');
        }
      }

      // Read streaming response
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.trim()) {
            try {
              const progress = JSON.parse(line);
              if (progress.type === 'progress') {
                setImportProgress({
                  customers: progress.customers || { current: 0, total: customers.length, imported: 0, skipped: 0, errors: 0 },
                  jobs: progress.jobs || { current: 0, total: jobs.length, imported: 0, skipped: 0, errors: 0 }
                });
              } else if (progress.type === 'complete') {
                setImportResult({
                  imported: (progress.results.customers.imported || 0) + (progress.results.jobs.imported || 0),
                  skipped: (progress.results.customers.skipped || 0) + (progress.results.jobs.skipped || 0),
                  errors: [
                    ...(progress.results.customers.errors || []),
                    ...(progress.results.jobs.errors || [])
                  ]
                });
                setStep(6); // Results step
              } else if (progress.type === 'error') {
                throw new Error(progress.error || progress.message || 'Import failed');
              }
            } catch (e) {
              // Ignore JSON parse errors for incomplete chunks
              if (e.message && e.message !== 'Unexpected end of JSON input') {
                console.error('Error parsing progress:', e);
              }
            }
          }
        }
      }
    } catch (err) {
      console.error('Import error:', err);
      setError(err.response?.data?.error || err.message || 'Failed to import data');
      setStep(4);
    } finally {
      setIsImporting(false);
    }
  };

  const resetImport = () => {
    setStep(1);
    setImportType(null);
    setSelectedFile(null);
    setFileData(null);
    setPreviewData(null);
    setError('');
    setImportResult(null);
  };

  // Step 1: Overview/Introduction
  if (step === 1) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-6">
          <button
            onClick={() => navigate('/settings')}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 mb-4"
          >
            <span>← Back to Settings</span>
          </button>
          <div className="flex items-center space-x-4 mb-4">
            <div className="p-3 bg-orange-100 rounded-lg">
              <Upload className="w-8 h-8 text-orange-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Booking Koala Integration</h1>
              <p className="text-gray-600">Import your customers and jobs from Booking Koala</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">About Booking Koala Import</h2>
          <p className="text-gray-700 mb-4">
            Easily migrate your data from Booking Koala to ZenBooker. Choose what you want to import:
          </p>

          <div className="grid md:grid-cols-2 gap-4 mb-6">
            {/* Customer Import Card */}
            <div className="border-2 border-gray-200 rounded-lg p-6 hover:border-orange-400 transition-colors">
              <div className="flex items-center space-x-3 mb-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <FileText className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Import Customers</h3>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                Import customer data from Booking Koala customer export. Includes:
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm text-gray-700 mb-4">
                <li>Name, email, phone</li>
                <li>Address information</li>
                <li>Customer notes and tags</li>
              </ul>
              <button
                onClick={() => {
                  setImportType('customers');
                  setStep(2);
                }}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Import Customers
              </button>
            </div>

            {/* Job Import Card */}
            <div className="border-2 border-gray-200 rounded-lg p-6 hover:border-orange-400 transition-colors">
              <div className="flex items-center space-x-3 mb-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <FileText className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Import Jobs</h3>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                Import booking/job data from Booking Koala bookings export. Includes:
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm text-gray-700 mb-4">
                <li>Service details and scheduling</li>
                <li>Provider/team assignments</li>
                <li>Pricing and status</li>
                <li>Auto-creates team members & territories</li>
              </ul>
              <button
                onClick={() => {
                  setImportType('jobs');
                  setStep(2);
                }}
                className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
              >
                Import Jobs
              </button>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-start space-x-3">
              <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-blue-900 mb-1">How to Export from Booking Koala</h3>
                <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
                  <li>Log in to your Booking Koala account</li>
                  <li>Navigate to Reports or Export section</li>
                  <li>Export your <strong>customers</strong> or <strong>bookings</strong> data as CSV or Excel</li>
                  <li>Download the file to your computer</li>
                  <li>Choose the appropriate import type above and upload the file</li>
                </ol>
              </div>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-yellow-900 mb-1">Supported File Formats</h3>
                <p className="text-sm text-yellow-800">
                  CSV (.csv), Excel (.xlsx, .xls)
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Step 2: File Upload
  if (step === 2) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-6">
          <button
            onClick={() => {
              setStep(1);
              setImportType(null);
            }}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 mb-4"
          >
            <span>← Back</span>
          </button>
          <h1 className="text-2xl font-bold text-gray-900">
            Upload Booking Koala {importType === 'customers' ? 'Customers' : 'Jobs'} File
          </h1>
          <p className="text-gray-600 mt-2">
            {importType === 'customers' 
              ? 'Upload your Booking Koala customer export file'
              : 'Upload your Booking Koala bookings/jobs export file'}
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

        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-orange-400 transition-colors">
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileChange}
              className="hidden"
              id="file-upload"
            />
            <label
              htmlFor="file-upload"
              className="cursor-pointer flex flex-col items-center"
            >
              <Upload className="w-12 h-12 text-gray-400 mb-4" />
              <p className="text-lg font-medium text-gray-700 mb-2">
                Click to upload or drag and drop
              </p>
              <p className="text-sm text-gray-500">
                CSV or Excel files (.csv, .xlsx, .xls)
              </p>
            </label>
          </div>

          {selectedFile && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <FileText className="w-5 h-5 text-gray-600" />
                  <span className="text-sm font-medium text-gray-900">{selectedFile.name}</span>
                  <span className="text-xs text-gray-500">
                    {(selectedFile.size / 1024).toFixed(2)} KB
                  </span>
                </div>
                <button
                  onClick={() => {
                    setSelectedFile(null);
                    setFileData(null);
                    setPreviewData(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Step 3: Preview Data
  if (step === 3) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="mb-6">
          <button
            onClick={() => setStep(2)}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 mb-4"
          >
            <span>← Back</span>
          </button>
          <h1 className="text-2xl font-bold text-gray-900">
            Preview {importType === 'customers' ? 'Customers' : 'Jobs'} Data
          </h1>
          <p className="text-gray-600">Review the first 10 rows of your {importType === 'customers' ? 'customer' : 'job'} data</p>
        </div>

        {previewData && previewData.length > 0 && (() => {
          // Map the preview data to show the actual fields that will be imported
          const mappedPreview = mapFields(previewData, importType || 'jobs');
          const displayData = mappedPreview.slice(0, 10);
          
          if (displayData.length === 0 || !displayData[0]) {
            return (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <p className="text-yellow-800">No data could be mapped. Please check your file format.</p>
              </div>
            );
          }
          
          return (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden mb-6">
              <div className="p-4 bg-blue-50 border-b border-blue-200">
                <p className="text-sm text-blue-800">
                  <strong>Preview of mapped data:</strong> This shows how your data will be imported. 
                  Only the first 10 rows are shown.
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      {Object.keys(displayData[0]).map((key) => (
                        <th
                          key={key}
                          className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          {key}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {displayData.map((row, idx) => (
                      <tr key={idx}>
                        {Object.keys(displayData[0]).map((key) => {
                          const value = row[key];
                          // Handle objects/arrays by stringifying them for display
                          const displayValue = typeof value === 'object' && value !== null 
                            ? JSON.stringify(value) 
                            : (value || '-');
                          return (
                            <td key={key} className="px-4 py-3 text-sm text-gray-900 max-w-xs truncate" title={typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}>
                              {String(displayValue).substring(0, 100)}{String(displayValue).length > 100 ? '...' : ''}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })()}

        <div className="flex justify-end space-x-4">
          <button
            onClick={() => setStep(2)}
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={() => setStep(4)}
            className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
          >
            Continue to Import Settings
          </button>
        </div>
      </div>
    );
  }

  // Step 4: Import Settings
  if (step === 4) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-6">
          <button
            onClick={() => setStep(3)}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 mb-4"
          >
            <span>← Back</span>
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Import Settings</h1>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <span className="text-red-600">{error}</span>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Duplicate Handling</h2>
          
          <div className="space-y-4">
            <label className="flex items-start space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={importSettings.skipDuplicates}
                onChange={(e) => setImportSettings({ ...importSettings, skipDuplicates: e.target.checked })}
                className="mt-1"
              />
              <div>
                <span className="font-medium text-gray-900">Skip Duplicates</span>
                <p className="text-sm text-gray-600">
                  Skip records that already exist in your system
                </p>
              </div>
            </label>

            <label className="flex items-start space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={importSettings.updateExisting}
                onChange={(e) => setImportSettings({ ...importSettings, updateExisting: e.target.checked })}
                className="mt-1"
                disabled={!importSettings.skipDuplicates}
              />
              <div>
                <span className="font-medium text-gray-900">Update Existing Records</span>
                <p className="text-sm text-gray-600">
                  Update existing records with new data instead of skipping them
                </p>
              </div>
            </label>
          </div>
        </div>

        <div className="flex justify-end space-x-4">
          <button
            onClick={() => setStep(3)}
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            Back
          </button>
          <button
            onClick={handleImport}
            className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
          >
            Start Import
          </button>
        </div>
      </div>
    );
  }

  // Step 5: Importing
  if (step === 5) {
    const customersProgress = importProgress.customers.total > 0 
      ? (importProgress.customers.current / importProgress.customers.total) * 100 
      : 0;
    const jobsProgress = importProgress.jobs.total > 0 
      ? (importProgress.jobs.current / importProgress.jobs.total) * 100 
      : 0;
    const overallProgress = importProgress.customers.total + importProgress.jobs.total > 0
      ? ((importProgress.customers.current + importProgress.jobs.current) / (importProgress.customers.total + importProgress.jobs.total)) * 100
      : 0;

    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center py-8">
          <Loader2 className="w-16 h-16 text-orange-600 mx-auto mb-4 animate-spin" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Importing Data...</h1>
          <p className="text-gray-600 mb-6">Please wait while we import your Booking Koala data</p>
          
          {/* Overall Progress */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">Overall Progress</span>
              <span className="text-sm font-medium text-gray-700">{Math.round(overallProgress)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div 
                className="bg-orange-600 h-3 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${overallProgress}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {importProgress.customers.current + importProgress.jobs.current} of {importProgress.customers.total + importProgress.jobs.total} records processed
            </p>
          </div>

          {/* Customers Progress */}
          {importProgress.customers.total > 0 && (
            <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-blue-900">Customers</span>
                <span className="text-sm font-medium text-blue-900">{Math.round(customersProgress)}%</span>
              </div>
              <div className="w-full bg-blue-200 rounded-full h-2.5 overflow-hidden mb-2">
                <div 
                  className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${customersProgress}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-blue-700">
                <span>Processed: {importProgress.customers.current} / {importProgress.customers.total}</span>
                <span className="flex gap-4">
                  <span>✓ {importProgress.customers.imported}</span>
                  <span>⊘ {importProgress.customers.skipped}</span>
                  {importProgress.customers.errors > 0 && <span className="text-red-600">✗ {importProgress.customers.errors}</span>}
                </span>
              </div>
            </div>
          )}

          {/* Jobs Progress */}
          {importProgress.jobs.total > 0 && (
            <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-green-900">Jobs</span>
                <span className="text-sm font-medium text-green-900">{Math.round(jobsProgress)}%</span>
              </div>
              <div className="w-full bg-green-200 rounded-full h-2.5 overflow-hidden mb-2">
                <div 
                  className="bg-green-600 h-2.5 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${jobsProgress}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-green-700">
                <span>Processed: {importProgress.jobs.current} / {importProgress.jobs.total}</span>
                <span className="flex gap-4">
                  <span>✓ {importProgress.jobs.imported}</span>
                  <span>⊘ {importProgress.jobs.skipped}</span>
                  {importProgress.jobs.errors > 0 && <span className="text-red-600">✗ {importProgress.jobs.errors}</span>}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Step 6: Results
  if (step === 6 && importResult) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center py-8">
          <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {importType === 'customers' ? 'Customers' : 'Jobs'} Import Complete!
          </h1>
          <p className="text-gray-600 mb-4">
            Successfully imported {importType === 'customers' ? 'customer' : 'job'} data from Booking Koala
          </p>
          
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6 mt-6">
            <h3 className="text-lg font-semibold text-green-800 mb-4">Import Summary</h3>
            <div className="space-y-2 text-sm text-green-700">
              <p><strong>Imported:</strong> {importResult.imported} {importType === 'customers' ? 'customers' : 'jobs'}</p>
              {importResult.skipped > 0 && (
                <p><strong>Skipped:</strong> {importResult.skipped} duplicates</p>
              )}
              {importResult.errors && importResult.errors.length > 0 && (
                <div className="mt-4">
                  <p><strong>Errors:</strong> {importResult.errors.length} records failed</p>
                  <details className="mt-2">
                    <summary className="cursor-pointer text-green-800 font-medium">View Error Details</summary>
                    <ul className="list-disc list-inside mt-2 space-y-1 text-xs">
                      {importResult.errors.slice(0, 10).map((error, idx) => (
                        <li key={idx}>{error}</li>
                      ))}
                      {importResult.errors.length > 10 && (
                        <li>... and {importResult.errors.length - 10} more errors</li>
                      )}
                    </ul>
                  </details>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex space-x-4 justify-center">
            <button
              onClick={resetImport}
              className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
            >
              Import More Data
            </button>
            <button
              onClick={() => navigate('/settings')}
              className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              Back to Settings
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default BookingKoalaIntegration;


