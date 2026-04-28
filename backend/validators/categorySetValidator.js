const { 
  REGEX, 
  validateCompanyGroup, 
  validateDateRange, 
  requireField,
  validateActiveFlag,
  isEmpty
} = require('./commonValidator');

/**
 * Category Set Validator
 */
const validateCategorySet = (data) => {
  const errors = {};

  validateCompanyGroup(errors, data);

  // Category Set Name
  if (isEmpty(data.category_set_name)) {
    errors.category_set_name = 'Category Set Name is required';
  } else if (!REGEX.NAME.test(data.category_set_name)) {
    errors.category_set_name = 'Name: 3–100 chars, no special chars except & ( ) -';
  }

  // Category Set Code
  if (isEmpty(data.category_set_code)) {
    errors.category_set_code = 'Category Set Code is required';
  } else if (!REGEX.CODE.test(data.category_set_code)) {
    errors.category_set_code = 'Must be 2–20 uppercase alphanumeric or _';
  }

  // Description
  if (data.description && data.description.length > 250) {
    errors.description = 'Description: max 250 characters';
  }

  // Module
  requireField(errors, data, 'module_id', 'Please select Module');

  validateDateRange(errors, data);
  validateActiveFlag(errors, data);

  return {
    errors,
    isValid: Object.keys(errors).length === 0
  };
};

module.exports = { validateCategorySet };
