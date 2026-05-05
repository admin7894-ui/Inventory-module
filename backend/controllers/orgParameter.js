const db = require('../data/db');
const { applyScopeFilter } = require('../utils/scopeFilter');
const { generateId } = require('../utils/idGenerator');
const MOCK_USER = 'admin';

const TABLE = 'org_parameter';
const PK    = 'org_param_id';

function cleanPayload(payload) {
  const { item_master_org, item_master_org_display, item_master_org_name, ...clean } = payload || {};
  return clean;
}

// RLS filter — filter by company_id if user has company context
function applyRLS(data, user) {
  return applyScopeFilter(data, user);
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

exports.create = (req, res) => {
  try {
    const body = cleanPayload(req.body);
    if (!body[PK]) body[PK] = generateId(TABLE);
    if ((db[TABLE]||[]).find(r => r[PK] === body[PK]))
      return res.status(409).json({ success:false, message:`${body[PK]} already exists` });
      
    // Prevent duplicate org parameter for the same inventory org
    if (body.inv_org_id && (db[TABLE]||[]).find(r => r.inv_org_id === body.inv_org_id)) {
      return res.status(400).json({ success:false, message: `Org Parameter already exists for Inventory Org "${body.inv_org_id}"` });
    }

    body.created_by = body.created_by || req.user?.username || MOCK_USER;
    body.updated_by = body.updated_by || req.user?.username || MOCK_USER;
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

    const currentParam = db[TABLE][idx];
    const incomingPayload = cleanPayload(req.body);
    
    // Prevent duplicate org parameter for the same inventory org on update
    if (incomingPayload.inv_org_id && incomingPayload.inv_org_id !== currentParam.inv_org_id) {
      if ((db[TABLE]||[]).find(r => r.inv_org_id === incomingPayload.inv_org_id && r[PK] !== req.params.id)) {
        return res.status(400).json({ success:false, message: `Org Parameter already exists for Inventory Org "${incomingPayload.inv_org_id}"` });
      }
    }
    
    // Check for locator control enabling
    const incomingLocatorControl = incomingPayload.locator_control === true || incomingPayload.locator_control === 'Y' || incomingPayload.locator_control === 'true';
    const currentLocatorControl = currentParam.locator_control === true || currentParam.locator_control === 'Y' || currentParam.locator_control === 'true';
    
    if (incomingLocatorControl && !currentLocatorControl) {
      // Find non-locator stock for this inventory org
      const nonLocatorStock = (db.item_stock_onhand || []).filter(stock => {
        return stock.inv_org_id === currentParam.inv_org_id &&
               (!stock.locator_id || stock.locator_id === 'null' || String(stock.locator_id).trim() === '') &&
               Number(stock.onhand_qty || 0) > 0;
      });
      
      if (nonLocatorStock.length > 0) {
        if (req.body.migrate_locator_id) {
          // Perform one-time migration
          nonLocatorStock.forEach(stock => {
            stock.locator_id = req.body.migrate_locator_id;
            stock.updated_at = new Date().toISOString();
          });
        } else {
          // Block and return warning + migration option
          return res.status(400).json({
            success: false,
            message: 'Existing non-locator stock found. Cannot enable Locator Control without migrating stock.',
            requiresMigration: true,
            affectedStockCount: nonLocatorStock.length
          });
        }
      }
    }

    db[TABLE][idx] = { ...cleanPayload(db[TABLE][idx]), ...incomingPayload, [PK]:req.params.id, updated_by:req.user?.username||MOCK_USER, updated_at:new Date().toISOString() };
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
