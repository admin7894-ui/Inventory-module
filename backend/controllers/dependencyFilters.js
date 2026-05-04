const db = require('../data/db');
const { applyScopeFilter, getScope } = require('../utils/scopeFilter');
const { getInvOrgIdsFromOrgParameter } = require('../utils/orgParameterInvOrgFilter');

function jsonList(res, data) {
  return res.json({ success: true, data: data || [], total: (data || []).length, page: 1, pages: 1 });
}

exports.getInvOrgs = (req, res) => {
  try {
    const scope = getScope(req.user || {});
    const source = String(req.query.source || 'org_parameter').toLowerCase();

    const invOrgs = applyScopeFilter([...(db.inventory_org || [])], req.user);

    if (source === 'item_org_assignment' || source === 'item-org-assignment') {
      const assigns = applyScopeFilter([...(db.item_org_assignment || [])], req.user);
      const allowedIds = new Set(assigns.map(a => String(a.inv_org_id)));
      const data = invOrgs.filter(r => allowedIds.has(String(r.inv_org_id)));
      return jsonList(res, data);
    }

    // Default: org_parameter (Inventory module only)
    const allowedIds = getInvOrgIdsFromOrgParameter({
      COMPANY_id: scope.company_id,
      business_type_id: scope.business_type_id,
      bg_id: scope.bg_id,
      module_id: 'MOD01',
    });
    const data = invOrgs.filter(r => allowedIds.has(String(r.inv_org_id)));
    return jsonList(res, data);
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

exports.getItems = (req, res) => {
  try {
    const { inv_org_id, mode = 'assigned' } = req.query;
    const items = applyScopeFilter([...(db.item_master || [])], req.user);
    const assigns = applyScopeFilter([...(db.item_org_assignment || [])], req.user);

    const orgId = inv_org_id ? String(inv_org_id) : '';
    if (!orgId) return jsonList(res, []);

    const assignedItemIds = new Set(
      assigns.filter(a => String(a.inv_org_id) === orgId).map(a => String(a.item_id))
    );

    const m = String(mode || '').toLowerCase();
    if (m === 'unassigned') {
      return jsonList(res, items.filter(i => !assignedItemIds.has(String(i.item_id))));
    }

    // default: assigned
    return jsonList(res, items.filter(i => assignedItemIds.has(String(i.item_id))));
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

exports.getSubinventories = (req, res) => {
  try {
    const { inv_org_id } = req.query;
    const subs = applyScopeFilter([...(db.subinventory || [])], req.user);
    const orgId = inv_org_id ? String(inv_org_id) : '';
    const data = orgId ? subs.filter(s => String(s.inv_org_id) === orgId) : [];
    return jsonList(res, data);
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

exports.getLocators = (req, res) => {
  try {
    const { inv_org_id, subinventory_id } = req.query;
    const invOrgId = inv_org_id ? String(inv_org_id) : '';
    const subId = subinventory_id ? String(subinventory_id) : '';

    if (!invOrgId || !subId) return jsonList(res, []);

    const locs = applyScopeFilter([...(db.locator___bin || [])], req.user);
    const subs = applyScopeFilter([...(db.subinventory || [])], req.user);
    const sub = subs.find(s => String(s.subinventory_id) === subId);
    if (!sub || String(sub.inv_org_id) !== invOrgId) return jsonList(res, []);

    const data = locs.filter(l => String(l.subinventory_id) === subId);
    return jsonList(res, data);
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

