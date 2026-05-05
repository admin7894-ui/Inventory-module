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
  locator_id: { required: false, message: "Locator is required" },
  to_inv_org_id: {
    requiredIf: (data) => data.txn_action === "TRANSFER",
    message: "Destination Org is required"
  },
  to_subinventory_id: {
    requiredIf: (data) => data.txn_action === "TRANSFER",
    message: "Destination Subinventory is required"
  },
  to_locator_id: {
    requiredIf: () => false,
    message: "Destination Locator is required"
  },
  txn_reason_id: { required: true, message: "Reason is required" },
  physical_qty: {
    required: true,
    min: 0.001,
    regex: /^[0-9]+(\.[0-9]{1,3})?$/,
    message: "Invalid quantity"
  },
  unit_cost: {
    required: false,
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
  const { stockInfo, isLotControlled, isSerialControlled, locatorRequired, destLocatorRequired } = options;
  const isTransfer = data.txn_action === 'TRANSFER';

  const systemQty = parseFloat(stockInfo?.onhand_qty || 0);
  const availableQty = parseFloat(stockInfo?.available_qty || 0);
  const physical = parseFloat(data.physical_qty || 0);

  if (isTransfer) {
    if (locatorRequired && !data.locator_id) errors.locator_id = "Locator is required";
    if (destLocatorRequired && !data.to_locator_id) errors.to_locator_id = "Destination Locator is required";
    if (physical <= 0) {
      errors.physical_qty = "Transfer quantity must be > 0";
    } else if (physical > availableQty) {
      errors.physical_qty = "Insufficient stock";
    }
    const src = `${data.inv_org_id}-${data.subinventory_id}-${data.locator_id || ''}`;
    const dest = `${data.to_inv_org_id}-${data.to_subinventory_id}-${data.to_locator_id || ''}`;
    if (src === dest && src !== '--') {
      errors.to_subinventory_id = "Source and destination cannot be same";
      errors.to_locator_id = "Source and destination cannot be same";
    }
  } else {
    if (locatorRequired && !data.locator_id) errors.locator_id = "Locator is required";
    if (data.txn_action === 'OUT' && physical > systemQty) {
      errors.physical_qty = "Physical quantity cannot exceed available stock for OUT transaction";
    }
    // For OUT adjustments on this page, quantity rule is handled by
    // explicit OUT check (physical must not exceed system qty).
    // Avoid showing "Insufficient stock" from available-qty logic here.
    if (data.txn_action !== 'OUT' && physical < systemQty) {
      const reduction = systemQty - physical;
      if (reduction > availableQty) {
        errors.physical_qty = `Insufficient available stock for reduction (Need: ${reduction}, Avail: ${availableQty})`;
      }
    }
    if (physical === systemQty && !isNaN(physical) && data.physical_qty !== "") {
      errors.physical_qty = "Physical qty must differ from system qty";
    }
  }

  if (isLotControlled) {
    if (data.txn_action === 'IN') {
      if (!data.lot_number) errors.lot_number = "Lot is required";
    } else {
      if (!data.lot_id) errors.lot_id = "Lot is required";
    }
  }

  if (isSerialControlled) {
    if (data.txn_action === 'IN') {
      const serials = options.serialInputs || [];
      const validSerials = serials.filter(s => s && s.trim());
      const physical = parseFloat(data.physical_qty || 0);

      if (validSerials.length === 0) {
        errors.serial_ids = "Serial numbers are required";
      } else if (validSerials.length !== physical) {
        errors.serial_ids = `Serial count (${validSerials.length}) must match quantity (${physical})`;
      } else {
        // Check for duplicates in form
        const seen = new Set();
        const duplicates = [];
        validSerials.forEach(s => {
          if (seen.has(s.toLowerCase())) duplicates.push(s);
          else seen.add(s.toLowerCase());
        });
        if (duplicates.length > 0) {
          errors.serial_ids = `Duplicate serials found: ${duplicates.join(', ')}`;
        }
      }
    } else {
      const serials = data.serial_ids || [];
      const physical = parseFloat(data.physical_qty || 0);
      if (serials.length === 0) {
        errors.serial_ids = "Serials are required";
      } else if (serials.length !== physical) {
        errors.serial_ids = `Serial count (${serials.length}) must match quantity (${physical})`;
      }
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
