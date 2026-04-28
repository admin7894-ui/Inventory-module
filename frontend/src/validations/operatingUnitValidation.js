import {
  isEmpty, REGEX, matchesRegex, validateCompanyGroup,
  validateDateRange, validateActiveFlag, requireField, generateShortCode
} from './commonValidation';

export const validateOperatingUnit = (formData) => {
  const errors = {};

  // Company Group (BG → Company → BT)
  validateCompanyGroup(errors, formData);

  // Legal Entity
  if (isEmpty(formData.le_id)) {
    errors.le_id = 'Legal Entity is required';
  }

  // OU Name
  if (isEmpty(formData.ou_name)) {
    errors.ou_name = 'OU Name is required';
  } else if (!matchesRegex(formData.ou_name, REGEX.NAME)) {
    errors.ou_name = 'OU Name must be 3–100 characters, no invalid special characters';
  }

  // OU Short Code (auto-generated from OU Name)
  if (isEmpty(formData.ou_short_code)) {
    errors.ou_short_code = 'OU Short Code is required';
  } else if (!matchesRegex(formData.ou_short_code, REGEX.CODE)) {
    errors.ou_short_code = 'OU Short Code must be 2–20 uppercase alphanumeric characters or underscores';
  }

  // Location
  if (isEmpty(formData.location_id)) {
    errors.location_id = 'Location is required';
  }

  // Currency Code
  if (isEmpty(formData.currency_code)) {
    errors.currency_code = 'Currency Code is required';
  } else if (!matchesRegex(formData.currency_code, REGEX.CURRENCY)) {
    errors.currency_code = 'Currency must be 3 uppercase letters (e.g., INR)';
  }

  // Module
  if (isEmpty(formData.module_id)) {
    errors.module_id = 'Module is required';
  }

  // Active Flag
  validateActiveFlag(errors, formData);

  // Date Range
  validateDateRange(errors, formData);

  return {
    errors,
    isValid: Object.keys(errors).length === 0
  };
};

// Helper to auto-generate OU Short Code from OU Name
export const generateOUShortCode = (ouName) => generateShortCode(ouName, 'OU');
