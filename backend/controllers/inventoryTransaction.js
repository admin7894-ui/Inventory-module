const db = require('../data/db');
const { generateId } = require('../utils/idGenerator');
const inventoryEngine = require('../services/inventoryEngine');
const MOCK_USER = 'admin';

function applyRLS(data, user) {
  if (!user?.company_id) return data;
  if (user.username === 'software_user' || user.username === 'admin') return data;
  return data.filter(r => !r.COMPANY_id || r.COMPANY_id === user.company_id);
}

exports.getAll = (req, res) => {
  try {
    let data = applyRLS([...(db.inventory_transaction || [])], req.user);
    const { search, page = 1, limit = 50 } = req.query;
    if (search) { const q = search.toLowerCase(); data = data.filter(r => Object.values(r).some(v => String(v||'').toLowerCase().includes(q))); }
    const total = data.length, p = parseInt(page), l = parseInt(limit);
    res.json({ success:true, data:data.slice((p-1)*l,p*l), total, page:p, pages:Math.ceil(total/l) });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
};

exports.getById = (req, res) => {
  const item = (db.inventory_transaction||[]).find(r => r.txn_id === req.params.id);
  if (!item) return res.status(404).json({ success:false, message:'Not found' });
  res.json({ success:true, data:item });
};

exports.create = async (req, res) => {
  try {
    const body = { ...req.body };
    
    // Ensure all mandatory fields for engine are present
    const mandatory = ['item_id', 'txn_qty', 'txn_type_id', 'txn_action', 'COMPANY_id'];
    for (const f of mandatory) {
      if (!body[f] && body[f] !== 0) return res.status(400).json({ success: false, message: `Missing field: ${f}` });
    }

    // ── Block non-physical items ────────────────────────────────
    const item = (db.item_master || []).find(i => i.item_id === body.item_id);
    if (item) {
      const itemType = (db.item_type || []).find(t => t.item_type_id === item.item_type_id);
      if (itemType && (itemType.is_physical === 'N' || itemType.is_physical === false)) {
        return res.status(400).json({
          success: false,
          message: 'Inventory transactions are not allowed for non-physical (software) items'
        });
      }
    }

    // Ensure inv_org_id is present (may come as from_inv_org_id)
    if (!body.inv_org_id) body.inv_org_id = body.from_inv_org_id;
    if (!body.subinventory_id) body.subinventory_id = body.from_subinventory_id;
    if (!body.locator_id) body.locator_id = body.from_locator_id;

    if (!body.inv_org_id) {
      return res.status(400).json({ success: false, message: 'Inventory Organization is required' });
    }

    // Process via Inventory Engine
    const result = await inventoryEngine.processTransaction(body, req.user);

    res.status(201).json({ success: true, data: result, message: `Transaction ${body.txn_action} processed successfully` });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: e.message });
  }
};

exports.update = (req, res) => {
  try {
    const idx = (db.inventory_transaction||[]).findIndex(r => r.txn_id === req.params.id);
    if (idx===-1) return res.status(404).json({ success:false, message:'Not found' });
    db.inventory_transaction[idx] = { ...db.inventory_transaction[idx], ...req.body, txn_id:req.params.id, updated_by:req.user?.username||MOCK_USER, updated_at:new Date().toISOString() };
    res.json({ success:true, data:db.inventory_transaction[idx] });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
};

exports.remove = (req, res) => {
  try {
    const idx = (db.inventory_transaction||[]).findIndex(r => r.txn_id === req.params.id);
    if (idx===-1) return res.status(404).json({ success:false, message:'Not found' });
    const [del] = db.inventory_transaction.splice(idx,1);
    res.json({ success:true, data:del });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
};
