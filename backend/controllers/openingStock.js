const db = require('../data/db');
const { applyScopeFilter } = require('../utils/scopeFilter');
const { generateId } = require('../utils/idGenerator');
const inventoryEngine = require('../services/inventoryEngine');
const { getControlContext, applyStandardCost } = require('../utils/inventoryControls');
const MOCK_USER = 'admin';

const TABLE = 'opening_stock';
const PK = 'opening_stock_id';

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

    // Perform JOINs
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

    // Search
    const { search, page = 1, limit = 50, sortBy, sortOrder = 'asc', ...filters } = req.query;
    if (search) {
      const q = search.toLowerCase();
      data = data.filter(r => Object.values(r).some(v => String(v || '').toLowerCase().includes(q)));
    }
    // Column filters
    Object.entries(filters).forEach(([k, v]) => {
      if (v && !['page', 'limit'].includes(k)) data = data.filter(r => String(r[k] || '').toLowerCase().includes(String(v).toLowerCase()));
    });
    // Sort
    if (sortBy) data.sort((a, b) => {
      const av = String(a[sortBy] || ''), bv = String(b[sortBy] || '');
      return sortOrder === 'desc' ? bv.localeCompare(av) : av.localeCompare(bv);
    });
    const total = data.length;
    const p = parseInt(page), l = parseInt(limit);
    res.json({ success: true, data: data.slice((p - 1) * l, p * l), total, page: p, pages: Math.ceil(total / l) });
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

exports.create = async (req, res) => {
  try {
    const body = { ...req.body };
    if (!body[PK]) body[PK] = generateId(TABLE);

    // Normalize organizational fields to uppercase/consistent names
    body.COMPANY_id = body.COMPANY_id || body.company_id;

    // ── ITEM VALIDATION ────────────────────────────────────────
    if (!body.item_id) return res.status(400).json({ success: false, message: 'Item is required' });
    const item = (db.item_master || []).find(i => i.item_id === body.item_id);
    if (!item) return res.status(400).json({ success: false, message: `Item ${body.item_id} not found` });

    // Check item type — block software items
    const itemType = (db.item_type || []).find(t => t.item_type_id === item.item_type_id);
    const isYes = (v) => v === 'Y' || v === true || v === 'True' || v === 'true';

    if (itemType && !isYes(itemType.is_physical)) {
      return res.status(400).json({ success: false, message: 'Opening stock is only allowed for physical items.' });
    }
    if (!isYes(item.is_stock_item)) {
      return res.status(400).json({ success: false, message: 'Opening stock is only allowed for stock items.' });
    }

    // Location fields required
    if (!body.inv_org_id) return res.status(400).json({ success: false, message: 'Inventory Organization is required' });
    if (!body.subinventory_id) return res.status(400).json({ success: false, message: 'Subinventory is required' });

    // Qty validation
    const qty = parseFloat(body.opening_qty || 0);
    if (qty <= 0) return res.status(400).json({ success: false, message: 'Opening quantity must be greater than 0' });

    const controls = getControlContext(body, body.opening_date || new Date());
    applyStandardCost(body, controls);

    // Unit Cost validation
    const cost = parseFloat(body.unit_cost || 0);
    if (cost < 0) return res.status(400).json({ success: false, message: 'Unit cost must be a non-negative number' });

    // Date validation
    if (body.opening_date) {
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      if (new Date(body.opening_date) > today) {
        return res.status(400).json({ success: false, message: 'Opening date cannot be in the future' });
      }
    }

    // Lot validation for lot-controlled items
    if (isYes(item.is_lot_controlled) && !body.lot_number) {
      return res.status(400).json({ success: false, message: 'Lot number is required' });
    }

    // Serial validation for serial-controlled items
    if (isYes(item.is_serial_controlled)) {
      const serials = body.serial_numbers || [];
      if (serials.length > 0 && serials.length !== qty) {
        return res.status(400).json({ success: false, message: `Serial count must match quantity (${qty})` });
      }
    }

    // Check if opening stock already exists for this item/location
    const existing = (db[TABLE] || []).find(r =>
      (r.COMPANY_id || r.company_id) === body.COMPANY_id &&
      r.item_id === body.item_id &&
      r.inv_org_id === body.inv_org_id &&
      (r.subinventory_id || '') === (body.subinventory_id || '') &&
      (r.locator_id || '') === (body.locator_id || '')
    );
    if (existing) return res.status(400).json({ success: false, message: 'Opening stock already exists for this item/location' });

    // Auto-calculate total value
    body.total_value = (qty * parseFloat(body.unit_cost || 0)).toFixed(2);
    body.opening_date = body.opening_date || new Date().toISOString().split('T')[0];
    body.uom_id = body.uom_id || item.primary_uom_id;
    body.active_flag = 'Y';
    body.approved_by = body.approved_by || req.user?.username || MOCK_USER;
    body.created_by = body.created_by || req.user?.username || MOCK_USER;
    body.created_at = new Date().toISOString();
    body.updated_at = new Date().toISOString();
    body.txn_type_id = body.txn_type_id || 'TT06';

    if (!db[TABLE]) db[TABLE] = [];
    db[TABLE].push(body);

    // ── PROCESS VIA INVENTORY ENGINE ────────────────────────────
    const engineResult = await inventoryEngine.processOpeningStock(body, req.user);

    res.status(201).json({ success: true, data: body, engine: engineResult, message: 'Opening stock processed successfully' });
  } catch (e) { res.status(400).json({ success: false, message: e.message }); }
};

exports.update = (req, res) => {
  try {
    const idx = (db[TABLE] || []).findIndex(r => r[PK] === req.params.id);
    if (idx === -1) return res.status(404).json({ success: false, message: 'Not found' });
    const updated = {
      ...db[TABLE][idx],
      ...req.body,
      [PK]: req.params.id,
      COMPANY_id: req.body.COMPANY_id || req.body.company_id || db[TABLE][idx].COMPANY_id,
      updated_by: req.user?.username || MOCK_USER,
      updated_at: new Date().toISOString()
    };
    db[TABLE][idx] = updated;
    res.json({ success: true, data: updated, message: 'Updated' });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

exports.remove = (req, res) => {
  try {
    const idx = (db[TABLE] || []).findIndex(r => r[PK] === req.params.id);
    if (idx === -1) return res.status(404).json({ success: false, message: 'Not found' });
    const [del] = db[TABLE].splice(idx, 1);
    res.json({ success: true, data: del, message: 'Deleted' });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};
