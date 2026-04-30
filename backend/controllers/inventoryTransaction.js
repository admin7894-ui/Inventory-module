const db = require('../data/db');
const { applyScopeFilter } = require('../utils/scopeFilter');
const { generateId } = require('../utils/idGenerator');
const inventoryEngine = require('../services/inventoryEngine');
const MOCK_USER = 'admin';

function applyRLS(data, user) {
  return applyScopeFilter(data, user);
}

exports.getAll = (req, res) => {
  try {
    let rawData = applyRLS([...(db.inventory_transaction || [])], req.user);
    
    // Perform JOINs for view screen
    const data = rawData.map(txn => {
      const item = (db.item_master || []).find(i => i.item_id === txn.item_id);
      const company = (db.company || []).find(c => c.company_id === txn.COMPANY_id || c.company_id === txn.company_id);
      const bg = (db.business_group || []).find(b => b.bg_id === txn.bg_id);
      const bt = (db.business_type || []).find(b => b.business_type_id === txn.business_type_id);
      const org = (db.inventory_org || []).find(o => o.inv_org_id === txn.inv_org_id);
      const subinv = (db.subinventory || []).find(s => s.subinventory_id === txn.subinventory_id);
      const locator = (db.locator___bin || []).find(l => l.locator_id === txn.locator_id);
      const reason = (db.transaction_reason || []).find(r => r.txn_reason_id === txn.txn_reason_id);
      const uom = (db.uom_unit_of_measure || []).find(u => u.uom_id === txn.uom_id);
      
      return {
        ...txn,
        item_name: item ? item.item_name : (txn.item_id || ''),
        item_code: item ? item.item_code : '',
        company_name: company ? company.company_name : '',
        bg_name: bg ? bg['Business Group Name'] : '',
        business_group_name: bg ? bg['Business Group Name'] : '',
        business_type_name: bt ? bt.name : '',
        inv_org_name: org ? org.inv_org_name : (txn.inv_org_id || ''),
        subinventory_name: subinv ? subinv.subinventory_name : '',
        locator_name: locator ? locator.locator_name : '',
        txn_reason_name: reason ? reason.txn_reason : '',
        uom_name: uom ? uom.uom_name : '',
        // Ensure lot/serial are displayed from whatever field they are in
        display_lot: txn.lot_number || txn.lot_id || '',
        display_serial: txn.serial_number || txn.serial_id || ''
      };
    });

    const { search, page = 1, limit = 50 } = req.query;
    let filteredData = data;
    if (search) { 
      const q = search.toLowerCase(); 
      filteredData = data.filter(r => Object.values(r).some(v => String(v||'').toLowerCase().includes(q))); 
    }
    
    const total = filteredData.length, p = parseInt(page), l = parseInt(limit);
    res.json({ 
      success: true, 
      data: filteredData.slice((p-1)*l, p*l), 
      total, 
      page: p, 
      pages: Math.ceil(total/l) 
    });
  } catch(e) { 
    res.status(500).json({ success:false, message:e.message }); 
  }
};

exports.getById = (req, res) => {
  const txn = (db.inventory_transaction||[]).find(r => r.txn_id === req.params.id);
  if (!txn) return res.status(404).json({ success:false, message:'Not found' });
  
  const item = (db.item_master || []).find(i => i.item_id === txn.item_id);
  const company = (db.company || []).find(c => c.company_id === txn.COMPANY_id || c.company_id === txn.company_id);
  const bg = (db.business_group || []).find(b => b.bg_id === txn.bg_id);
  const bt = (db.business_type || []).find(b => b.business_type_id === txn.business_type_id);
  const org = (db.inventory_org || []).find(o => o.inv_org_id === txn.inv_org_id);
  const subinv = (db.subinventory || []).find(s => s.subinventory_id === txn.subinventory_id);
  const locator = (db.locator___bin || []).find(l => l.locator_id === txn.locator_id);
  const reason = (db.transaction_reason || []).find(r => r.txn_reason_id === txn.txn_reason_id);
  const uom = (db.uom_unit_of_measure || []).find(u => u.uom_id === txn.uom_id);

  const data = {
    ...txn,
    item_name: item ? item.item_name : (txn.item_id || ''),
    item_code: item ? item.item_code : '',
    company_name: company ? company.company_name : '',
    bg_name: bg ? bg['Business Group Name'] : '',
    business_group_name: bg ? bg['Business Group Name'] : '',
    business_type_name: bt ? bt.name : '',
    inv_org_name: org ? org.inv_org_name : (txn.inv_org_id || ''),
    subinventory_name: subinv ? subinv.subinventory_name : '',
    locator_name: locator ? locator.locator_name : '',
    txn_reason_name: reason ? reason.txn_reason : '',
    uom_name: uom ? uom.uom_name : '',
    display_lot: txn.lot_number || txn.lot_id || '',
    display_serial: txn.serial_number || txn.serial_id || ''
  };
  res.json({ success:true, data });
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
      if (itemType && (itemType.is_physical === 'N' || itemType.is_physical === false || itemType.is_physical === 'False')) {
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
