const db = require('../data/db');
const { applyScopeFilter } = require('../utils/scopeFilter');
const { generateId } = require('../utils/idGenerator');
const MOCK_USER = 'admin';

const TABLE = 'material_status_master';
const PK    = 'material_status_id';

// RLS filter
function applyRLS(data, user) {
  return applyScopeFilter(data, user);
}

exports.getAll = (req, res) => {
  try {
    let data = [...(db[TABLE] || [])];
    data = applyRLS(data, req.user);

    // Filter by active_flag if requested (GET /material-status/list usually implies active only in these systems)
    if (req.query.active_only === 'true') {
      data = data.filter(r => r.active_flag === 'Y' || r.active_flag === true || r.active_flag === 1);
    }

    // Search
    const { search, page = 1, limit = 50, sortBy, sortOrder = 'asc', ...filters } = req.query;
    if (search) {
      const q = search.toLowerCase();
      data = data.filter(r => Object.values(r).some(v => String(v||'').toLowerCase().includes(q)));
    }
    // Column filters
    Object.entries(filters).forEach(([k,v]) => {
      if (v && !['page','limit', 'active_only'].includes(k)) {
        data = data.filter(r => String(r[k]||'').toLowerCase().includes(String(v).toLowerCase()));
      }
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
    
    // Auto-generate status_code from status_name if not provided
    if (!body.status_code && body.status_name) {
      body.status_code = body.status_name.toUpperCase().replace(/\s+/g, '_');
    }

    if ((db[TABLE]||[]).find(r => r[PK] === body[PK]))
      return res.status(409).json({ success:false, message:`${body[PK]} already exists` });
    
    // Uniqueness checks
    if (body.status_code && (db[TABLE]||[]).find(r => r.status_code === body.status_code))
      return res.status(400).json({ success:false, message:`Status Code "${body.status_code}" already exists` });
    if (body.status_name && (db[TABLE]||[]).find(r => r.status_name === body.status_name))
      return res.status(400).json({ success:false, message:`Status Name "${body.status_name}" already exists` });

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

    // Uniqueness checks
    if (req.body.status_code && (db[TABLE]||[]).find(r => r.status_code === req.body.status_code && r[PK] !== req.params.id))
      return res.status(400).json({ success:false, message:`Status Code "${req.body.status_code}" already exists` });
    if (req.body.status_name && (db[TABLE]||[]).find(r => r.status_name === req.body.status_name && r[PK] !== req.params.id))
      return res.status(400).json({ success:false, message:`Status Name "${req.body.status_name}" already exists` });

    db[TABLE][idx] = { ...db[TABLE][idx], ...req.body, [PK]:req.params.id, updated_by:req.user?.username||MOCK_USER, updated_at:new Date().toISOString() };
    res.json({ success:true, data:db[TABLE][idx], message:'Updated' });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
};

exports.toggleStatus = (req, res) => {
  try {
    const idx = (db[TABLE]||[]).findIndex(r => r[PK] === req.params.id);
    if (idx===-1) return res.status(404).json({ success:false, message:'Not found' });
    
    const currentStatus = db[TABLE][idx].active_flag;
    const newStatus = (currentStatus === 'Y' || currentStatus === true || currentStatus === 1) ? 'N' : 'Y';
    
    db[TABLE][idx].active_flag = newStatus;
    db[TABLE][idx].updated_by = req.user?.username || MOCK_USER;
    db[TABLE][idx].updated_at = new Date().toISOString();
    
    res.json({ success:true, data:db[TABLE][idx], message: `Status changed to ${newStatus === 'Y' ? 'Active' : 'Inactive'}` });
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
