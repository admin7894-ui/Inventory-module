const db = require('../data/db');

function isYes(value) {
  return value === true || value === 'Y' || value === 'True' || value === 'true' || value === 'ACTIVE';
}

function asNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function normalizeCompanyId(data = {}) {
  return data.COMPANY_id || data.company_id || '';
}

function normalizeContext(data = {}) {
  const ctx = {
    bg_id: data.bg_id || '',
    COMPANY_id: normalizeCompanyId(data),
    business_type_id: data.business_type_id || '',
    inv_org_id: data.inv_org_id || data.from_inv_org_id || ''
  };
  return ctx;
}

function requireContext(data = {}) {
  const ctx = normalizeContext(data);
  const missing = [];
  if (!ctx.bg_id) missing.push('bg_id');
  if (!ctx.COMPANY_id) missing.push('company_id');
  if (!ctx.business_type_id) missing.push('business_type_id');
  if (!ctx.inv_org_id) missing.push('inv_org_id');
  if (missing.length) {
    throw new Error(`Missing organization context: ${missing.join(', ')}`);
  }
  return ctx;
}

function inDateRange(row, dateValue = new Date()) {
  const current = new Date(dateValue);
  current.setHours(0, 0, 0, 0);

  const from = row.effective_from ? new Date(row.effective_from) : null;
  const to = row.effective_to ? new Date(row.effective_to) : null;
  if (from && !Number.isNaN(from.getTime())) {
    from.setHours(0, 0, 0, 0);
    if (current < from) return false;
  }
  if (to && !Number.isNaN(to.getTime())) {
    to.setHours(23, 59, 59, 999);
    if (current > to) return false;
  }
  return true;
}

function getActiveOrgParameter(invOrgId, dateValue = new Date()) {
  return (db.org_parameter || []).find(row =>
    String(row.inv_org_id) === String(invOrgId) &&
    isYes(row.active_flag) &&
    inDateRange(row, dateValue)
  );
}

function getItem(itemId) {
  return (db.item_master || []).find(i => String(i.item_id) === String(itemId));
}

function getItemType(item) {
  return item ? (db.item_type || []).find(t => String(t.item_type_id) === String(item.item_type_id)) : null;
}

function assertPhysicalStockItem(item) {
  if (!item) throw new Error('Item is required');
  const itemType = getItemType(item);
  if (itemType && !isYes(itemType.is_physical)) {
    throw new Error('Inventory transactions are not allowed for non-physical items');
  }
  if (!isYes(item.is_stock_item)) {
    throw new Error('Inventory transactions are only allowed for stock items');
  }
}

function getControlContext(data = {}, dateValue = new Date()) {
  const ctx = requireContext(data);
  const orgParam = getActiveOrgParameter(ctx.inv_org_id, dateValue);
  if (!orgParam) {
    throw new Error(`Active Org Parameter not found for Inventory Organization ${ctx.inv_org_id}`);
  }

  const item = getItem(data.item_id);
  if (!item) throw new Error(`Item ${data.item_id || ''} not found`);
  assertPhysicalStockItem(item);

  const assigned = (db.item_org_assignment || []).some(a =>
    String(a.item_id) === String(item.item_id) &&
    String(a.inv_org_id) === String(ctx.inv_org_id) &&
    isYes(a.active_flag)
  );
  if (!assigned) {
    throw new Error(`Item ${item.item_id} is not assigned to Inventory Organization ${ctx.inv_org_id}`);
  }

  return {
    ctx,
    item,
    orgParam,
    locatorRequired: isYes(orgParam.locator_control),
    lotRequired: isYes(orgParam.lot_control_enabled) && isYes(item.is_lot_controlled),
    serialRequired: isYes(orgParam.serial_control_enabled) && isYes(item.is_serial_controlled),
    costMethodId: orgParam.cost_method_id || orgParam.cost_method || '',
    standardCost: asNumber(item.standard_cost)
  };
}

function getSerialValues(data = {}) {
  let raw = [];
  if (Array.isArray(data.serial_ids) && data.serial_ids.length) raw = data.serial_ids;
  else if (Array.isArray(data.serial_numbers) && data.serial_numbers.length) raw = data.serial_numbers;
  else if (data.serial_id) raw = [data.serial_id];
  else if (data.serial_number) raw = [data.serial_number];
  return raw.map(v => String(v).trim());
}

function assertUnique(values, label) {
  const seen = new Set();
  for (const value of values) {
    const key = String(value).toUpperCase();
    if (seen.has(key)) throw new Error(`${label} must be unique`);
    seen.add(key);
  }
}

function findLot({ item_id, inv_org_id, lot_id, lot_number }) {
  if (!lot_id && !lot_number) return null;
  return (db.lot_master || []).find(l =>
    String(l.item_id) === String(item_id) &&
    (!l.inv_org_id || String(l.inv_org_id) === String(inv_org_id)) &&
    ((lot_id && String(l.lot_id) === String(lot_id)) || (lot_number && String(l.lot_number) === String(lot_number)))
  );
}

