const db = require('../data/db');
const { isYes } = require('./inventoryControls');

/**
 * Inventory org IDs that appear on an active org_parameter row for the given scope.
 * Matches filtering used by GET /inventory-org?org_parameter_only=true (company, business type, optional bg, optional module).
 *
 * @param {object} ctx
 * @param {string} [ctx.COMPANY_id]
 * @param {string} [ctx.company_id]
 * @param {string} [ctx.business_type_id]
 * @param {string} [ctx.bg_id]
 * @param {string} [ctx.module_id]
 * @returns {Set<string>}
 */
function getInvOrgIdsFromOrgParameter(ctx = {}) {
  const companyFilter = ctx.COMPANY_id || ctx.company_id || '';
  const businessTypeFilter = ctx.business_type_id || '';
  const bgFilter = ctx.bg_id || '';
  const moduleIdFilter = ctx.module_id;

  const allowed = new Set();
  for (const op of db.org_parameter || []) {
    if (!isYes(op.active_flag)) continue;
    if (moduleIdFilter && String(op.module_id || '') !== String(moduleIdFilter)) continue;
    if (companyFilter && String(op.COMPANY_id || op.company_id || '') !== String(companyFilter)) continue;
    if (businessTypeFilter && String(op.business_type_id || '') !== String(businessTypeFilter)) continue;
    if (bgFilter && op.bg_id && String(op.bg_id) !== String(bgFilter)) continue;
    if (op.inv_org_id) allowed.add(String(op.inv_org_id));
  }
  return allowed;
}

module.exports = { getInvOrgIdsFromOrgParameter };
