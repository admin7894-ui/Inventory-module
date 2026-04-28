import { isEmpty, isPositiveNumber, isNonNegativeNumber, isValidDate } from './commonValidation';

export const validateOpeningStock = (formData, options = {}) => {
  const errors = {};
  const { isLotControlled, isSerialControlled, serialMode, serialInputs } = options;

  // Company Group
  if (isEmpty(formData.COMPANY_id)) errors.COMPANY_id = 'Company is required';
  if (isEmpty(formData.bg_id)) errors.bg_id = 'Business Group is required';

  // Item
  if (isEmpty(formData.item_id)) {
    errors.item_id = 'Item is required';
  }

  // Transaction Reason
  if (isEmpty(formData.txn_reason_id)) {
    errors.txn_reason_id = 'Transaction Reason is required';
  }

  // Inventory Organization
  if (isEmpty(formData.inv_org_id)) {
    errors.inv_org_id = 'Inventory Organization is required';
  }

  // Subinventory
  if (isEmpty(formData.subinventory_id)) {
    errors.subinventory_id = 'Subinventory is required';
  }

  // Opening Qty
  if (isEmpty(formData.opening_qty)) {
    errors.opening_qty = 'Opening quantity is required';
  } else if (!isPositiveNumber(formData.opening_qty)) {
    errors.opening_qty = 'Opening quantity must be greater than 0';
  }

  // Unit Cost
  if (isEmpty(formData.unit_cost)) {
    errors.unit_cost = 'Unit cost is required';
  } else if (!isNonNegativeNumber(formData.unit_cost)) {
    errors.unit_cost = 'Unit cost must be a non-negative number';
  }

  // Lot validation (conditional)
  if (isLotControlled && isEmpty(formData.lot_number)) {
    errors.lot_number = 'Lot number is required for lot-controlled items';
  }

  // Serial validation (conditional)
  if (isSerialControlled && serialMode === 'manual') {
    const qty = parseInt(formData.opening_qty) || 0;
    const validSerials = (serialInputs || []).filter(s => s && s.trim());
    if (validSerials.length !== qty) {
      errors.serial_numbers = `Need exactly ${qty} serial numbers`;
    }
    // Check for duplicates
    const uniqueSerials = new Set(validSerials);
    if (uniqueSerials.size !== validSerials.length) {
      errors.serial_numbers = 'Duplicate serial numbers are not allowed';
    }
  }

  // Opening Date
  if (!isEmpty(formData.opening_date) && !isValidDate(formData.opening_date)) {
    errors.opening_date = 'Invalid date format';
  }

  return {
    errors,
    isValid: Object.keys(errors).length === 0
  };
};
