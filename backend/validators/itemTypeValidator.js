const { isEmpty, validateActiveFlag, validateDateRange } = require('./commonValidator');

const validateItemType = (data) => {
  const errors = {};

  if (isEmpty(data.bg_id)) errors.bg_id = 'Business Group is required';
  if (isEmpty(data.COMPANY_id)) errors.COMPANY_id = 'Company is required';
  if (isEmpty(data.business_type_id)) errors.business_type_id = 'Business Type is required';
  if (isEmpty(data.module_id)) errors.module_id = 'Module is required';

  // Item Type Name
  if (isEmpty(data.item_type_name)) {
    errors.item_type_name = 'Item Type Name is required';
  } else if (data.item_type_name.length < 2 || data.item_type_name.length > 50) {
    errors.item_type_name = '2-50 characters';
  }

  // Is Physical / Requires Inventory logic
  // "If Is Physical = false -> Requires Inventory must be false"
  const isPhysical = data.is_physical === 'Y' || data.is_physical === true;
  const requiresInv = data.requires_inventory === 'Y' || data.requires_inventory === true;

  if (!isPhysical && requiresInv) {
    errors.requires_inventory = 'Non-physical items cannot require inventory';
  }

  validateActiveFlag(errors, data);
  validateDateRange(errors, data);

  return {
    errors,
    isValid: Object.keys(errors).length === 0
  };
};

module.exports = validateItemType;
