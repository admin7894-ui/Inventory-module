const db = require('../data/db');
const { generateId } = require('../utils/idGenerator');
const inventoryEngine = require('../services/inventoryEngine');
const MOCK_USER = 'admin';

const TABLE = 'stock_adjustment';
const PK    = 'adjustment_id';

function applyRLS(data, user) {
  if (!user || !user.company_id) return data;
  if (user.username === 'software_user' || user.username === 'admin') return data;
  return data.filter(r => !r.COMPANY_id || r.COMPANY_id === user.company_id || !r.company_id || r.company_id === user.company_id);
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
    const { search, page = 1, limit = 50 } = req.query;
    if (search) { const q = search.toLowerCase(); data = data.filter(r => Object.values(r).some(v => String(v||'').toLowerCase().includes(q))); }
    const total = data.length, p = parseInt(page), l = parseInt(limit);
    res.json({ success:true, data:data.slice((p-1)*l,p*l), total, page:p, pages:Math.ceil(total/l) });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
};

exports.getById = (req, res) => {
  const row = (db[TABLE]||[]).find(r => r[PK] === req.params.id);
  if (!row) return res.status(404).json({ success:false, message:'Not found' });
  
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
  res.json({ success:true, data });
};

async function autoCreateTransaction(adj, user) {
  try {
    await inventoryEngine.processStockAdjustment(adj, user);
  } catch (e) {
    console.error('Inventory Engine Error:', e);
  }
}

exports.create = async (req, res) => {
  try {
    const body = { ...req.body };
    if (!body[PK]) body[PK] = generateId(TABLE);
    body.COMPANY_id = body.COMPANY_id || body.company_id;
    
    const isTransfer = body.txn_action === 'TRANSFER' || body.transfer_flag === 'Y' || body.txn_type_id === 'TT03';
    const item = (db.item_master || []).find(i => i.item_id === body.item_id);
    const isSerialControlled = item && (item.is_serial_controlled === 'Y' || item.is_serial_controlled === true);
    
    if (isTransfer) {
      if (!body.to_inv_org_id || !body.to_subinventory_id) {
        return res.status(400).json({ success: false, message: 'Destination Org and Subinventory are required for transfers' });
      }
      
      // Check Ship Network
      const network = (db.ship_network || []).find(n => 
        (n.from_inv_org_id === body.inv_org_id || n['Dropdown from_inv_org_id'] === body.inv_org_id) && 
        n.to_inv_org_id === body.to_inv_org_id &&
        (n.active_flag === 'Y' || n.active_flag === 'True' || n.active_flag === true)
      );
      if (!network) {
        return res.status(400).json({ success: false, message: `Ship Network does not exist between ${body.inv_org_id} and ${body.to_inv_org_id}` });
      }

      // Stock Validation
      const stocks = (db.item_stock_onhand || []).filter(s => 
        s.item_id === body.item_id && 
        s.inv_org_id === body.inv_org_id && 
        s.subinventory_id === body.subinventory_id && 
        (s.locator_id || '') === (body.locator_id || '')
      );

      let availableQty = 0;
      if (isSerialControlled) {
        const selectedSerials = Array.isArray(body.serial_ids) ? body.serial_ids : [body.serial_id].filter(Boolean);
        body.serial_ids = selectedSerials;
        body.adjustment_qty = selectedSerials.length;
        
        const validSerials = stocks.filter(s => selectedSerials.includes(s.serial_id) && parseFloat(s.available_qty) > 0);
        if (validSerials.length !== selectedSerials.length) {
          return res.status(400).json({ success: false, message: 'One or more selected serials are not available in this location' });
        }
        availableQty = validSerials.length;
      } else {
        const lotStock = stocks.find(s => (s.lot_id || '') === (body.lot_id || ''));
        availableQty = lotStock ? parseFloat(lotStock.available_qty || 0) : 0;
        body.adjustment_qty = Math.abs(parseFloat(body.adjustment_qty || body.physical_qty || 0));
      }
      
      const requestedQty = body.adjustment_qty;
      if (availableQty < requestedQty) {
        return res.status(400).json({ success: false, message: `Insufficient stock (Requested: ${requestedQty}, Available: ${availableQty})` });
      }

      body.transfer_flag = 'Y';
      body.approval_status = 'APPROVED';
      body.approved_by = body.approved_by || req.user?.username || MOCK_USER;
    } else {
      const adjQty = parseFloat(body.physical_qty || 0) - parseFloat(body.system_qty || 0);
      body.adjustment_qty = adjQty;
      body.approval_status = body.approval_status || 'PENDING';
      if (body.approval_status === 'APPROVED') body.approved_by = body.approved_by || req.user?.username || MOCK_USER;
    }

    body.adjustment_value = (body.adjustment_qty * parseFloat(body.unit_cost || 0)).toFixed(4);
    body.adjustment_date = body.adjustment_date || new Date().toISOString().split('T')[0];
    body.active_flag = 'Y';
    body.created_by = req.user?.username || MOCK_USER;
    body.updated_by = req.user?.username || MOCK_USER;
    body.created_at = new Date().toISOString();
    body.updated_at = new Date().toISOString();
    
    if (!db[TABLE]) db[TABLE] = [];
    db[TABLE].push(body);
    
    if (body.approval_status === 'APPROVED') await autoCreateTransaction(body, req.user);
    res.status(201).json({ success: true, data: body, message: 'Stock adjustment saved' });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
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
    const idx = (db[TABLE]||[]).findIndex(r => r[PK] === req.params.id);
    if (idx===-1) return res.status(404).json({ success:false, message:'Not found' });
    const [del] = db[TABLE].splice(idx,1);
    res.json({ success:true, data:del });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
};
