import React, { useState, useEffect, useCallback } from 'react';
import { Phone, CheckCircle, AlertCircle, Save } from 'lucide-react';
import { twilioAPI } from '../services/api';
import Modal from './Modal';

const DefaultPhoneSelector = () => {
  const [phoneNumbers, setPhoneNumbers] = useState([]);
  const [selectedPhone, setSelectedPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState({ isOpen: false, title: '', message: '', type: 'info' });

  const loadPhoneNumbers = useCallback(async () => {
    setLoading(true);
    try {
      console.log('📞 Loading phone numbers...');
      const response = await twilioAPI.getPhoneNumbers();
      console.log('📞 Phone numbers response:', response);
      if (response.phoneNumbers && response.phoneNumbers.length > 0) {
        setPhoneNumbers(response.phoneNumbers);
        console.log('📞 Set phone numbers:', response.phoneNumbers);
        // Set first number as default if none selected
        if (!selectedPhone && response.phoneNumbers[0]) {
          console.log('📞 Setting first phone as default:', response.phoneNumbers[0].phoneNumber);
          setSelectedPhone(response.phoneNumbers[0].phoneNumber);
        }
      }
    } catch (error) {
      console.error('Error loading phone numbers:', error);
      setModal({
        isOpen: true,
        title: 'Error',
        message: 'Failed to load Twilio phone numbers. Please check your Twilio connection.',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  }, []);

  const loadCurrentDefault = useCallback(async () => {
    try {
      console.log('📞 Loading current default phone number...');
      const response = await twilioAPI.getDefaultPhoneNumber();
      console.log('📞 Default phone response:', response);
      if (response.defaultPhoneNumber) {
        console.log('📞 Setting selected phone to:', response.defaultPhoneNumber);
        setSelectedPhone(response.defaultPhoneNumber);
      } else {
        // If no default is set, use the first available phone number
        if (phoneNumbers.length > 0) {
          console.log('📞 No default set, using first available phone:', phoneNumbers[0].phoneNumber);
          setSelectedPhone(phoneNumbers[0].phoneNumber);
        }
      }
    } catch (error) {
      console.error('Error loading default phone number:', error);
      // If error loading default, use first available number
      if (phoneNumbers.length > 0) {
        console.log('📞 Error loading default, using first available phone:', phoneNumbers[0].phoneNumber);
        setSelectedPhone(phoneNumbers[0].phoneNumber);
      }
    }
  }, [phoneNumbers]);

  useEffect(() => {
    loadPhoneNumbers();
  }, [loadPhoneNumbers]);

  // Load current default after phone numbers are loaded
  useEffect(() => {
    if (phoneNumbers.length > 0) {
      loadCurrentDefault();
    }
  }, [phoneNumbers, loadCurrentDefault]);

  const handleSaveDefault = async () => {
    if (!selectedPhone) {
      setModal({
        isOpen: true,
        title: 'No Phone Selected',
        message: 'Please select a phone number to set as default.',
        type: 'error'
      });
      return;
    }

    console.log('📞 Saving default phone number:', selectedPhone);
    setSaving(true);
    try {
      const response = await twilioAPI.setDefaultPhoneNumber(selectedPhone);
      console.log('📞 Save response:', response);
      setModal({
        isOpen: true,
        title: 'Default Phone Updated',
        message: `Default phone number has been set to ${selectedPhone}.`,
        type: 'success'
      });
    } catch (error) {
      console.error('Error setting default phone:', error);
      setModal({
        isOpen: true,
        title: 'Save Failed',
        message: 'Failed to save default phone number. Please try again.',
        type: 'error'
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white border border-[var(--sf-border-light)] rounded-lg p-6">
        <div className="flex items-center space-x-3">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
          <span className="text-[var(--sf-text-secondary)]">Loading phone numbers...</span>
        </div>
      </div>
    );
  }

  if (phoneNumbers.length === 0) {
    return (
      <div className="bg-white border border-[var(--sf-border-light)] rounded-lg p-6">
        <div className="flex items-center space-x-3 text-[var(--sf-text-secondary)]">
          <AlertCircle className="w-5 h-5" />
          <span>No Twilio phone numbers available. Please connect your Twilio account first.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-[var(--sf-border-light)] rounded-lg p-6">
      <div className="flex items-center space-x-3 mb-4">
        <Phone className="w-6 h-6 text-[var(--sf-blue-500)]" />
        <h2 className="text-lg font-semibold text-[var(--sf-text-primary)]">Default Phone Number</h2>
      </div>
      
      <p className="text-sm text-[var(--sf-text-secondary)] mb-4">
        Select which Twilio phone number to use as the default for sending SMS notifications.
      </p>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-[var(--sf-text-primary)] mb-2">
            Choose Default Phone Number
          </label>
          <select
            value={selectedPhone}
            onChange={(e) => setSelectedPhone(e.target.value)}
            className="w-full px-3 py-2 border border-[var(--sf-border-light)] rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--sf-blue-500)]"
          >
            {phoneNumbers.map((phone) => (
              <option key={phone.phoneNumber} value={phone.phoneNumber}>
                {phone.friendlyName ? 
                  `${phone.friendlyName} (${phone.phoneNumber})` : 
                  phone.phoneNumber
                }
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-sm text-[var(--sf-text-secondary)]">
            <span className="font-medium">Selected:</span> {selectedPhone}
          </div>
          <button
            onClick={handleSaveDefault}
            disabled={saving}
            className="flex items-center space-x-2 px-4 py-2 bg-[var(--sf-blue-500)] text-white rounded-md hover:bg-[var(--sf-blue-600)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>{saving ? 'Saving...' : 'Save Default'}</span>
          </button>
        </div>
      </div>

      <Modal
        isOpen={modal.isOpen}
        onClose={() => setModal({ ...modal, isOpen: false })}
        title={modal.title}
        message={modal.message}
        type={modal.type}
      />
    </div>
  );
};

export default DefaultPhoneSelector;
