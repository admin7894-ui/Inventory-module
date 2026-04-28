const { isEmpty, REGEX, validateCompanyGroup, validateDateRange, validateActiveFlag } = require('./commonValidator');

const validateLegalEntity = (data) => {
  const errors = {};

  validateCompanyGroup(errors, data);

  // LE Name
  if (isEmpty(data.le_name)) {
    errors.le_name = 'Legal Entity Name is required';
  } else if (!REGEX.NAME.test(data.le_name)) {
    errors.le_name = 'Legal Entity Name must be 3–100 characters, no special characters except & ( ) -';
  }

  // Tax Registration No
  if (isEmpty(data.tax_registration_no)) {
    errors.tax_registration_no = 'Tax Registration No is required';
  } else if (!REGEX.GST.test(data.tax_registration_no)) {
    errors.tax_registration_no = 'Tax Registration No must be 15 uppercase alphanumeric characters';
  }

  // Location
  if (isEmpty(data.location_id)) errors.location_id = 'Location is required';

  // Currency Code
  if (isEmpty(data.currency_code)) {
    errors.currency_code = 'Currency code is required';
  } else if (!REGEX.CURRENCY.test(data.currency_code)) {
    errors.currency_code = 'Currency code must be 3 uppercase letters (e.g., INR, USD)';
  }

  // Module
  if (isEmpty(data.module_id)) errors.module_id = 'Module is required';

  // Active
  validateActiveFlag(errors, data);

  // Dates
  validateDateRange(errors, data);

  return { errors, isValid: Object.keys(errors).length === 0 };
};

module.exports = { validateLegalEntity };
