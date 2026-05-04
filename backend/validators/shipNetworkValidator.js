const { 
  validateCompanyGroup, 
  validateDateRange, 
  requireField,
  requireDropdown,
  validateActiveFlag,
  isNonNegativeNumber,
  isEmpty
} = require('./commonValidator');
const { getInvOrgIdsFromOrgParameter } = require('../utils/orgParameterInvOrgFilter');

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
    const dupMsg = 'From and To Inventory Org cannot be same';
    errors.from_inv_org_id = dupMsg;
    errors.to_inv_org_id = dupMsg;
  }

  const allowedInv = getInvOrgIdsFromOrgParameter({
    COMPANY_id: data.COMPANY_id || data.company_id,
    business_type_id: data.business_type_id,
    bg_id: data.bg_id,
    module_id: data.module_id,
  });
  const notInParam = 'This Inventory Org is not configured in Org Parameter';
  if (!errors.from_inv_org_id && !isEmpty(data.from_inv_org_id) && !allowedInv.has(String(data.from_inv_org_id))) {
    errors.from_inv_org_id = notInParam;
  }
  if (!errors.to_inv_org_id && !isEmpty(data.to_inv_org_id) && !allowedInv.has(String(data.to_inv_org_id))) {
    errors.to_inv_org_id = notInParam;
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