function findSerial(value, itemId, invOrgId) {
  return (db.serial_master || []).find(s =>
    String(s.item_id) === String(itemId) &&
    (!s.inv_org_id || String(s.inv_org_id) === String(invOrgId)) &&
    (String(s.serial_id) === String(value) || String(s.serial_number) === String(value))
  );
}

function validateLocator(subinventoryId, locatorId) {
  if (!locatorId) throw new Error('Locator is required');
  const locator = (db.locator___bin || []).find(l => String(l.locator_id) === String(locatorId));
  if (!locator || String(locator.subinventory_id) !== String(subinventoryId)) {
    throw new Error('Locator must belong to selected subinventory');
  }
  return locator;
}

function matchesStock(row, data, controls, serialValue) {
  if (String(row.item_id) !== String(data.item_id)) return false;
  if (String(row.inv_org_id) !== String(data.inv_org_id)) return false;
  if (String(row.subinventory_id || '') !== String(data.subinventory_id || '')) return false;
  if (controls.locatorRequired && String(row.locator_id || '') !== String(data.locator_id || '')) return false;
  if (controls.lotRequired && String(row.lot_id || row.lot_no || '') !== String(data.lot_id || data.lot_no || '')) return false;
  if (controls.serialRequired && serialValue) {
    return String(row.serial_id || row.serial_no || '') === String(serialValue);
  }
  return true;
}

function availableQty(data, controls, serialValue) {
  return (db.item_stock_onhand || [])
    .filter(row => matchesStock(row, data, controls, serialValue))
    .reduce((sum, row) => sum + asNumber(row.available_qty), 0);
}

function validateIssueControls(data, controls, qty) {
  if (controls.locatorRequired) validateLocator(data.subinventory_id, data.locator_id);

  if (controls.lotRequired) {
    if (!data.lot_id && !data.lot_number) throw new Error('Lot is required');
    const lot = findLot({ item_id: data.item_id, inv_org_id: data.inv_org_id, lot_id: data.lot_id, lot_number: data.lot_number });
    if (!lot) throw new Error('Lot must exist for issue');
    data.lot_id = data.lot_id || lot.lot_id;
  }

  if (controls.serialRequired) {
    const serials = getSerialValues(data);
    if (!serials.length) throw new Error('Serial list is required');
    assertUnique(serials, 'Serial list');
    if (asNumber(qty) !== serials.length) throw new Error('Serial-controlled quantity must equal serial count');
    serials.forEach(serialValue => {
      const serial = findSerial(serialValue, data.item_id, data.inv_org_id);
      if (!serial) throw new Error(`Serial ${serialValue} must exist for issue`);
      const stockQty = availableQty(data, controls, serial.serial_id);
      if (stockQty < 1) throw new Error('Insufficient stock');
    });
    data.serial_ids = serials.map(v => findSerial(v, data.item_id, data.inv_org_id)?.serial_id || v);
    return;
  }

  if (availableQty(data, controls) < asNumber(qty)) throw new Error('Insufficient stock');
}

function validateReceiptControls(data, controls, qty, { allowNewLot = true, allowExistingSerial = false } = {}) {
  if (controls.locatorRequired) validateLocator(data.subinventory_id, data.locator_id);

  if (controls.lotRequired) {
    if (!data.lot_id && !data.lot_number) throw new Error('Lot is required');
    const lot = findLot({ item_id: data.item_id, inv_org_id: data.inv_org_id, lot_id: data.lot_id, lot_number: data.lot_number });
    if (!lot && !allowNewLot) throw new Error('Lot must exist');
    if (lot && !data.lot_id) data.lot_id = lot.lot_id;
  }

  if (controls.serialRequired) {
    const serials = getSerialValues(data);
    if (!serials.length) throw new Error('Serial list is required');
    assertUnique(serials, 'Serial list');
    if (asNumber(qty) !== serials.length) throw new Error('Serial-controlled quantity must equal serial count');
    serials.forEach(serialValue => {
      if (!allowExistingSerial && findSerial(serialValue, data.item_id, data.inv_org_id)) {
        throw new Error(`Serial ${serialValue} already exists`);
      }
    });
  }
}

function applyStandardCost(data, controls) {
  if (!data.unit_cost && controls.standardCost >= 0) data.unit_cost = controls.standardCost;
  data.cost_method_id = data.cost_method_id || controls.costMethodId;
  return data;
}

module.exports = {
  isYes,
  asNumber,
  normalizeCompanyId,
  normalizeContext,
  requireContext,
  getActiveOrgParameter,
  getControlContext,
  getSerialValues,
  findLot,
  findSerial,
  validateLocator,
  validateIssueControls,
  validateReceiptControls,
  availableQty,
  applyStandardCost
};
