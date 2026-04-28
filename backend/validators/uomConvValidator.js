const { 
  validateCompanyGroup, 
  validateDateRange, 
  requireField,
  validateActiveFlag,
  isEmpty,
  isPositiveNumber
} = require('./commonValidator');

/**
 * UOM Conversion Validator
 */
const validateUomConv = (data) => {
  const errors = {};

  validateCompanyGroup(errors, data);

  // Item
  if (isEmpty(data.item_id)) {
    errors.item_id = 'Item is required';
  }

  // From UOM
  if (isEmpty(data.from_uom_id)) {
    errors.from_uom_id = 'From UOM is required';
  }

  // To UOM
  if (isEmpty(data.to_uom_id)) {
    errors.to_uom_id = 'To UOM is required';
  } else if (!isEmpty(data.from_uom_id) && String(data.from_uom_id) === String(data.to_uom_id)) {
    errors.to_uom_id = 'From and To UOM must be different';
  }

  // Conversion Rate
  if (isEmpty(data.conversion_rate)) {
    errors.conversion_rate = 'Conversion Rate is required';
  } else if (!isPositiveNumber(data.conversion_rate)) {
    errors.conversion_rate = 'Rate must be greater than 0';
  }

  // Conversion Type
  if (isEmpty(data.conversion_type)) {
    errors.conversion_type = 'Conversion Type is required';
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

module.exports = { validateUomConv };
