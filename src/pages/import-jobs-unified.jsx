import React, { useState } from 'react';
import { ArrowLeft, FileText, AlertCircle, CheckCircle, Loader2, Upload, Download, Settings, Eye, EyeOff, ChevronDown, ChevronUp } from 'lucide-react';
import { jobsAPI } from '../services/api';
import { Link, useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';

const UnifiedImportJobsPage = () => {
  const navigate = useNavigate();
  const [selectedFile, setSelectedFile] = useState(null);
  const [sourceType, setSourceType] = useState('auto'); // 'auto', 'zenbooker', 'booking-koala', 'generic'
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [error, setError] = useState('');
  const [previewData, setPreviewData] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showFieldMapping, setShowFieldMapping] = useState(false);
  const [csvHeaders, setCsvHeaders] = useState([]);
  const [fieldMappings, setFieldMappings] = useState({});
  const [parsedJobs, setParsedJobs] = useState([]);
  const [importProgress, setImportProgress] = useState({
    current: 0,
    total: 0,
    percentage: 0,
    batchInfo: null
  });

  // Standard ZenBooker field names (target fields)
  const zenbookerFields = {
    // Customer fields
    customerFirstName: 'Customer First Name',
    customerLastName: 'Customer Last Name',
    customerEmail: 'Customer Email',
    customerPhone: 'Customer Phone',
    customerAddress: 'Customer Address',
    customerCity: 'Customer City',
    customerState: 'Customer State',
    customerZip: 'Customer Zip',
    
    // Job fields
    serviceName: 'Service Name',
    scheduledDate: 'Scheduled Date',
    scheduledTime: 'Scheduled Time',
    status: 'Status',
    price: 'Price',
    address: 'Service Address',
    city: 'Service City',
    state: 'Service State',
    zipCode: 'Service Zip Code',
    notes: 'Notes',
    duration: 'Duration (minutes)',
    isRecurring: 'Is Recurring',
    recurringFrequency: 'Recurring Frequency',
    _id: 'Job ID',
    jobRandomId: 'Job Random ID'
  };

  // Predefined mappings for known sources
  const predefinedMappings = {
    zenbooker: {
      customerFirstName: ['customer_name', 'Customer Name', 'customerName'],
      customerLastName: ['customer_name', 'Customer Name', 'customerName'],
      customerEmail: ['customer_email_text', 'Customer Email', 'customerEmail'],
      customerPhone: ['customer_phone_text', 'Customer Phone', 'customerPhone'],
      serviceName: ['service_selected_text', 'Service', 'serviceName'],
      scheduledDate: ['start_time_for_full_cal_date', 'Scheduled Date', 'scheduledDate'],
      price: ['price_number', 'Price', 'price'],
      address: ['job_address_geographic_address', 'Address', 'address'],
      status: ['live_status_text', 'Status', 'status'],
      _id: ['_id', 'ID', 'id']
    },
    'booking-koala': {
      customerFirstName: ['First name', 'First Name', 'first_name', 'firstName'],
      customerLastName: ['Last name', 'Last Name', 'last_name', 'lastName'],
      customerFullName: ['Full name', 'Full Name', 'full_name', 'fullName'],
      customerEmail: ['Email', 'Email Address', 'email'],
      customerPhone: ['Phone', 'Phone Number', 'phone'],
      serviceName: ['Service', 'Service Name', 'service'],
      scheduledDate: ['Booking start date time', 'Date', 'scheduledDate'],
      scheduledTime: ['Booking start date time', 'Time', 'scheduledTime'],
      bookingStartDateTime: ['Booking start date time', 'Booking start date time'],
      date: ['Date', 'date'],
      time: ['Time', 'time'],
      price: ['Final amount (USD)', 'Price', 'price'],
      address: ['Address', 'address'],
      city: ['City', 'city'],
      state: ['State', 'state'],
      zipCode: ['Zip/Postal code', 'Zip Code', 'zipCode', 'Zip/Postal code'],
      status: ['Booking status', 'Status', 'status']
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'].includes(file.type) &&
        !file.name.endsWith('.csv') && !file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      setError('Please upload a CSV or Excel file (.csv, .xlsx, .xls)');
      return;
    }

    setSelectedFile(file);
    setError('');
    setImportResult(null);
    setShowPreview(false);
    setPreviewData(null);
    setFieldMappings({});
    setShowFieldMapping(false);

    try {
      // Parse file based on type
      let rows = [];
      let headers = [];

      if (file.name.endsWith('.csv')) {
        const text = await file.text();
        if (!text || !text.trim()) {
          setError('CSV file is empty');
          return;
        }
        
        // Parse entire CSV text properly handling multi-line quoted fields
        const parseCSV = (csvText) => {
          const result = [];
          let currentRow = [];
          let currentField = '';
          let inQuotes = false;
          let i = 0;
          
          while (i < csvText.length) {
            const char = csvText[i];
            const nextChar = csvText[i + 1];
            
            if (char === '"') {
              // Check for escaped quotes ("")
              if (inQuotes && nextChar === '"') {
                currentField += '"';
                i += 2; // Skip both quotes
                continue;
              } else {
                inQuotes = !inQuotes;
                i++;
                continue;
              }
            }
            
            if (char === ',' && !inQuotes) {
              // End of field
              currentRow.push(currentField.trim());
              currentField = '';
              i++;
              continue;
            }
            
            if ((char === '\n' || char === '\r') && !inQuotes) {
              // End of row (handle both \n and \r\n)
              if (char === '\r' && nextChar === '\n') {
                i += 2; // Skip \r\n
              } else {
                i++; // Skip \n
              }
              
              // Add the last field of the row
              if (currentField.length > 0 || currentRow.length > 0) {
                currentRow.push(currentField.trim());
                // Only add row if it has data
                if (currentRow.some(field => field.length > 0)) {
                  result.push(currentRow);
                }
                currentRow = [];
                currentField = '';
              }
              continue;
            }
            
            // Regular character
            currentField += char;
            i++;
          }
          
          // Add the last field and row if exists
          if (currentField.length > 0 || currentRow.length > 0) {
            currentRow.push(currentField.trim());
            if (currentRow.some(field => field.length > 0)) {
              result.push(currentRow);
            }
          }
          
          return result;
        };

        const parsedData = parseCSV(text);
        
        if (parsedData.length === 0) {
          setError('CSV file is empty');
          return;
        }
        
        // First row is headers
        headers = parsedData[0].map(h => h.trim().replace(/^"|"$/g, ''));
        
        // Parse data rows
        for (let i = 1; i < parsedData.length; i++) {
          const values = parsedData[i];
          // Pad or truncate values to match header length
          const paddedValues = [...values];
          while (paddedValues.length < headers.length) {
            paddedValues.push('');
          }
          paddedValues.length = headers.length;
          
          const row = {};
          headers.forEach((header, index) => {
            // Remove surrounding quotes if present
            let value = paddedValues[index] || '';
            if (typeof value === 'string') {
              value = value.trim().replace(/^"|"$/g, '');
            }
            row[header] = value;
          });
          rows.push(row);
        }
      } else {
        // Excel file
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
        
        if (jsonData.length === 0) {
          setError('Excel file is empty');
          return;
        }
        
        headers = jsonData[0].map(h => String(h || '').trim()).filter(h => h);
        
        for (let i = 1; i < jsonData.length; i++) {
          const values = jsonData[i];
          const row = {};
          headers.forEach((header, index) => {
            row[header] = values[index] !== undefined ? String(values[index] || '') : '';
          });
          rows.push(row);
        }
      }

      if (rows.length === 0) {
        setError('No data rows found in the file');
        return;
      }

      setCsvHeaders(headers);
      setParsedJobs(rows);

      // Auto-detect source type based on headers
      if (sourceType === 'auto') {
        const headerLower = headers.map(h => h.toLowerCase()).join('|');
        
        // Check for ZenBooker fields
        if (headerLower.includes('start_time_for_full_cal_date') || 
            headerLower.includes('job_random_id_text') ||
            headerLower.includes('customer_email_text')) {
          setSourceType('zenbooker');
        }
        // Check for Booking Koala fields
        else if (headerLower.includes('booking start date time') ||
                 headerLower.includes('booking status') ||
                 headerLower.includes('final amount (usd)')) {
          setSourceType('booking-koala');
        }
        else {
          setSourceType('generic');
        }
      }

      // Apply predefined mappings if available
      if (predefinedMappings[sourceType] || sourceType === 'auto') {
        const mapping = predefinedMappings[sourceType] || {};
        const autoMappings = {};
        
        Object.keys(zenbookerFields).forEach(zenbookerField => {
          // Try to find matching header
          const possibleNames = mapping[zenbookerField] || [zenbookerField];
          for (const possibleName of possibleNames) {
            const found = headers.find(h => 
              h.toLowerCase() === possibleName.toLowerCase() ||
              h.toLowerCase().includes(possibleName.toLowerCase()) ||
              possibleName.toLowerCase().includes(h.toLowerCase())
            );
            if (found) {
              autoMappings[zenbookerField] = found;
              break;
            }
          }
        });
        
        setFieldMappings(autoMappings);
      }

      // Show field mapping by default for generic sources
      if (sourceType === 'generic') {
        setShowFieldMapping(true);
      }

      setPreviewData(rows.slice(0, 5)); // Show first 5 rows as preview
      setShowPreview(true);
    } catch (error) {
      console.error('Error parsing file:', error);
      setError(`Failed to parse file: ${error.message}`);
    }
  };

  const handleSourceTypeChange = (type) => {
    setSourceType(type);
    
    // Apply predefined mappings when source type changes
    if (predefinedMappings[type] && csvHeaders.length > 0) {
      const mapping = predefinedMappings[type];
      const autoMappings = {};
      
      Object.keys(zenbookerFields).forEach(zenbookerField => {
        const possibleNames = mapping[zenbookerField] || [zenbookerField];
        for (const possibleName of possibleNames) {
          const found = csvHeaders.find(h => 
            h.toLowerCase() === possibleName.toLowerCase() ||
            h.toLowerCase().includes(possibleName.toLowerCase())
          );
          if (found) {
            autoMappings[zenbookerField] = found;
            break;
          }
        }
      });
      
      setFieldMappings(autoMappings);
    }
  };

  const updateFieldMapping = (zenbookerField, csvHeader) => {
    setFieldMappings(prev => ({
      ...prev,
      [zenbookerField]: csvHeader || null
    }));
  };

  const mapJobData = (row) => {
    const mapped = {};
    
    Object.keys(zenbookerFields).forEach(zenbookerField => {
      const csvHeader = fieldMappings[zenbookerField];
      if (csvHeader && row[csvHeader] !== undefined) {
        mapped[zenbookerField] = row[csvHeader];
      }
    });
    
    // Special processing for Booking Koala - use the same approach as original import
    if (sourceType === 'booking-koala') {
      // IMPORTANT: Extract customer fields directly from CSV columns (same as original Booking Koala import)
      // This ensures backend can create customers on-the-fly
      // CSV has: "First name", "Last name", "Full name", "Email", "Phone", "Address", "Apt", "City", "State", "Zip/Postal code"
      // We MUST extract these even if empty, so backend knows they were attempted
      const firstName = row['First name'] || row['First Name'] || row['first name'] || row['firstName'] || row['first_name'] || '';
      const lastName = row['Last name'] || row['Last Name'] || row['last name'] || row['lastName'] || row['last_name'] || '';
      const fullName = row['Full name'] || row['Full Name'] || row['full name'] || row['fullName'] || row['full_name'] || '';
      const email = row['Email'] || row['email'] || row['Email Address'] || row['email address'] || '';
      const phone = row['Phone'] || row['phone'] || row['Phone Number'] || row['phone number'] || '';
      const address = row['Address'] || row['address'] || '';
      const apt = row['Apt'] || row['apt'] || row['Apt. No.'] || row['Apt. No'] || row['apartment'] || '';
      const city = row['City'] || row['city'] || '';
      const state = row['State'] || row['state'] || '';
      const zipCode = row['Zip/Postal code'] || row['Zip/Postal Code'] || row['zip/postal code'] || row['Zip Code'] || row['zip code'] || '';
      
      // ALWAYS set customer fields (even if empty) so backend receives them - same as original import
      // Backend will validate and show appropriate errors if required fields are missing
      // Use Full name as fallback if First/Last are missing
      mapped.customerFirstName = firstName || (fullName ? fullName.split(/\s+/)[0] : '');
      mapped.customerLastName = lastName || (fullName ? fullName.split(/\s+/).slice(1).join(' ') : '');
      mapped.customerEmail = email;
      if (phone) mapped.phone = phone;
      if (address) mapped.address = address;
      if (apt) mapped.apt = apt;
      if (city) mapped.city = city;
      if (state) mapped.state = state;
      if (zipCode) mapped.zipCode = zipCode;
      
      // ALSO preserve raw CSV column names as fallback (backend can use these directly)
      // This ensures backend can find fields even if mapped names don't work
      if (row['First name'] !== undefined) mapped['First name'] = row['First name'];
      if (row['Last name'] !== undefined) mapped['Last name'] = row['Last name'];
      if (row['Full name'] !== undefined) mapped['Full name'] = row['Full name'];
      if (row['Email'] !== undefined) mapped['Email'] = row['Email'];
      if (row['Phone'] !== undefined) mapped['Phone'] = row['Phone'];
      if (row['Address'] !== undefined) mapped['Address'] = row['Address'];
      if (row['Apt'] !== undefined) mapped['Apt'] = row['Apt'];
      if (row['City'] !== undefined) mapped['City'] = row['City'];
      if (row['State'] !== undefined) mapped['State'] = row['State'];
      if (row['Zip/Postal code'] !== undefined) mapped['Zip/Postal code'] = row['Zip/Postal code'];
      
      // Handle date/time from "Booking start date time" (ISO format: 2025-10-02T09:00:00-07:00)
      if (row['Booking start date time'] && !mapped.scheduledDate) {
        const bookingDateTime = row['Booking start date time'];
        try {
          // Parse ISO format: 2025-10-02T09:00:00-07:00
          const dateObj = new Date(bookingDateTime);
          if (!isNaN(dateObj.getTime())) {
            // Extract date part (YYYY-MM-DD)
            mapped.scheduledDate = dateObj.toISOString().split('T')[0];
            // Extract time part (HH:MM:SS)
            const hours = dateObj.getHours().toString().padStart(2, '0');
            const minutes = dateObj.getMinutes().toString().padStart(2, '0');
            const seconds = dateObj.getSeconds().toString().padStart(2, '0');
            mapped.scheduledTime = `${hours}:${minutes}:${seconds}`;
          }
        } catch (e) {
          console.warn('Error parsing Booking start date time:', bookingDateTime, e);
        }
      }
      
      // Fallback: Combine Date and Time columns if Booking start date time is not available
      if (!mapped.scheduledDate && row['Date'] && row['Time']) {
        try {
          // Parse Date (MM/DD/YYYY) and Time (HH:MM AM/PM)
          const dateStr = row['Date'].trim();
          const timeStr = row['Time'].trim();
          
          // Parse date: 10/02/2025
          const [month, day, year] = dateStr.split('/').map(Number);
          if (month && day && year) {
            // Parse time: 09:00 AM
            let hours = 0, minutes = 0;
            const timeMatch = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
            if (timeMatch) {
              hours = parseInt(timeMatch[1], 10);
              minutes = parseInt(timeMatch[2], 10);
              const ampm = timeMatch[3].toUpperCase();
              if (ampm === 'PM' && hours !== 12) hours += 12;
              if (ampm === 'AM' && hours === 12) hours = 0;
            }
            
            const dateObj = new Date(year, month - 1, day, hours, minutes);
            if (!isNaN(dateObj.getTime())) {
              mapped.scheduledDate = dateObj.toISOString().split('T')[0];
              mapped.scheduledTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`;
            }
          }
        } catch (e) {
          console.warn('Error parsing Date/Time:', e);
        }
      }
      
      // Handle address - parse from combined Address field if individual fields are missing
      if (address && !mapped.city && !mapped.state && !mapped.zipCode) {
        // Address format: "Street, City, State, Country" or "Street, City, State ZIP, Country"
        const parts = address.split(',').map(p => p.trim());
        if (parts.length >= 2) {
          // Last part is usually country, second-to-last might be state or state+zip
          mapped.city = parts[parts.length - 2] || '';
          
          // Check if second-to-last part contains state and zip
          const stateZipMatch = parts[parts.length - 2]?.match(/(.+?)\s+(\d{5}(?:-\d{4})?)$/);
          if (stateZipMatch) {
            mapped.state = stateZipMatch[1].trim();
            mapped.zipCode = stateZipMatch[2].trim();
            mapped.city = parts[parts.length - 3] || '';
          } else {
            // Try to extract state from the parts
            mapped.state = parts[parts.length - 2] || '';
          }
        }
      }
    }
    
    return mapped;
  };

  const handleImport = async () => {
    if (!parsedJobs || parsedJobs.length === 0) {
      setError('No jobs to import');
      return;
    }

    setIsImporting(true);
    setError('');
    setImportProgress({ current: 0, total: parsedJobs.length, percentage: 0, batchInfo: null });

    try {
      // Map all jobs using field mappings
      const mappedJobs = parsedJobs.map((row, index) => {
        const mapped = mapJobData(row);
        
        // Add source type and mappings metadata
        mapped._sourceType = sourceType;
        mapped._fieldMappings = fieldMappings;
        mapped._rowIndex = index + 2; // +2 because row 1 is header
        // Store original row data for Booking Koala (so backend can access raw CSV columns)
        mapped._originalRowData = row;
        
        return mapped;
      });

      // Transform mapped jobs to match expected API format
      // The backend expects the same format as ZenBooker import
      const transformedJobs = mappedJobs.map(mapped => {
        // Handle customer name - prefer mapped fields (already parsed in mapJobData), fallback to parsing
        let customerFirstName = mapped.customerFirstName || '';
        let customerLastName = mapped.customerLastName || '';
        
        // If names weren't set in mapJobData, try to parse from customerFullName or other fields
        if (!customerFirstName && !customerLastName) {
          // Try customerFullName first (if it exists in the mapping)
          if (mapped.customerFullName) {
            const nameParts = mapped.customerFullName.trim().split(/\s+/);
            if (nameParts.length > 0) {
              customerFirstName = nameParts[0];
              customerLastName = nameParts.slice(1).join(' ') || '';
            }
          }
          // Fallback to customer_name field (for ZenBooker format)
          else if (mapped.customer_name) {
            const nameParts = mapped.customer_name.trim().split(/\s+/);
            if (nameParts.length > 0) {
              customerFirstName = nameParts[0];
              customerLastName = nameParts.slice(1).join(' ') || '';
            }
          }
        }
        
        // Handle address parsing for Booking Koala
        let serviceAddressStreet = mapped.address || '';
        let serviceAddressCity = mapped.city || '';
        let serviceAddressState = mapped.state || '';
        let serviceAddressZip = mapped.zipCode || '';
        
        // For Booking Koala, if we have a combined address but missing individual fields, try to parse
        if (sourceType === 'booking-koala' && serviceAddressStreet && (!serviceAddressCity || !serviceAddressState)) {
          // Address format: "Street, City, State, Country" or "Street, City, State ZIP, Country"
          const addressParts = serviceAddressStreet.split(',').map(p => p.trim());
          if (addressParts.length >= 2) {
            // First part is usually the street
            serviceAddressStreet = addressParts[0];
            
            // Last part is usually country, second-to-last might be state or state+zip
            if (addressParts.length >= 3) {
              serviceAddressCity = serviceAddressCity || addressParts[addressParts.length - 2] || '';
              
              // Check if second-to-last part contains state and zip
              const stateZipPart = addressParts[addressParts.length - 2];
              const stateZipMatch = stateZipPart?.match(/(.+?)\s+(\d{5}(?:-\d{4})?)$/);
              if (stateZipMatch) {
                serviceAddressState = serviceAddressState || stateZipMatch[1].trim();
                serviceAddressZip = serviceAddressZip || stateZipMatch[2].trim();
                serviceAddressCity = serviceAddressCity || addressParts[addressParts.length - 3] || '';
              } else {
                // Try to extract state from the parts
                serviceAddressState = serviceAddressState || stateZipPart || '';
              }
            }
          }
        }
        
        // Use the mapped fields directly
        // The backend will handle field mapping if source type is specified
        // For Booking Koala, preserve original row data so backend can access raw CSV columns
        const result = {
          ...mapped,
          // Ensure required fields are present
          scheduledDate: mapped.scheduledDate || mapped.start_time_for_full_cal_date || '',
          scheduledTime: mapped.scheduledTime || '09:00:00',
          serviceName: mapped.serviceName || mapped.service_selected_text || 'Imported Service',
          customerFirstName: customerFirstName || mapped.customer_name?.split(' ')[0] || '',
          customerLastName: customerLastName || mapped.customer_name?.split(' ').slice(1).join(' ') || '',
          // Also send customerFullName as fallback for backend parsing
          customerFullName: mapped.customerFullName || (customerFirstName && customerLastName ? `${customerFirstName} ${customerLastName}` : '') || mapped.customer_name || '',
          customerEmail: mapped.customerEmail || mapped.customer_email_text || '',
          customerPhone: mapped.customerPhone || mapped.customer_phone_text || '',
          price: mapped.price || mapped.price_number || '0',
          // Map to backend field names
          serviceAddressStreet: serviceAddressStreet || mapped.job_address_geographic_address || '',
          serviceAddressCity: serviceAddressCity || '',
          serviceAddressState: serviceAddressState || '',
          serviceAddressZip: serviceAddressZip || mapped.zip_code || '',
          // Also keep old field names for backward compatibility
          address: serviceAddressStreet,
          city: serviceAddressCity,
          state: serviceAddressState,
          zipCode: serviceAddressZip,
          status: mapped.status || mapped.live_status_text || 'pending',
          _id: mapped._id || mapped.job_random_id_text || null,
          _debugRowIndex: mapped._originalRowIndex
        };
        
        // For Booking Koala, preserve original row data (raw CSV columns) as fallback
        // This allows backend to access fields like 'First name', 'Last name', 'Full name', etc. directly
        if (sourceType === 'booking-koala' && mapped._originalRowData) {
          // Preserve key Booking Koala columns that backend might need
          const originalRow = mapped._originalRowData;
          if (originalRow['First name'] !== undefined) result['First name'] = originalRow['First name'];
          if (originalRow['Last name'] !== undefined) result['Last name'] = originalRow['Last name'];
          if (originalRow['Full name'] !== undefined) result['Full name'] = originalRow['Full name'];
          if (originalRow['Email'] !== undefined) result['Email'] = originalRow['Email'];
          if (originalRow['Phone'] !== undefined) result['Phone'] = originalRow['Phone'];
          if (originalRow['Address'] !== undefined) result['Address'] = originalRow['Address'];
          if (originalRow['City'] !== undefined) result['City'] = originalRow['City'];
          if (originalRow['State'] !== undefined) result['State'] = originalRow['State'];
          if (originalRow['Zip/Postal code'] !== undefined) result['Zip/Postal code'] = originalRow['Zip/Postal code'];
          if (originalRow['Booking start date time'] !== undefined) result['Booking start date time'] = originalRow['Booking start date time'];
          if (originalRow['Date'] !== undefined) result['Date'] = originalRow['Date'];
          if (originalRow['Time'] !== undefined) result['Time'] = originalRow['Time'];
        }
        
        return result;
      });

      // Process in batches to avoid timeout
      const BATCH_SIZE = 50; // Process 50 jobs at a time
      const batches = [];
      for (let i = 0; i < transformedJobs.length; i += BATCH_SIZE) {
        batches.push(transformedJobs.slice(i, i + BATCH_SIZE));
      }

      let totalImported = 0;
      let totalUpdated = 0;
      let totalSkipped = 0;
      const errors = [];

      // Process batches sequentially
      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];
        
        setImportProgress({
          current: batchIndex * BATCH_SIZE,
          total: transformedJobs.length,
          percentage: Math.round((batchIndex * BATCH_SIZE / transformedJobs.length) * 100),
          batchInfo: `Processing batch ${batchIndex + 1} of ${batches.length} (${batch.length} jobs)`
        });

        try {
          const response = await jobsAPI.importJobs(batch);
          
          totalImported += response.imported || 0;
          totalUpdated += response.updated || 0;
          totalSkipped += response.skipped || 0;
          
          if (response.errors && response.errors.length > 0) {
            errors.push(...response.errors);
          }
        } catch (error) {
          console.error(`Error importing batch ${batchIndex + 1}:`, error);
          // Add errors for this batch
          batch.forEach((job, jobIndex) => {
            errors.push({
              row: (batchIndex * BATCH_SIZE) + jobIndex + 2,
              error: error.response?.data?.error || error.message || 'Failed to import job'
            });
          });
        }
      }

      setImportResult({
        imported: totalImported,
        updated: totalUpdated,
        skipped: totalSkipped,
        errors: errors.length > 0 ? errors : undefined
      });

      setImportProgress({
        current: transformedJobs.length,
        total: transformedJobs.length,
        percentage: 100,
        batchInfo: null
      });

      // Redirect to jobs page after 3 seconds
      setTimeout(() => {
        navigate('/jobs');
      }, 3000);
    } catch (error) {
      console.error('Import error:', error);
      setError(error.response?.data?.error || error.message || 'Failed to import jobs');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Link to="/jobs" className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Jobs
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Import Jobs</h1>
          <p className="mt-2 text-sm text-gray-600">
            Import jobs from CSV or Excel files. Supports ZenBooker, Booking Koala, and generic formats with field mapping.
          </p>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <p className="mt-1 text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        {importResult && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start">
              <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 mr-3 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="text-sm font-medium text-green-800">Import Complete</h3>
                <p className="mt-1 text-sm text-green-700">
                  Imported: {importResult.imported || 0} | Updated: {importResult.updated || 0} | 
                  Skipped: {importResult.skipped || 0} | Errors: {importResult.errors?.length || 0}
                </p>
                {importResult.recurringDetected > 0 && (
                  <p className="mt-1 text-sm text-green-700">
                    Recurring patterns detected: {importResult.recurringDetected} | Jobs marked as recurring: {importResult.recurringUpdated || 0}
                  </p>
                )}
                <p className="mt-2 text-sm text-green-600 font-medium">
                  Redirecting to jobs page in 3 seconds...
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-md p-6">
          {/* Source Type Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Import Source
            </label>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => handleSourceTypeChange('auto')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  sourceType === 'auto'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Auto-Detect
              </button>
              <button
                onClick={() => handleSourceTypeChange('zenbooker')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  sourceType === 'zenbooker'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                ZenBooker CSV
              </button>
              <button
                onClick={() => handleSourceTypeChange('booking-koala')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  sourceType === 'booking-koala'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Booking Koala
              </button>
              <button
                onClick={() => handleSourceTypeChange('generic')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  sourceType === 'generic'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Generic CSV/Excel
              </button>
            </div>
          </div>

          {/* File Upload */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select File
            </label>
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>

          {/* Field Mapping Section */}
          {showFieldMapping && csvHeaders.length > 0 && (
            <div className="mb-6 border border-gray-200 rounded-lg p-4">
              <button
                onClick={() => setShowFieldMapping(!showFieldMapping)}
                className="w-full flex items-center justify-between text-left mb-4"
              >
                <div className="flex items-center">
                  <Settings className="w-5 h-5 mr-2 text-gray-600" />
                  <h3 className="text-lg font-medium text-gray-900">Field Mapping</h3>
                  <span className="ml-2 text-sm text-gray-500">
                    ({Object.values(fieldMappings).filter(v => v).length} of {Object.keys(zenbookerFields).length} mapped)
                  </span>
                </div>
                {showFieldMapping ? (
                  <ChevronUp className="w-5 h-5 text-gray-600" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-600" />
                )}
              </button>

              {showFieldMapping && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
                  {Object.entries(zenbookerFields).map(([zenbookerField, label]) => (
                    <div key={zenbookerField} className="flex flex-col">
                      <label className="text-sm font-medium text-gray-700 mb-1">
                        {label}
                      </label>
                      <select
                        value={fieldMappings[zenbookerField] || ''}
                        onChange={(e) => updateFieldMapping(zenbookerField, e.target.value || null)}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                      >
                        <option value="">-- Not mapped --</option>
                        {csvHeaders.map(header => (
                          <option key={header} value={header}>
                            {header}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Preview Section */}
          {showPreview && previewData && previewData.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Preview (First 5 rows)</h3>
              <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      {Object.keys(previewData[0]).slice(0, 10).map(header => (
                        <th key={header} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {previewData.map((row, index) => (
                      <tr key={index}>
                        {Object.keys(row).slice(0, 10).map(header => (
                          <td key={header} className="px-4 py-3 text-sm text-gray-900 max-w-xs truncate">
                            {String(row[header] || '')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-sm text-gray-500">
                Showing {previewData.length} of {parsedJobs.length} total rows
              </p>
            </div>
          )}

          {/* Import Button */}
          {showPreview && parsedJobs.length > 0 && (
            <div className="flex items-center justify-between pt-4 border-t border-gray-200">
              <div className="text-sm text-gray-600">
                <span className="font-medium">{parsedJobs.length}</span> jobs ready to import
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
                    <span>Import {parsedJobs.length} Jobs</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Progress Bar */}
          {isImporting && (
            <div className="mt-6 bg-blue-50 border-2 border-blue-200 rounded-lg p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                  <div className="flex flex-col">
                    <span className="text-base font-semibold text-gray-900">Importing Jobs</span>
                    {importProgress.batchInfo && (
                      <span className="text-sm text-gray-600 mt-1">{importProgress.batchInfo}</span>
                    )}
                  </div>
                </div>
                <span className="text-base font-semibold text-blue-600">
                  {importProgress.current} / {importProgress.total} ({importProgress.percentage}%)
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                <div
                  className="bg-blue-600 h-4 rounded-full transition-all duration-300"
                  style={{ width: `${importProgress.percentage}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UnifiedImportJobsPage;

