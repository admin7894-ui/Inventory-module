const { isEmpty, isNonNegativeNumber } = require('./commonValidator');

const validateItemStock = (data) => {
  const errors = {};

  if (isEmpty(data.item_id)) errors.item_id = 'Item is required';
  if (isEmpty(data.inv_org_id)) errors.inv_org_id = 'Inventory Organization is required';
  if (isEmpty(data.subinventory_id)) errors.subinventory_id = 'Subinventory is required';

  if (isEmpty(data.onhand_qty)) {
    errors.onhand_qty = 'Onhand quantity is required';
  } else if (!isNonNegativeNumber(data.onhand_qty)) {
    errors.onhand_qty = 'Onhand quantity must be non-negative';
  }

  if (!isEmpty(data.available_qty) && !isNonNegativeNumber(data.available_qty)) {
    errors.available_qty = 'Available quantity must be non-negative';
  }
  if (!isEmpty(data.reserved_qty) && !isNonNegativeNumber(data.reserved_qty)) {
    errors.reserved_qty = 'Reserved quantity must be non-negative';
  }
  if (!isEmpty(data.available_qty) && !isEmpty(data.onhand_qty) && Number(data.available_qty) > Number(data.onhand_qty)) {
    errors.available_qty = 'Available quantity cannot exceed onhand quantity';
  }
  if (!isEmpty(data.unit_cost) && !isNonNegativeNumber(data.unit_cost)) {
    errors.unit_cost = 'Unit cost must be non-negative';
  }
  if (isEmpty(data.uom_id)) errors.uom_id = 'UOM is required';

  return { errors, isValid: Object.keys(errors).length === 0 };
};

module.exports = { validateItemStock };
