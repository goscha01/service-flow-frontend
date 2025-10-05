# 🔐 Google OAuth Setup Guide

## Issue Identified
Google OAuth is not working because the required environment variables are not configured.

## Step 1: Create Google OAuth Credentials

### 1.1 Go to Google Cloud Console
1. Visit [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the Google+ API (or Google Identity API)

### 1.2 Create OAuth 2.0 Credentials
1. Go to **APIs & Services > Credentials**
2. Click **Create Credentials > OAuth 2.0 Client IDs**
3. Choose **Web application**
4. Add authorized origins:
   - `http://localhost:3000` (for development)
   - `https://yourdomain.com` (for production)
5. Add authorized redirect URIs:
   - `http://localhost:3000` (for development)
   - `https://yourdomain.com` (for production)

### 1.3 Get Your Credentials
- **Client ID**: Copy this (starts with `your-client-id.apps.googleusercontent.com`)
- **Client Secret**: Copy this (starts with `GOCSPX-`)

## Step 2: Configure Environment Variables

### Frontend (.env file in zenbooker/ directory):
```env
REACT_APP_API_URL=https://service-flow-backend-production-4568.up.railway.app/api
REACT_APP_GOOGLE_CLIENT_ID=your-google-client-id-here.apps.googleusercontent.com
```

### Backend (.env file in server/ directory):
```env
GOOGLE_CLIENT_ID=your-google-client-id-here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret-here

# Your existing configs...
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
JWT_SECRET=your_jwt_secret_here
```

## Step 3: Test the Configuration

### 3.1 Start the Backend Server
```bash
cd server
npm start
```

### 3.2 Start the Frontend
```bash
cd zenbooker
npm start
```

### 3.3 Test Google OAuth
1. Go to `http://localhost:3000/signin`
2. Click "Sign in with Google"
3. Complete the OAuth flow
4. Verify you're redirected to dashboard

## Step 4: Troubleshooting

### Common Issues:

#### 1. "Invalid Client ID" Error
- ✅ Check that `REACT_APP_GOOGLE_CLIENT_ID` is set correctly
- ✅ Verify the Client ID in Google Cloud Console
- ✅ Ensure the domain is added to authorized origins

#### 2. "Redirect URI Mismatch" Error
- ✅ Add `http://localhost:3000` to authorized redirect URIs
- ✅ For production, add your actual domain

#### 3. "Token Verification Failed" Error
- ✅ Check that `GOOGLE_CLIENT_ID` is set in backend
- ✅ Verify the Client ID matches between frontend and backend
- ✅ Ensure the backend server is running

#### 4. Google Button Not Appearing
- ✅ Check browser console for JavaScript errors
- ✅ Verify `REACT_APP_GOOGLE_CLIENT_ID` is set
- ✅ Check network tab for failed script loads

## Step 5: Production Deployment

### 5.1 Update Authorized Origins
In Google Cloud Console, add your production domain:
- `https://yourdomain.com`
- `https://www.yourdomain.com`

### 5.2 Update Environment Variables
Set production environment variables:
```env
REACT_APP_GOOGLE_CLIENT_ID=your-production-client-id
GOOGLE_CLIENT_ID=your-production-client-id
GOOGLE_CLIENT_SECRET=your-production-client-secret
```

## Step 6: Security Best Practices

### 6.1 Environment Variables
- ✅ Never commit `.env` files to version control
- ✅ Use different Client IDs for development and production
- ✅ Rotate Client Secrets regularly

### 6.2 OAuth Scopes
The current implementation requests these scopes:
- `openid` - Basic profile information
- `email` - User's email address
- `profile` - User's name and profile picture

### 6.3 Token Handling
- ✅ Tokens are stored securely in localStorage
- ✅ JWT tokens are used for API authentication
- ✅ Google ID tokens are verified server-side

## Current Implementation

### Frontend (GoogleOAuth.jsx):
- ✅ Loads Google Identity Services script
- ✅ Renders Google Sign-In button
- ✅ Handles credential response
- ✅ Sends ID token to backend
- ✅ Updates authentication context

### Backend (server.js):
- ✅ Verifies Google ID tokens
- ✅ Creates or updates user accounts
- ✅ Generates JWT tokens
- ✅ Handles both signup and signin flows

### Database Integration:
- ✅ Stores Google ID in user records
- ✅ Links Google accounts to existing users
- ✅ Handles profile picture and name updates

## Testing Checklist

- [ ] Google Sign-In button appears on signin page
- [ ] Clicking button opens Google OAuth popup
- [ ] After authentication, user is redirected to dashboard
- [ ] User data is stored in localStorage
- [ ] Backend receives and verifies ID token
- [ ] New users are created in database
- [ ] Existing users are logged in successfully
- [ ] Error handling works for failed authentications

## Support

If you encounter issues:
1. Check browser console for JavaScript errors
2. Check server logs for backend errors
3. Verify environment variables are set correctly
4. Test with a fresh browser session
5. Ensure Google Cloud Console settings are correct
