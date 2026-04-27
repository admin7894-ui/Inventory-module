const db = require('../data/db');
const { generateId } = require('../utils/idGenerator');
const inventoryEngine = require('../services/inventoryEngine');
const MOCK_USER = 'admin';

const TABLE = 'opening_stock';
const PK    = 'opening_stock_id';

// RLS filter — filter by company_id if user has company context
function applyRLS(data, user) {
  if (!user || !user.company_id) return data;
  if (user.username === 'software_user' || user.username === 'admin') return data;
  return data.filter(r => !r.COMPANY_id || r.COMPANY_id === user.company_id || !r.company_id || r.company_id === user.company_id);
}

exports.getAll = (req, res) => {
  try {
    let data = [...(db[TABLE] || [])];
    data = applyRLS(data, req.user);

    // Search
    const { search, page = 1, limit = 50, sortBy, sortOrder = 'asc', ...filters } = req.query;
    if (search) {
      const q = search.toLowerCase();
      data = data.filter(r => Object.values(r).some(v => String(v||'').toLowerCase().includes(q)));
    }
    // Column filters
    Object.entries(filters).forEach(([k,v]) => {
      if (v && !['page','limit'].includes(k)) data = data.filter(r => String(r[k]||'').toLowerCase().includes(String(v).toLowerCase()));
    });
    // Sort
    if (sortBy) data.sort((a,b) => {
      const av = String(a[sortBy]||''), bv = String(b[sortBy]||'');
      return sortOrder==='desc' ? bv.localeCompare(av) : av.localeCompare(bv);
    });
    const total = data.length;
    const p = parseInt(page), l = parseInt(limit);
    res.json({ success:true, data:data.slice((p-1)*l,p*l), total, page:p, pages:Math.ceil(total/l) });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
};

exports.getById = (req, res) => {
  const item = (db[TABLE]||[]).find(r => r[PK] === req.params.id);
  if (!item) return res.status(404).json({ success:false, message:'Not found' });
  res.json({ success:true, data:item });
};

exports.create = async (req, res) => {
  try {
    const body = { ...req.body };
    if (!body[PK]) body[PK] = generateId(TABLE);

    // ── ITEM VALIDATION ────────────────────────────────────────
    if (!body.item_id) {
      return res.status(400).json({ success: false, message: 'Item is required' });
    }

    const item = (db.item_master || []).find(i => i.item_id === body.item_id);
    if (!item) {
      return res.status(400).json({ success: false, message: `Item ${body.item_id} not found` });
    }

    // Check item type — block software items
    const itemType = (db.item_type || []).find(t => t.item_type_id === item.item_type_id);
    if (itemType && (itemType.is_physical === 'N' || itemType.is_physical === false)) {
      return res.status(400).json({
        success: false,
        message: 'Opening stock is not allowed for non-physical (software) items. Software items do not track inventory.'
      });
    }

    // Check stock item flag
    if (item.is_stock_item === 'N' || item.is_stock_item === false) {
      return res.status(400).json({
        success: false,
        message: 'Opening stock is only allowed for stock items (is_stock_item must be Y)'
      });
    }

    // Location fields required
    if (!body.inv_org_id) return res.status(400).json({ success: false, message: 'Inventory Organization is required' });
    if (!body.subinventory_id) return res.status(400).json({ success: false, message: 'Subinventory is required' });

    // Qty validation
    const qty = parseFloat(body.opening_qty || 0);
    if (qty <= 0) return res.status(400).json({ success: false, message: 'Opening quantity must be greater than 0' });

    // Lot validation for lot-controlled items
    const isYes = (v) => v === 'Y' || v === true || v === 'True';
    if (isYes(item.is_lot_controlled) && !body.lot_number) {
      return res.status(400).json({ success: false, message: 'Lot number is required for lot-controlled items' });
    }

    // Serial validation for serial-controlled items
    if (isYes(item.is_serial_controlled)) {
      const serials = body.serial_numbers || [];
      if (serials.length > 0 && serials.length !== qty) {
        return res.status(400).json({
          success: false,
          message: `Serial count (${serials.length}) must match quantity (${qty}). Use auto-generate or provide exactly ${qty} serial numbers.`
        });
      }
    }

    // Expiry validation
    if (isYes(item.is_expirable) && isYes(item.is_lot_controlled)) {
      if (!body.expiry_date && !(item.shelf_life_days && parseInt(item.shelf_life_days) > 0)) {
        return res.status(400).json({ success: false, message: 'Expiry date is required for expirable items without shelf life configured' });
      }
    }

    // Check if opening stock already exists for this item/location/company
    const existing = (db[TABLE]||[]).find(r => 
      r.COMPANY_id === body.COMPANY_id &&
      r.item_id === body.item_id &&
      r.inv_org_id === body.inv_org_id &&
      (r.subinventory_id || '') === (body.subinventory_id || '') &&
      (r.locator_id || '') === (body.locator_id || '')
    );
    if (existing) {
      return res.status(400).json({ success:false, message:'Opening stock already exists for this item and location' });
    }

    if ((db[TABLE]||[]).find(r => r[PK] === body[PK]))
      return res.status(409).json({ success:false, message:`${body[PK]} already exists` });
    
    // Auto-calculate total value
    body.total_value = (qty * parseFloat(body.unit_cost || 0)).toFixed(2);
    body.opening_date = body.opening_date || new Date().toISOString().split('T')[0];
    body.created_by = body.created_by || req.user?.username || MOCK_USER;
    body.updated_by = body.updated_by || req.user?.username || MOCK_USER;
    body.created_at = new Date().toISOString();
    body.updated_at = new Date().toISOString();
    body.txn_type_id = body.txn_type_id || 'TT06';
    
    if (!db[TABLE]) db[TABLE] = [];
    db[TABLE].push(body);

    // ── PROCESS VIA INVENTORY ENGINE ────────────────────────────
    // This auto-creates: lot_master, serial_master, inventory_transaction, item_stock_onhand
    const engineResult = await inventoryEngine.processOpeningStock(body, req.user);

    res.status(201).json({
      success: true,
      data: body,
      engine: {
        transactions_created: engineResult.transactions?.length || 0,
        lot_created: engineResult.lot_id || null,
        serials_created: engineResult.serial_ids?.length || 0
      },
      message: 'Opening stock processed — lot, serial, transactions and on-hand updated automatically'
    });
  } catch(e) {
    console.error('Opening Stock Error:', e);
    res.status(500).json({ success:false, message:e.message });
  }
};

exports.update = (req, res) => {
  try {
    const idx = (db[TABLE]||[]).findIndex(r => r[PK] === req.params.id);
    if (idx===-1) return res.status(404).json({ success:false, message:'Not found' });
    db[TABLE][idx] = { ...db[TABLE][idx], ...req.body, [PK]:req.params.id, updated_by:req.user?.username||MOCK_USER, updated_at:new Date().toISOString() };
    res.json({ success:true, data:db[TABLE][idx], message:'Updated' });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
};

exports.remove = (req, res) => {
  try {
    const idx = (db[TABLE]||[]).findIndex(r => r[PK] === req.params.id);
    if (idx===-1) return res.status(404).json({ success:false, message:'Not found' });
    const [del] = db[TABLE].splice(idx,1);
    res.json({ success:true, data:del, message:'Deleted' });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
};
