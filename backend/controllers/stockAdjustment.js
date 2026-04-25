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

const inventoryEngine = require('../services/inventoryEngine');

async function autoCreateTransaction(adj, user) {
  try {
    await inventoryEngine.processStockAdjustment(adj, user);
  } catch (e) {
    console.error('Inventory Engine Error:', e);
    // In a real DB we would rollback here.
  }
}

exports.create = async (req, res) => {
  try {
    const body = { ...req.body };
    if (!body.adjustment_id) body.adjustment_id = generateId('stock_adjustment');
    
    const isTransfer = body.txn_action === 'TRANSFER' || body.transfer_flag === 'Y' || body.txn_type_id === 'TT03';
    
    if (isTransfer) {
      // Validation: Ship Network must exist
      if (!body.to_inv_org_id || !body.to_subinventory_id) {
        return res.status(400).json({ success: false, message: 'Destination Org and Subinventory are required for transfers' });
      }

      if (body.inv_org_id === body.to_inv_org_id) {
        return res.status(400).json({ success: false, message: 'Source and Destination Organizations must be different for transfers' });
      }

      // Check Ship Network
      const network = (db.ship_network || []).find(n => 
        (n['Dropdown from_inv_org_id'] === body.inv_org_id || n['from_inv_org_id'] === body.inv_org_id) && 
        n.to_inv_org_id === body.to_inv_org_id &&
        (n.active_flag === 'Y' || n.active_flag === 'True')
      );
      if (!network) {
        return res.status(400).json({ success: false, message: `Ship Network does not exist between ${body.inv_org_id} and ${body.to_inv_org_id}` });
      }

      // Check availability in source
      const stock = (db.item_stock_onhand || []).find(s => 
        s.item_id === body.item_id && 
        s.inv_org_id === body.inv_org_id && 
        s.subinventory_id === body.subinventory_id &&
        (s.locator_id || '') === (body.locator_id || '') &&
        (s.lot_id || '') === (body.lot_id || '') &&
        (s.serial_id || '') === (body.serial_id || '')
      );
      
      const requestedQty = Math.abs(parseFloat(body.adjustment_qty || body.physical_qty || 0));
      const availableQty = stock ? parseFloat(stock.available_qty || 0) : 0;
      
      if (!stock || availableQty < requestedQty) {
        return res.status(400).json({ 
          success: false, 
          message: `Insufficient stock. Requested: ${requestedQty}, Available: ${availableQty} at ${body.inv_org_id}/${body.subinventory_id}/${body.locator_id || 'No Locator'}` 
        });
      }

      body.adjustment_qty = requestedQty;
      body.transfer_flag = 'Y';
    } else {
      const adjQty = parseFloat(body.physical_qty || 0) - parseFloat(body.system_qty || 0);
      body.adjustment_qty = adjQty;
    }

    body.adjustment_value = (body.adjustment_qty * parseFloat(body.unit_cost || 0)).toFixed(4);
    body.approval_status = body.approval_status || 'PENDING';
    body.adjustment_date = body.adjustment_date || new Date().toISOString().split('T')[0];
    body.created_by = req.user?.username || MOCK_USER;
    body.updated_by = req.user?.username || MOCK_USER;
    body.created_at = new Date().toISOString();
    body.updated_at = new Date().toISOString();
    
    if (!db.stock_adjustment) db.stock_adjustment = [];
    db.stock_adjustment.push(body);
    
    if (body.approval_status === 'APPROVED') await autoCreateTransaction(body, req.user);
    res.status(201).json({ success: true, data: body, message: 'Stock adjustment saved' });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

exports.update = async (req, res) => {
  try {
    const idx = (db.stock_adjustment || []).findIndex(r => r.adjustment_id === req.params.id);
    if (idx === -1) return res.status(404).json({ success: false, message: 'Not found' });
    const prev = db.stock_adjustment[idx];
    const updated = { ...prev, ...req.body, adjustment_id: req.params.id, updated_by: req.user?.username || MOCK_USER, updated_at: new Date().toISOString() };
    
    const isTransfer = updated.txn_action === 'TRANSFER' || updated.transfer_flag === 'Y' || updated.txn_type_id === 'TT03';
    
    if (isTransfer) {
      const network = (db.ship_network || []).find(n => 
        (n['Dropdown from_inv_org_id'] === updated.inv_org_id || n['from_inv_org_id'] === updated.inv_org_id) && 
        n.to_inv_org_id === updated.to_inv_org_id &&
        (n.active_flag === 'Y' || n.active_flag === 'True')
      );
      if (!network) return res.status(400).json({ success: false, message: 'Ship Network does not exist' });
      
      const stock = (db.item_stock_onhand || []).find(s => 
        s.item_id === updated.item_id && s.inv_org_id === updated.inv_org_id && 
        s.subinventory_id === updated.subinventory_id && (s.locator_id || '') === (updated.locator_id || '')
      );
      const requestedQty = Math.abs(parseFloat(updated.adjustment_qty || updated.physical_qty || 0));
      if (!stock || parseFloat(stock.available_qty || 0) < requestedQty) {
        return res.status(400).json({ success: false, message: 'Insufficient stock' });
      }
      updated.adjustment_qty = requestedQty;
    } else {
      updated.adjustment_qty = parseFloat(updated.physical_qty || 0) - parseFloat(updated.system_qty || 0);
    }

    updated.adjustment_value = (updated.adjustment_qty * parseFloat(updated.unit_cost || 0)).toFixed(4);
    db.stock_adjustment[idx] = updated;
    
    if (prev.approval_status !== 'APPROVED' && updated.approval_status === 'APPROVED') await autoCreateTransaction(updated, req.user);
    res.json({ success: true, data: updated });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

exports.remove = (req, res) => {
  try {
    const idx = (db.stock_adjustment||[]).findIndex(r => r.adjustment_id === req.params.id);
    if (idx===-1) return res.status(404).json({ success:false, message:'Not found' });
    const [del] = db.stock_adjustment.splice(idx,1);
    res.json({ success:true, data:del });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
};
