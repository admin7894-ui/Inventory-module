const { 
  REGEX, 
  validateCompanyGroup, 
  validateDateRange, 
  requireField,
  validateActiveFlag,
  isEmpty
} = require('./commonValidator');

/**
 * UOM Type Validator
 */
const validateUomType = (data) => {
  const errors = {};

  validateCompanyGroup(errors, data);

  // UOM Type Name
  if (isEmpty(data.uom_type_name)) {
    errors.uom_type_name = 'UOM Type Name is required';
  } else if (!REGEX.NAME.test(data.uom_type_name)) {
    errors.uom_type_name = 'Name: 3–100 chars, no special chars except & ( ) -';
  }

  // UOM Type Code
  if (isEmpty(data.uom_type_code)) {
    errors.uom_type_code = 'UOM Type Code is required';
  } else if (!REGEX.CODE.test(data.uom_type_code)) {
    errors.uom_type_code = 'Must be 2–20 uppercase alphanumeric or _';
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

module.exports = { validateUomType };
