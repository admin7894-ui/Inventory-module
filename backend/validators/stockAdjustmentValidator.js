const { isEmpty, isPositiveNumber, isNonNegativeNumber, isValidDate } = require('./commonValidator');

const validateStockAdjustment = (data) => {
  const errors = {};

  if (isEmpty(data.COMPANY_id)) errors.COMPANY_id = 'Company is required';
  if (isEmpty(data.bg_id)) errors.bg_id = 'Business Group is required';
  if (isEmpty(data.item_id)) errors.item_id = 'Item is required';
  if (isEmpty(data.txn_type_id)) errors.txn_type_id = 'Adjustment Type is required';
  if (isEmpty(data.inv_org_id)) errors.inv_org_id = 'Source Organization is required';

  const isTransfer = data.txn_action === 'TRANSFER';

  if (isTransfer) {
    if (isEmpty(data.to_inv_org_id)) errors.to_inv_org_id = 'Destination Organization is required';
    if (isEmpty(data.to_subinventory_id)) errors.to_subinventory_id = 'Destination Subinventory is required';
    if (!isEmpty(data.inv_org_id) && !isEmpty(data.to_inv_org_id) &&
        !isEmpty(data.subinventory_id) && !isEmpty(data.to_subinventory_id)) {
      if (data.inv_org_id === data.to_inv_org_id && data.subinventory_id === data.to_subinventory_id) {
        errors.to_subinventory_id = 'Destination must differ from source';
      }
    }
    if (isEmpty(data.physical_qty)) {
      errors.physical_qty = 'Transfer quantity is required';
    } else if (!isPositiveNumber(data.physical_qty)) {
      errors.physical_qty = 'Transfer quantity must be > 0';
    }
  } else {
    if (isEmpty(data.physical_qty)) {
      errors.physical_qty = 'Physical quantity is required';
    } else if (!isNonNegativeNumber(data.physical_qty)) {
      errors.physical_qty = 'Physical quantity must be non-negative';
    }
  }

  if (!isEmpty(data.unit_cost) && !isNonNegativeNumber(data.unit_cost)) {
    errors.unit_cost = 'Unit cost must be non-negative';
  }

  if (!isEmpty(data.adjustment_date) && !isValidDate(data.adjustment_date)) {
    errors.adjustment_date = 'Invalid date format';
  }

  return { errors, isValid: Object.keys(errors).length === 0 };
};

module.exports = { validateStockAdjustment };
