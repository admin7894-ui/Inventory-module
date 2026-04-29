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
const { validateShipMethod } = require('./shipMethodValidator');
const { validateShipNetwork } = require('./shipNetworkValidator');
const { validateIntercompany } = require('./intercompanyValidator');
const { validateUomType } = require('./uomTypeValidator');
const { validateUom } = require('./uomValidator');
const { validateUomConv } = require('./uomConvValidator');
const { validateCategorySet } = require('./categorySetValidator');
const { validateItemCategory } = require('./itemCategoryValidator');
const { validateItemSubCategory } = require('./itemSubCategoryValidator');
const validateBrand = require('./brandValidator');
const validateItemType = require('./itemTypeValidator');
const validateZone = require('./zoneValidator');
const validateSubinventory = require('./subinventoryValidator');
const validateLocator = require('./locatorValidator');
const { validateTransactionType } = require('./transactionTypeValidator');
const { validateTransactionReason } = require('./transactionReasonValidator');
const { validateItemSubinvRestriction } = require('./itemSubinvRestrictionValidator');
const { validateItemOrgAssignment } = require('./itemOrgAssignmentValidator');

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
  validateOrgParameter,
  validateShipMethod,
  validateShipNetwork,
  validateIntercompany,
  validateUomType,
  validateUom,
  validateUomConv,
  validateCategorySet,
  validateItemCategory,
  validateItemSubCategory,
  validateBrand,
  validateItemType,
  validateZone,
  validateSubinventory,
  validateLocator,
  validateTransactionType,
  validateTransactionReason,
  validateItemSubinvRestriction,
  validateItemOrgAssignment
};
