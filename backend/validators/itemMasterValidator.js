const { isEmpty, isPositiveNumber, isNonNegativeNumber, REGEX, validateCompanyGroup, validateDateRange } = require('./commonValidator');

const validateItemMaster = (data) => {
  const errors = {};

  validateCompanyGroup(errors, data);

  if (isEmpty(data.item_name)) {
    errors.item_name = 'Item Name is required';
  } else if (!REGEX.NAME.test(data.item_name)) {
    errors.item_name = 'Item Name must be 3–100 characters, no invalid special characters';
  }

  if (!isEmpty(data.item_code) && !REGEX.CODE.test(data.item_code)) {
    errors.item_code = 'Item Code must be 2–20 uppercase alphanumeric characters or underscores';
  }

  if (isEmpty(data.item_type_id)) errors.item_type_id = 'Item Type is required';

  // Physical items
  if (data._isPhysical === true) {
    if (isEmpty(data.primary_uom_id)) errors.primary_uom_id = 'Primary UOM is required for physical items';
    if (data.is_serial_controlled === 'Y' && data.is_lot_controlled === 'Y') {
      errors.is_lot_controlled = 'Cannot enable both Serial and Lot control';
    }
    if ((data.is_expirable === 'Y' || data.is_expirable === true) && isEmpty(data.shelf_life_days)) {
      errors.shelf_life_days = 'Shelf life is required when item is expirable';
    }
    if (!isEmpty(data.weight_kg) && !isNonNegativeNumber(data.weight_kg)) errors.weight_kg = 'Weight must be non-negative';
    if (!isEmpty(data.volume_cbm) && !isNonNegativeNumber(data.volume_cbm)) errors.volume_cbm = 'Volume must be non-negative';
    if (!isEmpty(data.min_order_qty) && !isPositiveNumber(data.min_order_qty)) errors.min_order_qty = 'Min order qty must be positive';
    if (!isEmpty(data.max_order_qty) && !isPositiveNumber(data.max_order_qty)) errors.max_order_qty = 'Max order qty must be positive';
    if (!isEmpty(data.min_order_qty) && !isEmpty(data.max_order_qty) && Number(data.min_order_qty) > Number(data.max_order_qty)) {
      errors.max_order_qty = 'Max order qty must be >= Min order qty';
    }
  }

  // Software items
  if (data._isPhysical === false) {
    if (data.is_license_required === 'Y' || data.is_license_required === true) {
      if (isEmpty(data.license_type)) errors.license_type = 'License type is required';
      if (isEmpty(data.max_users)) errors.max_users = 'Max users is required';
      else if (!isPositiveNumber(data.max_users)) errors.max_users = 'Max users must be positive';
    }
  }

  if (!isEmpty(data.standard_cost) && !isNonNegativeNumber(data.standard_cost)) errors.standard_cost = 'Standard cost must be non-negative';
  if (!isEmpty(data.list_price) && !isNonNegativeNumber(data.list_price)) errors.list_price = 'List price must be non-negative';

  validateDateRange(errors, data);

  return { errors, isValid: Object.keys(errors).length === 0 };
};

module.exports = { validateItemMaster };
