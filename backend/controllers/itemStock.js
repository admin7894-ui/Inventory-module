const db = require('../data/db');
const { applyScopeFilter } = require('../utils/scopeFilter');
const { generateId } = require('../utils/idGenerator');
const MOCK_USER = 'admin';

const TABLE = 'item_stock_onhand';
const PK    = 'stock_id';

function applyRLS(data, user) {
  return applyScopeFilter(data, user);
}

exports.getAll = (req, res) => {
  try {
    let rawData = applyRLS([...(db[TABLE] || [])], req.user);

    // Aggregate serial-level rows into inventory summary rows.
    const grouped = new Map();
    rawData.forEach((stock) => {
      const key = [
        stock.COMPANY_id || stock.company_id || '',
        stock.business_type_id || '',
        stock.bg_id || '',
        stock.item_id || '',
        stock.inv_org_id || '',
        stock.subinventory_id || '',
        stock.locator_id || '',
        stock.lot_id || ''
      ].join('|');

      const current = grouped.get(key);
      const onhand = parseFloat(stock.onhand_qty || 0);
      const available = parseFloat(stock.available_qty || 0);
      const reserved = parseFloat(stock.reserved_qty || 0);
      const inTransit = parseFloat(stock.in_transit_qty || 0);
      const damaged = parseFloat(stock.damaged_qty || 0);
      const hold = parseFloat(stock.hold_qty || 0);
      const totalValue = parseFloat(stock.total_cost_value || 0);

      if (!current) {
        grouped.set(key, {
          ...stock,
          serial_id: '',
          onhand_qty: onhand,
          available_qty: available,
          reserved_qty: reserved,
          in_transit_qty: inTransit,
          damaged_qty: damaged,
          hold_qty: hold,
          total_cost_value: totalValue,
          detail_serial_ids: stock.serial_id ? [stock.serial_id] : []
        });
        return;
      }

      current.onhand_qty += onhand;
      current.available_qty += available;
      current.reserved_qty += reserved;
      current.in_transit_qty += inTransit;
      current.damaged_qty += damaged;
      current.hold_qty += hold;
      current.total_cost_value += totalValue;
      if (stock.serial_id) current.detail_serial_ids.push(stock.serial_id);
    });

    // Hide empty quantity rows in summary view.
    const aggregatedRows = [...grouped.values()].filter(
      (r) => (parseFloat(r.onhand_qty || 0) > 0) || (parseFloat(r.available_qty || 0) > 0)
    );

    // Build item+org total onhand map for clarity in UI/reporting.
    const itemOrgTotals = new Map();
    aggregatedRows.forEach((row) => {
      const key = `${row.item_id || ''}|${row.inv_org_id || ''}`;
      const prev = itemOrgTotals.get(key) || 0;
      itemOrgTotals.set(key, prev + parseFloat(row.onhand_qty || 0));
    });

    // Perform JOINs
    const data = aggregatedRows.map(stock => {
      const item = (db.item_master || []).find(i => i.item_id === stock.item_id);
      const company = (db.company || []).find(c => c.company_id === stock.COMPANY_id || c.company_id === stock.company_id);
      const bg = (db.business_group || []).find(b => b.bg_id === stock.bg_id);
      const uom = (db.uom_unit_of_measure || []).find(u => u.uom_id === stock.uom_id);
      const org = (db.inventory_org || []).find(o => o.inv_org_id === stock.inv_org_id);
      const subinv = (db.subinventory || []).find(s => s.subinventory_id === stock.subinventory_id);
      const locator = (db.locator___bin || []).find(l => l.locator_id === stock.locator_id);
      const bt = (db.business_type || []).find(b => b.business_type_id === stock.business_type_id);
      const detailSerialNumbers = (stock.detail_serial_ids || []).map((sid) =>
        (db.serial_master || []).find((s) => String(s.serial_id) === String(sid))?.serial_number || sid
      );
      return {
        ...stock,
        onhand_qty: parseFloat(stock.onhand_qty || 0),
        available_qty: parseFloat(stock.available_qty || 0),
        reserved_qty: parseFloat(stock.reserved_qty || 0),
        in_transit_qty: parseFloat(stock.in_transit_qty || 0),
        damaged_qty: parseFloat(stock.damaged_qty || 0),
        hold_qty: parseFloat(stock.hold_qty || 0),
        total_cost_value: (parseFloat(stock.total_cost_value || 0)).toFixed(4),
        item_name: item ? item.item_name : (stock.item_name || ''),
        item_code: item ? item.item_code : (stock.item_code || ''),
        company_name: company ? company.company_name : (stock.company_name || ''),
        bg_name: bg ? bg['Business Group Name'] : (stock.bg_name || ''),
        business_group_name: bg ? bg['Business Group Name'] : (stock.business_group_name || ''),
        uom_name: uom ? uom.uom_name : (stock.uom_name || ''),
        inv_org_name: org ? org.inv_org_name : (stock.inv_org_name || ''),
        subinventory_name: subinv ? subinv.subinventory_name : (stock.subinventory_name || ''),
        locator_name: locator ? locator.locator_name : (stock.locator_name || ''),
        business_type_name: bt ? bt.name : (stock.business_type_name || ''),
        serial_count: detailSerialNumbers.length,
        serial_numbers: detailSerialNumbers,
        total_onhand_qty: itemOrgTotals.get(`${stock.item_id || ''}|${stock.inv_org_id || ''}`) || 0
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
      if (v && !['page','limit'].includes(k)) {
        filteredData = filteredData.filter(r => String(r[k]||'').toLowerCase().includes(String(v).toLowerCase()));
      }
    });

    // Sort
    if (sortBy) {
      filteredData.sort((a,b) => {
        const av = String(a[sortBy]||''), bv = String(b[sortBy]||'');
        return sortOrder==='desc' ? bv.localeCompare(av) : av.localeCompare(bv);
      });
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
  const stock = (db[TABLE]||[]).find(r => r[PK] === req.params.id);
  if (!stock) return res.status(404).json({ success:false, message:'Not found' });
  
  const item = (db.item_master || []).find(i => i.item_id === stock.item_id);
  const company = (db.company || []).find(c => c.company_id === stock.COMPANY_id || c.company_id === stock.company_id);
  const bg = (db.business_group || []).find(b => b.bg_id === stock.bg_id);
  const uom = (db.uom_unit_of_measure || []).find(u => u.uom_id === stock.uom_id);
  const org = (db.inventory_org || []).find(o => o.inv_org_id === stock.inv_org_id);
  const subinv = (db.subinventory || []).find(s => s.subinventory_id === stock.subinventory_id);
  const locator = (db.locator___bin || []).find(l => l.locator_id === stock.locator_id);
  const bt = (db.business_type || []).find(b => b.business_type_id === stock.business_type_id);

  const data = {
    ...stock,
    item_name: item ? item.item_name : (stock.item_name || ''),
    item_code: item ? item.item_code : (stock.item_code || ''),
    company_name: company ? company.company_name : (stock.company_name || ''),
    bg_name: bg ? bg['Business Group Name'] : (stock.bg_name || ''),
    business_group_name: bg ? bg['Business Group Name'] : (stock.business_group_name || ''),
    uom_name: uom ? uom.uom_name : (stock.uom_name || ''),
    inv_org_name: org ? org.inv_org_name : (stock.inv_org_name || ''),
    subinventory_name: subinv ? subinv.subinventory_name : (stock.subinventory_name || ''),
    locator_name: locator ? locator.locator_name : (stock.locator_name || ''),
    business_type_name: bt ? bt.name : (stock.business_type_name || ''),
  };
  res.json({ success:true, data });
};

exports.create = (req, res) => {
  try {
    const body = { ...req.body };
    if (!body[PK]) body[PK] = generateId(TABLE);
    if ((db[TABLE]||[]).find(r => r[PK] === body[PK]))
      return res.status(409).json({ success:false, message:`${body[PK]} already exists` });
    
    body.active_flag = body.active_flag || 'Y';
    body.created_by = body.created_by || req.user?.username || MOCK_USER;
    body.created_at = new Date().toISOString();
    body.updated_at = new Date().toISOString();
    
    if (!db[TABLE]) db[TABLE] = [];
    db[TABLE].push(body);
    res.status(201).json({ success:true, data:body, message:'Created' });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
};

exports.update = (req, res) => {
  try {
    const idx = (db[TABLE]||[]).findIndex(r => r[PK] === req.params.id);
    if (idx===-1) return res.status(404).json({ success:false, message:'Not found' });
    db[TABLE][idx] = { 
      ...db[TABLE][idx], 
      ...req.body, 
      [PK]:req.params.id, 
      updated_by:req.user?.username||MOCK_USER, 
      updated_at:new Date().toISOString() 
    };
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
