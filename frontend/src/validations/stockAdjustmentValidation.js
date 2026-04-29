
/**
 * Stock Adjustment Validation Schema
 * Supports both Normal Adjustments (IN/OUT/LOSS/DAMAGE) and Stock Transfers
 */

export const stockAdjustmentValidation = {
  bg_id: {
    required: true,
    message: "Business Group is required"
  },
  COMPANY_id: {
    required: true,
    dependsOn: "bg_id",
    message: "Company is required"
  },
  business_type_id: {
    required: true,
    dependsOn: "COMPANY_id",
    message: "Business Type is required"
  },
  item_id: {
    required: true,
    message: "Item is required"
  },
  txn_type_id: {
    required: true,
    message: "Adjustment Type is required"
  },

  // LOCATION (Source)
  inv_org_id: {
    required: true,
    message: "Organization is required"
  },
  subinventory_id: {
    required: true,
    dependsOn: "inv_org_id",
    message: "Subinventory is required"
  },

  // TRANSFER LOCATION (Destination)
  to_inv_org_id: {
    requiredIf: (data) => data.txn_action === "TRANSFER",
    message: "Destination Org is required"
  },
  to_subinventory_id: {
    requiredIf: (data) => data.txn_action === "TRANSFER",
    message: "Destination Subinventory is required"
  },

  // QUANTITY
  physical_qty: {
    required: true,
    regex: /^[0-9]+(\.[0-9]{1,3})?$/,
    min: 0,
    message: "Invalid quantity"
  },

  uom_id: {
    required: true,
    message: "UOM is required"
  },

  unit_cost: {
    required: true,
    regex: /^[0-9]+(\.[0-9]{1,2})?$/,
    min: 0,
    message: "Invalid unit cost"
  },

  adjustment_date: {
    required: true,
    type: "date",
    notFuture: true,
    message: "Invalid transaction date"
  },

  remarks: {
    maxLength: 250,
    message: "Max 250 characters allowed"
  }
};

/**
 * Dynamic Validation for complex business rules
 */
export const stockAdjustmentDynamicValidation = (data, stockInfo, isLotControlled, isSerialControlled) => {
  const errors = {};
  const isTransfer = data.txn_action === 'TRANSFER';
  
  const systemQty = parseFloat(stockInfo?.onhand_qty || 0);
  const availableQty = parseFloat(stockInfo?.available_qty || 0);
  const physical = parseFloat(data.physical_qty || 0);

  // 1. Stock Sufficiency for Transfers or Reductions
  if (isTransfer) {
    if (physical > availableQty) {
      errors.physical_qty = `Insufficient stock (Available: ${availableQty})`;
    }
    
    // Prevent same source/dest
    const src = `${data.inv_org_id}-${data.subinventory_id}-${data.locator_id || ''}`;
    const dest = `${data.to_inv_org_id}-${data.to_subinventory_id}-${data.to_locator_id || ''}`;
    if (src === dest) {
      errors.to_locator_id = "Source and destination cannot be the same";
    }
  } else {
    // For non-transfer, if it's a reduction (Physical < System), ensure we have enough
    if (physical < systemQty) {
      const reduction = systemQty - physical;
      if (reduction > availableQty) {
         errors.physical_qty = `Insufficient available stock for reduction (Need: ${reduction}, Avail: ${availableQty})`;
      }
    }
  }

  // 2. Control Type Validations
  if (isLotControlled && !data.lot_id) {
    errors.lot_id = "Lot is required for this item";
  }

  if (isSerialControlled) {
    const serials = data.serial_ids || [];
    if (serials.length === 0) {
      errors.serial_ids = "Serials are required for this item";
    } else if (serials.length !== physical) {
      errors.serial_ids = `Serial count (${serials.length}) must match quantity (${physical})`;
    }
  }

  return errors;
};

/**
 * Generic Validator
 */
export const validateStockAdjustment = (data, schema) => {
  const errors = {};

  Object.keys(schema).forEach((field) => {
    const rules = schema[field];
    const value = data[field];

    // Required check
    if (rules.required && !value && value !== 0) {
      errors[field] = rules.message;
      return;
    }

    // RequiredIf check
    if (rules.requiredIf && rules.requiredIf(data) && !value && value !== 0) {
      errors[field] = rules.message;
      return;
    }

    // Regex check
    if (rules.regex && value && !rules.regex.test(value)) {
      errors[field] = rules.message;
    }

    // Min check
    if (rules.min !== undefined && parseFloat(value) < rules.min) {
      errors[field] = rules.message;
    }

    // MaxLength check
    if (rules.maxLength && value?.length > rules.maxLength) {
      errors[field] = rules.message;
    }

    // Date not future check
    if (rules.notFuture && value) {
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      if (new Date(value) > today) {
        errors[field] = "Future date not allowed";
      }
    }
  });

  return errors;
};
