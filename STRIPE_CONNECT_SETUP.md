# 🚀 Stripe Connect Integration Setup Guide

## Overview
This guide will help you set up Stripe Connect for account connection (not payments) in your ServiceFlow application. Users can connect their Stripe accounts to accept payments and manage their business finances.

## Prerequisites
- Stripe account (test mode for development)
- Node.js and npm installed
- ServiceFlow application running

## Step 1: Get Your Stripe Test Keys

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Make sure you're in **Test mode** (toggle in the top right)
3. Go to **Developers > API Keys**
4. Copy your **Publishable key** (starts with `pk_test_...`)
5. Copy your **Secret key** (starts with `sk_test_...`)

## Step 2: Configure Environment Variables

### Frontend (.env file in zenbooker/ directory):
```env
REACT_APP_API_URL=http://localhost:3001/api
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
```

### Backend (.env file in server/ directory):
```env
STRIPE_SECRET_KEY=sk_test_your_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here

# Your existing Supabase and other configs...
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
JWT_SECRET=your_jwt_secret_here
```

## Step 3: Database Schema Update

Add the `stripe_connect_account_id` column to your `user_billing` table:

```sql
ALTER TABLE user_billing ADD COLUMN IF NOT EXISTS stripe_connect_account_id TEXT;
```

## Step 4: Install Dependencies

The required packages are already installed:
- `@stripe/stripe-js` - Stripe JavaScript SDK
- `@stripe/react-stripe-js` - React components for Stripe
- `stripe` - Node.js Stripe SDK (for backend)

## Step 5: Test the Integration

1. Start your backend server:
   ```bash
   cd server
   npm start
   ```

2. Start your frontend:
   ```bash
   cd zenbooker
   npm start
   ```

3. Navigate to the billing page: `http://localhost:3000/settings/billing`

4. Click "Connect Stripe Account" button

5. Complete the Stripe Connect onboarding flow

## Features Implemented

### ✅ Frontend Components
- **StripeConnectOnboarding**: Modern UI component for account connection
- **Account Status Display**: Shows connection status and capabilities
- **Error Handling**: User-friendly error messages
- **Loading States**: Smooth user experience

### ✅ Backend API Endpoints
- `POST /api/stripe/connect/account-link` - Create Connect account and onboarding link
- `GET /api/stripe/connect/account-status` - Get account connection status

### ✅ Database Integration
- Stores Connect account IDs in `user_billing` table
- Handles account status and requirements
- Supports account updates and refreshes

## API Endpoints

### Create Account Link
```javascript
POST /api/stripe/connect/account-link
Headers: Authorization: Bearer <token>
Body: {
  "return_url": "https://yourapp.com/dashboard?stripe_connect=success",
  "refresh_url": "https://yourapp.com/dashboard?stripe_connect=refresh"
}
```

### Get Account Status
```javascript
GET /api/stripe/connect/account-status
Headers: Authorization: Bearer <token>
Response: {
  "connected": true,
  "charges_enabled": true,
  "payouts_enabled": true,
  "details_submitted": true,
  "requirements": {...}
}
```

## Testing with Stripe Test Mode

1. **Create Test Account**: Use the Connect onboarding flow
2. **Complete Onboarding**: Fill out the test account details
3. **Verify Status**: Check that `charges_enabled` and `payouts_enabled` are true
4. **Test Account Management**: Verify account status updates

## Production Deployment

### 1. Switch to Live Mode
- Update environment variables with live keys
- Test thoroughly in Stripe's live mode
- Ensure webhook endpoints are configured

### 2. Webhook Configuration
Set up webhooks for Connect events:
- `account.updated`
- `account.application.deauthorized`
- `capability.updated`

### 3. Security Considerations
- Validate all webhook signatures
- Implement proper error handling
- Use HTTPS in production
- Store sensitive data securely

## Troubleshooting

### Common Issues

1. **"Invalid API Key" Error**
   - Verify your test keys are correct
   - Ensure you're using test keys in test mode

2. **"Account Not Found" Error**
   - Check that the account ID is stored in the database
   - Verify the user has completed onboarding

3. **"Charges Not Enabled" Error**
   - User needs to complete full onboarding
   - Check account requirements in Stripe Dashboard

### Debug Mode
Enable debug logging by setting:
```env
DEBUG=stripe:*
```

## Support

For issues with this integration:
1. Check Stripe Dashboard for account status
2. Review server logs for API errors
3. Verify environment variables are set correctly
4. Test with Stripe's test cards and accounts

## Next Steps

After successful Connect integration:
1. Implement payment processing with connected accounts
2. Add payout management features
3. Set up webhook handling for account events
4. Add account verification workflows
