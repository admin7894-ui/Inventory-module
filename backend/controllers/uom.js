const db = require('../data/db');
const { applyScopeFilter } = require('../utils/scopeFilter');
const { generateId } = require('../utils/idGenerator');
const MOCK_USER = 'admin';

const TABLE = 'uom_unit_of_measure';
const PK    = 'uom_id';

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
    const body = { ...req.body };
    if (!body[PK]) body[PK] = generateId(TABLE);
    if ((db[TABLE]||[]).find(r => r[PK] === body[PK]))
      return res.status(409).json({ success:false, message:`${body[PK]} already exists` });
    
    // Uniqueness check for uom_code
    if ((db[TABLE]||[]).find(r => r.uom_code === body.uom_code))
      return res.status(400).json({ success:false, message:`UOM Code "${body.uom_code}" already exists` });

    // Base UOM logic: Only one per type. If new is 'Y', unset others.
    if (body.base_uom_flag === 'Y') {
      (db[TABLE] || []).forEach(r => {
        if (r.uom_type_id === body.uom_type_id) r.base_uom_flag = 'N';
      });
    }

    if (body.decimal_precision !== undefined) {
      body.decimal_precision = parseInt(body.decimal_precision) || 0;
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

    // Uniqueness check for uom_code
    if (req.body.uom_code && (db[TABLE]||[]).find(r => r.uom_code === req.body.uom_code && r[PK] !== req.params.id))
      return res.status(400).json({ success:false, message:`UOM Code "${req.body.uom_code}" already exists` });

    // Base UOM logic: Only one per type. If new is 'Y', unset others.
    if (req.body.base_uom_flag === 'Y') {
      const typeId = req.body.uom_type_id || db[TABLE][idx].uom_type_id;
      (db[TABLE] || []).forEach(r => {
        if (r.uom_type_id === typeId && r[PK] !== req.params.id) {
          r.base_uom_flag = 'N';
        }
      });
    }

    const updatedData = { ...req.body };
    if (updatedData.decimal_precision !== undefined) {
      updatedData.decimal_precision = parseInt(updatedData.decimal_precision) || 0;
    }

    db[TABLE][idx] = { ...db[TABLE][idx], ...updatedData, [PK]:req.params.id, updated_by:req.user?.username||MOCK_USER, updated_at:new Date().toISOString() };
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
