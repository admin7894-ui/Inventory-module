const db = require('../data/db');
const { generateId } = require('../utils/idGenerator');
const MOCK_USER = 'admin';

function applyRLS(data, user) {
  if (!user?.company_id) return data;
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
exports.create = (req, res) => {
  try {
    const body = { ...req.body };
    if (!body.txn_id) body.txn_id = generateId('inventory_transaction');
    body.txn_value = (parseFloat(body.txn_qty || 0) * parseFloat(body.unit_cost || 0)).toFixed(4);
    body.txn_date = body.txn_date || new Date().toISOString().split('T')[0];
    body.txn_status = body.txn_status || 'COMPLETED';
    body.created_by = req.user?.username || MOCK_USER;
    body.updated_by = req.user?.username || MOCK_USER;
    body.created_at = new Date().toISOString();
    body.updated_at = new Date().toISOString();

    if (!db.inventory_transaction) db.inventory_transaction = [];
    db.inventory_transaction.push(body);

    const qty = parseFloat(body.txn_qty || 0);
    const cost = parseFloat(body.unit_cost || 0);
    const action = (body.txn_action || '').toUpperCase();

    if (!db.item_stock_onhand) db.item_stock_onhand = [];

    // Unique Constraint Fields: item_id, inv_org_id, subinventory_id, locator_id, lot_id, serial_id
    const stockMatch = (s) => 
      s.item_id === body.item_id && 
      s.inv_org_id === (body.inv_org_id || body.from_inv_org_id) && 
      (s.subinventory_id || '') === (body.subinventory_id || body.from_subinventory_id || '') &&
      (s.locator_id || '') === (body.locator_id || body.from_locator_id || '') &&
      (s.lot_id || '') === (body.lot_id || '') &&
      (s.serial_id || '') === (body.serial_id || '');

    let stock = db.item_stock_onhand.find(stockMatch);

    if (action === 'IN') {
      if (stock) {
        stock.onhand_qty = (parseFloat(stock.onhand_qty) || 0) + qty;
        stock.available_qty = Math.max(0, parseFloat(stock.onhand_qty) - parseFloat(stock.reserved_qty || 0));
        stock.total_cost_value = (parseFloat(stock.onhand_qty) * cost).toFixed(4);
        stock.last_updated_date = new Date().toISOString().split('T')[0];
        stock.updated_at = new Date().toISOString();
      } else {
        db.item_stock_onhand.push({
          stock_id: generateId('item_stock_onhand'),
          item_id: body.item_id,
          inv_org_id: body.inv_org_id || body.from_inv_org_id,
          subinventory_id: body.subinventory_id || body.from_subinventory_id || '',
          locator_id: body.locator_id || body.from_locator_id || '',
          lot_id: body.lot_id || '',
          serial_id: body.serial_id || '',
          uom_id: body.uom_id || '',
          onhand_qty: qty,
          reserved_qty: 0,
          available_qty: qty,
          in_transit_qty: 0,
          unit_cost: cost,
          total_cost_value: (qty * cost).toFixed(4),
          COMPANY_id: body.COMPANY_id,
          business_type_id: body.business_type_id,
          bg_id: body.bg_id,
          last_updated_date: new Date().toISOString().split('T')[0],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      }
    } else if (['OUT', 'ADJUSTMENT'].includes(action)) {
      if (stock) {
        stock.onhand_qty = Math.max(0, (parseFloat(stock.onhand_qty) || 0) - qty);
        stock.available_qty = Math.max(0, parseFloat(stock.onhand_qty) - parseFloat(stock.reserved_qty || 0));
        stock.total_cost_value = (parseFloat(stock.onhand_qty) * cost).toFixed(4);
        stock.last_updated_date = new Date().toISOString().split('T')[0];
        stock.updated_at = new Date().toISOString();
      }
    }

    // Update Stock Ledger
    if (!db.stock_ledger) db.stock_ledger = [];
    const lastL = [...db.stock_ledger].filter(l => l.item_id === body.item_id).pop();
    const prevBal = parseFloat(lastL?.balance_qty || 0);
    const dr = action === 'IN' ? qty : 0;
    const cr = action === 'OUT' ? qty : 0;

    db.stock_ledger.push({
      ledger_id: generateId('stock_ledger'),
      transaction_id: body.txn_id,
      item_id: body.item_id,
      inv_org_id: body.inv_org_id || body.from_inv_org_id || '',
      subinventory_id: body.subinventory_id || body.from_subinventory_id || '',
      locator_id: body.locator_id || body.from_locator_id || '',
      lot_id: body.lot_id || '',
      serial_id: body.serial_id || '',
      uom_id: body.uom_id || '',
      transaction_date: body.txn_date,
      transaction_type: action,
      txn_type_id: body.txn_type_id || '',
      dr_qty: dr,
      cr_qty: cr,
      balance_qty: Math.max(0, prevBal + dr - cr),
      unit_cost: cost,
      transaction_value: (Math.max(dr, cr) * cost).toFixed(4),
      reference_no: body.reference_no || body.txn_id,
      remarks: body.remarks || '',
      COMPANY_id: body.COMPANY_id,
      business_type_id: body.business_type_id,
      bg_id: body.bg_id,
      module_id: body.module_id || '',
      created_by: req.user?.username || MOCK_USER,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    // Update Batch/Serial Tracking
    if (body.lot_id || body.serial_id) {
      if (!db.batch___serial_tracking) db.batch___serial_tracking = [];
      db.batch___serial_tracking.push({
        tracking_id: generateId('batch___serial_tracking'),
        item_id: body.item_id,
        lot_id: body.lot_id || '',
        serial_id: body.serial_id || '',
        txn_id: body.txn_id,
        txn_type_id: body.txn_type_id || '',
        from_inv_org_id: body.from_inv_org_id || '',
        from_subinventory_id: body.from_subinventory_id || '',
        from_locator_id: body.from_locator_id || '',
        to_inv_org_id: body.to_inv_org_id || body.inv_org_id || '',
        to_subinventory_id: body.to_subinventory_id || body.subinventory_id || '',
        to_locator_id: body.to_locator_id || body.locator_id || '',
        tracking_qty: qty,
        tracking_date: body.txn_date,
        tracking_type: body.serial_id ? 'SERIAL' : 'BATCH',
        remarks: body.remarks || '',
        COMPANY_id: body.COMPANY_id,
        business_type_id: body.business_type_id,
        bg_id: body.bg_id,
        created_by: req.user?.username || MOCK_USER,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    }

    res.status(201).json({ success: true, data: body, message: `Transaction ${action} processed` });
  } catch (e) { console.error(e); res.status(500).json({ success: false, message: e.message }); }
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
