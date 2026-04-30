const db = require('../data/db');
const { applyScopeFilter } = require('../utils/scopeFilter');
const { generateId } = require('../utils/idGenerator');
const MOCK_USER = 'admin';

const TABLE = 'stock_ledger';
const PK    = 'ledger_id';

function applyRLS(data, user) {
  return applyScopeFilter(data, user);
}

exports.getAll = (req, res) => {
  try {
    let rawData = applyRLS([...(db[TABLE] || [])], req.user);
    
    // Perform JOINs
    const data = rawData.map(ledger => {
      const item = (db.item_master || []).find(i => i.item_id === ledger.item_id);
      const uom = (db.uom_unit_of_measure || []).find(u => u.uom_id === ledger.uom_id);
      const org = (db.inventory_org || []).find(o => o.inv_org_id === ledger.inv_org_id);
      const subinv = (db.subinventory || []).find(s => s.subinventory_id === ledger.subinventory_id);
      const locator = (db.locator___bin || []).find(l => l.locator_id === ledger.locator_id);
      const type = (db.transaction_type || []).find(t => t.txn_type_id === ledger.txn_type_id);

      return {
        ...ledger,
        item_name: item ? item.item_name : (ledger.item_name || ''),
        item_code: item ? item.item_code : (ledger.item_code || ''),
        uom_name: uom ? uom.uom_name : (ledger.uom_name || ''),
        inv_org_name: org ? org.inv_org_name : (ledger.inv_org_name || ''),
        subinventory_name: subinv ? subinv.subinventory_name : (ledger.subinventory_name || ''),
        locator_name: locator ? locator.locator_name : (ledger.locator_name || ''),
        txn_type_name: type ? type.txn_type_name : (ledger.txn_type_name || '')
      };
    });

    const { search, page = 1, limit = 50, sortBy, sortOrder = 'asc', ...filters } = req.query;
    let filteredData = data;

    if (search) {
      const q = search.toLowerCase();
      filteredData = data.filter(r => Object.values(r).some(v => String(v||'').toLowerCase().includes(q)));
    }
    
    Object.entries(filters).forEach(([k,v]) => {
      if (v && !['page','limit'].includes(k)) {
        filteredData = filteredData.filter(r => String(r[k]||'').toLowerCase().includes(String(v).toLowerCase()));
      }
    });

    if (sortBy) {
      filteredData.sort((a,b) => {
        const av = String(a[sortBy]||''), bv = String(b[sortBy]||'');
        return sortOrder==='desc' ? bv.localeCompare(av) : av.localeCompare(bv);
      });
    }

    const total = filteredData.length, p = parseInt(page), l = parseInt(limit);
    res.json({ success:true, data:filteredData.slice((p-1)*l,p*l), total, page:p, pages:Math.ceil(total/l) });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
};

exports.getById = (req, res) => {
  const ledger = (db[TABLE]||[]).find(r => r[PK] === req.params.id);
  if (!ledger) return res.status(404).json({ success:false, message:'Not found' });
  
  const item = (db.item_master || []).find(i => i.item_id === ledger.item_id);
  const uom = (db.uom_unit_of_measure || []).find(u => u.uom_id === ledger.uom_id);
  const org = (db.inventory_org || []).find(o => o.inv_org_id === ledger.inv_org_id);
  const subinv = (db.subinventory || []).find(s => s.subinventory_id === ledger.subinventory_id);
  const locator = (db.locator___bin || []).find(l => l.locator_id === ledger.locator_id);
  const type = (db.transaction_type || []).find(t => t.txn_type_id === ledger.txn_type_id);

  const data = {
    ...ledger,
    item_name: item ? item.item_name : (ledger.item_name || ''),
    item_code: item ? item.item_code : (ledger.item_code || ''),
    uom_name: uom ? uom.uom_name : (ledger.uom_name || ''),
    inv_org_name: org ? org.inv_org_name : (ledger.inv_org_name || ''),
    subinventory_name: subinv ? subinv.subinventory_name : (ledger.subinventory_name || ''),
    locator_name: locator ? locator.locator_name : (ledger.locator_name || ''),
    txn_type_name: type ? type.txn_type_name : (ledger.txn_type_name || '')
  };
  res.json({ success:true, data });
};

exports.create = (req, res) => {
  try {
    const body = { ...req.body };
    if (!body[PK]) body[PK] = generateId(TABLE);
    
    body.active_flag = body.active_flag || 'Y';
    body.created_by = body.created_by || req.user?.username || MOCK_USER;
    body.created_at = new Date().toISOString();
    
    if (!db[TABLE]) db[TABLE] = [];
    db[TABLE].push(body);
    res.status(201).json({ success:true, data:body, message:'Created' });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
};

exports.update = (req, res) => {
  try {
    const idx = (db[TABLE]||[]).findIndex(r => r[PK] === req.params.id);
    if (idx===-1) return res.status(404).json({ success:false, message:'Not found' });
    db[TABLE][idx] = { ...db[TABLE][idx], ...req.body, [PK]:req.params.id };
    res.json({ success:true, data:db[TABLE][idx] });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
};

exports.remove = (req, res) => {
  try {
    const idx = (db[TABLE]||[]).findIndex(r => r[PK] === req.params.id);
    if (idx===-1) return res.status(404).json({ success:false, message:'Not found' });
    const [del] = db[TABLE].splice(idx,1);
    res.json({ success:true, data:del });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
};
