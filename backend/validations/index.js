// Centralized Backend Validation Architecture
const { PATTERNS, LOV } = require('../middleware/validate');

const commonValidators = {
  required: (val) => val !== undefined && val !== null && val !== '',
  isNumber: (val) => !isNaN(Number(val)),
  isPositive: (val) => Number(val) >= 0,
  isEnum: (val, list) => list.includes(val),
  isPatternMatch: (val, pattern) => pattern.test(String(val)),
  isDateRangeValid: (from, to) => {
    if (!from || !to) return true;
    return new Date(from) <= new Date(to);
  }
};

const schemas = {
  transaction_type: {
    txn_type_code: { required: true, pattern: PATTERNS.item_code },
    txn_type_name: { required: true },
    txn_action: { required: true, lov: LOV.txn_action },
    txn_category: { required: true, lov: LOV.txn_category },
    COMPANY_id: { required: true, pattern: PATTERNS.company_id },
    bg_id: { required: true, pattern: PATTERNS.bg_id },
    business_type_id: { required: true, pattern: PATTERNS.business_type_id },
    module_id: { required: true },
    active_flag: { required: true, lov: LOV.active_flag }
  },
  stock_adjustment: {
    item_id: { required: true, pattern: PATTERNS.item_id },
    inv_org_id: { required: true },
    subinventory_id: { required: true },
    adjustment_qty: { required: true, numeric: true },
    unit_cost: { required: true, numeric: true, positive: true },
    adjustment_date: { required: true },
    COMPANY_id: { required: true, pattern: PATTERNS.company_id },
    bg_id: { required: true, pattern: PATTERNS.bg_id },
    business_type_id: { required: true, pattern: PATTERNS.business_type_id }
  },
  // Default schema for any table to ensure common fields
  default: {
    COMPANY_id: { required: true, pattern: PATTERNS.company_id },
    active_flag: { lov: LOV.active_flag },
    effective_from: { pattern: PATTERNS.effective_from }
  }
};

function validateRequest(table, data) {
  const schema = schemas[table] || schemas.default;
  const errors = [];
  
  for (const [field, rules] of Object.entries(schema)) {
    const val = data[field];
    
    if (rules.required && !commonValidators.required(val)) {
      errors.push(`${field} is required`);
      continue;
    }

    if (val === undefined || val === null || val === '') continue;

    if (rules.pattern && !commonValidators.isPatternMatch(val, rules.pattern)) {
      errors.push(`${field} format invalid`);
    }

    if (rules.lov && !commonValidators.isEnum(val, rules.lov)) {
      errors.push(`${field} must be one of: ${rules.lov.join(', ')}`);
    }

    if (rules.numeric && !commonValidators.isNumber(val)) {
      errors.push(`${field} must be a number`);
    }

    if (rules.positive && !commonValidators.isPositive(val)) {
      errors.push(`${field} must be positive`);
    }
  }

  // Cross-field validation
  if (data.effective_from && data.effective_to) {
    if (!commonValidators.isDateRangeValid(data.effective_from, data.effective_to)) {
      errors.push('Effective From cannot be after Effective To');
    }
  }

  return errors;
}

const validateMiddleware = (table) => (req, res, next) => {
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    const errors = validateRequest(table, req.body);
    if (errors.length > 0) {
      return res.status(400).json({ success: false, errors, message: 'Validation failed' });
    }
  }
  next();
};

module.exports = { validateRequest, validateMiddleware, schemas, commonValidators };
