const { 
  REGEX, 
  validateCompanyGroup, 
  validateDateRange, 
  requireField,
  validateActiveFlag,
  isEmpty,
  isNonNegativeNumber
} = require('./commonValidator');

/**
 * UOM Validator
 */
const validateUom = (data) => {
  const errors = {};

  validateCompanyGroup(errors, data);

  // UOM Type
  if (isEmpty(data.uom_type_id)) {
    errors.uom_type_id = 'UOM Type is required';
  }

  // UOM Name
  if (isEmpty(data.uom_name)) {
    errors.uom_name = 'UOM Name is required';
  } else if (!REGEX.NAME.test(data.uom_name)) {
    errors.uom_name = 'Name: 3–100 chars, no special chars except & ( ) -';
  }

  // UOM Code
  if (isEmpty(data.uom_code)) {
    errors.uom_code = 'UOM Code is required';
  } else if (!REGEX.CODE.test(data.uom_code)) {
    errors.uom_code = 'Must be 2–20 uppercase alphanumeric or _';
  }

  // Decimal Precision
  if (isEmpty(data.decimal_precision)) {
    errors.decimal_precision = 'Decimal Precision is required';
  } else {
    const prec = Number(data.decimal_precision);
    if (isNaN(prec) || prec < 0 || prec > 6) {
      errors.decimal_precision = 'Precision must be between 0 and 6';
    }
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

module.exports = { validateUom };
