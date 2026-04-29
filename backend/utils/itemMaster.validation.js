const db = require('../data/db');

const itemMasterValidation = {
  bg_id: {
    required: true,
    message: "Business Group is required"
  },
  COMPANY_id: {
    required: true,
    message: "Company is required"
  },
  business_type_id: {
    required: true,
    message: "Business Type is required"
  },

  item_name: {
    required: true,
    minLength: 3,
    message: "Item Name is required (min 3 chars)"
  },

  item_code: {
    required: true,
    regex: /^[A-Z0-9][A-Z0-9-_]{0,18}[A-Z0-9]?$/,
    message: "Item Code must be valid"
  },

  item_type_id: {
    required: true,
    message: "Item Type is required"
  },

  brand_id: {
    required: true,
    message: "Brand is required"
  },

  category_id: {
    required: true,
    message: "Category is required"
  },

  sub_category_id: {
    required: true,
    message: "Sub Category is required"
  },

  list_price: {
    required: true,
    min: 0,
    regex: /^[0-9]+(\.[0-9]{1,2})?$/,
    message: "Valid List Price is required (must be 0 or more)"
  },

  tax_category: {
    required: true,
    message: "Tax Category is required"
  },

  effective_from: {
    required: true,
    type: "date",
    message: "Effective From is required"
  }
};

const validateItemMaster = (data, schema) => {
  const errors = {};

  Object.keys(schema).forEach((field) => {
    const rules = schema[field];
    if (!rules) return;

    const value = data[field];
    const isValueEmpty = value === undefined || value === null || value === "";

    if (rules.required && isValueEmpty) {
      errors[field] = rules.message || `${field} is required`;
      return;
    }

    if (isValueEmpty) return;

    if (rules.minLength && String(value).length < rules.minLength) {
      errors[field] = rules.message || `Min ${rules.minLength} characters required`;
      return;
    }

    if (rules.regex && !rules.regex.test(String(value))) {
      errors[field] = rules.message || `${field} format is invalid`;
      return;
    }

    if (rules.min !== undefined && Number(value) < rules.min) {
      errors[field] = rules.message || `${field} must be at least ${rules.min}`;
      return;
    }

    if (rules.maxLength && String(value).length > rules.maxLength) {
      errors[field] = rules.message || `${field} exceeds max length`;
      return;
    }
  });

  return errors;
};

const itemMasterDynamicValidation = (data) => {
  const errors = {};

  // Unique item_code check - Removed as we now auto-adjust in controller

  // PHYSICAL Items
  if (data.item_type === "PHYSICAL") {
    if (!data.primary_uom_id) {
      errors.primary_uom_id = "Primary UOM is required";
    }

    if (data.is_stock_item === undefined || data.is_stock_item === null || data.is_stock_item === "") {
      errors.is_stock_item = "Stock flag is required";
    }
  }

  // SOFTWARE Items
  if (data.item_type === "SOFTWARE") {
    if (data.is_license_required === undefined || data.is_license_required === null || data.is_license_required === "") {
      errors.is_license_required = "License flag is required";
    }

    if ((data.is_license_required === 'Y' || data.is_license_required === true)) {
        if (!data.license_type) {
            errors.license_type = "License Type is required";
        }
        if (!data.max_users || Number(data.max_users) <= 0) {
            errors.max_users = "Enter valid number of users";
        }
    }
  }

  // Date validation: Effective To > Effective From
  if (data.effective_to && data.effective_from && data.effective_to !== '' && data.effective_from !== '') {
    const from = new Date(data.effective_from);
    const to = new Date(data.effective_to);
    if (to <= from) {
      errors.effective_to = "Effective To must be strictly AFTER Effective From";
    }
  }

  // Serial & Lot exclusivity
  if (data.is_serial_controlled === 'Y' && data.is_lot_controlled === 'Y') {
    errors.is_serial_controlled = "Cannot enable both Serial and Lot";
    errors.is_lot_controlled = "Cannot enable both Serial and Lot";
  }

  return errors;
};

module.exports = {
  itemMasterValidation,
  validateItemMaster,
  itemMasterDynamicValidation
};
