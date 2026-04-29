const { isEmpty, validateActiveFlag, validateDateRange } = require('./commonValidator');

const validateSubinventory = (data) => {
  const errors = {};

  if (isEmpty(data.bg_id)) errors.bg_id = 'Business Group is required';
  if (isEmpty(data.COMPANY_id)) errors.COMPANY_id = 'Company is required';
  if (isEmpty(data.business_type_id)) errors.business_type_id = 'Business Type is required';
  if (isEmpty(data.module_id)) errors.module_id = 'Module is required';

  // Inv Org Id
  if (isEmpty(data.inv_org_id)) {
    errors.inv_org_id = 'Inventory Org is required';
  }

  // Subinventory Name
  if (isEmpty(data.subinventory_name)) {
    errors.subinventory_name = 'Subinventory Name is required';
  }

  // Subinventory Code
  if (isEmpty(data.subinventory_code)) {
    errors.subinventory_code = 'Subinventory Code is required';
  } else {
    const codeRegex = /^SUB_INV_[A-Z0-9_]{1,12}$/;
    if (!codeRegex.test(data.subinventory_code)) {
      errors.subinventory_code = 'Must start with SUB_INV_ and be max 20 chars';
    }
  }

  // Zone
  if (isEmpty(data.zone_id)) {
    errors.zone_id = 'Zone is required';
  }

  // Material Status
  if (isEmpty(data.material_status)) {
    errors.material_status = 'Material Status is required';
  }

  // Max Capacity Kg >= 0
  if (isEmpty(data.max_capacity_kg)) {
    errors.max_capacity_kg = 'Capacity is required';
  } else if (Number(data.max_capacity_kg) < 0) {
    errors.max_capacity_kg = 'Capacity must be >= 0';
  }

  // Utilization 0-100
  if (!isEmpty(data.current_utilization_pct)) {
    const util = Number(data.current_utilization_pct);
    if (isNaN(util) || util < 0 || util > 100) {
      errors.current_utilization_pct = 'Utilization must be 0-100';
    }
  }

  validateActiveFlag(errors, data);
  validateDateRange(errors, data);

  return {
    errors,
    isValid: Object.keys(errors).length === 0
  };
};

module.exports = validateSubinventory;
