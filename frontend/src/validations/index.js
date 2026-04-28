// ── Frontend Validation Index ─────────────────────────────────
// Central export for all validation modules

// Common helpers
export {
  isEmpty, isPositiveNumber, isNonNegativeNumber, isValidNumber,
  isValidDate, compareDates, REGEX, matchesRegex,
  requireField, requireDropdown, validateCompanyGroup,
  validateDateRange, validateActiveFlag, generateShortCode
} from './commonValidation';

// Module validators
export { validateLegalEntity } from './legalEntityValidation';
export { validateOperatingUnit, generateOUShortCode } from './operatingUnitValidation';
export { validateItemMaster } from './itemMasterValidation';
export { validateInventoryTransaction } from './inventoryTransactionValidation';
export { validateItemStock } from './itemStockValidation';
export { validateOpeningStock } from './openingStockValidation';
export { validateStockAdjustment } from './stockAdjustmentValidation';

// ── Legacy Schema-Based Validation (used by TransactionTypePage, etc.) ──
export const validators = {
  required: (value) => (!value && value !== 0 ? 'This field is required' : null),
  minLength: (min) => (value) => (value && value.length < min ? `Minimum ${min} characters` : null),
  maxLength: (max) => (value) => (value && value.length > max ? `Maximum ${max} characters` : null),
  pattern: (regex, msg) => (value) => (value && !regex.test(value) ? (msg || 'Invalid format') : null),
};

export const validateForm = (formData, schema) => {
  const errors = {};
  for (const [field, rules] of Object.entries(schema)) {
    for (const rule of rules) {
      const error = rule(formData[field]);
      if (error) {
        errors[field] = error;
        break;
      }
    }
  }
  return errors;
};
