// Image utility functions for handling Supabase Storage URLs

/**
 * Get a properly formatted image URL
 * @param {string} imageUrl - The image URL from database
 * @param {string} fallbackUrl - Fallback image URL if main URL fails
 * @returns {string} The image URL to use
 */
export const getImageUrl = (imageUrl, fallbackUrl = null) => {
  if (!imageUrl) {
    return fallbackUrl || '/images/default-service.png';
  }

  // If it's already a full URL (http/https), return as is
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl;
  }

  // If it's a relative path, assume it's a local image
  if (imageUrl.startsWith('/')) {
    return imageUrl;
  }

  // If it's just a filename, assume it's in the uploads folder
  if (!imageUrl.includes('/')) {
    return `/uploads/${imageUrl}`;
  }

  // Default fallback
  return fallbackUrl || '/images/default-service.png';
};

/**
 * Check if an image URL is a Supabase Storage URL
 * @param {string} imageUrl - The image URL to check
 * @returns {boolean} True if it's a Supabase Storage URL
 */
export const isSupabaseStorageUrl = (imageUrl) => {
  return imageUrl && imageUrl.includes('supabase.co/storage');
};

/**
 * Get a default image URL based on type
 * @param {string} type - The type of image (service, profile, logo, etc.)
 * @returns {string} Default image URL
 */
export const getDefaultImageUrl = (type = 'service') => {
  const defaults = {
    service: '/images/default-service.png',
    profile: '/images/default-profile.png',
    logo: '/images/default-logo.png',
    modifier: '/images/default-modifier.png',
    intake: '/images/default-intake.png',
    hero: '/images/default-hero.png',
    favicon: '/images/default-favicon.png'
  };

  return defaults[type] || defaults.service;
};

/**
 * Handle image load error by setting a fallback
 * @param {Event} event - The error event
 * @param {string} fallbackUrl - Fallback image URL
 */
export const handleImageError = (event, fallbackUrl = null) => {
  console.warn('Image failed to load:', event.target.src);
  event.target.src = fallbackUrl || getDefaultImageUrl();
  event.target.onerror = null; // Prevent infinite loop
};

/**
 * Preload an image to check if it's valid
 * @param {string} imageUrl - The image URL to check
 * @returns {Promise<boolean>} True if image loads successfully
 */
export const preloadImage = (imageUrl) => {
  return new Promise((resolve) => {
    if (!imageUrl) {
      resolve(false);
      return;
    }

    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = imageUrl;
  });
};

/**
 * Get optimized image URL for different sizes (for future use)
 * @param {string} imageUrl - The original image URL
 * @param {string} size - The desired size (thumbnail, small, medium, large)
 * @returns {string} Optimized image URL
 */
export const getOptimizedImageUrl = (imageUrl, size = 'medium') => {
  if (!imageUrl) return getDefaultImageUrl();

  // For Supabase Storage URLs, we can add transformations
  if (isSupabaseStorageUrl(imageUrl)) {
    // Future: Add Supabase Storage transformations
    // Example: ?transform=w_300,h_200
    return imageUrl;
  }

  return imageUrl;
};
