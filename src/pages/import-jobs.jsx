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
  const [importProgress, setImportProgress] = useState({
    current: 0,
    total: 0,
    percentage: 0,
    batchInfo: null
  });

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

  // Helper function to parse date/time from ZenBooker format and split into date and time
  const parseZenBookerDateTime = (dateTimeStr, timeStr, timezoneStr) => {
    if (!dateTimeStr || !dateTimeStr.trim()) {
      console.warn('No date/time string provided');
      return { date: '', time: '09:00:00' };
    }
    
    try {
      // Clean the string - remove quotes and trim
      let cleanDateTime = dateTimeStr.trim().replace(/^"|"$/g, '');
      
      // Format can be: "2024-11-23, 9:00 AM" or "2024-11-23 9:00 AM" or "2025-11-06 10:00 am" or "1/14/2026 9:59"
      let datePart = '';
      let timePart = '09:00:00';
      
      // First, try to extract date part - handle multiple formats
      // Format 1: YYYY-MM-DD (with optional comma and space after, like "2026-04-15, " or "2026-04-15 " or "2026-01-14 10:00 am")
      // Match YYYY-MM-DD followed by optional comma/space OR space directly (for formats like "2026-01-14 10:00 am")
      let dateMatch = cleanDateTime.match(/^(\d{4}-\d{2}-\d{2})(?:\s*,?\s*|\s+)/);
      
      // Format 2: MM/DD/YYYY or M/D/YYYY (US format)
      if (!dateMatch) {
        dateMatch = cleanDateTime.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
        if (dateMatch) {
          // Convert MM/DD/YYYY to YYYY-MM-DD
          const month = dateMatch[1].padStart(2, '0');
          const day = dateMatch[2].padStart(2, '0');
          const year = dateMatch[3];
          datePart = `${year}-${month}-${day}`;
        }
      } else {
        datePart = dateMatch[1];
      }
      
      if (datePart) {
        // Validate the date is reasonable (not in the far future like 2026+ unless it's actually 2026+)
        // Parse date as local date (not UTC) to avoid timezone shifts
        const [year, month, day] = datePart.split('-').map(Number);
        const dateObj = new Date(year, month - 1, day); // month is 0-indexed
        const currentYear = new Date().getFullYear();
        const dateYear = dateObj.getFullYear();
        
        // Check if date seems corrupted (year is way in the future, like 2026+ when it should be 2024)
        // But allow dates up to 2 years in the future (for scheduling)
        // REMOVED: This was incorrectly "correcting" valid 2026 dates
        // Allow dates up to 3 years in the future to accommodate 2026 dates in 2025
        if (dateYear > currentYear + 3) {
          console.warn(`Suspicious future date detected: ${datePart}, checking for date corruption`);
          // If the year seems wrong, try to extract just the month and day and use current year
          const monthDay = datePart.substring(5);
          if (monthDay) {
            const correctedDate = `${currentYear}-${monthDay}`;
            const correctedDateObj = new Date(Number(currentYear), Number(monthDay.split('-')[0]) - 1, Number(monthDay.split('-')[1]));
            if (!isNaN(correctedDateObj.getTime())) {
              console.warn(`Correcting date from ${datePart} to ${correctedDate}`);
              datePart = correctedDate;
            }
          }
        }
        
        // Try to extract time from dateTimeStr first
        // Handle formats like: 
        // - "2024-11-23, 9:00 AM" or "2024-11-23 9:00 AM" (YYYY-MM-DD with comma)
        // - "1/14/2026 9:59" or "1/11/2026  10:00:00 AM" (MM/DD/YYYY with optional seconds)
        // - "2026-04-15, 10:00 AM" (YYYY-MM-DD with comma and AM/PM)
        
        // First try with AM/PM (with optional seconds: HH:MM:SS AM/PM or HH:MM AM/PM)
        let timeMatch = cleanDateTime.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm|AM|PM)/i);
        if (timeMatch) {
          let hours = parseInt(timeMatch[1]);
          const minutes = timeMatch[2];
          // timeMatch[3] is optional seconds, timeMatch[4] is AM/PM
          const ampm = timeMatch[4].toUpperCase();
          
          if (ampm === 'PM' && hours !== 12) {
            hours += 12;
          } else if (ampm === 'AM' && hours === 12) {
            hours = 0;
          }
          
          timePart = `${String(hours).padStart(2, '0')}:${minutes}:00`;
        } else {
          // Try 24-hour format (HH:MM:SS or HH:MM without AM/PM, like "9:59" or "14:30" or "10:00:00")
          timeMatch = cleanDateTime.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\s|$|,)/);
          if (timeMatch) {
            let hours = parseInt(timeMatch[1]);
            const minutes = timeMatch[2];
            // For import, if no AM/PM, assume 24-hour format
            timePart = `${String(hours).padStart(2, '0')}:${minutes}:00`;
          } else if (timeStr) {
            // Use the separate time string
            const cleanTimeStr = timeStr.trim().replace(/^"|"$/g, '');
            // Try with AM/PM first (with optional seconds)
            const timeMatchFromStr = cleanTimeStr.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm|AM|PM)/i);
            if (timeMatchFromStr) {
              let hours = parseInt(timeMatchFromStr[1]);
              const minutes = timeMatchFromStr[2];
              // timeMatchFromStr[3] is optional seconds, timeMatchFromStr[4] is AM/PM
              const ampm = timeMatchFromStr[4].toUpperCase();
              
              if (ampm === 'PM' && hours !== 12) {
                hours += 12;
              } else if (ampm === 'AM' && hours === 12) {
                hours = 0;
              }
              
              timePart = `${String(hours).padStart(2, '0')}:${minutes}:00`;
            } else {
              // Try 24-hour format from timeStr
              const timeMatch24 = cleanTimeStr.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/);
              if (timeMatch24) {
                let hours = parseInt(timeMatch24[1]);
                const minutes = timeMatch24[2];
                timePart = `${String(hours).padStart(2, '0')}:${minutes}:00`;
              }
            }
          }
        }
      } else {
        console.warn('Could not parse date from:', cleanDateTime);
      }
      
      return { date: datePart, time: timePart };
    } catch (error) {
      console.warn('Error parsing date/time:', dateTimeStr, error);
      return { date: '', time: '09:00:00' };
    }
  };

  // Helper function to parse address from geographic address format
  const parseAddress = (addressStr) => {
    if (!addressStr) return { street: '', city: '', state: '', zipCode: '', country: 'USA' };
    
    // Format: "4710 Parkdale Ln, New Port Richey, FL 34655, USA"
    const parts = addressStr.split(',').map(p => p.trim());
    
    if (parts.length >= 4) {
      return {
        street: parts[0],
        city: parts[1],
        state: parts[2].split(' ')[0], // State abbreviation (first part)
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

  // Helper function to convert seconds to minutes
  const secondsToMinutes = (secondsStr) => {
    if (!secondsStr) return '';
    const seconds = parseInt(secondsStr);
    if (isNaN(seconds)) return '';
    return Math.round(seconds / 60).toString();
  };

  // Helper function to map ZenBooker status to standard status
  // Handles various status formats like "complete", "completed", "in-progress", etc.
  const mapStatus = (statusStr) => {
    if (!statusStr) return 'pending';
    const status = statusStr.toLowerCase().trim();
    
    // Handle completed/complete variations
    if (status === 'complete' || 
        status === 'completed' || 
        status === 'done' || 
        status === 'finished' ||
        status === 'closed' ||
        status.startsWith('complet')) {
      return 'completed';
    }
    
    // Handle in-progress variations
    if (status === 'in-progress' || 
        status === 'in progress' || 
        status === 'inprogress' ||
        status === 'active' ||
        status === 'working' ||
        status === 'started' ||
        status.startsWith('in-progress') ||
        status.startsWith('in progress')) {
      return 'in-progress';
    }
    
    // Handle cancelled/canceled variations
    if (status === 'cancelled' || 
        status === 'canceled' || 
        status === 'cancel' ||
        status === 'cancelled' ||
        status.startsWith('cancel')) {
      return 'cancelled';
    }
    
    // Handle pending/scheduled variations
    if (status === 'pending' || 
        status === 'scheduled' || 
        status === 'upcoming' ||
        status === 'not started' ||
        status === 'not-started' ||
        status.startsWith('pending') ||
        status.startsWith('scheduled')) {
      return 'pending';
    }
    
    // Default to pending for unknown statuses
    console.warn(`Unknown status format: "${statusStr}", defaulting to "pending"`);
    return 'pending';
  };

  // Helper function to extract first service name from patterns like "Service Name, + 1 more" or "Service Name, + 1 other"
  // Returns null if the service name is invalid (only contains the suffix pattern)
  const extractFirstServiceName = (serviceName) => {
    if (!serviceName || typeof serviceName !== 'string') return serviceName;
    
    let cleaned = serviceName.trim();
    
    // Check if the entire string is just the pattern (like ", + -1 more" or "* , + -1 more")
    // If so, this is an invalid service name and should be skipped
    const isOnlyPattern = /^[\*\s]*,\s*\+\s*-?\d+\s*(more|other)\s*$/gi.test(cleaned);
    if (isOnlyPattern) {
      return null; // Return null to indicate invalid service name
    }
    
    // Remove patterns like ", + 1 more", ", + 1 other", ", + -1 more", etc.
    // Handle various spacing: ", + 1 more", ",+1 more", ", +-1 more", ", + 1more"
    // Pattern: comma, optional spaces, plus sign, optional spaces, optional minus, number, optional spaces, "more" or "other"
    cleaned = cleaned.replace(/,\s*\+\s*-?\d+\s*(more|other)/gi, '').trim();
    
    // Handle patterns that start with comma and plus (like ", + -1 more" or ", + 1 more")
    cleaned = cleaned.replace(/^,\s*\+\s*-?\d+\s*(more|other)/gi, '').trim();
    
    // Handle patterns like "* , + -1 more" - remove leading asterisk, comma, and plus
    cleaned = cleaned.replace(/^\*\s*,\s*\+\s*-?\d+\s*(more|other)/gi, '').trim();
    
    // Remove trailing commas and plus signs
    cleaned = cleaned.replace(/,\s*\+\s*$/gi, '').trim();
    cleaned = cleaned.replace(/,\s*$/g, '').trim(); // Remove trailing comma
    
    // Remove leading commas
    cleaned = cleaned.replace(/^,\s*/g, '').trim();
    
    // Remove leading asterisks
    cleaned = cleaned.replace(/^\*\s*/g, '').trim();
    
    // If result is empty or just special characters, this is invalid
    if (!cleaned || cleaned === ',' || cleaned === '+' || cleaned === ', +' || cleaned === '*' || cleaned === ', + -1' || cleaned === ', + 1') {
      return null; // Return null to indicate invalid service name
    }
    
    return cleaned;
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
        const rawData = {}; // Store raw values for processing
        
        // First pass: collect all values (strip quotes)
        headers.forEach((header, index) => {
          let value = values[index] || '';
          // Remove surrounding quotes if present
          if (value.startsWith('"') && value.endsWith('"')) {
            value = value.slice(1, -1);
          }
          rawData[header.trim()] = value.trim();
        });
        
        // Map ZenBooker-specific fields
        // IMPORTANT: Use service_order_custom_service_order for duplicate detection (primary identifier)
        // Also store _id separately as it's the original unique identifier
        job.jobId = rawData['service_order_custom_service_order'] || rawData['job_random_id_text'] || rawData['_id'] || '';
        // Store _id separately if it exists (it's the original unique identifier)
        if (rawData['_id']) {
          job._id = rawData['_id'];
        }
        job.customerName = rawData['customer_name_text'] || '';
        job.customerEmail = rawData['customer_email_text'] || '';
        job.customerPhone = rawData['customer_phone_text'] || '';
        // Map service name - check multiple possible field names
        // Extract first service name from patterns like "Service Name, + 1 more"
        const rawServiceName = rawData['service_selected_text'] || 
                          rawData['services_list_custom_service'] || 
                          rawData['service_name'] || 
                          rawData['service'] || 
                          '';
        const cleanedServiceName = extractFirstServiceName(rawServiceName);
        // If service name is invalid (only contains pattern), set to empty string
        job.serviceName = cleanedServiceName === null ? '' : cleanedServiceName;
        job.price = rawData['price_number'] || rawData['pretax_total_number'] || '';
        job.total = rawData['pretax_total_number'] || rawData['price_number'] || '';
        job.subTotal = rawData['sub_total_number'] || '';
        job.taxTotal = rawData['tax_total_number'] || '';
        job.tip = rawData['tip_number'] || '';
        
        // Parse duration from seconds to minutes
        const durationSeconds = rawData['service_duration_inseconds_number'];
        job.duration = durationSeconds ? secondsToMinutes(durationSeconds) : '';
        
        // Parse scheduled date/time
        const startDateTime = rawData['start_time_for_full_cal_date'];
        const endDateTime = rawData['end_time_for_full_cal_date'] || rawData['finish_time_for_full_cal_date'] || rawData['finish_time_date'];
        const timeHumanReadable = rawData['time_human_readable_text'];
        const timezone = rawData['timezone_text'];
        const dateTimeParts = parseZenBookerDateTime(startDateTime, timeHumanReadable, timezone);
        job.scheduledDate = dateTimeParts.date || null;
        job.scheduledTime = dateTimeParts.time || '09:00:00';
        
        // If we have both start and end times, calculate duration from them
        // This ensures the job duration matches the actual time range
        if (endDateTime && startDateTime) {
          try {
            const startParts = parseZenBookerDateTime(startDateTime, timeHumanReadable, timezone);
            const endParts = parseZenBookerDateTime(endDateTime, null, timezone);
            
            if (startParts.date && endParts.date && startParts.time && endParts.time) {
              // Parse times to calculate duration
              const [startHours, startMinutes] = startParts.time.split(':').map(Number);
              const [endHours, endMinutes] = endParts.time.split(':').map(Number);
              
              // Calculate duration in minutes
              let durationMinutes = (endHours * 60 + endMinutes) - (startHours * 60 + startMinutes);
              
              // Handle case where end time is next day (e.g., 11 PM to 2 AM)
              if (durationMinutes < 0) {
                durationMinutes += 24 * 60; // Add 24 hours
              }
              
              // If we calculated a valid duration, use it (unless duration was already explicitly provided)
              if (durationMinutes > 0 && !job.duration) {
                job.duration = durationMinutes.toString();
                console.log(`Row ${i + 1}: Calculated duration ${durationMinutes} minutes from start ${startParts.time} to end ${endParts.time}`);
              } else if (durationMinutes > 0 && job.duration) {
                // If both exist, prefer the calculated duration from times
                const providedDuration = parseInt(job.duration);
                if (Math.abs(durationMinutes - providedDuration) > 5) {
                  // If there's a significant difference (>5 min), use calculated duration
                  console.log(`Row ${i + 1}: Duration mismatch - provided: ${providedDuration} min, calculated: ${durationMinutes} min. Using calculated.`);
                  job.duration = durationMinutes.toString();
                }
              }
            }
          } catch (error) {
            console.warn(`Row ${i + 1}: Error calculating duration from start/end times:`, error);
          }
        }
        
        // Log the parsed date for debugging
        if (job.scheduledDate) {
          console.log(`Row ${i + 1}: 📅 Parsed date from "${startDateTime}" -> date: "${job.scheduledDate}", time: "${job.scheduledTime}"`);
          // Validate the parsed date matches the original for debugging
          if (startDateTime && (startDateTime.includes('1/14/2026') || startDateTime.includes('2026-01-14'))) {
            console.log(`⚠️ Row ${i + 1}: Original date was 1/14/2026, parsed to: ${job.scheduledDate}`);
            if (job.scheduledDate !== '2026-01-14') {
              console.error(`❌ Row ${i + 1}: DATE MISMATCH! Expected 2026-01-14, got ${job.scheduledDate}`);
            }
          }
        } else if (startDateTime) {
          console.error(`Row ${i + 1}: ❌ FAILED to parse date from "${startDateTime}"`);
        }
        
        // If no date, skip this job (can't create job without date)
        if (!job.scheduledDate) {
          console.warn(`Row ${i + 1}: ⚠️ SKIPPING JOB - no scheduled date provided. Customer: "${job.customerName || job.customerEmail}", Service: "${job.serviceName}", Original value: "${startDateTime}"`);
          console.warn(`Row ${i + 1}: ⚠️ This row will NOT be sent to backend, but processing will CONTINUE for remaining rows`);
          continue;
        }
        
        // Parse status - prioritize live_status_text, but also check standard status field
        const statusFromLiveStatus = rawData['live_status_text'];
        const statusFromStandard = rawData['status'] || rawData['Status'];
        
        // Use live_status_text first, then fall back to standard status field
        if (statusFromLiveStatus) {
          job.status = mapStatus(statusFromLiveStatus);
        } else if (statusFromStandard) {
          job.status = mapStatus(statusFromStandard);
        }
        
        // Parse address
        const addressStr = rawData['job_address_geographic_address'];
        const apartmentUnit = rawData['appartment_unit_floor_number_text'];
        const addressParts = parseAddress(addressStr);
        job.serviceAddress = apartmentUnit ? `${addressParts.street}, ${apartmentUnit}` : addressParts.street;
        job.serviceAddressCity = addressParts.city;
        job.serviceAddressState = addressParts.state;
        job.serviceAddressZip = addressParts.zipCode;
        job.serviceAddressCountry = addressParts.country;
        
        // Team member/crew - store external IDs (will be used to create/find team members on backend)
        const assignedCrew = rawData['assigned_crew_list_list_custom_crew'];
        if (assignedCrew) {
          // Crew IDs are comma-separated, take first one for teamMemberId
          const crewIds = assignedCrew.split(',').map(id => id.trim()).filter(id => id);
          job.assignedCrewExternalId = crewIds[0] || ''; // Store external ID (e.g., "1733683020919x797049254337314800")
          job.assignedCrewIds = crewIds; // Store all IDs if multiple
        }
        
        // Service region/territory - store external ID (will be used to create/find territory on backend)
        const serviceRegion = rawData['service_region_custom_service_region'];
        if (serviceRegion) {
          job.serviceRegionExternalId = serviceRegion.trim(); // Store external ID (e.g., "1733415451364x525754777237780000")
        }
        
        // Additional fields
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
        
        // Payment/Invoice status fields - CRITICAL for payment status detection
        // Extract invoice_fully_paid_boolean (handles TRUE/FALSE strings, boolean values, etc.)
        // IMPORTANT: Always extract if it exists, even if it's 'FALSE' - backend needs to know
        if (rawData.hasOwnProperty('invoice_fully_paid_boolean')) {
          const invoiceFullyPaidValue = rawData['invoice_fully_paid_boolean'];
          // Preserve the value as-is (could be 'TRUE', 'FALSE', true, false, '1', '0', '', etc.)
          job.invoice_fully_paid_boolean = invoiceFullyPaidValue;
          console.log(`Row ${i + 1}: ✅ Extracted invoice_fully_paid_boolean = "${invoiceFullyPaidValue}" (type: ${typeof invoiceFullyPaidValue})`);
        } else {
          console.log(`Row ${i + 1}: ⚠️ invoice_fully_paid_boolean field NOT found in CSV. Available keys:`, Object.keys(rawData).filter(k => k.toLowerCase().includes('invoice') || k.toLowerCase().includes('paid')));
        }
        
        // Also extract explicit payment/invoice status fields if present
        if (rawData['payment_status'] || rawData['Payment Status']) {
          job.paymentStatus = rawData['payment_status'] || rawData['Payment Status'];
        }
        if (rawData['invoice_status'] || rawData['Invoice Status']) {
          job.invoiceStatus = rawData['invoice_status'] || rawData['Invoice Status'];
        }
        
        // Timestamps
        job.dateTimeArrived = rawData['date_time_arrived_date'] || '';
        job.dateTimeCompleted = rawData['date_time_completed_date'] || '';
        job.dateTimeEnroute = rawData['date_time_enroute_date'] || '';
        
        // Also support standard field names for backward compatibility
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
              // Store _id separately - this is the primary unique identifier for duplicate detection
              if (!job._id) job._id = value;
              // Also set jobId if not already set
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
              if (!job.serviceName) {
                const cleaned = extractFirstServiceName(value);
                if (cleaned !== null) job.serviceName = cleaned;
              }
              break;
            case 'service_selected_text':
            case 'services_list_custom_service':
              if (!job.serviceName) {
                const cleaned = extractFirstServiceName(value);
                if (cleaned !== null) job.serviceName = cleaned;
              }
              break;
            case 'service price':
            case 'serviceprice':
              if (!job.servicePrice) job.servicePrice = value;
              break;
            case 'duration':
              if (!job.duration) job.duration = value;
              break;
            case 'status':
              // Always use the status from CSV if provided, don't override if already set
              if (value && value.trim()) {
                const mappedStatus = mapStatus(value);
                // Only set if we don't have a status yet, or if current status is just the default 'pending'
                if (!job.status || (job.status === 'pending' && mappedStatus !== 'pending')) {
                  job.status = mappedStatus;
                }
              }
              break;
            case 'scheduled date':
            case 'scheduleddate':
            case 'start date':
            case 'startdate':
              if (!job.scheduledDate) job.scheduledDate = value;
              break;
            case 'scheduled time':
            case 'scheduledtime':
            case 'start time':
            case 'starttime':
              if (!job.scheduledTime || job.scheduledTime === '09:00:00') job.scheduledTime = value;
              break;
            case 'end time':
            case 'endtime':
            case 'finish time':
            case 'finishtime':
            case 'end_time':
            case 'finish_time':
              // Store end time to calculate duration if needed
              if (value && !job.endTime) {
                job.endTime = value;
              }
              break;
            case 'team member':
            case 'teammember':
              if (!job.teamMemberName) job.teamMemberName = value;
              break;
            case 'team member id':
            case 'teammemberid':
            case 'team_member_id':
            case 'assigned_team_member_id':
              // If value is a number, treat it as internal team member ID
              const parsedTeamMemberId = parseInt(value);
              if (!isNaN(parsedTeamMemberId) && !value.toString().includes('x') && !value.toString().includes('X')) {
                job.teamMemberId = parsedTeamMemberId;
              }
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
              if (!job.total) job.total = value;
              break;
            case 'notes':
              if (!job.notes) job.notes = value;
              break;
            case 'service address':
            case 'serviceaddress':
              if (!job.serviceAddress) job.serviceAddress = value;
              break;
            case 'city':
              if (!job.serviceAddressCity) job.serviceAddressCity = value;
              break;
            case 'state':
              if (!job.serviceAddressState) job.serviceAddressState = value;
              break;
            case 'service address zip':
            case 'serviceaddresszip':
            case 'zip code':
            case 'zipcode':
              if (!job.serviceAddressZip) job.serviceAddressZip = value;
              break;
            case 'service address country':
            case 'serviceaddresscountry':
              if (!job.serviceAddressCountry) job.serviceAddressCountry = value;
              break;
            case 'price':
              if (!job.price) job.price = value;
              break;
            case 'discount':
              job.discount = value;
              break;
            case 'additional fees':
            case 'additionalfees':
              job.additionalFees = value;
              break;
            case 'taxes':
              if (!job.taxTotal) job.taxTotal = value;
              break;
            case 'payment method':
            case 'paymentmethod':
              if (!job.paymentMethod) job.paymentMethod = value;
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
              if (!job.workersNeeded) job.workersNeeded = value;
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
            case 'cancel_boolean':
            case 'cancel boolean':
            case 'cancelboolean':
              // If cancel_boolean is true, mark job as cancelled
              if (value === 'true' || value === true || value === 'TRUE') {
                job.status = 'cancelled';
                console.log(`Row ${i + 1}: ✅ Job marked as cancelled (cancel_boolean = true)`);
              }
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
        
        // Set defaults - but preserve status if it was already set from CSV
        // Only set to 'pending' if status was never set at all
        if (!job.status) {
          job.status = 'pending';
        }
        
        if (!job.priority) job.priority = 'normal';
        if (!job.workersNeeded) job.workersNeeded = '1';
        
        // Validate status (already mapped, but double-check)
        const validStatuses = ['pending', 'in-progress', 'completed', 'cancelled'];
        if (!validStatuses.includes(job.status)) {
          console.warn(`Row ${i + 1}: Invalid status "${job.status}", defaulting to "pending"`);
          job.status = 'pending';
        } else {
          // Log the status being used for debugging
          console.log(`Row ${i + 1}: Using status "${job.status}"`);
        }
        
        // Validate priority
        const validPriorities = ['low', 'normal', 'high', 'urgent'];
        if (job.priority && !validPriorities.includes(job.priority.toLowerCase())) {
          console.warn(`Row ${i + 1}: Invalid priority "${job.priority}", defaulting to "normal"`);
          job.priority = 'normal';
        }
        
        // Validate and parse numeric fields
        if (job.price) {
          const priceNum = parseFloat(job.price);
          if (isNaN(priceNum)) {
            console.warn(`Row ${i + 1}: Invalid price "${job.price}", defaulting to 0`);
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
            console.warn(`Row ${i + 1}: Invalid total "${job.total}", defaulting to price`);
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
        
        // Clean up empty strings, but preserve required fields and payment status fields
        // Note: invoice_fully_paid_boolean is already extracted above (line 377-381)
        const requiredFields = ['customerName', 'customerEmail', 'customerPhone', 'serviceName', 'scheduledDate', 'scheduledTime'];
        const paymentStatusFields = ['invoice_fully_paid_boolean', 'paymentStatus', 'invoiceStatus', 'paymentMethod']; // Don't delete these even if empty
        Object.keys(job).forEach(key => {
          if (job[key] === '' && !requiredFields.includes(key) && !paymentStatusFields.includes(key)) {
            delete job[key];
          }
        });
        
        // Ensure customerName is always present (even if empty string)
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
        
        // Log first job for debugging - show invoice_fully_paid_boolean if present
        if (i === 1) {
          console.log('📋 Sample parsed job:', JSON.stringify(job, null, 2));
          if (job.invoice_fully_paid_boolean !== undefined) {
            console.log(`✅ Row ${i + 1}: invoice_fully_paid_boolean will be sent to backend:`, job.invoice_fully_paid_boolean);
          } else {
            console.log(`❌ Row ${i + 1}: invoice_fully_paid_boolean is MISSING from job object!`);
          }
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
    
    // Initialize progress
    const totalJobs = previewData.length;
    const BATCH_SIZE = 100; // Process 100 jobs at a time to avoid timeouts
    const batches = Math.ceil(totalJobs / BATCH_SIZE);
    
    setImportProgress({
      current: 0,
      total: totalJobs,
      percentage: 0,
      batchInfo: batches > 1 ? { current: 0, total: batches } : null
    });
    
    // Aggregate results
    const aggregateResults = {
      imported: 0,
      updated: 0,
      skipped: 0,
      errors: [],
      warnings: [] // Track update warnings separately
    };
    
    try {
      console.log(`📤 Starting batch import: ${totalJobs} jobs in ${batches} batches of ${BATCH_SIZE}`);
      
      // Process jobs in batches
      for (let batchIndex = 0; batchIndex < batches; batchIndex++) {
        const startIndex = batchIndex * BATCH_SIZE;
        const endIndex = Math.min(startIndex + BATCH_SIZE, totalJobs);
        const rawBatch = previewData.slice(startIndex, endIndex);
        
        // CRITICAL: Filter out any jobs without valid scheduledDate before sending to backend
        // This ensures that jobs without dates don't cause the entire batch to fail
        const batch = rawBatch.filter(job => {
          const hasValidDate = job.scheduledDate && 
                               typeof job.scheduledDate === 'string' && 
                               job.scheduledDate.trim() !== '';
          if (!hasValidDate) {
            console.warn(`⚠️ Filtering out job before batch send - missing scheduledDate. Job data:`, {
              customerName: job.customerName,
              customerEmail: job.customerEmail,
              serviceName: job.serviceName
            });
          }
          return hasValidDate;
        });
        
        // Skip empty batches (all jobs filtered out)
        if (batch.length === 0) {
          console.log(`⏭️ Skipping batch ${batchIndex + 1} - all jobs filtered out due to missing dates`);
          setImportProgress({
            current: endIndex,
            total: totalJobs,
            percentage: Math.round((endIndex / totalJobs) * 100),
            batchInfo: batches > 1 ? { current: batchIndex + 1, total: batches } : null
          });
          continue;
        }
        
        const batchNumber = batchIndex + 1;
        const skippedInBatch = rawBatch.length - batch.length;
        if (skippedInBatch > 0) {
          aggregateResults.skipped += skippedInBatch;
          aggregateResults.errors.push(`Batch ${batchNumber}: ${skippedInBatch} job(s) skipped due to missing scheduled dates`);
        }
        
        console.log(`📦 Processing batch ${batchNumber}/${batches}: ${batch.length} valid jobs (${skippedInBatch} skipped) out of ${rawBatch.length} total`);
        if (batch.length > 0) {
          console.log(`✅ Valid jobs in batch ${batchNumber}:`, batch.map(j => ({
            customer: j.customerName || j.customerEmail,
            date: j.scheduledDate,
            service: j.serviceName
          })));
          
          // Specifically log if Stephanie or Georgina are in this batch
          const hasStephanie = batch.some(j => (j.customerName || '').toLowerCase().includes('stephanie'));
          const hasGeorgina = batch.some(j => (j.customerName || '').toLowerCase().includes('georgina'));
          if (hasStephanie || hasGeorgina) {
            console.log(`🎯 Batch ${batchNumber} contains Stephanie or Georgina jobs - these will be sent to backend`);
          }
        }
        
        try {
          // Update progress before sending batch
          setImportProgress({
            current: startIndex,
            total: totalJobs,
            percentage: Math.round((startIndex / totalJobs) * 100),
            batchInfo: batches > 1 ? { current: batchIndex, total: batches } : null
          });
          
          // Import this batch
          const result = await jobsAPI.importJobs(batch);
          
          // Aggregate results
          if (result) {
            aggregateResults.imported += result.imported || 0;
            aggregateResults.updated += result.updated || 0;
            aggregateResults.skipped += result.skipped || 0;
            if (result.errors && Array.isArray(result.errors)) {
              // Adjust error row numbers to reflect actual row numbers
              const adjustedErrors = result.errors.map(error => {
                // If error contains "Row X:", adjust the row number
                if (error.includes('Row ')) {
                  return error.replace(/Row (\d+):/, (match, rowNum) => {
                    const actualRow = parseInt(rowNum) + startIndex;
                    return `Row ${actualRow}:`;
                  });
                }
                return `Batch ${batchNumber}: ${error}`;
              });
              aggregateResults.errors.push(...adjustedErrors);
            }
            if (result.warnings && Array.isArray(result.warnings)) {
              // Adjust warning row numbers to reflect actual row numbers
              const adjustedWarnings = result.warnings.map(warning => {
                // If warning contains "Row X:", adjust the row number
                if (warning.includes('Row ')) {
                  return warning.replace(/Row (\d+):/, (match, rowNum) => {
                    const actualRow = parseInt(rowNum) + startIndex;
                    return `Row ${actualRow}:`;
                  });
                }
                return `Batch ${batchNumber}: ${warning}`;
              });
              aggregateResults.warnings.push(...adjustedWarnings);
            }
          }
          
          // Update progress after batch completes
          setImportProgress({
            current: endIndex,
            total: totalJobs,
            percentage: Math.round((endIndex / totalJobs) * 100),
            batchInfo: batches > 1 ? { current: batchIndex + 1, total: batches } : null
          });
          
          // Small delay between batches to avoid overwhelming the server
          if (batchIndex < batches - 1) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
          
        } catch (error) {
          console.error(`❌ Batch ${batchNumber} error:`, error);
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
              aggregateResults.imported += responseData.imported || 0;
              aggregateResults.updated += responseData.updated || 0;
              aggregateResults.skipped += responseData.skipped || 0;
              if (responseData.errors && Array.isArray(responseData.errors)) {
                const adjustedErrors = responseData.errors.map(err => 
                  `Batch ${batchNumber}: ${err}`
                );
                aggregateResults.errors.push(...adjustedErrors);
              }
            } else if (responseData.error) {
              aggregateResults.errors.push(`Batch ${batchNumber}: ${responseData.error}`);
            } else {
              // Unknown error format - log the entire batch as failed but continue
              aggregateResults.errors.push(`Batch ${batchNumber}: Import failed - ${responseData.message || error.message || 'Unknown error'}`);
              aggregateResults.skipped += batch.length;
            }
          } else {
            // Network or other errors - log but continue
            aggregateResults.errors.push(`Batch ${batchNumber}: ${error.message || 'Network error'} - ${batch.length} jobs not imported`);
            aggregateResults.skipped += batch.length;
          }
          
          // CRITICAL: Always continue with next batch even if this one failed
          // This ensures that subsequent batches (like Stephanie and Georgina) still get processed
          console.log(`⏭️ Continuing to next batch despite error in batch ${batchNumber}`);
          setImportProgress({
            current: endIndex,
            total: totalJobs,
            percentage: Math.round((endIndex / totalJobs) * 100),
            batchInfo: batches > 1 ? { current: batchIndex + 1, total: batches } : null
          });
        }
      }
      
      // Set final progress
      setImportProgress({
        current: totalJobs,
        total: totalJobs,
        percentage: 100,
        batchInfo: batches > 1 ? { current: batches, total: batches } : null
      });
      
      console.log('📊 Final import results:', aggregateResults);
      
      // Set the aggregated results
      setImportResult(aggregateResults);
      
    } catch (error) {
      console.error('❌ Import error:', error);
      console.error('❌ Error response:', error.response?.data);
      console.error('❌ Error status:', error.response?.status);
      console.error('❌ Full error:', error);
      
      // If we have partial results, show them
      if (aggregateResults.imported > 0 || aggregateResults.errors.length > 0) {
        setImportResult(aggregateResults);
      } else {
        setError(`Import failed: ${error.message || 'Unknown error'}`);
      }
    } finally {
      setIsImporting(false);
      // Reset progress after a short delay
      setTimeout(() => {
        setImportProgress({
          current: 0,
          total: 0,
          percentage: 0,
          batchInfo: null
        });
      }, 1000);
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
    const hasImports = (importResult.imported > 0) || (importResult.updated > 0);
    const hasErrors = importResult.errors && importResult.errors.length > 0;
    const hasWarnings = importResult.warnings && importResult.warnings.length > 0;
    
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center py-12">
            {hasImports ? (
              <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-6" />
            ) : (
              <AlertCircle className="w-16 h-16 text-red-600 mx-auto mb-6" />
            )}
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              {hasImports ? 'Import Complete!' : 'Import Failed'}
            </h1>
            <p className="text-lg text-gray-600 mb-8">
              {hasImports 
                ? `Successfully processed ${(importResult.imported || 0) + (importResult.updated || 0)} job${((importResult.imported || 0) + (importResult.updated || 0)) !== 1 ? 's' : ''} (${importResult.imported || 0} new, ${importResult.updated || 0} updated).`
                : 'No jobs were imported. Please check the errors below and try again.'
              }
            </p>
            
            <div className="bg-green-50 border border-green-200 rounded-xl p-6 mb-8 max-w-4xl mx-auto">
              <h3 className="text-lg font-semibold text-green-800 mb-4">Import Summary</h3>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-sm mb-6">
                <div className="bg-white rounded-lg p-4">
                  <div className="text-2xl font-bold text-green-600">{importResult.imported || 0}</div>
                  <div className="text-green-700">New Jobs</div>
                </div>
                {(importResult.updated > 0) && (
                  <div className="bg-white rounded-lg p-4">
                    <div className="text-2xl font-bold text-blue-600">{importResult.updated}</div>
                    <div className="text-blue-700">Updated</div>
                  </div>
                )}
                {importResult.skipped > 0 && (
                  <div className="bg-white rounded-lg p-4">
                    <div className="text-2xl font-bold text-yellow-600">{importResult.skipped}</div>
                    <div className="text-yellow-700">Skipped</div>
                  </div>
                )}
                {hasErrors && (
                  <div className="bg-white rounded-lg p-4">
                    <div className="text-2xl font-bold text-red-600">{importResult.errors.length}</div>
                    <div className="text-red-700">Errors</div>
                  </div>
                )}
              </div>
              
              {/* Updated Jobs Display */}
              {hasWarnings && (
                <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-6">
                  <h4 className="text-lg font-semibold text-blue-800 mb-4 flex items-center">
                    <CheckCircle className="w-5 h-5 mr-2" />
                    Jobs Updated ({importResult.warnings.length})
                  </h4>
                  <p className="text-sm text-blue-700 mb-4">
                    These jobs already existed in your account and were updated with new data from the CSV file.
                  </p>
                  <div className="max-h-64 overflow-y-auto space-y-2">
                    {importResult.warnings.slice(0, 50).map((warning, index) => (
                      <div key={index} className="bg-white rounded-lg p-2 border border-blue-100">
                        <p className="text-xs text-blue-700 font-mono">{warning}</p>
                      </div>
                    ))}
                    {importResult.warnings.length > 50 && (
                      <p className="text-sm text-blue-600 italic">
                        ... and {importResult.warnings.length - 50} more updated jobs
                      </p>
                    )}
                  </div>
                </div>
              )}
              
              {/* Detailed Error Display */}
              {hasErrors && (
                <div className="mt-6 bg-red-50 border border-red-200 rounded-xl p-6">
                  <h4 className="text-lg font-semibold text-red-800 mb-4 flex items-center">
                    <AlertCircle className="w-5 h-5 mr-2" />
                    Import Errors ({importResult.errors.length})
                  </h4>
                  <p className="text-sm text-red-700 mb-4">
                    These are actual errors that prevented jobs from being imported. Please review and fix these issues.
                  </p>
                  <div className="max-h-96 overflow-y-auto space-y-2">
                    {importResult.errors.map((error, index) => (
                      <div key={index} className="bg-white rounded-lg p-3 border border-red-100">
                        <p className="text-sm text-red-700 font-mono">{error}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Warning if nothing imported */}
              {importResult.imported === 0 && importResult.skipped > 0 && (
                <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-xl p-6">
                  <h4 className="text-lg font-semibold text-yellow-800 mb-2 flex items-center">
                    <AlertCircle className="w-5 h-5 mr-2" />
                    No Jobs Imported
                  </h4>
                  <p className="text-yellow-700 text-sm">
                    All {importResult.skipped} jobs were skipped. Check the errors above for details.
                  </p>
                </div>
              )}
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
      {/* Fixed Progress Bar Overlay */}
      {isImporting && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-white border-b-2 border-blue-200 shadow-lg">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
             <div className="flex items-center justify-between mb-2">
               <div className="flex items-center space-x-3">
                 <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                 <span className="text-lg font-semibold text-gray-900">Importing Jobs...</span>
                 {importProgress.batchInfo && (
                   <span className="text-sm text-blue-600">
                     (Batch {importProgress.batchInfo.current}/{importProgress.batchInfo.total})
                   </span>
                 )}
               </div>
               <span className="text-lg font-semibold text-blue-600">
                 {importProgress.current} / {importProgress.total} ({importProgress.percentage}%)
               </span>
             </div>
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div
                className="bg-blue-600 h-3 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${importProgress.percentage}%` }}
              />
            </div>
          </div>
        </div>
      )}
      
      <div className={`max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 ${isImporting ? 'pt-24' : ''}`}>
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
            Import your job data from a CSV file into ZenBooker. Supports ZenBooker export format and standard CSV templates.
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
                  
                  {/* Progress Bar */}
                  {isImporting && (
                    <div className="mt-6 bg-blue-50 border-2 border-blue-200 rounded-lg p-6 shadow-lg">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                          <span className="text-base font-semibold text-gray-900">Importing Jobs</span>
                          {importProgress.batchInfo && (
                            <span className="text-sm text-blue-600 ml-2">
                              (Batch {importProgress.batchInfo.current}/{importProgress.batchInfo.total})
                            </span>
                          )}
                        </div>
                        <span className="text-base font-semibold text-blue-600">
                          {importProgress.current} / {importProgress.total} ({importProgress.percentage}%)
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden shadow-inner">
                        <div
                          className="bg-blue-600 h-4 rounded-full transition-all duration-300 ease-out flex items-center justify-end pr-2"
                          style={{ width: `${importProgress.percentage}%` }}
                        >
                          {importProgress.percentage > 10 && (
                            <span className="text-xs font-medium text-white">
                              {importProgress.percentage}%
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 mt-3 font-medium">
                        {importProgress.batchInfo 
                          ? `Processing in batches to ensure reliability. Batch ${importProgress.batchInfo.current} of ${importProgress.batchInfo.total}...`
                          : 'Please wait while we import your jobs. This may take a few moments...'
                        }
                      </p>
                    </div>
                  )}
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
