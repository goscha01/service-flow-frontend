import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CreditCard, Lock, CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';

// Dynamic Stripe initialization
const initializeStripe = async (publishableKey) => {
  if (!publishableKey) {
    console.warn('⚠️ No Stripe publishable key provided');
    return null;
  }
  return loadStripe(publishableKey);
};


const PaymentForm = ({ invoice, onSuccess, onError }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    console.log('💳 Payment form submitted');

    if (!stripe || !elements) {
      console.error('💳 Stripe or elements not available');
      return;
    }

    setProcessing(true);
    setError('');
    console.log('💳 Starting payment processing...');

    const cardElement = elements.getElement(CardElement);

    try {
      // Create payment intent on the server
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'https://service-flow-backend-production-4568.up.railway.app/api'}/create-payment-intent`, {
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

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ Payment intent creation failed:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        });
        throw new Error(errorData.error || 'Failed to create payment intent');
      }

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
        console.log('Payment succeeded:', paymentIntent);
        
        // Call payment success endpoint to save transaction and update invoice
        try {
          const successResponse = await fetch(`${process.env.REACT_APP_API_URL || 'https://service-flow-backend-production-4568.up.railway.app/api'}/payment-success`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              paymentIntentId: paymentIntent.id,
              invoiceId: invoice.id,
            }),
          });

          if (!successResponse.ok) {
            const errorData = await successResponse.json();
            throw new Error(errorData.error || 'Failed to process payment success');
          }

          const successData = await successResponse.json();
          
          if (successData.success) {
            console.log('✅ Payment processed successfully:', successData);
            onSuccess(paymentIntent, successData);
          } else {
            throw new Error(successData.error || 'Payment processing failed');
          }
        } catch (error) {
          console.error('❌ Error processing payment success:', error);
          console.error('❌ Error details:', {
            message: error.message,
            stack: error.stack,
            paymentIntent: paymentIntent.id,
            invoiceId: invoice.id
          });
          setError(`Payment succeeded but failed to process: ${error.message}`);
          onError(error.message);
        }
      }
    } catch (err) {
      console.error('❌ Payment processing error:', err);
      console.error('❌ Error details:', {
        message: err.message,
        stack: err.stack,
        name: err.name
      });
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
  const [stripePromise, setStripePromise] = useState(null);
  const [stripeConfig, setStripeConfig] = useState(null);
  const [invoicePaid, setInvoicePaid] = useState(false);
  const [paymentError, setPaymentError] = useState(false);

  useEffect(() => {
    fetchInvoice();
    fetchStripeConfig();
  }, [invoiceId]);

  const fetchInvoice = async () => {
    try {
      setLoading(true);
      console.log('📄 Fetching invoice:', invoiceId);
      
      // Fetch real invoice data from backend
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'https://service-flow-backend-production-4568.up.railway.app/api'}/public/invoice/${invoiceId}`);
      
      console.log('📄 Invoice response status:', response.status);
      
      if (response.ok) {
        const invoiceData = await response.json();
        console.log('📄 Invoice data:', invoiceData);
        setInvoice(invoiceData);
        
        // Check if invoice is already paid
        if (invoiceData.status === 'paid') {
          console.log('📄 Invoice already paid');
          setError('This invoice has already been paid');
          setInvoicePaid(true);
        }
      } else {
        const errorData = await response.json();
        console.error('📄 Invoice fetch failed:', errorData);
        throw new Error('Failed to fetch invoice');
      }
    } catch (error) {
      console.error('Error fetching invoice:', error);
      setError('Failed to load invoice');
    } finally {
      setLoading(false);
    }
  };

  const fetchStripeConfig = async () => {
    try {
      console.log('🔑 Fetching Stripe config for invoice:', invoiceId);
      
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'https://service-flow-backend-production-4568.up.railway.app/api'}/public/stripe-config/${invoiceId}`);
      
      if (response.ok) {
        const config = await response.json();
        console.log('🔑 Stripe config received:', config);
        setStripeConfig(config);
        
        // Initialize Stripe with the publishable key
        const stripe = await initializeStripe(config.publishableKey);
        setStripePromise(stripe);
      } else {
        console.error('❌ Failed to fetch Stripe config:', response.status);
        setError('Payment system not configured');
      }
    } catch (error) {
      console.error('❌ Error fetching Stripe config:', error);
      setError('Failed to load payment system');
    }
  };

  const handlePaymentSuccess = (paymentIntent, successData) => {
    console.log('✅ Payment succeeded:', paymentIntent);
    console.log('✅ Payment success data:', successData);
    console.log('✅ Navigating to receipt page...');
    
    // Navigate to receipt page with payment details
    const params = new URLSearchParams({
      payment_intent: paymentIntent.id,
      transaction_id: successData?.transactionId || '',
      amount: successData?.amount || invoice?.amount || 0
    });
    
    const receiptUrl = `/public/payment-success/${invoiceId}?${params.toString()}`;
    console.log('✅ Receipt URL:', receiptUrl);
    
    navigate(receiptUrl);
  };

  const handlePaymentError = (errorMessage) => {
    console.error('Payment failed:', errorMessage);
    setError(errorMessage);
    setPaymentError(true);
    // Prevent the component from re-fetching invoice data on payment errors
    setLoading(false);
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

  if (error && !paymentError && !invoice) {
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

  if (invoicePaid) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-green-600 text-6xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Invoice Already Paid</h2>
          <p className="text-gray-600 mb-6">This invoice has already been paid and cannot be paid again.</p>
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-md mx-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Details</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Amount:</span>
                <span className="font-semibold">${invoice.amount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Status:</span>
                <span className="text-green-600 font-semibold">Paid</span>
              </div>
            </div>
          </div>
          <button
            onClick={() => navigate(`/public/invoice/${invoiceId}`)}
            className="mt-6 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            View Invoice
          </button>
        </div>
      </div>
    );
  }

  // Show payment error modal if there's a payment error
  if (paymentError && error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-6xl mb-4">❌</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Error</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="space-x-4">
            <button
              onClick={() => {
                setPaymentError(false);
                setError('');
              }}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
            >
              Try Again
            </button>
            <button
              onClick={() => navigate(`/public/invoice/${invoiceId}`)}
              className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700"
            >
              Back to Invoice
            </button>
          </div>
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

            {!stripeConfig ? (
              <div className="text-center p-6">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                <p className="text-gray-600">Loading payment system...</p>
              </div>
            ) : !stripeConfig.connected ? (
              <div className="text-center p-6 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="h-8 w-8 text-red-600 mx-auto mb-2" />
                <h3 className="text-lg font-semibold text-red-800 mb-2">Payment Not Available</h3>
                <p className="text-red-600">
                  Online payments are not configured for this invoice. Please contact the business directly.
                </p>
              </div>
            ) : stripePromise ? (
              <Elements stripe={stripePromise}>
                <PaymentForm 
                  invoice={invoice} 
                  onSuccess={handlePaymentSuccess}
                  onError={handlePaymentError}
                />
              </Elements>
            ) : (
              <div className="text-center p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
                <AlertCircle className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
                <h3 className="text-lg font-semibold text-yellow-800 mb-2">Payment System Error</h3>
                <p className="text-yellow-600">
                  There was an error loading the payment system. Please try again.
                </p>
              </div>
            )}

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
