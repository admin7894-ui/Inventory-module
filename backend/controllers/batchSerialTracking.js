const db = require('../data/db');
const { applyScopeFilter } = require('../utils/scopeFilter');
const { generateId } = require('../utils/idGenerator');
const MOCK_USER = 'admin';

const TABLE = 'batch___serial_tracking';
const PK    = 'tracking_id';

function applyRLS(data, user) {
  return applyScopeFilter(data, user);
}

exports.getAll = (req, res) => {
  try {
    let rawData = applyRLS([...(db[TABLE] || [])], req.user);
    
    // Perform JOINs
    const data = rawData.map(track => {
      const item = (db.item_master || []).find(i => i.item_id === track.item_id);
      const company = (db.company || []).find(c => c.company_id === track.COMPANY_id || c.company_id === track.company_id);
      const bg = (db.business_group || []).find(b => b.bg_id === track.bg_id);
      const uom = (db.uom_unit_of_measure || []).find(u => u.uom_id === track.uom_id);

      return {
        ...track,
        item_name: item ? item.item_name : (track.item_name || ''),
        item_code: item ? item.item_code : (track.item_code || ''),
        company_name: company ? company.company_name : (track.company_name || ''),
        bg_name: bg ? bg['Business Group Name'] : (track.bg_name || ''),
        uom_name: uom ? uom.uom_name : (track.uom_name || '')
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
  const track = (db[TABLE]||[]).find(r => r[PK] === req.params.id);
  if (!track) return res.status(404).json({ success:false, message:'Not found' });
  
  const item = (db.item_master || []).find(i => i.item_id === track.item_id);
  const company = (db.company || []).find(c => c.company_id === track.COMPANY_id || c.company_id === track.company_id);
  const bg = (db.business_group || []).find(b => b.bg_id === track.bg_id);
  const uom = (db.uom_unit_of_measure || []).find(u => u.uom_id === track.uom_id);

  const data = {
    ...track,
    item_name: item ? item.item_name : (track.item_name || ''),
    item_code: item ? item.item_code : (track.item_code || ''),
    company_name: company ? company.company_name : (track.company_name || ''),
    bg_name: bg ? bg['Business Group Name'] : (track.bg_name || ''),
    uom_name: uom ? uom.uom_name : (track.uom_name || '')
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
