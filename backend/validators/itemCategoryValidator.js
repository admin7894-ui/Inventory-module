const { 
  REGEX, 
  validateCompanyGroup, 
  validateDateRange, 
  requireField,
  validateActiveFlag,
  isEmpty
} = require('./commonValidator');

/**
 * Item Category Validator
 */
const validateItemCategory = (data) => {
  const errors = {};

  validateCompanyGroup(errors, data);

  // Category Set
  if (isEmpty(data.category_set_id)) {
    errors.category_set_id = 'Category Set is required';
  }

  // Category Name
  if (isEmpty(data.category_name)) {
    errors.category_name = 'Category Name is required';
  } else if (!REGEX.NAME.test(data.category_name)) {
    errors.category_name = 'Name: 3–100 chars, no special chars except & ( ) -';
  }

  // Category Code
  if (isEmpty(data.category_code)) {
    errors.category_code = 'Category Code is required';
  } else if (!REGEX.CODE.test(data.category_code)) {
    errors.category_code = 'Must be 2–20 uppercase alphanumeric or _';
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

module.exports = { validateItemCategory };
