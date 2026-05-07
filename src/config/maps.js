// Google Maps API Configuration.
// REACT_APP_GOOGLE_MAPS_API_KEY is provided at build time by Vercel
// (production + preview). When unset (e.g. local dev without `.env`),
// embeds and Places calls return blank tiles instead of a quota error
// from a fallback key — failing loud is preferable to leaking a key.
export const GOOGLE_MAPS_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY || ''

export const getGoogleMapsApiKey = () => GOOGLE_MAPS_API_KEY
