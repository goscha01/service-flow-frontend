/**
 * Single source of truth for job price calculation.
 *
 * Formula: servicePrice - discount + additionalFees + taxes
 *
 * Every place in the app that needs a job total should call this
 * function instead of inlining the arithmetic.
 */

/**
 * Calculate the total job price.
 * @param {object} opts
 * @param {number} opts.servicePrice - base service price (includes modifiers)
 * @param {number} opts.discount     - discount in dollars (already resolved from % if applicable)
 * @param {number} opts.additionalFees
 * @param {number} opts.taxes
 * @returns {number}
 */
export function calculateJobTotal({ servicePrice = 0, discount = 0, additionalFees = 0, taxes = 0 } = {}) {
  const sp = parseFloat(servicePrice) || 0
  const d  = parseFloat(discount) || 0
  const f  = parseFloat(additionalFees) || 0
  const t  = parseFloat(taxes) || 0
  return sp - d + f + t
}

/**
 * Resolve a discount value to a dollar amount.
 * When type is 'percentage', the result is rounded UP to the nearest whole dollar.
 *
 * @param {number} value    - raw input (dollars or percent)
 * @param {string} type     - 'fixed' | 'percentage'
 * @param {number} subtotal - base price the percentage applies to
 * @returns {number} discount in dollars
 */
export function resolveDiscount(value, type, subtotal) {
  const v = parseFloat(value) || 0
  if (v <= 0) return 0
  if (type === 'percentage') {
    return Math.ceil((parseFloat(subtotal || 0) * v) / 100)
  }
  return v
}
