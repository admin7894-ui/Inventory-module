const { 
  validateCompanyGroup, 
  validateDateRange, 
  requireField,
  requireDropdown,
  validateActiveFlag,
  isNonNegativeNumber,
  isEmpty
} = require('./commonValidator');

/**
 * Ship Network Validator
 */
const validateShipNetwork = (data) => {
  const errors = {};

  validateCompanyGroup(errors, data);

  // From Inv Org
  requireDropdown(errors, data, 'from_inv_org_id', 'From Inv Org');
  
  // To Inv Org
  requireDropdown(errors, data, 'to_inv_org_id', 'To Inv Org');
  
  // From != To Org
  if (!isEmpty(data.from_inv_org_id) && !isEmpty(data.to_inv_org_id) && String(data.from_inv_org_id) === String(data.to_inv_org_id)) {
    errors.to_inv_org_id = 'Source and Destination Organizations must be different';
  }

  // Transfer Type
  requireField(errors, data, 'transfer_type', 'Transfer Type is required');
  
  // Default Ship Method
  requireDropdown(errors, data, 'default_ship_method_id', 'Default Ship Method');

  // Intransit Lead Time
  if (isEmpty(data.intransit_lead_time_days)) {
    errors.intransit_lead_time_days = 'Lead Time is required';
  } else if (!isNonNegativeNumber(data.intransit_lead_time_days)) {
    errors.intransit_lead_time_days = 'Lead Time must be ≥ 0';
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

module.exports = { validateShipNetwork };
