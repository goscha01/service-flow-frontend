/**
 * Decodes HTML entities in a string
 * Converts entities like &#x2F; to their actual characters
 * @param {string} str - String containing HTML entities
 * @returns {string} - Decoded string
 */
export const decodeHtmlEntities = (str) => {
  if (!str || typeof str !== 'string') return str;
  
  // Create a temporary textarea element to decode HTML entities
  const textarea = document.createElement('textarea');
  textarea.innerHTML = str;
  return textarea.value;
};

/**
 * Safely renders text that may contain HTML entities
 * @param {string} text - Text that may contain HTML entities
 * @returns {string} - Decoded text safe for React rendering
 */
export const safeDecodeText = (text) => {
  if (!text) return text;
  return decodeHtmlEntities(String(text));
};

