const { 
  REGEX, 
  validateCompanyGroup, 
  validateDateRange, 
  requireField,
  validateActiveFlag,
  isEmpty
} = require('./commonValidator');

/**
 * Item Sub Category Validator
 */
const validateItemSubCategory = (data) => {
  const errors = {};

  validateCompanyGroup(errors, data);

  // Category
  if (isEmpty(data.category_id)) {
    errors.category_id = 'Category is required';
  }

  // Sub Category Name
  if (isEmpty(data.sub_category_name)) {
    errors.sub_category_name = 'Sub Category Name is required';
  } else if (!REGEX.NAME.test(data.sub_category_name)) {
    errors.sub_category_name = 'Name: 3–100 chars, no special chars except & ( ) -';
  }

  // Sub Category Code
  if (isEmpty(data.sub_category_code)) {
    errors.sub_category_code = 'Sub Category Code is required';
  } else if (!REGEX.CODE.test(data.sub_category_code)) {
    errors.sub_category_code = 'Must be 2–20 uppercase alphanumeric or _';
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

module.exports = { validateItemSubCategory };
