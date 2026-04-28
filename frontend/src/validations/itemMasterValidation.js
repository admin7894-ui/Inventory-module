import {
  isEmpty, REGEX, matchesRegex, isPositiveNumber, isNonNegativeNumber,
  validateCompanyGroup, validateDateRange, validateActiveFlag
} from './commonValidation';

export const validateItemMaster = (formData, options = {}) => {
  const errors = {};
  const { isPhysical } = options;

  // Company Group
  validateCompanyGroup(errors, formData);

  // Item Name
  if (isEmpty(formData.item_name)) {
    errors.item_name = 'Item Name is required';
  } else if (!matchesRegex(formData.item_name, REGEX.NAME)) {
    errors.item_name = 'Item Name must be 3–100 characters, no invalid special characters';
  }

  // Item Code (optional but if present, validate format)
  if (!isEmpty(formData.item_code) && !matchesRegex(formData.item_code, REGEX.CODE)) {
    errors.item_code = 'Item Code must be 2–20 uppercase alphanumeric characters or underscores';
  }

  // Item Type
  if (isEmpty(formData.item_type_id)) {
    errors.item_type_id = 'Item Type is required';
  }

  // Physical item validations
  if (isPhysical === true) {
    // Primary UOM required for physical items
    if (isEmpty(formData.primary_uom_id)) {
      errors.primary_uom_id = 'Primary UOM is required for physical items';
    }

    // Serial + Lot mutual exclusivity
    if (formData.is_serial_controlled === 'Y' && formData.is_lot_controlled === 'Y') {
      errors.is_lot_controlled = 'Cannot enable both Serial and Lot control';
    }

    // Expirable → shelf life required
    if ((formData.is_expirable === 'Y' || formData.is_expirable === true) && isEmpty(formData.shelf_life_days)) {
      errors.shelf_life_days = 'Shelf life is required when item is expirable';
    }

    // Numeric validations
    if (!isEmpty(formData.weight_kg) && !isNonNegativeNumber(formData.weight_kg)) {
      errors.weight_kg = 'Weight must be a non-negative number';
    }
    if (!isEmpty(formData.volume_cbm) && !isNonNegativeNumber(formData.volume_cbm)) {
      errors.volume_cbm = 'Volume must be a non-negative number';
    }
    if (!isEmpty(formData.reorder_point) && !isNonNegativeNumber(formData.reorder_point)) {
      errors.reorder_point = 'Reorder point must be a non-negative number';
    }
    if (!isEmpty(formData.min_order_qty) && !isPositiveNumber(formData.min_order_qty)) {
      errors.min_order_qty = 'Min order qty must be a positive number';
    }
    if (!isEmpty(formData.max_order_qty) && !isPositiveNumber(formData.max_order_qty)) {
      errors.max_order_qty = 'Max order qty must be a positive number';
    }
    if (!isEmpty(formData.min_order_qty) && !isEmpty(formData.max_order_qty)) {
      if (Number(formData.min_order_qty) > Number(formData.max_order_qty)) {
        errors.max_order_qty = 'Max order qty must be >= Min order qty';
      }
    }

    // HSN Code
    if (!isEmpty(formData.hsn_code) && !matchesRegex(formData.hsn_code, REGEX.HSN)) {
      errors.hsn_code = 'HSN Code must be 4–8 digits';
    }
  }

  // Non-physical (Software) validations
  if (isPhysical === false) {
    if (formData.is_license_required === 'Y' || formData.is_license_required === true) {
      if (isEmpty(formData.license_type)) {
        errors.license_type = 'License type is required';
      }
      if (isEmpty(formData.max_users)) {
        errors.max_users = 'Max users is required';
      } else if (!isPositiveNumber(formData.max_users)) {
        errors.max_users = 'Max users must be a positive number';
      }
    }
  }

  // Costing (optional but validate format)
  if (!isEmpty(formData.standard_cost) && !isNonNegativeNumber(formData.standard_cost)) {
    errors.standard_cost = 'Standard cost must be a non-negative number';
  }
  if (!isEmpty(formData.list_price) && !isNonNegativeNumber(formData.list_price)) {
    errors.list_price = 'List price must be a non-negative number';
  }

  // Date Range
  validateDateRange(errors, formData);

  return {
    errors,
    isValid: Object.keys(errors).length === 0
  };
};
