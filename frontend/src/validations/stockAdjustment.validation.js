/**
 * Stock Adjustment Validation Schema
 */
export const stockAdjustmentValidation = {
  bg_id: { required: true, message: "Business Group is required" },
  COMPANY_id: { required: true, message: "Company is required" },
  business_type_id: { required: true, message: "Business Type is required" },
  item_id: { required: true, message: "Item is required" },
  txn_type_id: { required: true, message: "Adjustment Type is required" },
  inv_org_id: { required: true, message: "Organization is required" },
  subinventory_id: { required: true, message: "Subinventory is required" },
  to_inv_org_id: {
    requiredIf: (data) => data.txn_action === "TRANSFER",
    message: "Destination Org is required"
  },
  to_subinventory_id: {
    requiredIf: (data) => data.txn_action === "TRANSFER",
    message: "Destination Subinventory is required"
  },
  physical_qty: {
    required: true,
    min: 0,
    regex: /^[0-9]+(\.[0-9]{1,3})?$/,
    message: "Invalid quantity"
  },
  unit_cost: {
    required: true,
    min: 0,
    regex: /^[0-9]+(\.[0-9]{1,2})?$/,
    message: "Invalid unit cost"
  },
  adjustment_date: { required: true, message: "Adjustment date is required" }
};

/**
 * Stock Adjustment Validation Entry Point
 * @returns {{ errors: object, isValid: boolean }}
 */
export const validateStockAdjustment = (data, options = {}) => {
  const staticErrors = runStaticValidation(data, stockAdjustmentValidation);
  const dynamicErrors = runDynamicValidation(data, options);
  const errors = { ...staticErrors, ...dynamicErrors };
  return { errors, isValid: Object.keys(errors).length === 0 };
};

const runStaticValidation = (data, schema) => {
  const errors = {};
  Object.keys(schema).forEach((field) => {
    const rules = schema[field];
    const value = data[field];
    const isEmpty = value === undefined || value === null || value === "";

    if (rules.required && isEmpty) {
      errors[field] = rules.message || "Field is required";
      return;
    }
    if (rules.requiredIf && rules.requiredIf(data) && isEmpty) {
      errors[field] = rules.message || "Field is required";
      return;
    }
    if (isEmpty) return;
    if (rules.regex && !rules.regex.test(String(value))) {
      errors[field] = rules.message || "Invalid format";
      return;
    }
    if (rules.min !== undefined && parseFloat(value) < rules.min) {
      errors[field] = rules.message || `Min value is ${rules.min}`;
    }
  });
  return errors;
};

const runDynamicValidation = (data, options) => {
  const errors = {};
  const { stockInfo, isLotControlled, isSerialControlled } = options;
  const isTransfer = data.txn_action === 'TRANSFER';

  const systemQty = parseFloat(stockInfo?.onhand_qty || 0);
  const availableQty = parseFloat(stockInfo?.available_qty || 0);
  const physical = parseFloat(data.physical_qty || 0);

  if (isTransfer) {
    if (physical > availableQty) {
      errors.physical_qty = `Insufficient stock (Available: ${availableQty})`;
    }
    const src = `${data.inv_org_id}-${data.subinventory_id}-${data.locator_id || ''}`;
    const dest = `${data.to_inv_org_id}-${data.to_subinventory_id}-${data.to_locator_id || ''}`;
    if (src === dest) {
      errors.to_subinventory_id = "Source and destination cannot be the same";
    }
  } else {
    if (physical < systemQty) {
      const reduction = systemQty - physical;
      if (reduction > availableQty) {
        errors.physical_qty = `Insufficient available stock for reduction (Need: ${reduction}, Avail: ${availableQty})`;
      }
    }
    if (physical === systemQty && !isNaN(physical) && data.physical_qty !== "") {
      errors.physical_qty = "Physical qty must differ from system qty";
    }
  }

  if (isLotControlled && !data.lot_id) {
    errors.lot_id = "Lot is required";
  }

  if (isSerialControlled) {
    const serials = data.serial_ids || [];
    if (serials.length === 0) {
      errors.serial_ids = "Serials are required";
    } else if (serials.length !== physical) {
      errors.serial_ids = `Serial count (${serials.length}) must match quantity (${physical})`;
    }
  }

  if (data.adjustment_date) {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    if (new Date(data.adjustment_date) > today) {
      errors.adjustment_date = "Future date not allowed";
    }
  }

  return errors;
};
