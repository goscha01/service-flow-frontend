import React, { useState } from 'react';
import { ArrowLeft, FileText, AlertCircle, CheckCircle, Loader2, Upload, Download, Settings, Eye, EyeOff, ChevronDown, ChevronUp } from 'lucide-react';
import { jobsAPI } from '../services/api';
import api from '../services/api';
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

      // For ZenBooker CSV, use the same parsing approach as original import
      if (file.name.endsWith('.csv')) {
        const text = await file.text();
        if (!text || !text.trim()) {
          setError('CSV file is empty');
          return;
        }
        
        // Check if this looks like a ZenBooker file (before parsing)
        const headerLower = text.split('\n')[0].toLowerCase();
        const isZenBooker = headerLower.includes('start_time_for_full_cal_date') || 
                           headerLower.includes('job_random_id_text') ||
                           headerLower.includes('customer_email_text');
        
        if (isZenBooker && sourceType === 'auto') {
          // For ZenBooker, use the same parseCSVLine approach as original
          const lines = text.split('\n').filter(line => line.trim());
          if (lines.length < 2) {
            setError('CSV file is empty');
            return;
          }
          
          // Helper function to parse CSV line (same as original)
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
          
          headers = parseCSVLine(lines[0]).map(h => h.trim().replace(/^"|"$/g, ''));
          
          // Parse data rows
          for (let i = 1; i < lines.length; i++) {
            if (lines[i].trim()) {
              const values = parseCSVLine(lines[i]);
              const row = {};
              headers.forEach((header, index) => {
                let value = values[index] || '';
                if (value.startsWith('"') && value.endsWith('"')) {
                  value = value.slice(1, -1);
                }
                row[header.trim()] = value.trim();
              });
              rows.push(row);
            }
          }
        } else {
          // For non-ZenBooker CSV, use the multi-line quoted field parser
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
                if (inQuotes && nextChar === '"') {
                  currentField += '"';
                  i += 2;
                  continue;
                } else {
                  inQuotes = !inQuotes;
                  i++;
                  continue;
                }
              }
              
              if (char === ',' && !inQuotes) {
                currentRow.push(currentField.trim());
                currentField = '';
                i++;
                continue;
              }
              
              if ((char === '\n' || char === '\r') && !inQuotes) {
                if (char === '\r' && nextChar === '\n') {
                  i += 2;
                } else {
                  i++;
                }
                
                if (currentField.length > 0 || currentRow.length > 0) {
                  currentRow.push(currentField.trim());
                  if (currentRow.some(field => field.length > 0)) {
                    result.push(currentRow);
                  }
                  currentRow = [];
                  currentField = '';
                }
                continue;
              }
              
              currentField += char;
              i++;
            }
            
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
          
          headers = parsedData[0].map(h => h.trim().replace(/^"|"$/g, ''));
          
          for (let i = 1; i < parsedData.length; i++) {
            const values = parsedData[i];
            const paddedValues = [...values];
            while (paddedValues.length < headers.length) {
              paddedValues.push('');
            }
            paddedValues.length = headers.length;
            
            const row = {};
            headers.forEach((header, index) => {
              let value = paddedValues[index] || '';
              if (typeof value === 'string') {
                value = value.trim().replace(/^"|"$/g, '');
              }
              row[header] = value;
            });
            rows.push(row);
          }
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

  // ZenBooker field mapping - same as original import
  const mapZenBookerFields = (csvText) => {
    // Helper functions from original ZenBooker import
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

    const parseZenBookerDateTime = (dateTimeStr, timeStr, timezoneStr) => {
      if (!dateTimeStr || !dateTimeStr.trim()) {
        return { date: '', time: '09:00:00' };
      }
      
      try {
        let cleanDateTime = dateTimeStr.trim().replace(/^"|"$/g, '');
        let datePart = '';
        let timePart = '09:00:00';
        
        let dateMatch = cleanDateTime.match(/^(\d{4}-\d{2}-\d{2})(?:\s*,?\s*|\s+)/);
        if (!dateMatch) {
          dateMatch = cleanDateTime.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
          if (dateMatch) {
            const month = dateMatch[1].padStart(2, '0');
            const day = dateMatch[2].padStart(2, '0');
            const year = dateMatch[3];
            datePart = `${year}-${month}-${day}`;
          }
        } else {
          datePart = dateMatch[1];
        }
        
        if (datePart) {
          const [year, month, day] = datePart.split('-').map(Number);
          const dateObj = new Date(year, month - 1, day);
          const currentYear = new Date().getFullYear();
          const dateYear = dateObj.getFullYear();
          
          if (dateYear > currentYear + 3) {
            const monthDay = datePart.substring(5);
            if (monthDay) {
              const correctedDate = `${currentYear}-${monthDay}`;
              const correctedDateObj = new Date(Number(currentYear), Number(monthDay.split('-')[0]) - 1, Number(monthDay.split('-')[1]));
              if (!isNaN(correctedDateObj.getTime())) {
                datePart = correctedDate;
              }
            }
          }
        }
        
        let timeMatch = cleanDateTime.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm|AM|PM)/i);
        if (timeMatch) {
          let hours = parseInt(timeMatch[1]);
          const minutes = timeMatch[2];
          const ampm = timeMatch[4].toUpperCase();
          
          if (ampm === 'PM' && hours !== 12) {
            hours += 12;
          } else if (ampm === 'AM' && hours === 12) {
            hours = 0;
          }
          
          timePart = `${String(hours).padStart(2, '0')}:${minutes}:00`;
        } else {
          timeMatch = cleanDateTime.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\s|$|,)/);
          if (timeMatch) {
            let hours = parseInt(timeMatch[1]);
            const minutes = timeMatch[2];
            timePart = `${String(hours).padStart(2, '0')}:${minutes}:00`;
          } else if (timeStr) {
            const cleanTimeStr = timeStr.trim().replace(/^"|"$/g, '');
            const timeMatchFromStr = cleanTimeStr.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm|AM|PM)/i);
            if (timeMatchFromStr) {
              let hours = parseInt(timeMatchFromStr[1]);
              const minutes = timeMatchFromStr[2];
              const ampm = timeMatchFromStr[4].toUpperCase();
              
              if (ampm === 'PM' && hours !== 12) {
                hours += 12;
              } else if (ampm === 'AM' && hours === 12) {
                hours = 0;
              }
              
              timePart = `${String(hours).padStart(2, '0')}:${minutes}:00`;
            } else {
              const timeMatch24 = cleanTimeStr.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/);
              if (timeMatch24) {
                let hours = parseInt(timeMatch24[1]);
                const minutes = timeMatch24[2];
                timePart = `${String(hours).padStart(2, '0')}:${minutes}:00`;
              }
            }
          }
        }
        
        return { date: datePart, time: timePart };
      } catch (error) {
        return { date: '', time: '09:00:00' };
      }
    };

    const parseAddress = (addressStr) => {
      if (!addressStr) return { street: '', city: '', state: '', zipCode: '', country: 'USA' };
      
      const parts = addressStr.split(',').map(p => p.trim());
      
      if (parts.length >= 4) {
        return {
          street: parts[0],
          city: parts[1],
          state: parts[2].split(' ')[0],
          zipCode: parts[2].split(' ').slice(1).join(' ') || parts[3].split(' ')[0] || '',
          country: parts[parts.length - 1] || 'USA'
        };
      } else if (parts.length >= 3) {
        return {
          street: parts[0],
          city: parts[1],
          state: parts[2].split(' ')[0] || '',
          zipCode: parts[2].split(' ').slice(1).join(' ') || '',
          country: 'USA'
        };
      }
      
      return {
        street: addressStr,
        city: '',
        state: '',
        zipCode: '',
        country: 'USA'
      };
    };

    const secondsToMinutes = (secondsStr) => {
      if (!secondsStr) return '';
      const seconds = parseInt(secondsStr);
      if (isNaN(seconds)) return '';
      return Math.round(seconds / 60).toString();
    };

    const mapStatus = (statusStr) => {
      if (!statusStr) return 'pending';
      const status = statusStr.toLowerCase().trim();
      
      if (status === 'complete' || status === 'completed' || status === 'done' || status === 'finished' || status === 'closed' || status.startsWith('complet')) {
        return 'completed';
      }
      
      // Supabase database uses "in-progress" (with hyphen)
      // Map all variations to "in-progress" (with hyphen) for Supabase enum
      if (status === 'in-progress' || status === 'in progress' || status === 'inprogress' || status === 'in_progress' || status === 'active' || status === 'working' || status === 'started' || status.startsWith('in-progress') || status.startsWith('in progress') || status.startsWith('in_progress')) {
        return 'in-progress'; // Use hyphen to match Supabase enum
      }
      
      if (status === 'cancelled' || status === 'canceled' || status === 'cancel' || status.startsWith('cancel')) {
        return 'cancelled';
      }
      
      if (status === 'pending' || status === 'scheduled' || status === 'upcoming' || status === 'not started' || status === 'not-started' || status.startsWith('pending') || status.startsWith('scheduled')) {
        return 'pending';
      }
      
      return 'pending';
    };

    const extractFirstServiceName = (serviceName) => {
      if (!serviceName || typeof serviceName !== 'string') return serviceName;
      
      let cleaned = serviceName.trim();
      const isOnlyPattern = /^[\*\s]*,\s*\+\s*-?\d+\s*(more|other)\s*$/gi.test(cleaned);
      if (isOnlyPattern) {
        return null;
      }
      
      cleaned = cleaned.replace(/,\s*\+\s*-?\d+\s*(more|other)/gi, '').trim();
      cleaned = cleaned.replace(/^,\s*\+\s*-?\d+\s*(more|other)/gi, '').trim();
      cleaned = cleaned.replace(/^\*\s*,\s*\+\s*-?\d+\s*(more|other)/gi, '').trim();
      cleaned = cleaned.replace(/,\s*\+\s*$/gi, '').trim();
      cleaned = cleaned.replace(/,\s*$/g, '').trim();
      cleaned = cleaned.replace(/^,\s*/g, '').trim();
      cleaned = cleaned.replace(/^\*\s*/g, '').trim();
      
      if (!cleaned || cleaned === ',' || cleaned === '+' || cleaned === ', +' || cleaned === '*' || cleaned === ', + -1' || cleaned === ', + 1') {
        return null;
      }
      
      return cleaned;
    };

    // Parse CSV using same approach as original
    const lines = csvText.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];
    
    const headers = parseCSVLine(lines[0]);
    const jobs = [];
    
    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim()) {
        const values = parseCSVLine(lines[i]);
        const job = {};
        const rawData = {};
        
        headers.forEach((header, index) => {
          let value = values[index] || '';
          if (value.startsWith('"') && value.endsWith('"')) {
            value = value.slice(1, -1);
          }
          rawData[header.trim()] = value.trim();
        });
        
        // Map ZenBooker-specific fields (same as original)
        job.jobId = rawData['service_order_custom_service_order'] || rawData['job_random_id_text'] || rawData['_id'] || '';
        if (rawData['_id']) {
          job._id = rawData['_id'].trim();
        }
        
        // CRITICAL: Log _id extraction for debugging (especially for Sheila O'steen)
        const customerNameForDebug = rawData['customer_name_text'] || '';
        const isSheilaOsteen = customerNameForDebug.toLowerCase().includes("sheila") && customerNameForDebug.toLowerCase().includes("o'steen");
        if (isSheilaOsteen || i < 5) {
          console.log(`Row ${i + 1}: 🔍 CSV Parsing - Customer: "${customerNameForDebug}", _id from rawData: "${rawData['_id'] || 'MISSING'}", job._id: "${job._id || 'MISSING'}"`);
          if (!rawData['_id'] && !job._id) {
            console.error(`Row ${i + 1}: ❌ CRITICAL - _id is MISSING from CSV! Available headers:`, headers.slice(-5));
            console.error(`Row ${i + 1}: ❌ Last 5 values in row:`, values.slice(-5));
          }
        }
        job.customerName = rawData['customer_name_text'] || '';
        job.customerEmail = rawData['customer_email_text'] || '';
        job.customerPhone = rawData['customer_phone_text'] || '';
        const rawServiceName = rawData['service_selected_text'] || 
                          rawData['services_list_custom_service'] || 
                          rawData['service_name'] || 
                          rawData['service'] || 
                          '';
        const cleanedServiceName = extractFirstServiceName(rawServiceName);
        job.serviceName = cleanedServiceName === null ? '' : cleanedServiceName;
        job.price = rawData['price_number'] || rawData['pretax_total_number'] || '';
        job.total = rawData['pretax_total_number'] || rawData['price_number'] || '';
        job.subTotal = rawData['sub_total_number'] || '';
        job.taxTotal = rawData['tax_total_number'] || '';
        job.tip = rawData['tip_number'] || '';
        
        const durationSeconds = rawData['service_duration_inseconds_number'];
        job.duration = durationSeconds ? secondsToMinutes(durationSeconds) : '';
        
        const startDateTime = rawData['start_time_for_full_cal_date'];
        const endDateTime = rawData['end_time_for_full_cal_date'] || rawData['finish_time_for_full_cal_date'] || rawData['finish_time_date'];
        const timeHumanReadable = rawData['time_human_readable_text'];
        const timezone = rawData['timezone_text'];
        
        // DEBUG: Log specific rows for Stephanie and Georgina
        const isStephaniePoupko = (rawData['customer_name_text'] || '').includes('Stephanie Poupko') && i === 1182; // Row 1183 (0-indexed is 1182)
        const isGeorginaBaez = (rawData['customer_name_text'] || '').includes('Georgina Baez') && i === 1183; // Row 1184 (0-indexed is 1183)
        
        if (isStephaniePoupko || isGeorginaBaez) {
          console.log(`🔍 DEBUG Row ${i + 1} (${isStephaniePoupko ? 'Stephanie Poupko' : 'Georgina Baez'}):`, {
            customerName: rawData['customer_name_text'],
            customerPhone: rawData['customer_phone_text'],
            customerEmail: rawData['customer_email_text'],
            startDateTime: startDateTime,
            timeHumanReadable: timeHumanReadable,
            timezone: timezone,
            serviceName: rawData['service_selected_text'],
            rawData_start_time: rawData['start_time_for_full_cal_date']
          });
        }
        
        const dateTimeParts = parseZenBookerDateTime(startDateTime, timeHumanReadable, timezone);
        job.scheduledDate = dateTimeParts.date || null;
        job.scheduledTime = dateTimeParts.time || '09:00:00';
        
        if (isStephaniePoupko || isGeorginaBaez) {
          console.log(`🔍 DEBUG Row ${i + 1} - After parsing:`, {
            scheduledDate: job.scheduledDate,
            scheduledTime: job.scheduledTime,
            dateTimeParts: dateTimeParts,
            willBeSkipped: !job.scheduledDate
          });
        }
        
        if (endDateTime && startDateTime) {
          try {
            const startParts = parseZenBookerDateTime(startDateTime, timeHumanReadable, timezone);
            const endParts = parseZenBookerDateTime(endDateTime, null, timezone);
            
            if (startParts.date && endParts.date && startParts.time && endParts.time) {
              const [startHours, startMinutes] = startParts.time.split(':').map(Number);
              const [endHours, endMinutes] = endParts.time.split(':').map(Number);
              
              let durationMinutes = (endHours * 60 + endMinutes) - (startHours * 60 + startMinutes);
              if (durationMinutes < 0) {
                durationMinutes += 24 * 60;
              }
              
              if (durationMinutes > 0 && !job.duration) {
                job.duration = durationMinutes.toString();
              } else if (durationMinutes > 0 && job.duration) {
                const providedDuration = parseInt(job.duration);
                if (Math.abs(durationMinutes - providedDuration) > 5) {
                  job.duration = durationMinutes.toString();
                }
              }
            }
          } catch (error) {
            console.warn(`Row ${i + 1}: Error calculating duration from start/end times:`, error);
          }
        }
        
        if (!job.scheduledDate) {
          const isStephaniePoupko = (job.customerName || '').includes('Stephanie Poupko') && i === 1182;
          const isGeorginaBaez = (job.customerName || '').includes('Georgina Baez') && i === 1183;
          
          if (isStephaniePoupko || isGeorginaBaez) {
            console.error(`❌ CRITICAL: Row ${i + 1} (${isStephaniePoupko ? 'Stephanie Poupko' : 'Georgina Baez'}) is being SKIPPED!`, {
              customerName: job.customerName,
              customerPhone: job.customerPhone,
              serviceName: job.serviceName,
              startDateTime: startDateTime,
              timeHumanReadable: timeHumanReadable,
              timezone: timezone,
              dateTimeParts: dateTimeParts,
              parsedDate: job.scheduledDate,
              rawData_start_time: rawData['start_time_for_full_cal_date']
            });
          }
          
          console.warn(`Row ${i + 1}: ⚠️ SKIPPING JOB - no scheduled date provided. Customer: "${job.customerName || job.customerEmail}", Service: "${job.serviceName}", Original value: "${startDateTime}"`);
          console.warn(`Row ${i + 1}: ⚠️ This row will NOT be sent to backend, but processing will CONTINUE for remaining rows`);
          continue;
        }
        
        const statusFromLiveStatus = rawData['live_status_text'];
        const statusFromStandard = rawData['status'] || rawData['Status'];
        
        if (statusFromLiveStatus) {
          job.status = mapStatus(statusFromLiveStatus);
        } else if (statusFromStandard) {
          job.status = mapStatus(statusFromStandard);
        }
        
        const addressStr = rawData['job_address_geographic_address'];
        const apartmentUnit = rawData['appartment_unit_floor_number_text'];
        const addressParts = parseAddress(addressStr);
        job.serviceAddress = apartmentUnit ? `${addressParts.street}, ${apartmentUnit}` : addressParts.street;
        job.serviceAddressCity = addressParts.city;
        job.serviceAddressState = addressParts.state;
        job.serviceAddressZip = addressParts.zipCode;
        job.serviceAddressCountry = addressParts.country;
        
        const assignedCrew = rawData['assigned_crew_list_list_custom_crew'];
        if (assignedCrew) {
          const crewIds = assignedCrew.split(',').map(id => id.trim()).filter(id => id);
          job.assignedCrewExternalId = crewIds[0] || '';
          job.assignedCrewIds = crewIds;
        }
        
        const serviceRegion = rawData['service_region_custom_service_region'];
        if (serviceRegion) {
          job.serviceRegionExternalId = serviceRegion.trim();
        }
        
        job.paymentMethod = rawData['selected_payment_method_text'] || rawData['manual_payment_method_custom_manual_payment_method'] || '';
        job.notes = rawData['cancel_reason_custom_cancellation_reasons'] || '';
        job.workersNeeded = rawData['min_providers_needed_number'] || '1';
        job.offerToProviders = rawData['offer_job_to_providers_boolean'] === 'true';
        job.inStoreJob = rawData['in_store_job_boolean'] === 'true';
        job.smsMessages = rawData['sms_messages_boolean'] === 'true';
        
        // Check cancel_boolean - if true, mark job as cancelled
        const cancelBoolean = rawData['cancel_boolean'];
        if (cancelBoolean === 'true' || cancelBoolean === true || cancelBoolean === 'TRUE') {
          job.status = 'cancelled';
          console.log(`Row ${i + 1}: ✅ Job marked as cancelled (cancel_boolean = true)`);
        }
        
        if (rawData.hasOwnProperty('invoice_fully_paid_boolean')) {
          job.invoice_fully_paid_boolean = rawData['invoice_fully_paid_boolean'];
        }
        
        if (rawData['payment_status'] || rawData['Payment Status']) {
          job.paymentStatus = rawData['payment_status'] || rawData['Payment Status'];
        }
        if (rawData['invoice_status'] || rawData['Invoice Status']) {
          job.invoiceStatus = rawData['invoice_status'] || rawData['Invoice Status'];
        }
        
        job.dateTimeArrived = rawData['date_time_arrived_date'] || '';
        job.dateTimeCompleted = rawData['date_time_completed_date'] || '';
        job.dateTimeEnroute = rawData['date_time_enroute_date'] || '';
        
        // Handle standard field names
        const headerLower = (header) => header.toLowerCase().trim();
        
        headers.forEach((header, index) => {
          const value = values[index] || '';
          const h = headerLower(header);
          
          switch (h) {
            case 'job id':
            case 'jobid':
            case 'service_order_custom_service_order':
              if (!job.jobId) job.jobId = value;
              break;
            case '_id':
            case 'id':
            case 'job_id':
              if (!job._id) job._id = value;
              if (!job.jobId) job.jobId = value;
              break;
            case 'customer name':
            case 'customername':
              if (!job.customerName) job.customerName = value;
              break;
            case 'customer email':
            case 'customeremail':
              if (!job.customerEmail) job.customerEmail = value;
              break;
            case 'customer phone':
            case 'customerphone':
              if (!job.customerPhone) job.customerPhone = value;
              break;
            case 'service name':
            case 'servicename':
            case 'service_selected_text':
            case 'services_list_custom_service':
              if (!job.serviceName) {
                const cleaned = extractFirstServiceName(value);
                if (cleaned !== null) job.serviceName = cleaned;
              }
              break;
            case 'status':
              if (value && value.trim()) {
                const mappedStatus = mapStatus(value);
                if (!job.status || (job.status === 'pending' && mappedStatus !== 'pending')) {
                  job.status = mappedStatus;
                }
              }
              break;
            case 'cancel_boolean':
            case 'cancel boolean':
            case 'cancelboolean':
              // If cancel_boolean is true, mark job as cancelled
              if (value === 'true' || value === true || value === 'TRUE') {
                job.status = 'cancelled';
                console.log(`Row ${i + 1}: ✅ Job marked as cancelled (cancel_boolean = true)`);
              }
              break;
            case 'team member id':
            case 'teammemberid':
            case 'team_member_id':
            case 'assigned_team_member_id':
              const parsedTeamMemberId = parseInt(value);
              if (!isNaN(parsedTeamMemberId) && !value.toString().includes('x') && !value.toString().includes('X')) {
                job.teamMemberId = parsedTeamMemberId;
              }
              break;
            default:
              break;
          }
        });
        
        if (!job.customerEmail && !job.customerName) {
          console.warn(`Row ${i + 1}: Skipping job - no customer email or name provided`);
          continue;
        }
        
        if (!job.status) {
          job.status = 'pending';
        }
        
        if (!job.priority) job.priority = 'normal';
        if (!job.workersNeeded) job.workersNeeded = '1';
        
        // Supabase enum accepts: pending, in-progress, completed, cancelled (with hyphen)
        const validStatuses = ['pending', 'in-progress', 'completed', 'cancelled'];
        if (!validStatuses.includes(job.status)) {
          job.status = 'pending';
        }
        
        const validPriorities = ['low', 'normal', 'high', 'urgent'];
        if (job.priority && !validPriorities.includes(job.priority.toLowerCase())) {
          job.priority = 'normal';
        }
        
        if (job.price) {
          const priceNum = parseFloat(job.price);
          if (isNaN(priceNum)) {
            job.price = '0';
          } else {
            job.price = priceNum.toString();
          }
        } else {
          job.price = '0';
        }
        
        if (job.total) {
          const totalNum = parseFloat(job.total);
          if (isNaN(totalNum)) {
            job.total = job.price || '0';
          } else {
            job.total = totalNum.toString();
          }
        } else {
          job.total = job.price || '0';
        }
        
        if (job.duration && !isNaN(parseInt(job.duration))) {
          job.duration = parseInt(job.duration).toString();
        }
        
        const requiredFields = ['customerName', 'customerEmail', 'customerPhone', 'serviceName', 'scheduledDate', 'scheduledTime'];
        const paymentStatusFields = ['invoice_fully_paid_boolean', 'paymentStatus', 'invoiceStatus', 'paymentMethod'];
        // CRITICAL: Always preserve _id field - it's essential for duplicate detection
        // _id is the PRIMARY identifier for jobs - without it, fallback duplicate detection may incorrectly match jobs
        const preserveFields = ['_id', 'jobId'];
        Object.keys(job).forEach(key => {
          if (job[key] === '' && !requiredFields.includes(key) && !paymentStatusFields.includes(key) && !preserveFields.includes(key)) {
            delete job[key];
          }
        });
        
        // CRITICAL: Ensure _id is always included if it was extracted from CSV
        // This prevents jobs from being incorrectly matched by fallback duplicate detection
        if (rawData['_id'] && rawData['_id'].trim() && !job._id) {
          job._id = rawData['_id'].trim();
          console.warn(`Row ${i + 1}: ⚠️ _id was extracted from CSV but missing from job object - restoring it. Customer: "${job.customerName || 'N/A'}"`);
        }
        
        // Log warning if _id is missing for jobs that should have it (ZenBooker exports always have _id)
        if (!job._id && sourceType === 'zenbooker') {
          const customerNameForWarning = job.customerName || 'N/A';
          console.error(`Row ${i + 1}: ❌ CRITICAL ERROR - ZenBooker job missing _id field! Customer: "${customerNameForWarning}", Service: "${job.serviceName || 'N/A'}"`);
          console.error(`Row ${i + 1}: ❌ This job will be created as NEW (cannot detect duplicates without _id)`);
          console.error(`Row ${i + 1}: ❌ Check CSV - _id column should be the last column. Raw _id value: "${rawData['_id'] || 'NOT FOUND'}"`);
        }
        
        if (!job.customerName && !job.customerEmail && !job.customerPhone) {
          console.warn(`Row ${i + 1}: Skipping job - no customer information provided`);
          continue;
        }
        
        // Final validation: ensure scheduledDate is valid (not null, undefined, empty string, or whitespace)
        // This is critical because scheduledDate might have been set to empty string during field processing
        if (!job.scheduledDate || (typeof job.scheduledDate === 'string' && !job.scheduledDate.trim())) {
          console.warn(`Row ${i + 1}: ⚠️ SKIPPING JOB - no valid scheduled date after processing. Customer: "${job.customerName || job.customerEmail}", Service: "${job.serviceName}", Value: "${job.scheduledDate}"`);
          console.warn(`Row ${i + 1}: ⚠️ This row will NOT be sent to backend, but processing will CONTINUE for remaining rows`);
          continue;
        }
        
        // Log jobs being added to the array for debugging (especially for Stephanie and Georgina)
        const customerNameLower = (job.customerName || '').toLowerCase();
        if (customerNameLower.includes('stephanie') || customerNameLower.includes('georgina')) {
          console.log(`✅ Row ${i + 1}: ADDING JOB TO IMPORT ARRAY - Customer: "${job.customerName}", Date: "${job.scheduledDate}", Service: "${job.serviceName}"`);
        }
        
        jobs.push(job);
      }
    }
    
    // Log summary of parsed jobs
    console.log(`📊 CSV Parsing Summary: Parsed ${jobs.length} valid jobs from CSV`);
    if (jobs.length < lines.length - 1) {
      const skippedCount = (lines.length - 1) - jobs.length;
      console.log(`⚠️ Skipped ${skippedCount} row(s) due to missing dates or invalid data`);
    }
    
    // Log if we found Stephanie or Georgina
    const stephanieJobs = jobs.filter(j => (j.customerName || '').toLowerCase().includes('stephanie'));
    const georginaJobs = jobs.filter(j => (j.customerName || '').toLowerCase().includes('georgina'));
    if (stephanieJobs.length > 0) {
      console.log(`✅ Found ${stephanieJobs.length} Stephanie job(s) in parsed data:`, stephanieJobs.map(j => ({ date: j.scheduledDate, name: j.customerName })));
    }
    if (georginaJobs.length > 0) {
      console.log(`✅ Found ${georginaJobs.length} Georgina job(s) in parsed data:`, georginaJobs.map(j => ({ date: j.scheduledDate, name: j.customerName })));
    }
    
    return jobs;
  };

  // Booking Koala field mapping - same as original import
  const mapBookingKoalaFields = (data, type) => {
    // Same field mappings as original Booking Koala import
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
      'serviceRegionExternalId': ['Location', 'Location id', 'serviceRegionExternalId'],
      'amountPaidByCustomer': ['Amount paid by customer (USD)', 'Amount paid by customer (USD)', 'amountPaidByCustomer'],
      'amountOwed': ['Amount owed by customer (USD)', 'Amount owed by customer (USD)', 'amountOwed'],
      'finalAmount': ['Final amount (USD)', 'Final amount (USD)', 'finalAmount'],
      'paymentMethod': ['Payment method', 'Payment method', 'paymentMethod', 'payment_method']
    };

    // Helper functions from original import
    const parseDateTime = (dateTimeStr, dateStr, timeStr) => {
      if (dateTimeStr) {
        try {
          const dt = new Date(dateTimeStr);
          if (!isNaN(dt.getTime())) {
            return {
              date: dt.toISOString().split('T')[0],
              time: dt.toTimeString().split(' ')[0].substring(0, 5)
            };
          }
        } catch (e) {}
      }
      
      if (dateStr && timeStr) {
        try {
          const dateParts = dateStr.split('/');
          if (dateParts.length === 3) {
            const month = dateParts[0].padStart(2, '0');
            const day = dateParts[1].padStart(2, '0');
            const year = dateParts[2];
            const date = `${year}-${month}-${day}`;
            
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
        } catch (e) {}
      }
      
      return { date: null, time: null };
    };

    const parseDuration = (durationStr) => {
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

    return data.map(row => {
      const mapped = {};
      Object.keys(jobFieldMappings).forEach(key => {
        const possibleNames = jobFieldMappings[key];
        for (const name of possibleNames) {
          if (row[name] !== undefined && row[name] !== null && row[name] !== '') {
            const value = row[name];
            
            // Special handling for specific fields (same as original)
            if (key === 'scheduledDate' || key === 'scheduledTime') {
              const dt = parseDateTime(row['Booking start date time'], row['Date'], row['Time']);
              if (key === 'scheduledDate') mapped['scheduledDate'] = dt.date;
              if (key === 'scheduledTime') mapped['scheduledTime'] = dt.time;
              return;
            }
            
            if (key === 'duration') {
              const duration = parseDuration(value);
              if (duration) mapped[key] = duration;
              return;
            }
            
            if (key === 'isRecurring' || key === 'recurringFrequency') {
              const recurring = parseRecurring(row['Frequency'] || value);
              if (key === 'isRecurring') mapped['isRecurring'] = recurring.isRecurring;
              if (key === 'recurringFrequency') mapped['recurringFrequency'] = recurring.frequency;
              return;
            }
            
            if (key === 'notes') {
              const notes = [
                row['Booking note'],
                row['Private customer note'],
                row['Provider note'],
                row['Special notes']
              ].filter(n => n && n.trim()).join('\n\n');
              if (notes) mapped[key] = notes;
              return;
            }
            
            if (key === 'status') {
              const statusMap = {
                'Completed': 'completed',
                'Upcoming': 'pending',
                'Unassigned': 'pending',
                'Cancelled': 'cancelled'
              };
              mapped[key] = statusMap[value] || value.toLowerCase() || 'pending';
              return;
            }
            
            if (key === 'assignedCrewExternalId' || key === 'assignedCrewIds') {
              const providerDetails = row['Provider details'];
              if (providerDetails) {
                try {
                  let jsonStr = providerDetails.trim();
                  if (jsonStr.startsWith('[') && jsonStr.endsWith(']')) {
                    jsonStr = jsonStr.replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":');
                    jsonStr = jsonStr.replace(/'/g, '"');
                    
                    const providers = JSON.parse(jsonStr);
                    if (Array.isArray(providers) && providers.length > 0) {
                      const providerIds = providers.map(p => {
                        return p.Id || p.id || p['Id'] || p['Email Id'] || p['EmailId'];
                      }).filter(id => id);
                      
                      if (providerIds.length > 0) {
                        mapped['assignedCrewExternalId'] = providerIds[0].toString();
                        mapped['assignedCrewIds'] = providerIds.map(id => id.toString());
                      }
                    }
                  }
                } catch (e) {
                  const providerTeam = row['Provider/team'] || row['Provider/team (without ids)'];
                  if (providerTeam) {
                    const providerMatches = providerTeam.matchAll(/(\d+):/g);
                    const providerIds = [];
                    for (const match of providerMatches) {
                      if (match[1]) {
                        providerIds.push(match[1]);
                      }
                    }
                    
                    if (providerIds.length > 0) {
                      mapped['assignedCrewExternalId'] = providerIds[0].toString();
                      mapped['assignedCrewIds'] = providerIds.map(id => id.toString());
                    } else {
                      const singleMatch = providerTeam.match(/^(\d+):/);
                      if (singleMatch) {
                        mapped['assignedCrewExternalId'] = singleMatch[1];
                        mapped['assignedCrewIds'] = [singleMatch[1]];
                      }
                    }
                  }
                }
              }
              return;
            }
            
            if (key === 'serviceRegionExternalId') {
              const location = row['Location'] || row['Location id'];
              if (location) {
                mapped['serviceRegionExternalId'] = location.toString();
              }
              return;
            }
            
            mapped[key] = value;
            break;
          }
        }
      });
      
      // Ensure we have date/time from Booking start date time if not already set
      if (!mapped.scheduledDate && row['Booking start date time']) {
        const dt = parseDateTime(row['Booking start date time'], row['Date'], row['Time']);
        if (dt.date) mapped.scheduledDate = dt.date;
        if (dt.time) mapped.scheduledTime = dt.time;
      }
      
      // Extract customer fields directly from CSV columns (same as original)
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
      
      // ALWAYS set customer fields (even if empty) - same as original
      mapped['customerFirstName'] = firstName;
      mapped['customerLastName'] = lastName;
      mapped['customerEmail'] = email;
      if (phone) mapped['phone'] = phone;
      if (address) mapped['address'] = address;
      if (apt) mapped['apt'] = apt;
      if (city) mapped['city'] = city;
      if (state) mapped['state'] = state;
      if (zipCode) mapped['zipCode'] = zipCode;
      
      // Preserve raw CSV column names as fallback
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
      
      return mapped;
    });
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
      let mappedJobs;
      
      // For ZenBooker, use the EXACT same parsing and mapping as original import
      if (sourceType === 'zenbooker') {
        // Need to re-read the file as CSV text for ZenBooker parsing
        if (!selectedFile) {
          setError('File not found. Please upload the file again.');
          setIsImporting(false);
          return;
        }
        
        if (selectedFile.name.endsWith('.csv')) {
          const text = await selectedFile.text();
          // Use the same mapZenBookerFields function as original import
          mappedJobs = mapZenBookerFields(text);
        } else {
          setError('ZenBooker import only supports CSV files');
          setIsImporting(false);
          return;
        }
      }
      // For Booking Koala, use the SAME mapFields approach as original import
      else if (sourceType === 'booking-koala') {
        // Use the exact same mapping logic as original Booking Koala import
        // This ensures backend receives data in the format it expects
        mappedJobs = mapBookingKoalaFields(parsedJobs, 'jobs');
      } else {
        // For other sources, use the generic field mapping
        mappedJobs = parsedJobs.map((row, index) => {
          const mapped = mapJobData(row);
          
          // Add source type and mappings metadata
          mapped._sourceType = sourceType;
          mapped._fieldMappings = fieldMappings;
          mapped._rowIndex = index + 2; // +2 because row 1 is header
          mapped._originalRowData = row;
          
          return mapped;
        });
      }

      // Transform mapped jobs to match expected API format
      // For ZenBooker, jobs are already in the correct format from mapZenBookerFields (same as original import)
      // For Booking Koala, jobs are already in the correct format from mapBookingKoalaFields
      // For other sources, transform as before
      const transformedJobs = (sourceType === 'zenbooker' || sourceType === 'booking-koala')
        ? mappedJobs  // Already in correct format - no transformation needed
        : mappedJobs.map(mapped => {
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
      // ZenBooker uses batch size 100 (same as original import), others use 50
      const BATCH_SIZE = sourceType === 'zenbooker' ? 100 : 50;
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
        const rawBatch = batches[batchIndex];
        
        // CRITICAL: Filter out any jobs without valid scheduledDate before sending to backend
        // This ensures that jobs without dates don't cause the entire batch to fail
        const batch = rawBatch.filter(job => {
          const hasValidDate = job.scheduledDate && 
                               typeof job.scheduledDate === 'string' && 
                               job.scheduledDate.trim() !== '';
          if (!hasValidDate) {
            console.warn(`⚠️ Filtering out job before batch send - missing scheduledDate. Job data:`, {
              customerName: job.customerName || job.customerFirstName,
              customerEmail: job.customerEmail,
              serviceName: job.serviceName
            });
          }
          return hasValidDate;
        });
        
        // Skip empty batches (all jobs filtered out)
        if (batch.length === 0) {
          console.log(`⏭️ Skipping batch ${batchIndex + 1} - all jobs filtered out due to missing dates`);
          const skippedInBatch = rawBatch.length;
          totalSkipped += skippedInBatch;
          errors.push(`Batch ${batchIndex + 1}: ${skippedInBatch} job(s) skipped due to missing scheduled dates`);
          setImportProgress({
            current: (batchIndex + 1) * BATCH_SIZE,
            total: transformedJobs.length,
            percentage: Math.round(((batchIndex + 1) * BATCH_SIZE / transformedJobs.length) * 100),
            batchInfo: `Batch ${batchIndex + 1} of ${batches.length} skipped (no valid jobs)`
          });
          continue;
        }
        
        const skippedInBatch = rawBatch.length - batch.length;
        if (skippedInBatch > 0) {
          totalSkipped += skippedInBatch;
          errors.push(`Batch ${batchIndex + 1}: ${skippedInBatch} job(s) skipped due to missing scheduled dates`);
        }
        if (batch.length > 0) {
          console.log(`✅ Valid jobs in batch ${batchIndex + 1}:`, batch.map(j => ({
            customer: j.customerName || j.customerEmail,
            date: j.scheduledDate,
            service: j.serviceName
          })));
        }
        
        setImportProgress({
          current: batchIndex * BATCH_SIZE,
          total: transformedJobs.length,
          percentage: Math.round((batchIndex * BATCH_SIZE / transformedJobs.length) * 100),
          batchInfo: `Processing batch ${batchIndex + 1} of ${batches.length} (${batch.length} valid jobs, ${skippedInBatch} skipped)`
        });

        // Check if batch contains Stephanie or Georgina jobs (for detailed logging)
        const hasStephanie = batch.some(j => (j.customerName || '').toLowerCase().includes('stephanie'));
        const hasGeorgina = batch.some(j => (j.customerName || '').toLowerCase().includes('georgina'));
        
        if (hasStephanie || hasGeorgina) {
          console.log(`🎯 Batch ${batchIndex + 1} contains Stephanie or Georgina jobs - sending to backend...`);
        }

        try {
          let response;
          
          // For ZenBooker, use the SAME API endpoint as original import (jobsAPI.importJobs)
          if (sourceType === 'zenbooker') {
            // Use the exact same API as original ZenBooker import
            // No transformation needed - mapZenBookerFields already returns jobs in the correct format
            response = await jobsAPI.importJobs(batch);
            
            if (response) {
              // Log detailed response for batches containing Stephanie or Georgina
              if (hasStephanie || hasGeorgina) {
                console.log(`📥 Backend response for batch ${batchIndex + 1} (contains Stephanie/Georgina):`, {
                  imported: response.imported || 0,
                  updated: response.updated || 0,
                  skipped: response.skipped || 0,
                  errors: response.errors || [],
                  fullResponse: response
                });
                
                // Check if Stephanie/Georgina jobs were in the batch and see if they were imported/skipped
                const stephanieInBatch = batch.filter(j => (j.customerName || '').toLowerCase().includes('stephanie'));
                const georginaInBatch = batch.filter(j => (j.customerName || '').toLowerCase().includes('georgina'));
                if (stephanieInBatch.length > 0) {
                  console.log(`🔍 Stephanie jobs sent in this batch:`, stephanieInBatch.map(j => ({ name: j.customerName, date: j.scheduledDate, service: j.serviceName })));
                }
                if (georginaInBatch.length > 0) {
                  console.log(`🔍 Georgina jobs sent in this batch:`, georginaInBatch.map(j => ({ name: j.customerName, date: j.scheduledDate, service: j.serviceName })));
                }
                
                // IMPORTANT: Show detailed errors if any jobs were skipped
                if (response.errors && response.errors.length > 0) {
                  console.error(`❌ ERRORS in batch ${batchIndex + 1} (contains Stephanie/Georgina):`);
                  response.errors.forEach((error, idx) => {
                    console.error(`  Error ${idx + 1}:`, error);
                    // Try to find if this error is related to Stephanie or Georgina
                    const errorStr = JSON.stringify(error).toLowerCase();
                    if (errorStr.includes('stephanie') || errorStr.includes('georgina')) {
                      console.error(`  ⚠️ This error might be related to Stephanie or Georgina!`);
                    }
                  });
                }
                
                // Check if skipped count matches Stephanie/Georgina jobs
                if (response.skipped > 0) {
                  console.warn(`⚠️ ${response.skipped} job(s) were SKIPPED in batch ${batchIndex + 1}. This might include Stephanie or Georgina jobs.`);
                  console.warn(`   Batch contained ${stephanieInBatch.length} Stephanie job(s) and ${georginaInBatch.length} Georgina job(s).`);
                }
              }
              
              totalImported += (response.imported || 0);
              totalUpdated += (response.updated || 0);
              totalSkipped += (response.skipped || 0);
              if (response.errors && Array.isArray(response.errors)) {
                errors.push(...response.errors);
              }
            }
          }
          // For Booking Koala, use the dedicated endpoint with the same format as original import
          else if (sourceType === 'booking-koala') {
            // Use the Booking Koala import endpoint with same format as original
            // Format: { customers: [], jobs: [], importSettings: {} }
            // The jobs array should use the same field mapping as original Booking Koala import
            response = await api.post('/booking-koala/import', {
              customers: [], // Jobs-only import (customers are created from job data)
              jobs: batch,
              importSettings: {
                updateExisting: true,
                skipDuplicates: true
              }
            });
            
            // Transform Booking Koala response format to match our expected format
            const bkResults = response.data.results || response.data;
            totalImported += (bkResults.jobs?.imported || 0);
            totalSkipped += (bkResults.jobs?.skipped || 0);
            
            if (bkResults.jobs?.errors && bkResults.jobs.errors.length > 0) {
              errors.push(...bkResults.jobs.errors);
            }
          } else {
            // For other sources, use the generic jobs import endpoint
            response = await jobsAPI.importJobs(batch);
            
            if (response) {
              totalImported += (response.imported || 0);
              totalUpdated += (response.updated || 0);
              totalSkipped += (response.skipped || 0);
              if (response.errors && Array.isArray(response.errors)) {
                errors.push(...response.errors);
              }
            }
          }
        } catch (error) {
          console.error(`❌ Batch ${batchIndex + 1} error:`, error);
          console.error(`❌ Error details:`, {
            message: error.message,
            response: error.response?.data,
            status: error.response?.status,
            batchSize: batch.length,
            batchJobs: batch.map(j => ({ 
              customer: j.customerName || j.customerEmail, 
              date: j.scheduledDate,
              service: j.serviceName 
            }))
          });
          
          // Handle batch errors - continue processing even on error
          if (error.response?.data) {
            const responseData = error.response.data;
            if (responseData.imported !== undefined || responseData.errors) {
              totalImported += (responseData.imported || 0);
              totalUpdated += (responseData.updated || 0);
              totalSkipped += (responseData.skipped || 0);
              if (responseData.errors && Array.isArray(responseData.errors)) {
                errors.push(...responseData.errors.map(err => `Batch ${batchIndex + 1}: ${err}`));
              }
            } else if (responseData.error) {
              errors.push(`Batch ${batchIndex + 1}: ${responseData.error}`);
            } else {
              // Unknown error format - log the entire batch as failed but continue
              errors.push(`Batch ${batchIndex + 1}: Import failed - ${responseData.message || error.message || 'Unknown error'}`);
              totalSkipped += batch.length;
            }
          } else {
            // Network or other errors - log but continue
            errors.push(`Batch ${batchIndex + 1}: ${error.message || 'Network error'} - ${batch.length} jobs not imported`);
            totalSkipped += batch.length;
          }
          
          // CRITICAL: Always continue with next batch even if this one failed
          // This ensures that subsequent batches (like Stephanie and Georgina) still get processed
          console.log(`⏭️ Continuing to next batch despite error in batch ${batchIndex + 1}`);
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

