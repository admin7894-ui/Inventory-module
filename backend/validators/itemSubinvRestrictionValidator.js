const { isEmpty, validateCompanyGroup, validateDateRange } = require('./commonValidator');

const validateItemSubinvRestriction = (data) => {
  const errors = {};

  validateCompanyGroup(errors, data);

  if (isEmpty(data.item_id)) {
    errors.item_id = 'Item is required';
  }

  if (isEmpty(data.inv_org_id)) {
    errors.inv_org_id = 'Inventory Organization is required';
  }

  if (isEmpty(data.subinventory_id)) {
    errors.subinventory_id = 'Subinventory is required';
  }

  if (isEmpty(data.locator_id)) {
    errors.locator_id = 'Locator is required';
  }

  if (isEmpty(data.module_id)) {
    errors.module_id = 'Module is required';
  }

  validateDateRange(errors, data);

  return { errors, isValid: Object.keys(errors).length === 0 };
};

module.exports = { validateItemSubinvRestriction };
