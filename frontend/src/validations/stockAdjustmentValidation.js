import { isEmpty, isPositiveNumber, isNonNegativeNumber, isValidDate } from './commonValidation';

export const validateStockAdjustment = (formData, options = {}) => {
  const errors = {};
  const { isTransfer, isLotControlled, isSerialControlled } = options;

  // Company Group
  if (isEmpty(formData.COMPANY_id)) errors.COMPANY_id = 'Company is required';
  if (isEmpty(formData.bg_id)) errors.bg_id = 'Business Group is required';

  // Item
  if (isEmpty(formData.item_id)) {
    errors.item_id = 'Item is required';
  }

  // Adjustment Type
  if (isEmpty(formData.txn_type_id)) {
    errors.txn_type_id = 'Adjustment Type is required';
  }

  // Source Org
  if (isEmpty(formData.inv_org_id)) {
    errors.inv_org_id = 'Source Organization is required';
  }

  // Source Subinventory
  if (isEmpty(formData.subinventory_id)) {
    errors.subinventory_id = 'Source Subinventory is required';
  }

  // Transfer-specific validations
  if (isTransfer) {
    if (isEmpty(formData.to_inv_org_id)) {
      errors.to_inv_org_id = 'Destination Organization is required for transfers';
    }
    if (isEmpty(formData.to_subinventory_id)) {
      errors.to_subinventory_id = 'Destination Subinventory is required for transfers';
    }
    // Same source and destination check
    if (!isEmpty(formData.inv_org_id) && !isEmpty(formData.to_inv_org_id) &&
        !isEmpty(formData.subinventory_id) && !isEmpty(formData.to_subinventory_id)) {
      if (formData.inv_org_id === formData.to_inv_org_id &&
          formData.subinventory_id === formData.to_subinventory_id) {
        errors.to_subinventory_id = 'Destination must be different from source';
      }
    }
    // Transfer qty
    if (isEmpty(formData.physical_qty)) {
      errors.physical_qty = 'Transfer quantity is required';
    } else if (!isPositiveNumber(formData.physical_qty)) {
      errors.physical_qty = 'Transfer quantity must be greater than 0';
    }
  } else {
    // Non-transfer: physical qty check
    if (isEmpty(formData.physical_qty)) {
      errors.physical_qty = 'Physical quantity is required';
    } else if (!isNonNegativeNumber(formData.physical_qty)) {
      errors.physical_qty = 'Physical quantity must be a non-negative number';
    }
  }

  // Lot validation (conditional)
  if (isLotControlled && isEmpty(formData.lot_id)) {
    errors.lot_id = 'Lot is required for lot-controlled items';
  }

  // Serial validation (conditional)
  if (isSerialControlled) {
    if (!formData.serial_ids || formData.serial_ids.length === 0) {
      errors.serial_ids = 'At least one serial is required for serial-controlled items';
    }
  }

  // Unit Cost
  if (!isEmpty(formData.unit_cost) && !isNonNegativeNumber(formData.unit_cost)) {
    errors.unit_cost = 'Unit cost must be a non-negative number';
  }

  // Adjustment Date
  if (!isEmpty(formData.adjustment_date) && !isValidDate(formData.adjustment_date)) {
    errors.adjustment_date = 'Invalid date format';
  }

  return {
    errors,
    isValid: Object.keys(errors).length === 0
  };
};
