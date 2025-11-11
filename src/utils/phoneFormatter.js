// Phone number formatting utility
export const formatPhoneNumber = (phone) => {
  if (!phone) return phone
  
  // Remove all non-digit characters except +
  const cleaned = phone.replace(/[^\d+]/g, '')
  
  // If it starts with +, it's international
  if (cleaned.startsWith('+')) {
    return cleaned
  }
  
  // Remove all non-digit characters for US numbers
  const digits = cleaned.replace(/\D/g, '')
  
  // Format based on length
  if (digits.length === 10) {
    return `(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6)}`
  } else if (digits.length === 11 && digits[0] === '1') {
    return `+1 (${digits.slice(1,4)}) ${digits.slice(4,7)}-${digits.slice(7)}`
  } else if (digits.length > 10) {
    // International format
    return `+${digits}`
  }
  
  return phone
}

export const unformatPhoneNumber = (phone) => {
  if (!phone) return phone
  // Remove all formatting characters, keep only digits and +
  return phone.replace(/[\s\-()]/g, '')
} 