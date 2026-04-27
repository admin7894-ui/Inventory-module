const db = require('../data/db');
const { generateId } = require('../utils/idGenerator');
const MOCK_USER = 'admin';

const TABLE = 'lot_master';
const PK    = 'lot_id';

// RLS filter — filter by company_id if user has company context
function applyRLS(data, user) {
  if (!user || !user.company_id) return data;
  return data.filter(r => !r.COMPANY_id || r.COMPANY_id === user.company_id || !r.company_id || r.company_id === user.company_id);
}

exports.getAll = (req, res) => {
  try {
    let rawData = [...(db[TABLE] || [])];
    rawData = applyRLS(rawData, req.user);

    // Perform JOINs
    const data = rawData.map(row => {
      const item = (db.item_master || []).find(i => i.item_id === row.item_id);
      const company = (db.company || []).find(c => c.company_id === row.COMPANY_id || c.company_id === row.company_id);
      const bg = (db.business_group || []).find(b => b.bg_id === row.bg_id);
      const bt = (db.business_type || []).find(b => b.business_type_id === row.business_type_id);
      
      return {
        ...row,
        item_name: item ? item.item_name : (row.item_name || ''),
        item_code: item ? item.item_code : (row.item_code || ''),
        company_name: company ? company.company_name : (row.company_name || ''),
        bg_name: bg ? bg['Business Group Name'] : (row.bg_name || ''),
        business_group_name: bg ? bg['Business Group Name'] : (row.business_group_name || ''),
        business_type_name: bt ? bt.name : (row.business_type_name || '')
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
