const { 
  validateCompanyGroup, 
  validateDateRange, 
  requireField,
  requireDropdown,
  validateActiveFlag,
  isEmpty
} = require('./commonValidator');

/**
 * Intercompany Validator
 */
const validateIntercompany = (data) => {
  const errors = {};

  validateCompanyGroup(errors, data);

  // Ship OU
  requireDropdown(errors, data, 'ship_ou_id', 'Ship OU');
  
  // Sell OU
  requireDropdown(errors, data, 'sell_ou_id', 'Sell OU');
  
  // Ship != Sell OU
  if (!isEmpty(data.ship_ou_id) && !isEmpty(data.sell_ou_id) && String(data.ship_ou_id) === String(data.sell_ou_id)) {
    errors.sell_ou_id = 'Ship OU and Sell OU must be different';
  }

  // Relation Type
  requireField(errors, data, 'relation_type', 'Relation Type is required');
  
  // AR Inv Method
  requireField(errors, data, 'ar_inv_method_id', 'AR Inv Method is required');
  
  // AP Inv Method
  requireField(errors, data, 'ap_inv_method_id', 'AP Inv Method is required');

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

module.exports = { validateIntercompany };
