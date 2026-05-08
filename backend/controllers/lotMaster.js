const db = require('../data/db');
const { applyScopeFilter } = require('../utils/scopeFilter');
const { generateId } = require('../utils/idGenerator');
const MOCK_USER = 'admin';

const TABLE = 'lot_master';
const PK    = 'lot_id';

// RLS filter — filter by company_id if user has company context
function applyRLS(data, user) {
  return applyScopeFilter(data, user);
}

exports.getAll = (req, res) => {
  try {
    // Perform JOINs with item_stock_onhand to get location-wise balances
    const itemStock = db.item_stock_onhand || [];
    const lotMaster = db.lot_master || [];
    
    // We want to show every location where a lot exists
    const data = itemStock.filter(s => s.lot_id).map(stock => {
      const lot = lotMaster.find(l => String(l.lot_id) === String(stock.lot_id));
      const item = (db.item_master || []).find(i => String(i.item_id) === String(stock.item_id));
      const org = (db.inventory_org || []).find(o => String(o.inv_org_id) === String(stock.inv_org_id));
      const subinv = (db.subinventory || []).find(s => String(s.subinventory_id) === String(stock.subinventory_id));
      const loc = (db.locator___bin || []).find(l => String(l.locator_id) === String(stock.locator_id));
      const company = (db.company || []).find(c => String(c.company_id) === String(stock.COMPANY_id));
      const bg = (db.business_group || []).find(b => String(b.bg_id) === String(stock.bg_id));
      const bt = (db.business_type || []).find(b => String(b.business_type_id) === String(stock.business_type_id));
      
      const onhand = parseFloat(stock.onhand_qty) || 0;
      const reserved = parseFloat(stock.reserved_qty) || 0;
      const damaged = parseFloat(stock.damaged_qty) || 0;
      const hold = parseFloat(stock.hold_qty) || 0;
      const available = Math.max(0, onhand - reserved - damaged - hold);

      return {
        ...lot,
        ...stock, // stock_id, lot_id, onhand_qty, etc.
        lot_id: stock.lot_id,
        lot_number: lot ? lot.lot_number : (stock.lot_number || ''),
        manufacture_date: lot ? lot.manufacture_date : '',
        expiry_date: lot ? lot.expiry_date : '',
        item_name: item ? item.item_name : '',
        item_code: item ? item.item_code : '',
        inv_org_name: org ? org.inv_org_name : '',
        subinventory_name: subinv ? subinv.subinventory_name : '',
        locator_name: loc ? loc.locator_name : '',
        company_name: company ? company.company_name : '',
        bg_name: bg ? bg['Business Group Name'] : '',
        business_type_name: bt ? bt.name : '',
        current_qty: onhand,
        available_qty: available,
        damaged_qty: damaged,
        reserved_qty: reserved,
        hold_qty: hold,
        status: lot ? lot.status : 'ACTIVE'
      };
    });

    // Search
    const { search, page = 1, limit = 50, sortBy, sortOrder = 'asc', ...filters } = req.query;
    let filteredData = data;
    if (search) {
      const q = search.toLowerCase();
      filteredData = data.filter(r => Object.values(r).some(v => String(v||'').toLowerCase().includes(q)));
    }
    // Column filters
    Object.entries(filters).forEach(([k,v]) => {
      if (v && !['page','limit'].includes(k)) filteredData = filteredData.filter(r => String(r[k]||'').toLowerCase().includes(String(v).toLowerCase()));
    });
    // Sort
    if (sortBy) filteredData.sort((a,b) => {
      const av = String(a[sortBy]||''), bv = String(b[sortBy]||'');
      return sortOrder==='desc' ? bv.localeCompare(av) : av.localeCompare(bv);
    });
    const total = filteredData.length;
    const p = parseInt(page), l = parseInt(limit);
    res.json({ success:true, data:filteredData.slice((p-1)*l,p*l), total, page:p, pages:Math.ceil(total/l) });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
};

exports.getById = (req, res) => {
  const row = (db[TABLE]||[]).find(r => r[PK] === req.params.id);
  if (!row) return res.status(404).json({ success:false, message:'Not found' });
  
  const item = (db.item_master || []).find(i => i.item_id === row.item_id);
  const company = (db.company || []).find(c => c.company_id === row.COMPANY_id || c.company_id === row.company_id);
  const bg = (db.business_group || []).find(b => b.bg_id === row.bg_id);
  const bt = (db.business_type || []).find(b => b.business_type_id === row.business_type_id);

  const data = {
    ...row,
    item_name: item ? item.item_name : (row.item_name || ''),
    item_code: item ? item.item_code : (row.item_code || ''),
    company_name: company ? company.company_name : (row.company_name || ''),
    bg_name: bg ? bg['Business Group Name'] : (row.bg_name || ''),
    business_group_name: bg ? bg['Business Group Name'] : (row.business_group_name || ''),
    business_type_name: bt ? bt.name : (row.business_type_name || '')
  };
  res.json({ success:true, data });
};

exports.create = (req, res) => {
  res.status(403).json({ success:false, message:'Direct creation of Lot Master records is disabled. Use Opening Stock or Stock Adjustment.' });
};

exports.update = (req, res) => {
  res.status(403).json({ success:false, message:'Direct modification of Lot Master records is disabled.' });
};

exports.remove = (req, res) => {
  res.status(403).json({ success:false, message:'Deletion of Lot Master records is disabled.' });
};

const { generateAutoLotNumber } = require('../utils/lotSerialAuto');
exports.generate = (req, res) => {
  try {
    const { item_id } = req.body;
    if (!item_id) return res.status(400).json({ success:false, message: 'item_id is required' });
    
    const item = (db.item_master || []).find(i => String(i.item_id) === String(item_id));
    if (!item) return res.status(404).json({ success:false, message: 'Item not found' });

    const lotNumber = generateAutoLotNumber(item);
    res.json({ success:true, data: lotNumber });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
};
