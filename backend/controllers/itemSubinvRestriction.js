const db = require('../data/db');
const { applyScopeFilter } = require('../utils/scopeFilter');
const { generateId } = require('../utils/idGenerator');
const { assertConfiguredInvOrg } = require('../utils/inventoryControls');
const MOCK_USER = 'admin';

const TABLE = 'item_subinventory_restriction';
const PK    = 'item_subinv_id';

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

const { validateItemSubinvRestriction } = require('../validators/index');

exports.getById = (req, res) => {
  const item = (db[TABLE]||[]).find(r => r[PK] === req.params.id);
  if (!item) return res.status(404).json({ success:false, message:'Not found' });
  res.json({ success:true, data:item });
};

exports.create = (req, res) => {
  try {
    const { errors, isValid } = validateItemSubinvRestriction(req.body);
    try {
      assertConfiguredInvOrg(req.body);
    } catch (e) {
      errors.inv_org_id = e.message;
    }
    
    // Item must be assigned to selected Org (Item Org Assignment)
    if (req.body.item_id && req.body.inv_org_id) {
      const assigns = (db.item_org_assignment || []).filter(a =>
        String(a.item_id) === String(req.body.item_id) &&
        String(a.inv_org_id) === String(req.body.inv_org_id) &&
        String(a.COMPANY_id || '') === String(req.body.COMPANY_id || '') &&
        String(a.bg_id || '') === String(req.body.bg_id || '') &&
        String(a.business_type_id || '') === String(req.body.business_type_id || '')
      );
      if (!assigns.length) errors.item_id = 'Item is not assigned to selected Organization';
    }

    // Relationship integrity
    if (req.body.subinventory_id && req.body.inv_org_id) {
      const sub = (db.subinventory || []).find(s => s.subinventory_id === req.body.subinventory_id);
      if (sub && sub.inv_org_id !== req.body.inv_org_id) {
        errors.subinventory_id = 'Invalid Subinventory for selected Org';
      }
    }
    if (req.body.locator_id && req.body.subinventory_id) {
      const loc = (db.locator || []).find(l => l.locator_id === req.body.locator_id);
      if (loc && loc.subinventory_id !== req.body.subinventory_id) {
        errors.locator_id = 'Invalid Locator for selected Subinventory';
      }
    }

    // Prevent duplicate mapping: same item + org + subinventory
    if (req.body.item_id && req.body.inv_org_id && req.body.subinventory_id) {
      const exists = (db[TABLE] || []).find(r =>
        String(r.item_id) === String(req.body.item_id) &&
        String(r.inv_org_id) === String(req.body.inv_org_id) &&
        String(r.subinventory_id) === String(req.body.subinventory_id)
      );
      if (exists) errors.subinventory_id = 'Duplicate mapping already exists';
    }

    if (Object.keys(errors).length > 0) return res.status(400).json({ success: false, errors });

    const body = { ...req.body };
    if (!body[PK]) body[PK] = generateId(TABLE);
    if ((db[TABLE]||[]).find(r => r[PK] === body[PK]))
      return res.status(409).json({ success:false, message:`${body[PK]} already exists` });
    
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
    const { errors, isValid } = validateItemSubinvRestriction(req.body);
    const current = (db[TABLE] || []).find(r => r[PK] === req.params.id);
    if (!current) return res.status(404).json({ success:false, message:'Not found' });
    try {
      assertConfiguredInvOrg({ ...current, ...req.body });
    } catch (e) {
      errors.inv_org_id = e.message;
    }
    
    const next = { ...current, ...req.body };

    // Item must be assigned to selected Org (Item Org Assignment)
    if (next.item_id && next.inv_org_id) {
      const assigns = (db.item_org_assignment || []).filter(a =>
        String(a.item_id) === String(next.item_id) &&
        String(a.inv_org_id) === String(next.inv_org_id) &&
        String(a.COMPANY_id || '') === String(next.COMPANY_id || '') &&
        String(a.bg_id || '') === String(next.bg_id || '') &&
        String(a.business_type_id || '') === String(next.business_type_id || '')
      );
      if (!assigns.length) errors.item_id = 'Item is not assigned to selected Organization';
    }

    // Relationship integrity
    if (next.subinventory_id && next.inv_org_id) {
      const sub = (db.subinventory || []).find(s => s.subinventory_id === next.subinventory_id);
      if (sub && String(sub.inv_org_id) !== String(next.inv_org_id)) {
        errors.subinventory_id = 'Invalid Subinventory for selected Org';
      }
    }
    if (next.locator_id && next.subinventory_id) {
      const loc = (db.locator || []).find(l => l.locator_id === next.locator_id);
      if (loc && String(loc.subinventory_id) !== String(next.subinventory_id)) {
        errors.locator_id = 'Invalid Locator for selected Subinventory';
      }
    }

    // Prevent duplicate mapping: same item + org + subinventory (excluding self)
    if (next.item_id && next.inv_org_id && next.subinventory_id) {
      const exists = (db[TABLE] || []).find(r =>
        String(r.item_id) === String(next.item_id) &&
        String(r.inv_org_id) === String(next.inv_org_id) &&
        String(r.subinventory_id) === String(next.subinventory_id) &&
        String(r[PK]) !== String(req.params.id)
      );
      if (exists) errors.subinventory_id = 'Duplicate mapping already exists';
    }

    if (Object.keys(errors).length > 0) return res.status(400).json({ success: false, errors });

    const idx = (db[TABLE]||[]).findIndex(r => r[PK] === req.params.id);
    db[TABLE][idx] = { ...db[TABLE][idx], ...req.body, [PK]:req.params.id, updated_by:req.user?.username||MOCK_USER, updated_at:new Date().toISOString() };
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
