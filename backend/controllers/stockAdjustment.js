const db = require('../data/db');
const { generateId } = require('../utils/idGenerator');
const MOCK_USER = 'admin';

exports.getAll = (req, res) => {
  try {
    let data = [...(db.stock_adjustment || [])];
    const { search, page = 1, limit = 50 } = req.query;
    if (search) { const q = search.toLowerCase(); data = data.filter(r => Object.values(r).some(v => String(v||'').toLowerCase().includes(q))); }
    const total = data.length, p = parseInt(page), l = parseInt(limit);
    res.json({ success:true, data:data.slice((p-1)*l,p*l), total, page:p, pages:Math.ceil(total/l) });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
};
exports.getById = (req, res) => {
  const item = (db.stock_adjustment||[]).find(r => r.adjustment_id === req.params.id);
  if (!item) return res.status(404).json({ success:false, message:'Not found' });
  res.json({ success:true, data:item });
};

function autoCreateTransaction(adj, user) {
  const txnCtrl = require('./inventoryTransaction');
  const txnBody = { txn_id:generateId('inventory_transaction'), COMPANY_id:adj.COMPANY_id, business_type_id:adj.business_type_id, bg_id:adj.bg_id, item_id:adj.item_id, txn_action:parseFloat(adj.adjustment_qty||0)>=0?'IN':'OUT', from_inv_org_id:adj.inv_org_id, from_subinventory_id:adj.subinventory_id, from_locator_id:adj.locator_id||'', lot_id:adj.lot_id||'', serial_id:adj.serial_id||'', uom_id:adj.uom_id, txn_qty:Math.abs(parseFloat(adj.adjustment_qty||0)), unit_cost:adj.unit_cost, txn_value:Math.abs(parseFloat(adj.adjustment_value||0)), txn_reason_id:adj.txn_reason_id||'', txn_date:adj.adjustment_date, reference_type:'ADJUSTMENT', reference_id:adj.adjustment_id, txn_status:'COMPLETED', active_flag:'Y', created_by:user?.username||'system', updated_by:user?.username||'system' };
  txnCtrl.create({ body:txnBody, user: user||{username:'system'} }, { status:()=>({json:()=>{}}), json:()=>{} });
}

exports.create = (req, res) => {
  try {
    const body = { ...req.body };
    if (!body.adjustment_id) body.adjustment_id = generateId('stock_adjustment');
    const adjQty = parseFloat(body.physical_qty||0) - parseFloat(body.system_qty||0);
    body.adjustment_qty = adjQty;
    body.adjustment_value = (adjQty * parseFloat(body.unit_cost||0)).toFixed(4);
    body.approval_status = body.approval_status || 'PENDING';
    body.adjustment_date = body.adjustment_date || new Date().toISOString().split('T')[0];
    body.created_by = req.user?.username || MOCK_USER;
    body.updated_by = req.user?.username || MOCK_USER;
    body.created_at = new Date().toISOString();
    body.updated_at = new Date().toISOString();
    if (!db.stock_adjustment) db.stock_adjustment = [];
    db.stock_adjustment.push(body);
    if (body.approval_status === 'APPROVED') autoCreateTransaction(body, req.user);
    res.status(201).json({ success:true, data:body, message:'Stock adjustment saved' });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
};

exports.update = (req, res) => {
  try {
    const idx = (db.stock_adjustment||[]).findIndex(r => r.adjustment_id === req.params.id);
    if (idx===-1) return res.status(404).json({ success:false, message:'Not found' });
    const prev = db.stock_adjustment[idx];
    const updated = { ...prev, ...req.body, adjustment_id:req.params.id, updated_by:req.user?.username||MOCK_USER, updated_at:new Date().toISOString() };
    const adjQty = parseFloat(updated.physical_qty||0) - parseFloat(updated.system_qty||0);
    updated.adjustment_qty = adjQty;
    updated.adjustment_value = (adjQty * parseFloat(updated.unit_cost||0)).toFixed(4);
    db.stock_adjustment[idx] = updated;
    if (prev.approval_status !== 'APPROVED' && updated.approval_status === 'APPROVED') autoCreateTransaction(updated, req.user);
    res.json({ success:true, data:updated });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
};

exports.remove = (req, res) => {
  try {
    const idx = (db.stock_adjustment||[]).findIndex(r => r.adjustment_id === req.params.id);
    if (idx===-1) return res.status(404).json({ success:false, message:'Not found' });
    const [del] = db.stock_adjustment.splice(idx,1);
    res.json({ success:true, data:del });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
};
