// ID Generator Utility - Auto-generate PKs from seed patterns

const PREFIXES = {
  departments: 'DEPT',
  roles: 'ROLE',
  designation: 'DSG',
  module: 'MOD',
  business_type: 'BT',
  location: 'L',
  company: 'C',
  business_group: 'BG',
  security_profile: 'SP',
  profile_access: 'PA',
  security_roles: 'SR',
  table_access: 'TA',
  legal_entity: 'LE',
  operating_unit: 'OU',
  inventory_org: 'INV',
  workday_calendar: 'CAL',
  workday_holidays: 'HOL',
  cost_method: 'CM',
  cost_type: 'CT',
  org_parameter: 'OPRM',
  ship_method: 'SM',
  ship_network: 'SN',
  intercompany: 'IC',
  uom_type: 'UT',
  uom_unit_of_measure: 'UOM',
  category_set: 'CS',
  item_category: 'CAT',
  item_sub_category: 'SCAT',
  brand: 'BR',
  item_type: 'IT',
  item_master: 'ITEM',
  zone: 'ZN',
  subinventory: 'SUB',
  locator___bin: 'BIN',
  item_subinventory_restriction: 'ISR',
  item_org_assignment: 'IOA',
  uom_conv: 'UC',
  lot_master: 'LOT',
  serial_master: 'SER',
  transaction_type: 'TT',
  transaction_reason: 'TR',
  opening_stock: 'OPS',
  inventory_transaction: 'TXN',
  item_stock_onhand: 'STK',
  stock_ledger: 'SLG',
  stock_adjustment: 'ADJ',
  batch___serial_tracking: 'TRK',
};

const counters = {};

function generateId(tableKey) {
  const prefix = PREFIXES[tableKey] || tableKey.slice(0,3).toUpperCase();
  if (!counters[tableKey]) counters[tableKey] = 1000;
  counters[tableKey]++;
  return `${prefix}-${String(counters[tableKey]).padStart(3,'0')}`;
}

function initCounters(db) {
  // Initialize counters based on existing data
  Object.entries(db).forEach(([tableKey, rows]) => {
    if (!Array.isArray(rows)) return;
    counters[tableKey] = rows.length + 100;
  });
}

module.exports = { generateId, initCounters, PREFIXES };
