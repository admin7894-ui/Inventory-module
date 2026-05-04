const db = require('../data/db');
const { applyScopeFilter, getScope } = require('../utils/scopeFilter');
const { generateId } = require('../utils/idGenerator');
const { isYes } = require('../utils/inventoryControls');
const MOCK_USER = 'admin';

const TABLE = 'inventory_org';
const PK    = 'inv_org_id';

// RLS filter — filter by company_id if user has company context
function applyRLS(data, user) {
  return applyScopeFilter(data, user);
}

exports.getAll = (req, res) => {
  try {
    let data = [...(db[TABLE] || [])];
    data = applyRLS(data, req.user);

    // Search
    const {
      search,
      page = 1,
      limit = 50,
      sortBy,
      sortOrder = 'asc',
      org_parameter_only,
      configured_only,
      require_org_parameter,
      ...filters
    } = req.query;

    const needsOrgParamFilter =
      String(org_parameter_only || '').toLowerCase() === 'true' ||
      String(configured_only || '').toLowerCase() === 'true' ||
      String(require_org_parameter || '').toLowerCase() === 'true';

    if (needsOrgParamFilter) {
      const scope = getScope(req.user || {});
      const companyFilter = filters.COMPANY_id || filters.company_id || scope.company_id;
      const businessTypeFilter = filters.business_type_id || scope.business_type_id;
      const bgFilter = filters.bg_id || scope.bg_id;

      const allowedInvOrgIds = new Set(
        (db.org_parameter || [])
          .filter(op => isYes(op.active_flag))
          .filter(op => {
            // Keep module check on org_parameter itself.
            if (filters.module_id && String(op.module_id || '') !== String(filters.module_id)) return false;
            // Enforce same company/business type context to prevent cross-company org usage.
            if (companyFilter && String(op.COMPANY_id || op.company_id || '') !== String(companyFilter)) return false;
            if (businessTypeFilter && String(op.business_type_id || '') !== String(businessTypeFilter)) return false;
            // bg_id can be missing in older rows; enforce only when org_parameter carries bg_id.
            if (bgFilter && op.bg_id && String(op.bg_id) !== String(bgFilter)) return false;
            return true;
          })
          .map(op => String(op.inv_org_id))
      );
      data = data.filter(r => allowedInvOrgIds.has(String(r.inv_org_id)));
    }

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
