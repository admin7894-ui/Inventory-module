const db = require('../data/db');
const { generateId } = require('./idGenerator');

function slugItemCode(code) {
  const raw = String(code || 'ITEM').replace(/[^A-Za-z0-9_-]/g, '').toUpperCase();
  return raw || 'ITEM';
}

function yyyymmdd(d = new Date()) {
  const dt = d instanceof Date ? d : new Date(d);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const day = String(dt.getDate()).padStart(2, '0');
  return `${y}${m}${day}`;
}

function maxSeqForLotPrefix(prefix) {
  let max = 0;
  const re = new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}-(\\d+)$`);
  for (const row of db.lot_master || []) {
    const n = String(row.lot_number || '');
    const m = n.match(re);
    if (m) max = Math.max(max, parseInt(m[1], 10) || 0);
  }
  return max;
}

function maxSeqForSerialPrefix(prefix) {
  let max = 0;
  const re = new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}-(\\d+)$`);
  for (const row of db.serial_master || []) {
    const n = String(row.serial_number || '');
    const m = n.match(re);
    if (m) max = Math.max(max, parseInt(m[1], 10) || 0);
  }
  return max;
}

/**
 * LOT-{ITEM_CODE}-{YYYYMMDD}-{SEQ}
 */
function generateAutoLotNumber(item, dateValue = new Date()) {
  const itemCode = slugItemCode(item?.item_code || item?.item_id);
  const day = yyyymmdd(dateValue);
  const base = `LOT-${itemCode}-${day}`;
  const next = maxSeqForLotPrefix(base) + 1;
  return `${base}-${String(next).padStart(4, '0')}`;
}

/**
 * SR-{ITEM_CODE}-{SEQ} (global seq per item code prefix)
 */
function generateAutoSerialNumbers(item, count) {
  const itemCode = slugItemCode(item?.item_code || item?.item_id);
  const base = `SR-${itemCode}`;
  let start = maxSeqForSerialPrefix(base);
  const out = [];
  for (let i = 0; i < count; i += 1) {
    start += 1;
    out.push(`${base}-${String(start).padStart(6, '0')}`);
  }
  return out;
}

function pushLotRecord({ data, item, lot_number, user }) {
  const openingDate = data.opening_date || data.adjustment_date || data.txn_date || new Date().toISOString().split('T')[0];
  let expiry_date = data.expiry_date || '';
  if (item && (item.is_expirable === 'Y' || item.is_expirable === true || item.is_expirable === 'True') && !expiry_date) {
    const d = new Date(openingDate);
    const days = parseInt(item.shelf_life_days || 365, 10);
    d.setDate(d.getDate() + days);
    expiry_date = d.toISOString().split('T')[0];
  }
  const lotRecord = {
    lot_id: generateId('lot_master'),
    COMPANY_id: data.COMPANY_id || data.company_id,
    business_type_id: data.business_type_id,
    bg_id: data.bg_id,
    inv_org_id: data.inv_org_id || '',
    item_id: data.item_id,
    lot_number,
    manufacture_date: openingDate,
    expiry_date,
    status: 'ACTIVE',
    module_id: data.module_id || 'MOD01',
    active_flag: 'Y',
    created_by: user?.username || 'system',
    created_at: new Date().toISOString()
  };
  if (!db.lot_master) db.lot_master = [];
  db.lot_master.push(lotRecord);
  return lotRecord;
}

function pushSerialRecord({ data, item, serial_number, user }) {
  const rec = {
    serial_id: generateId('serial_master'),
    COMPANY_id: data.COMPANY_id || data.company_id,
    business_type_id: data.business_type_id,
    bg_id: data.bg_id,
    inv_org_id: data.inv_org_id || '',
    item_id: data.item_id,
    serial_number,
    current_subinventory_id: data.subinventory_id || '',
    current_locator_id: data.locator_id || '',
    status: 'AVAILABLE',
    receipt_date: new Date().toISOString().split('T')[0],
    module_id: data.module_id || 'MOD01',
    active_flag: 'Y',
    created_by: user?.username || 'system',
    created_at: new Date().toISOString()
  };
  if (!db.serial_master) db.serial_master = [];
  db.serial_master.push(rec);
  return rec;
}

module.exports = {
  generateAutoLotNumber,
  generateAutoSerialNumbers,
  pushLotRecord,
  pushSerialRecord,
  slugItemCode,
  yyyymmdd
};
