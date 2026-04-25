// Centralized Frontend Validation Architecture

/**
 * Common reusable validators
 */

export const validators = {
  required: (value) => {
    if (value === undefined || value === null || value === '') return 'This field is required';
    if (typeof value === 'string' && value.trim() === '') return 'This field is required';
    return null;
  },

  isNumber: (value) => {
    if (value === undefined || value === null || value === '') return null; // Allow empty if not required
    return isNaN(Number(value)) ? 'Must be a number' : null;
  },

  isPositive: (value) => {
    if (value === undefined || value === null || value === '') return null;
    return Number(value) < 0 ? 'Must be a positive number' : null;
  },

  minMax: (value, min, max) => {
    if (value === undefined || value === null || value === '') return null;
    const num = Number(value);
    if (min !== undefined && num < min) return `Must be at least ${min}`;
    if (max !== undefined && num > max) return `Must be at most ${max}`;
    return null;
  },

  isDateValid: (from, to) => {
    if (!from || !to) return null;
    return new Date(from) > new Date(to) ? 'From date cannot be after To date' : null;
  },

  isDropdownValid: (value, options) => {
    if (value === undefined || value === null || value === '') return null;
    const isValid = options.some(opt => opt === value || opt.value === value);
    return isValid ? null : 'Invalid selection';
  },

  trimText: (value) => {
    return typeof value === 'string' ? value.trim() : value;
  },

  maxLength: (value, max) => {
    if (!value) return null;
    return String(value).length > max ? `Maximum length is ${max}` : null;
  }
};

/**
 * Global Form Validator
 * @param {Object} formData 
 * @param {Object} schema { field: [validatorFunctions] }
 */
export const validateForm = (formData, schema) => {
  const errors = {};
  Object.entries(schema).forEach(([field, rules]) => {
    for (const rule of rules) {
      const error = rule(formData[field], formData);
      if (error) {
        errors[field] = error;
        break;
      }
    }
  });
  return errors;
};
