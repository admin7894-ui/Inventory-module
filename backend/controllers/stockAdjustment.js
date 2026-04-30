const db = require('../data/db');
const { applyScopeFilter } = require('../utils/scopeFilter');
const { generateId } = require('../utils/idGenerator');
const inventoryEngine = require('../services/inventoryEngine');
const {
  getControlContext,
  validateIssueControls,
  validateReceiptControls,
  validateLocator,
  applyStandardCost
} = require('../utils/inventoryControls');
const MOCK_USER = 'admin';

const TABLE = 'stock_adjustment';
const PK = 'adjustment_id';

function applyRLS(data, user) {
  return applyScopeFilter(data, user);
}

exports.getAll = (req, res) => {
  try {
    let rawData = (db[TABLE] || []).map(r => ({
      ...r,
      COMPANY_id: r.COMPANY_id || r.company_id || '',
      bg_id: r.bg_id || '',
      business_type_id: r.business_type_id || ''
    }));
    rawData = applyRLS(rawData, req.user);

    const data = rawData.map(row => {
      const item = (db.item_master || []).find(i => i.item_id === row.item_id);
      const company = (db.company || []).find(c => c.company_id === row.COMPANY_id || c.company_id === row.company_id);
      const bg = (db.business_group || []).find(b => b.bg_id === row.bg_id);
      const bt = (db.business_type || []).find(b => b.business_type_id === row.business_type_id);
      const org = (db.inventory_org || []).find(o => o.inv_org_id === row.inv_org_id);
      const subinv = (db.subinventory || []).find(s => s.subinventory_id === row.subinventory_id);
      const locator = (db.locator___bin || []).find(l => l.locator_id === row.locator_id);
      return {
        ...row,
        item_name: item ? item.item_name : '',
        item_code: item ? item.item_code : '',
        company_name: company ? company.company_name : '',
        bg_name: bg ? bg['Business Group Name'] : '',
        business_group_name: bg ? bg['Business Group Name'] : '',
        business_type_name: bt ? bt.name : '',
        inv_org_name: org ? org.inv_org_name : '',
        subinventory_name: subinv ? subinv.subinventory_name : '',
        locator_name: locator ? locator.locator_name : ''
      };
    });
    const { search, page = 1, limit = 50 } = req.query;
    let filtered = data;
    if (search) { const q = search.toLowerCase(); filtered = filtered.filter(r => Object.values(r).some(v => String(v || '').toLowerCase().includes(q))); }
    const total = filtered.length, p = parseInt(page), l = parseInt(limit);
    res.json({ success: true, data: filtered.slice((p - 1) * l, p * l), total, page: p, pages: Math.ceil(total / l) });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

exports.getById = (req, res) => {
  const row = (db[TABLE] || []).find(r => r[PK] === req.params.id);
  if (!row) return res.status(404).json({ success: false, message: 'Not found' });
  const item = (db.item_master || []).find(i => i.item_id === row.item_id);
  const company = (db.company || []).find(c => c.company_id === row.COMPANY_id || c.company_id === row.company_id);
  const bg = (db.business_group || []).find(b => b.bg_id === row.bg_id);
  const bt = (db.business_type || []).find(b => b.business_type_id === row.business_type_id);
  const org = (db.inventory_org || []).find(o => o.inv_org_id === row.inv_org_id);
  const subinv = (db.subinventory || []).find(s => s.subinventory_id === row.subinventory_id);
  const locator = (db.locator___bin || []).find(l => l.locator_id === row.locator_id);
  const data = {
    ...row,
    COMPANY_id: row.COMPANY_id || row.company_id || '',
    item_name: item ? item.item_name : '',
    item_code: item ? item.item_code : '',
    company_name: company ? company.company_name : '',
    bg_name: bg ? bg['Business Group Name'] : '',
    business_group_name: bg ? bg['Business Group Name'] : '',
    business_type_name: bt ? bt.name : '',
    inv_org_name: org ? org.inv_org_name : '',
    subinventory_name: subinv ? subinv.subinventory_name : '',
    locator_name: locator ? locator.locator_name : ''
  };
  res.json({ success: true, data });
};

async function autoCreateTransaction(adj, user) {
  return inventoryEngine.processStockAdjustment(adj, user);
}

exports.create = async (req, res) => {
  try {
    const body = { ...req.body };
    if (!body[PK]) body[PK] = generateId(TABLE);
    body.COMPANY_id = body.COMPANY_id || body.company_id;
    const fieldErrors = {};

    // ── 1. Basic Field Validation ───────────────────────────────
    const requiredFields = ['bg_id', 'COMPANY_id', 'business_type_id', 'item_id', 'txn_type_id', 'inv_org_id', 'subinventory_id', 'uom_id', 'adjustment_date'];
    for (const f of requiredFields) {
      if (!body[f]) return res.status(400).json({ success: false, message: `${f.replace('_id', '').replace('COMPANY', 'Company')} is required` });
    }

    const item = (db.item_master || []).find(i => i.item_id === body.item_id);
    if (!item && body.item_id) fieldErrors.item_id = 'Invalid Item';

    const isYes = (v) => v === 'Y' || v === true || v === 'True' || v === 'true';
    const controls = getControlContext(body, body.adjustment_date || new Date());
    applyStandardCost(body, controls);
    const isLotControlled = controls.lotRequired;
    const isSerialControlled = controls.serialRequired;
    const isTransfer = body.txn_action === 'TRANSFER' || body.transfer_flag === 'Y' || body.txn_type_id === 'TT03';

    // ── 2. Lot/Serial Validation ────────────────────────────────
    if (isLotControlled && !body.lot_id && !body.lot_number) {
      fieldErrors.lot_id = 'Lot is required for this item';
    }
    if (isSerialControlled) {
      const serials = Array.isArray(body.serial_ids) ? body.serial_ids : [body.serial_id].filter(Boolean);
      if (serials.length === 0) fieldErrors.serial_ids = 'Serials are required for this item';
      body.serial_ids = serials;
    }

    // ── 3. Stock Sufficiency Check ──────────────────────────────
    // Get current stock info
    const stocks = (db.item_stock_onhand || []).filter(s =>
      String(s.item_id) === String(body.item_id) &&
      String(s.inv_org_id) === String(body.inv_org_id) &&
      String(s.subinventory_id) === String(body.subinventory_id) &&
      (String(s.locator_id || '')) === (String(body.locator_id || '')) &&
      (isLotControlled ? String(s.lot_id) === String(body.lot_id) : true)
    );

    let onhandQty = 0, availableQty = 0;
    if (isSerialControlled) {
      const validStock = stocks.filter(s => body.serial_ids.includes(s.serial_id));
      onhandQty = validStock.length;
      availableQty = validStock.filter(s => parseFloat(s.available_qty) > 0).length;
    } else {
      const s = stocks[0]; // Lot filtered above
      onhandQty = s ? parseFloat(s.onhand_qty || 0) : 0;
      availableQty = s ? parseFloat(s.available_qty || 0) : 0;
    }

    if (isTransfer) {
      // Transfer Logic
      if (!body.to_inv_org_id) fieldErrors.to_inv_org_id = 'Destination Org is required';
      if (!body.to_subinventory_id) fieldErrors.to_subinventory_id = 'Destination Subinventory is required';
      if (!body.subinventory_id) fieldErrors.subinventory_id = 'Subinventory is required';
      if (controls.locatorRequired && !body.locator_id) fieldErrors.locator_id = 'Locator is required';

      const requested = parseFloat(body.physical_qty || body.adjustment_qty || 0);
      if (requested <= 0) fieldErrors.physical_qty = 'Transfer quantity must be > 0';
      if (requested > availableQty) {
        fieldErrors.physical_qty = 'Insufficient stock';
      }

      // Block same loc
      if (body.inv_org_id === body.to_inv_org_id && body.subinventory_id === body.to_subinventory_id && (body.locator_id || '') === (body.to_locator_id || '') && body.subinventory_id) {
        fieldErrors.to_subinventory_id = 'Source and destination cannot be same';
        fieldErrors.to_locator_id = 'Source and destination cannot be same';
      }

      // Restriction check
      const destRestriction = (db.item_subinventory_restriction || []).find(r =>
        isYes(r.active_flag) && String(r.item_id) === String(body.item_id) &&
        String(r.inv_org_id) === String(body.to_inv_org_id) &&
        String(r.subinventory_id) === String(body.to_subinventory_id) &&
        (!r.locator_id || !body.to_locator_id || String(r.locator_id) === String(body.to_locator_id))
      );
      if (!destRestriction) {
        fieldErrors.to_subinventory_id = 'Destination location is not mapped/active for this item';
      }

      body.adjustment_qty = requested;
      body.transfer_flag = 'Y';
      body.approval_status = 'APPROVED'; // Transfers are usually auto-approved or require different flow, keeping auto for now
      body.approved_by = body.approved_by || req.user?.username || MOCK_USER;

      validateIssueControls(body, controls, requested);
      const destControls = getControlContext({ ...body, inv_org_id: body.to_inv_org_id }, body.adjustment_date || new Date());
      if (destControls.locatorRequired) validateLocator(body.to_subinventory_id, body.to_locator_id);
    } else {
      // Adjustment Logic (IN / OUT / etc)
      const physical = parseFloat(body.physical_qty || 0);
      const system = parseFloat(body.system_qty || 0);
      const netAdj = physical - system;

      if (netAdj < 0) {
        // Reduction: ensure we have enough available
        const reduction = Math.abs(netAdj);
        if (reduction > availableQty) {
          fieldErrors.physical_qty = 'Insufficient stock';
        }
      }

      body.adjustment_qty = netAdj;
      body.approval_status = body.approval_status || 'PENDING';
      if (body.approval_status === 'APPROVED') body.approved_by = body.approved_by || req.user?.username || MOCK_USER;

      if (netAdj < 0) validateIssueControls(body, controls, Math.abs(netAdj));
      if (netAdj > 0) validateReceiptControls(body, controls, netAdj);
    }

    if (Object.keys(fieldErrors).length > 0) {
      return res.status(400).json({ success: false, errors: fieldErrors });
    }

    body.adjustment_value = (body.adjustment_qty * parseFloat(body.unit_cost || 0)).toFixed(4);
    body.active_flag = 'Y';
    body.created_by = req.user?.username || MOCK_USER;
    body.updated_by = req.user?.username || MOCK_USER;
    body.created_at = new Date().toISOString();
    body.updated_at = new Date().toISOString();

    if (!db[TABLE]) db[TABLE] = [];
    db[TABLE].push(body);

    if (body.approval_status === 'APPROVED') await autoCreateTransaction(body, req.user);
    res.status(201).json({ success: true, data: body, message: 'Stock adjustment saved' });
  } catch (e) { res.status(400).json({ success: false, message: e.message }); }
};

exports.update = async (req, res) => {
  try {
    const idx = (db[TABLE] || []).findIndex(r => r[PK] === req.params.id);
    if (idx === -1) return res.status(404).json({ success: false, message: 'Not found' });
    const prev = db[TABLE][idx];
    const body = { ...req.body };
    body.COMPANY_id = body.COMPANY_id || body.company_id;
    const updated = { ...prev, ...body, [PK]: req.params.id, updated_by: req.user?.username || MOCK_USER, updated_at: new Date().toISOString() };
    const isTransfer = updated.txn_action === 'TRANSFER' || updated.transfer_flag === 'Y';
    if (!isTransfer) {
      updated.adjustment_qty = parseFloat(updated.physical_qty || 0) - parseFloat(updated.system_qty || 0);
    }
    updated.adjustment_value = (updated.adjustment_qty * parseFloat(updated.unit_cost || 0)).toFixed(4);
    if (updated.approval_status === 'APPROVED' && !updated.approved_by) {
      updated.approved_by = req.user?.username || MOCK_USER;
    }
    db[TABLE][idx] = updated;
    if (prev.approval_status !== 'APPROVED' && updated.approval_status === 'APPROVED') {
      await autoCreateTransaction(updated, req.user);
    }
    res.json({ success: true, data: updated });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

exports.remove = (req, res) => {
  try {
    const idx = (db[TABLE] || []).findIndex(r => r[PK] === req.params.id);
    if (idx === -1) return res.status(404).json({ success: false, message: 'Not found' });
    const [del] = db[TABLE].splice(idx, 1);
    res.json({ success: true, data: del });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};



