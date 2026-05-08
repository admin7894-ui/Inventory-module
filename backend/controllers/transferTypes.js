const db = require('../data/db');
const { applyScopeFilter } = require('../utils/scopeFilter');
const { generateId } = require('../utils/idGenerator');

const TABLE = 'transfer_types';
const PK = 'id';
const MOCK_USER = 'admin';

function applyRLS(data, user) {
  return applyScopeFilter(data, user);
}

function normalizeTransferTypeCode(name = '') {
  const cleaned = String(name).toUpperCase().replace(/[^A-Z0-9]/g, '');
  return cleaned ? `TT-${cleaned}` : '';
}

function normalizeRecord(body = {}) {
  const record = { ...body };
  record.business_group_id = record.business_group_id || record.bg_id || '';
  record.company_id = record.company_id || record.COMPANY_id || '';
  record.business_type_id = record.business_type_id || '';

  record.bg_id = record.business_group_id;
  record.COMPANY_id = record.company_id;

  if (record.transfer_type_name) {
    record.transfer_type_code = normalizeTransferTypeCode(record.transfer_type_name);
  }

  const normalizedActive = record.is_active ?? record.active_flag ?? 'Y';
  record.is_active = normalizedActive;
  record.active_flag = normalizedActive;

  return record;
}

function hasDuplicateName(name, skipId = null) {
  const n = String(name || '').trim().toUpperCase();
  return (db[TABLE] || []).some((r) =>
    String(r.transfer_type_name || '').trim().toUpperCase() === n &&
    String(r[PK]) !== String(skipId || '')
  );
}

function hasDuplicateCode(code, skipId = null) {
  const c = String(code || '').trim().toUpperCase();
  return (db[TABLE] || []).some((r) =>
    String(r.transfer_type_code || '').trim().toUpperCase() === c &&
    String(r[PK]) !== String(skipId || '')
  );
}

exports.getAll = (req, res) => {
  try {
    let data = [...(db[TABLE] || [])];
    data = applyRLS(data, req.user);

    const { search, page = 1, limit = 50, sortBy, sortOrder = 'asc', ...filters } = req.query;
    if (search) {
      const q = String(search).toLowerCase();
      data = data.filter((r) => Object.values(r).some((v) => String(v || '').toLowerCase().includes(q)));
    }
    Object.entries(filters).forEach(([k, v]) => {
      if (!v || ['page', 'limit'].includes(k)) return;
      data = data.filter((r) => String(r[k] || '').toLowerCase().includes(String(v).toLowerCase()));
    });
    if (sortBy) {
      data.sort((a, b) => {
        const av = String(a[sortBy] || '');
        const bv = String(b[sortBy] || '');
        return sortOrder === 'desc' ? bv.localeCompare(av) : av.localeCompare(bv);
      });
    }
    const total = data.length;
    const p = parseInt(page, 10);
    const l = parseInt(limit, 10);
    res.json({ success: true, data: data.slice((p - 1) * l, p * l), total, page: p, pages: Math.ceil(total / l) });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

exports.getById = (req, res) => {
  const item = (db[TABLE] || []).find((r) => String(r[PK]) === String(req.params.id));
  if (!item) return res.status(404).json({ success: false, message: 'Not found' });
  res.json({ success: true, data: item });
};

exports.create = (req, res) => {
  try {
    const body = normalizeRecord(req.body);
    if (hasDuplicateName(body.transfer_type_name)) {
      return res.status(400).json({ success: false, errors: { transfer_type_name: 'Transfer Type Name already exists' } });
    }
    if (hasDuplicateCode(body.transfer_type_code)) {
      return res.status(400).json({ success: false, errors: { transfer_type_code: 'Transfer Type Code already exists' } });
    }

    if (!body[PK]) body[PK] = generateId(TABLE);
    if ((db[TABLE] || []).find((r) => String(r[PK]) === String(body[PK]))) {
      return res.status(409).json({ success: false, message: `${body[PK]} already exists` });
    }

    body.created_by = body.created_by || req.user?.username || MOCK_USER;
    body.created_at = new Date().toISOString();
    body.updated_at = new Date().toISOString();
    if (!db[TABLE]) db[TABLE] = [];
    db[TABLE].push(body);
    res.status(201).json({ success: true, data: body, message: 'Created' });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

exports.update = (req, res) => {
  try {
    const idx = (db[TABLE] || []).findIndex((r) => String(r[PK]) === String(req.params.id));
    if (idx === -1) return res.status(404).json({ success: false, message: 'Not found' });

    const merged = normalizeRecord({ ...db[TABLE][idx], ...req.body, [PK]: req.params.id });
    if (hasDuplicateName(merged.transfer_type_name, req.params.id)) {
      return res.status(400).json({ success: false, errors: { transfer_type_name: 'Transfer Type Name already exists' } });
    }
    if (hasDuplicateCode(merged.transfer_type_code, req.params.id)) {
      return res.status(400).json({ success: false, errors: { transfer_type_code: 'Transfer Type Code already exists' } });
    }

    merged.updated_at = new Date().toISOString();
    db[TABLE][idx] = merged;
    res.json({ success: true, data: db[TABLE][idx], message: 'Updated' });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

exports.updateStatus = (req, res) => {
  try {
    const idx = (db[TABLE] || []).findIndex((r) => String(r[PK]) === String(req.params.id));
    if (idx === -1) return res.status(404).json({ success: false, message: 'Not found' });
    const next = req.body?.is_active ?? req.body?.active_flag;
    db[TABLE][idx].is_active = next;
    db[TABLE][idx].active_flag = next;
    db[TABLE][idx].updated_at = new Date().toISOString();
    res.json({ success: true, data: db[TABLE][idx], message: 'Status updated' });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

exports.remove = (req, res) => {
  try {
    const idx = (db[TABLE] || []).findIndex((r) => String(r[PK]) === String(req.params.id));
    if (idx === -1) return res.status(404).json({ success: false, message: 'Not found' });
    const [del] = db[TABLE].splice(idx, 1);
    res.json({ success: true, data: del, message: 'Deleted' });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};
