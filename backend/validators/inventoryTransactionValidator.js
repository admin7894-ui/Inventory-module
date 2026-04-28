const { isEmpty, isPositiveNumber, isNonNegativeNumber, isValidDate } = require('./commonValidator');

const validateInventoryTransaction = (data) => {
  const errors = {};

  if (isEmpty(data.item_id)) errors.item_id = 'Item is required';
  if (isEmpty(data.txn_type_id)) errors.txn_type_id = 'Transaction Type is required';

  if (isEmpty(data.txn_action)) {
    errors.txn_action = 'Transaction Action is required';
  } else if (!['IN', 'OUT', 'TRANSFER'].includes(data.txn_action)) {
    errors.txn_action = 'Transaction Action must be IN, OUT, or TRANSFER';
  }

  if (isEmpty(data.inv_org_id)) errors.inv_org_id = 'Inventory Organization is required';
  if (isEmpty(data.subinventory_id)) errors.subinventory_id = 'Subinventory is required';

  if (isEmpty(data.txn_qty)) {
    errors.txn_qty = 'Quantity is required';
  } else if (!isPositiveNumber(data.txn_qty)) {
    errors.txn_qty = 'Quantity must be greater than 0';
  }

  if (isEmpty(data.uom_id)) errors.uom_id = 'UOM is required';

  if (!isEmpty(data.unit_cost) && !isNonNegativeNumber(data.unit_cost)) {
    errors.unit_cost = 'Unit cost must be non-negative';
  }

  if (isEmpty(data.txn_date)) {
    errors.txn_date = 'Transaction date is required';
  } else if (!isValidDate(data.txn_date)) {
    errors.txn_date = 'Invalid date format';
  }

  if (isEmpty(data.txn_reason_id)) errors.txn_reason_id = 'Transaction Reason is required';

  return { errors, isValid: Object.keys(errors).length === 0 };
};

module.exports = { validateInventoryTransaction };
