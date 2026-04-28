const { isEmpty, isPositiveNumber, isNonNegativeNumber, isValidDate } = require('./commonValidator');

const validateOpeningStock = (data) => {
  const errors = {};

  if (isEmpty(data.COMPANY_id)) errors.COMPANY_id = 'Company is required';
  if (isEmpty(data.bg_id)) errors.bg_id = 'Business Group is required';
  if (isEmpty(data.item_id)) errors.item_id = 'Item is required';
  if (isEmpty(data.txn_reason_id)) errors.txn_reason_id = 'Transaction Reason is required';
  if (isEmpty(data.inv_org_id)) errors.inv_org_id = 'Inventory Organization is required';
  if (isEmpty(data.subinventory_id)) errors.subinventory_id = 'Subinventory is required';

  if (isEmpty(data.opening_qty)) {
    errors.opening_qty = 'Opening quantity is required';
  } else if (!isPositiveNumber(data.opening_qty)) {
    errors.opening_qty = 'Opening quantity must be greater than 0';
  }

  if (isEmpty(data.unit_cost)) {
    errors.unit_cost = 'Unit cost is required';
  } else if (!isNonNegativeNumber(data.unit_cost)) {
    errors.unit_cost = 'Unit cost must be non-negative';
  }

  if (!isEmpty(data.opening_date) && !isValidDate(data.opening_date)) {
    errors.opening_date = 'Invalid date format';
  }

  return { errors, isValid: Object.keys(errors).length === 0 };
};

module.exports = { validateOpeningStock };
