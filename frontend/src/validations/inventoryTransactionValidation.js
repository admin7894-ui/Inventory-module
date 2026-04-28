import { isEmpty, isPositiveNumber, isNonNegativeNumber, isValidDate } from './commonValidation';

export const validateInventoryTransaction = (formData) => {
  const errors = {};

  // Item
  if (isEmpty(formData.item_id)) {
    errors.item_id = 'Item is required';
  }

  // Transaction Type
  if (isEmpty(formData.txn_type_id)) {
    errors.txn_type_id = 'Transaction Type is required';
  }

  // Transaction Action
  if (isEmpty(formData.txn_action)) {
    errors.txn_action = 'Transaction Action (IN/OUT) is required';
  } else if (!['IN', 'OUT', 'TRANSFER'].includes(formData.txn_action)) {
    errors.txn_action = 'Transaction Action must be IN, OUT, or TRANSFER';
  }

  // Organization
  if (isEmpty(formData.inv_org_id)) {
    errors.inv_org_id = 'Inventory Organization is required';
  }

  // Subinventory
  if (isEmpty(formData.subinventory_id)) {
    errors.subinventory_id = 'Subinventory is required';
  }

  // Quantity
  if (isEmpty(formData.txn_qty)) {
    errors.txn_qty = 'Quantity is required';
  } else if (!isPositiveNumber(formData.txn_qty)) {
    errors.txn_qty = 'Quantity must be greater than 0';
  }

  // UOM
  if (isEmpty(formData.uom_id)) {
    errors.uom_id = 'UOM is required';
  }

  // Unit Cost
  if (!isEmpty(formData.unit_cost) && !isNonNegativeNumber(formData.unit_cost)) {
    errors.unit_cost = 'Unit cost must be a non-negative number';
  }

  // Transaction Date
  if (isEmpty(formData.txn_date)) {
    errors.txn_date = 'Transaction date is required';
  } else if (!isValidDate(formData.txn_date)) {
    errors.txn_date = 'Invalid date format';
  }

  // Transaction Reason
  if (isEmpty(formData.txn_reason_id)) {
    errors.txn_reason_id = 'Transaction Reason is required';
  }

  return {
    errors,
    isValid: Object.keys(errors).length === 0
  };
};
