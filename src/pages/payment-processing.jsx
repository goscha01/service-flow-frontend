import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CreditCard, Lock, CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';

// Initialize Stripe with error handling
const stripePromise = (() => {
  const publishableKey = process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY;
  if (!publishableKey) {
    console.warn('⚠️ Stripe publishable key not found. Please set REACT_APP_STRIPE_PUBLISHABLE_KEY in your .env file');
    // Return a mock promise that will be handled in the component
    return Promise.resolve(null);
  }
  return loadStripe(publishableKey);
})();

const StripePaymentForm = ({ invoice, onSuccess, onError }) => {
  const [stripeLoaded, setStripeLoaded] = useState(false);
  const [stripeError, setStripeError] = useState(false);

  useEffect(() => {
    stripePromise.then((stripe) => {
      if (stripe) {
        setStripeLoaded(true);
      } else {
        setStripeError(true);
      }
    }).catch((error) => {
      console.error('Error loading Stripe:', error);
      setStripeError(true);
    });
  }, []);

  if (stripeError) {
    return (
      <div className="text-center p-6 bg-red-50 border border-red-200 rounded-lg">
        <AlertCircle className="h-8 w-8 text-red-600 mx-auto mb-2" />
        <h3 className="text-lg font-semibold text-red-800 mb-2">Payment System Not Configured</h3>
        <p className="text-red-600">
          Stripe payment processing is not configured. Please contact support.
        </p>
      </div>
    );
  }

  if (!stripeLoaded) {
    return (
      <div className="text-center p-6">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
        <p className="text-gray-600">Loading payment form...</p>
      </div>
    );
  }

  return (
    <Elements stripe={stripePromise}>
      <PaymentForm 
        invoice={invoice} 
        onSuccess={onSuccess}
        onError={onError}
      />
    </Elements>
  );
};

const PaymentForm = ({ invoice, onSuccess, onError }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setProcessing(true);
    setError('');

    const cardElement = elements.getElement(CardElement);

    try {
      // Create payment intent on the server
      const response = await fetch('/api/create-payment-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: Math.round(invoice.amount * 100), // Convert to cents
          currency: 'usd',
          invoiceId: invoice.id,
          customerEmail: invoice.customerEmail || 'customer@example.com',
        }),
      });

      const { clientSecret } = await response.json();

      // Confirm payment with Stripe
      const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
          billing_details: {
            name: invoice.customerName,
            email: invoice.customerEmail || 'customer@example.com',
          },
        },
      });

      if (stripeError) {
        setError(stripeError.message);
        onError(stripeError.message);
      } else if (paymentIntent.status === 'succeeded') {
        onSuccess(paymentIntent);
      }
    } catch (err) {
      setError('An error occurred while processing your payment.');
      onError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Card Information
        </label>
        <div className="border border-gray-300 rounded-lg p-4">
          <CardElement
            options={{
              style: {
                base: {
                  fontSize: '16px',
                  color: '#424770',
                  '::placeholder': {
                    color: '#aab7c4',
                  },
                },
                invalid: {
                  color: '#9e2146',
                },
              },
            }}
          />
        </div>
        {error && (
          <div className="mt-2 flex items-center space-x-2 text-red-600">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">{error}</span>
          </div>
        )}
      </div>

      <button
        type="submit"
        disabled={!stripe || processing}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-4 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
      >
        {processing ? (
          <>
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            <span>Processing...</span>
          </>
        ) : (
          <>
            <Lock className="h-5 w-5" />
            <span>Pay ${invoice.amount.toFixed(2)}</span>
          </>
        )}
      </button>
    </form>
  );
};

const PaymentProcessing = () => {
  const { invoiceId } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchInvoice();
  }, [invoiceId]);

  const fetchInvoice = async () => {
    try {
      setLoading(true);
      
      // Fetch real invoice data from backend
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'https://service-flow-backend-production-4568.up.railway.app/api'}/public/invoice/${invoiceId}`);
      
      if (response.ok) {
        const invoiceData = await response.json();
        setInvoice(invoiceData);
      } else {
        throw new Error('Failed to fetch invoice');
      }
    } catch (error) {
      console.error('Error fetching invoice:', error);
      setError('Failed to load invoice');
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = (paymentIntent) => {
    console.log('Payment succeeded:', paymentIntent);
    navigate(`/public/payment-success/${invoiceId}?payment_intent=${paymentIntent.id}`);
  };

  const handlePaymentError = (errorMessage) => {
    console.error('Payment failed:', errorMessage);
    setError(errorMessage);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading payment form...</p>
        </div>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">❌</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Invoice Not Found</h2>
          <p className="text-gray-600">The invoice you're looking for doesn't exist or has been removed.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Side - Invoice Summary */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={() => navigate(`/public/invoice/${invoiceId}`)}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-800"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back to Invoice</span>
              </button>
              <div className="text-right">
                <p className="text-sm text-gray-600">Invoice</p>
                <p className="text-xl font-bold">#{invoice.invoiceNumber}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-gray-900">Bill to</h3>
                <p className="text-gray-600">{invoice.customerName}</p>
              </div>
              
              <div>
                <h3 className="font-semibold text-gray-900">Service Date</h3>
                <p className="text-gray-600">{new Date(invoice.serviceDate).toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  month: 'long', 
                  day: 'numeric', 
                  year: 'numeric' 
                })}</p>
              </div>
              
              <div>
                <h3 className="font-semibold text-gray-900">Job Number</h3>
                <p className="text-gray-600">#{invoice.jobNumber}</p>
              </div>
              
              <div>
                <h3 className="font-semibold text-gray-900">Service Address</h3>
                <p className="text-gray-600">{invoice.serviceAddress}</p>
              </div>

              <div className="pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-600">We appreciate your business.</p>
              </div>
            </div>

            {/* Service Details */}
            <div className="mt-6">
              <h4 className="font-semibold text-gray-900 mb-3">Items</h4>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium text-gray-900">{invoice.service}</p>
                    <p className="text-sm text-gray-600 mt-1">{invoice.description}</p>
                  </div>
                  <p className="font-semibold text-gray-900">${invoice.amount.toFixed(2)}</p>
                </div>
              </div>
            </div>

            {/* Financial Summary */}
            <div className="mt-6 bg-gray-50 rounded-lg p-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total</span>
                  <span>${invoice.amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-semibold text-lg border-t pt-2">
                  <span>Total Due</span>
                  <span>${invoice.amount.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side - Payment Form */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Payment Method</h2>
              <p className="text-gray-600 mt-1">Select a preferred method to process your payment.</p>
            </div>

            <div className="mb-6">
              <div className="flex items-center space-x-3 p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
                <CreditCard className="h-6 w-6 text-blue-600" />
                <span className="font-medium text-blue-900">Card</span>
              </div>
            </div>

            <StripePaymentForm 
              invoice={invoice} 
              onSuccess={handlePaymentSuccess}
              onError={handlePaymentError}
            />

            <div className="mt-6 flex items-center space-x-2 text-sm text-gray-500">
              <Lock className="h-4 w-4" />
              <span>Your payment information is secure and encrypted</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentProcessing;
