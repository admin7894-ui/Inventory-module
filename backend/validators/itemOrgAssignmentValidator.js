const { isEmpty, isPositiveNumber, isNonNegativeNumber, validateCompanyGroup, validateDateRange } = require('./commonValidator');

const validateItemOrgAssignment = (data) => {
  const errors = {};

  validateCompanyGroup(errors, data);

  if (isEmpty(data.item_id)) {
    errors.item_id = 'Item is required';
  }

  if (isEmpty(data.inv_org_id)) {
    errors.inv_org_id = 'Inventory Organization is required';
  }

  // Stock Policy
  if (isEmpty(data.min_qty)) {
    errors.min_qty = 'Min Qty is required';
  } else if (!isNonNegativeNumber(data.min_qty)) {
    errors.min_qty = 'Min Qty must be ≥ 0';
  }

  if (isEmpty(data.max_qty)) {
    errors.max_qty = 'Max Qty is required';
  } else if (!isPositiveNumber(data.max_qty)) {
    errors.max_qty = 'Max Qty must be greater than Min Qty';
  } else if (!isEmpty(data.min_qty) && Number(data.max_qty) <= Number(data.min_qty)) {
    errors.max_qty = 'Max Qty must be greater than Min Qty';
  }

  if (isEmpty(data.safety_stock_qty)) {
    errors.safety_stock_qty = 'Safety Stock Qty is required';
  } else if (!isNonNegativeNumber(data.safety_stock_qty)) {
    errors.safety_stock_qty = 'Safety Stock must be ≥ 0';
  }

  if (isEmpty(data.module_id)) {
    errors.module_id = 'Module is required';
  }

  validateDateRange(errors, data);

  return { errors, isValid: Object.keys(errors).length === 0 };
};

module.exports = { validateItemOrgAssignment };
