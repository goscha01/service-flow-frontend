// Google Maps API Configuration
// Get API key from environment variable, with fallback to default
export const GOOGLE_MAPS_API_KEY = 
  process.env.REACT_APP_GOOGLE_MAPS_API_KEY || 
  'AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8' // Fallback key

// Export a function to get the API key (for consistency)
export const getGoogleMapsApiKey = () => {
  return GOOGLE_MAPS_API_KEY
}

