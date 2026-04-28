/**
 * Opening Stock Validation Schema
 * Matches Operating Unit validation pattern
 */

export const openingStockValidation = {
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
  txn_reason_id: {
    required: true,
    message: "Transaction Reason is required"
  },
  inv_org_id: {
    required: true,
    message: "Inventory Organization is required"
  },
  subinventory_id: {
    required: true,
    dependsOn: "inv_org_id",
    message: "Subinventory is required"
  },
  locator_id: {
    // Optional in some orgs but let's keep it based on setup if needed
    // For now, making it required if others are set
    required: false, 
    message: "Locator is required"
  },
  uom_id: {
    required: true,
    message: "UOM is required"
  },
  opening_qty: {
    required: true,
    regex: /^[0-9]+(\.[0-9]{1,3})?$/,
    min: 0.001,
    message: "Enter valid quantity greater than 0"
  },
  unit_cost: {
    required: true,
    regex: /^[0-9]+(\.[0-9]{1,2})?$/,
    min: 0,
    message: "Enter valid unit cost"
  },
  opening_date: {
    required: true,
    type: "date",
    notFuture: true,
    message: "Invalid date"
  },
  remarks: {
    maxLength: 250,
    message: "Max 250 characters allowed"
  }
};

/**
 * Dynamic Validation for Serial / Lot Control
 */
export const openingStockDynamicValidation = (data, options = {}) => {
  const errors = {};
  const { isLotControlled, isSerialControlled, serialMode, serialInputs } = options;

  if (isSerialControlled && serialMode === 'manual') {
    const qty = parseInt(data.opening_qty) || 0;
    const validSerials = (serialInputs || []).filter(s => s && s.trim());
    
    if (validSerials.length !== qty) {
      errors.serial_numbers = `Need exactly ${qty} serial numbers`;
    }

    const uniqueSerials = new Set(validSerials);
    if (uniqueSerials.size !== validSerials.length) {
      errors.serial_numbers = "Duplicate serial numbers are not allowed";
    }
  }

  if (isLotControlled) {
    if (!data.lot_number || !data.lot_number.trim()) {
      errors.lot_number = "Lot number is required for lot-controlled items";
    }
  }

  return errors;
};

/**
 * Reusable Validator Function
 */
export const validateOpeningStock = (data, schema) => {
  const errors = {};

  Object.keys(schema).forEach((field) => {
    const rules = schema[field];
    const value = data[field];

    // Required check
    if (rules.required && (value === undefined || value === null || value === '')) {
      errors[field] = rules.message;
      return;
    }

    // Skip other checks if empty
    if (value === undefined || value === null || value === '') return;

    // Regex check
    if (rules.regex && !rules.regex.test(String(value))) {
      errors[field] = rules.message;
    }

    // Min check
    if (rules.min !== undefined && parseFloat(value) < rules.min) {
      errors[field] = rules.message;
    }

    // MaxLength check
    if (rules.maxLength && String(value).length > rules.maxLength) {
      errors[field] = rules.message;
    }

    // Date not future check
    if (rules.notFuture && value) {
      const today = new Date();
      today.setHours(23, 59, 59, 999); // Allow today
      if (new Date(value) > today) {
        errors[field] = "Future date not allowed";
      }
    }
  });

  return errors;
};
