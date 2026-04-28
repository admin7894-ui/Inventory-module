// ── Common Backend Validator Helpers ──────────────────────────
// Mirror of frontend commonValidation.js — NEVER trust frontend

const isEmpty = (value) => {
  if (value === undefined || value === null) return true;
  if (typeof value === 'string' && value.trim() === '') return true;
  if (Array.isArray(value) && value.length === 0) return true;
  return false;
};

const isPositiveNumber = (value) => {
  if (isEmpty(value)) return false;
  const num = Number(value);
  return !isNaN(num) && num > 0;
};

const isNonNegativeNumber = (value) => {
  if (isEmpty(value)) return false;
  const num = Number(value);
  return !isNaN(num) && num >= 0;
};

const isValidDate = (value) => {
  if (isEmpty(value)) return false;
  const d = new Date(value);
  return d instanceof Date && !isNaN(d.getTime());
};

const compareDates = (from, to) => {
  if (!isValidDate(from) || !isValidDate(to)) return true;
  return new Date(to) >= new Date(from);
};

// Regex patterns — must match frontend exactly
const REGEX = {
  NAME:     /^[A-Za-z0-9 &()\-]{3,100}$/,
  CODE:     /^[A-Z0-9_]{2,20}$/,
  GST:      /^[0-9A-Z]{15}$/,
  CURRENCY: /^[A-Z]{3}$/,
  HSN:      /^[0-9]{4,8}$/,
};

const requireField = (errors, data, field, message) => {
  if (isEmpty(data[field])) {
    errors[field] = message || 'This field is required';
  }
};

const requireDropdown = (errors, data, field, label, parentField, parentLabel) => {
  if (parentField && isEmpty(data[parentField])) {
    errors[field] = `Select ${parentLabel} first`;
  } else if (isEmpty(data[field])) {
    errors[field] = `${label} is required`;
  }
};

const validateCompanyGroup = (errors, data) => {
  requireDropdown(errors, data, 'bg_id', 'Business Group');
  requireDropdown(errors, data, 'COMPANY_id', 'Company', 'bg_id', 'Business Group');
  requireDropdown(errors, data, 'business_type_id', 'Business Type', 'COMPANY_id', 'Company');
};

const validateDateRange = (errors, data, fromField = 'effective_from', toField = 'effective_to') => {
  if (isEmpty(data[fromField])) {
    errors[fromField] = 'Effective From date is required';
  } else if (!isValidDate(data[fromField])) {
    errors[fromField] = 'Invalid date format';
  }
  if (!isEmpty(data[toField])) {
    if (!isValidDate(data[toField])) {
      errors[toField] = 'Invalid date format';
    } else if (data[fromField] && !compareDates(data[fromField], data[toField])) {
      errors[toField] = 'Effective To must be greater than or equal to Effective From';
    }
  }
};

const validateActiveFlag = (errors, data) => {
  if (data.active_flag === undefined || data.active_flag === null) {
    errors.active_flag = 'Active status is required';
  }
};

module.exports = {
  isEmpty, isPositiveNumber, isNonNegativeNumber, isValidDate,
  compareDates, REGEX, requireField, requireDropdown,
  validateCompanyGroup, validateDateRange, validateActiveFlag
};
