# Serviceflow Frontend

A React-based frontend for the Serviceflow application with complete authentication system.

## Features

- **Authentication System**: Complete signup/signin with axios API integration
- **Form Validation**: Real-time validation with error handling
- **Loading States**: Proper loading indicators during API calls
- **Error Handling**: Comprehensive error handling for all API calls
- **Protected Routes**: Authentication-based route protection
- **Context API**: Global state management for user authentication

## Setup Instructions

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Environment Configuration**
   Create a `.env` file in the root directory:
   ```
   REACT_APP_API_URL=https://service-flow-backend-production-4568.up.railway.app/api
   REACT_APP_ENV=development
   ```

3. **Start the Development Server**
   ```bash
   npm start
   ```

## Authentication Flow

### Sign Up Process
1. User fills out registration form with:
   - First Name
   - Last Name
   - Business Name
   - Email
   - Password (minimum 8 characters)

2. Form validation checks:
   - All fields are required
   - Email format validation
   - Password length validation

3. API call to `/api/auth/signup` with user data

4. On success:
   - User data stored in localStorage
   - Redirect to dashboard
   - Global auth state updated

5. Error handling for:
   - Duplicate email addresses
   - Server errors
   - Network errors

### Sign In Process
1. User enters email and password

2. Form validation checks:
   - Email format validation
   - Password minimum length (6 characters)

3. API call to `/api/auth/signin` with credentials

4. On success:
   - User data stored in localStorage
   - Redirect to dashboard
   - Global auth state updated

5. Error handling for:
   - Invalid credentials
   - User not found
   - Server errors
   - Network errors

## API Integration

The frontend uses axios for all API calls with:

- **Base Configuration**: Centralized axios instance with base URL and headers
- **Request Interceptors**: Automatic token injection for authenticated requests
- **Response Interceptors**: Global error handling and token management
- **Error Handling**: Specific error messages for different HTTP status codes

## Protected Routes

The application includes a `ProtectedRoute` component that:

- Checks user authentication status
- Shows loading spinner while checking auth
- Redirects unauthenticated users to signin page
- Allows authenticated users to access protected content

## File Structure

```
src/
├── components/
│   └── ProtectedRoute.js          # Route protection component
├── context/
│   └── AuthContext.js             # Authentication context
├── pages/
│   ├── Signin.js                  # Sign in page
│   └── Signup.js                  # Sign up page
├── services/
│   └── api.js                     # API service functions
└── index.js                       # App routing and setup
```

## API Endpoints Used

- `POST /api/auth/signup` - User registration
- `POST /api/auth/signin` - User login
- `GET /api/health` - API health check

## Error Handling

The application handles various error scenarios:

- **Network Errors**: Connection issues and timeouts
- **Server Errors**: 500-level HTTP errors
- **Client Errors**: 400-level HTTP errors with specific messages
- **Validation Errors**: Form field validation with real-time feedback

## Development Notes

- All API calls use async/await with try/catch error handling
- Form state is managed with React useState hooks
- Loading states prevent multiple form submissions
- Error messages are user-friendly and actionable
- Authentication state persists across page refreshes


another for fake depployment