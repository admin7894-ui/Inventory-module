// ── Backend Validator Index + Middleware ───────────────────────

const { validateLegalEntity } = require('./legalEntityValidator');
const { validateOperatingUnit } = require('./operatingUnitValidator');
const { validateItemMaster } = require('./itemMasterValidator');
const { validateInventoryTransaction } = require('./inventoryTransactionValidator');
const { validateItemStock } = require('./itemStockValidator');
const { validateOpeningStock } = require('./openingStockValidator');
const { validateStockAdjustment } = require('./stockAdjustmentValidator');
const { validateCostMethod } = require('./costMethodValidator');
const { validateCostType } = require('./costTypeValidator');
const { validateOrgParameter } = require('./orgParameterValidator');

/**
 * Express validation middleware factory
 * Usage: router.post('/', validate(validateLegalEntity), controller.create);
 */
const validate = (validator) => (req, res, next) => {
  const { errors, isValid } = validator(req.body);
  if (!isValid) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors
    });
  }
  next();
};

module.exports = {
  validate,
  validateLegalEntity,
  validateOperatingUnit,
  validateItemMaster,
  validateInventoryTransaction,
  validateItemStock,
  validateOpeningStock,
  validateStockAdjustment,
  validateCostMethod,
  validateCostType,
  validateOrgParameter
};
