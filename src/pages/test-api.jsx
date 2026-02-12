import React, { useState } from 'react';
import { stripeAPI, twilioAPI } from '../services/api';

const TestAPI = () => {
  const [results, setResults] = useState({});

  const testStripeConnection = async () => {
    try {
      const result = await stripeAPI.testConnection();
      setResults(prev => ({ ...prev, stripe: result }));
    } catch (error) {
      setResults(prev => ({ ...prev, stripe: { error: error.message } }));
    }
  };

  const testTwilioConnection = async () => {
    try {
      const result = await twilioAPI.getPhoneNumbers();
      setResults(prev => ({ ...prev, twilio: result }));
    } catch (error) {
      setResults(prev => ({ ...prev, twilio: { error: error.message } }));
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">API Test Page</h1>
      
      <div className="space-y-4">
        <div>
          <button 
            onClick={testStripeConnection}
            className="px-4 py-2 bg-blue-500 text-white rounded"
          >
            Test Stripe Connection
          </button>
          <pre className="mt-2 p-2 bg-gray-100 rounded">
            {JSON.stringify(results.stripe, null, 2)}
          </pre>
        </div>

        <div>
          <button 
            onClick={testTwilioConnection}
            className="px-4 py-2 bg-green-500 text-white rounded"
          >
            Test Twilio Connection
          </button>
          <pre className="mt-2 p-2 bg-gray-100 rounded">
            {JSON.stringify(results.twilio, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
};

export default TestAPI;
