import { isEmpty, isNonNegativeNumber } from './commonValidation';

export const validateItemStock = (formData) => {
  const errors = {};

  // Item
  if (isEmpty(formData.item_id)) {
    errors.item_id = 'Item is required';
  }

  // Organization
  if (isEmpty(formData.inv_org_id)) {
    errors.inv_org_id = 'Inventory Organization is required';
  }

  // Subinventory
  if (isEmpty(formData.subinventory_id)) {
    errors.subinventory_id = 'Subinventory is required';
  }

  // Onhand Qty
  if (isEmpty(formData.onhand_qty)) {
    errors.onhand_qty = 'Onhand quantity is required';
  } else if (!isNonNegativeNumber(formData.onhand_qty)) {
    errors.onhand_qty = 'Onhand quantity must be a non-negative number';
  }

  // Available Qty
  if (!isEmpty(formData.available_qty) && !isNonNegativeNumber(formData.available_qty)) {
    errors.available_qty = 'Available quantity must be a non-negative number';
  }

  // Reserved Qty
  if (!isEmpty(formData.reserved_qty) && !isNonNegativeNumber(formData.reserved_qty)) {
    errors.reserved_qty = 'Reserved quantity must be a non-negative number';
  }

  // Available <= Onhand
  if (!isEmpty(formData.available_qty) && !isEmpty(formData.onhand_qty)) {
    if (Number(formData.available_qty) > Number(formData.onhand_qty)) {
      errors.available_qty = 'Available quantity cannot exceed onhand quantity';
    }
  }

  // Unit Cost
  if (!isEmpty(formData.unit_cost) && !isNonNegativeNumber(formData.unit_cost)) {
    errors.unit_cost = 'Unit cost must be a non-negative number';
  }

  // UOM
  if (isEmpty(formData.uom_id)) {
    errors.uom_id = 'UOM is required';
  }

  return {
    errors,
    isValid: Object.keys(errors).length === 0
  };
};
