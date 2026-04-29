/**
 * Opening Stock Validation Schema
 */
export const openingStockValidation = {
  bg_id: { required: true, message: "Business Group is required" },
  COMPANY_id: { required: true, message: "Company is required" },
  business_type_id: { required: true, message: "Business Type is required" },
  item_id: { required: true, message: "Item is required" },
  inv_org_id: { required: true, message: "Inventory Org is required" },
  subinventory_id: { required: true, message: "Subinventory is required" },
  opening_qty: {
    required: true,
    min: 0.001,
    regex: /^[0-9]+(\.[0-9]{1,3})?$/,
    message: "Quantity must be greater than 0"
  },
  unit_cost: {
    required: true,
    min: 0,
    regex: /^[0-9]+(\.[0-9]{1,2})?$/,
    message: "Unit cost must be 0 or more"
  },
  opening_date: { required: true, message: "Opening date is required" }
};

/**
 * Opening Stock Validation Entry Point
 * @returns {{ errors: object, isValid: boolean }}
 */
export const validateOpeningStock = (data, options = {}) => {
  const staticErrors = runStaticValidation(data, openingStockValidation);
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
  const { isLotControlled, isSerialControlled, serialInputs } = options;

  if (isLotControlled && !data.lot_number) {
    errors.lot_number = "Lot number is required";
  }

  if (isSerialControlled) {
    const qty = parseFloat(data.opening_qty || 0);
    const validSerials = (serialInputs || []).filter(s => s && s.trim());
    if (validSerials.length !== qty) {
      errors.serial_numbers = `Please enter exactly ${qty} serial numbers`;
    }
  }

  if (data.opening_date) {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    if (new Date(data.opening_date) > today) {
      errors.opening_date = "Date cannot be in the future";
    }
  }

  return errors;
};
