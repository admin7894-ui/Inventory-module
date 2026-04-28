const { 
  REGEX, 
  validateCompanyGroup, 
  validateDateRange, 
  requireField,
  validateActiveFlag,
  isEmpty
} = require('./commonValidator');

/**
 * Ship Method Validator
 */
const validateShipMethod = (data) => {
  const errors = {};

  validateCompanyGroup(errors, data);

  // Ship Method Name
  if (isEmpty(data.ship_method_name)) {
    errors.ship_method_name = 'Ship Method Name is required';
  } else if (!REGEX.NAME.test(data.ship_method_name)) {
    errors.ship_method_name = 'Name: 3–100 chars, no special chars except & ( ) -';
  }

  // Method Code
  if (isEmpty(data.method_code)) {
    errors.method_code = 'Method Code is required';
  } else if (!REGEX.CODE.test(data.method_code)) {
    errors.method_code = 'Must be 2–20 uppercase alphanumeric or _';
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

module.exports = { validateShipMethod };
