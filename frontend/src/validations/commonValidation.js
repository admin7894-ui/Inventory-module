// ── Common Validation Helpers (Frontend) ──────────────────────
// Reusable across ALL inventory modules

// ── Emptiness Check ───────────────────────────────────────────
export const isEmpty = (value) => {
  if (value === undefined || value === null) return true;
  if (typeof value === 'string' && value.trim() === '') return true;
  if (Array.isArray(value) && value.length === 0) return true;
  return false;
};

// ── Number Validators ─────────────────────────────────────────
export const isPositiveNumber = (value) => {
  if (isEmpty(value)) return false;
  const num = Number(value);
  return !isNaN(num) && num > 0;
};

export const isNonNegativeNumber = (value) => {
  if (isEmpty(value)) return false;
  const num = Number(value);
  return !isNaN(num) && num >= 0;
};

export const isValidNumber = (value) => {
  if (isEmpty(value)) return false;
  return !isNaN(Number(value));
};

// ── Date Validators ───────────────────────────────────────────
export const isValidDate = (value) => {
  if (isEmpty(value)) return false;
  const d = new Date(value);
  return d instanceof Date && !isNaN(d.getTime());
};

export const compareDates = (from, to) => {
  if (!isValidDate(from) || !isValidDate(to)) return true; // skip if either missing
  return new Date(to) >= new Date(from);
};

// ── Regex Patterns ────────────────────────────────────────────
export const REGEX = {
  NAME:     /^[A-Za-z0-9 &()\-]{3,100}$/,
  CODE:     /^[A-Z0-9_]{2,20}$/,
  GST:      /^[0-9A-Z]{15}$/,
  CURRENCY: /^[A-Z]{3}$/,
  HSN:      /^[0-9]{4,8}$/,
  EMAIL:    /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
};

// ── Regex Validator ───────────────────────────────────────────
export const matchesRegex = (value, regex) => {
  if (isEmpty(value)) return false;
  return regex.test(String(value));
};

// ── Required Field Check ──────────────────────────────────────
export const requireField = (errors, formData, field, message) => {
  if (isEmpty(formData[field])) {
    errors[field] = message || 'This field is required';
  }
};

// ── Dropdown Dependency Check ─────────────────────────────────
export const requireDropdown = (errors, formData, field, label, parentField, parentLabel) => {
  if (parentField && isEmpty(formData[parentField])) {
    errors[field] = `Select ${parentLabel} first`;
  } else if (isEmpty(formData[field])) {
    errors[field] = `${label} is required`;
  }
};

// ── Company Group Validation (BG → Company → BT) ─────────────
export const validateCompanyGroup = (errors, formData) => {
  requireDropdown(errors, formData, 'bg_id', 'Business Group');
  requireDropdown(errors, formData, 'COMPANY_id', 'Company', 'bg_id', 'Business Group');
  requireDropdown(errors, formData, 'business_type_id', 'Business Type', 'COMPANY_id', 'Company');
};

// ── Date Range Validation ─────────────────────────────────────
export const validateDateRange = (errors, formData, fromField = 'effective_from', toField = 'effective_to') => {
  if (isEmpty(formData[fromField])) {
    errors[fromField] = 'Effective From date is required';
  } else if (!isValidDate(formData[fromField])) {
    errors[fromField] = 'Invalid date format';
  }

  if (!isEmpty(formData[toField])) {
    if (!isValidDate(formData[toField])) {
      errors[toField] = 'Invalid date format';
    } else if (formData[fromField] && !compareDates(formData[fromField], formData[toField])) {
      errors[toField] = 'Effective To must be greater than or equal to Effective From';
    }
  }
};

// ── Active Flag Validation ────────────────────────────────────
export const validateActiveFlag = (errors, formData) => {
  if (formData.active_flag === undefined || formData.active_flag === null) {
    errors.active_flag = 'Active status is required';
  }
};

// ── Auto-generate Short Code from Name ────────────────────────
export const generateShortCode = (name, prefix = '') => {
  if (!name) return '';
  const cleaned = name
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, '')
    .replace(/\s+/g, '_')
    .substring(0, 20 - prefix.length);
  return prefix ? `${prefix}_${cleaned}` : cleaned;
};
