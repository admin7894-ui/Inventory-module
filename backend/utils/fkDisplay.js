const db = require('../data/db');

const tableConfig = {
  departments: { pk: 'dept_id', labels: ['name'] },
  roles: { pk: 'role_id', labels: ['name'] },
  designation: { pk: 'designation_id', labels: ['name'] },
  module: { pk: 'module_id', labels: ['module_name', 'name', 'module_code'] },
  business_type: { pk: 'business_type_id', labels: ['name'] },
  location: { pk: 'location_id', labels: ['location_name', 'name'] },
  company: { pk: 'company_id', labels: ['company_name', 'name'] },
  business_group: { pk: 'bg_id', labels: ['Business Group Name', 'bg_name', 'name'] },
  security_profile: { pk: 'security_profile_id', labels: ['profile_name', 'profile_code'] },
  profile_access: { pk: 'profile_access_id', labels: ['profile_code', 'user_name'] },
  security_roles: { pk: 'security_roles_id', labels: ['user_name'] },
  table_access: { pk: 'table_access_id', labels: ['table_name'] },
  legal_enity: { pk: 'le_id', labels: ['le_name', 'name'] },
  operating_unit: { pk: 'op_id', labels: ['ou_name', 'operating_unit_name', 'name'] },
  inventory_org: { pk: 'inv_org_id', labels: ['inv_org_name', 'name'] },
  workday_calender: { pk: 'workday_calendar_id', labels: ['calendar_name', 'workday_calendar_name'] },
  workday_calendar: { pk: 'calendar_id', labels: ['calendar_name'] },
  cost_method: { pk: 'cost_method_id', labels: ['cost_method_name', 'name'] },
  cost_type: { pk: 'cost_type_id', labels: ['cost_type_name', 'name'] },
  org_parameter: { pk: 'org_parameter_id', labels: ['org_code', 'org_parameter_name'] },
  ship_method: { pk: 'ship_method_id', labels: ['ship_method_name', 'ship_method name', 'method_code', 'name'] },
  ship_network: { pk: 'ship_network_id', labels: ['network_name', 'ship_network_name'] },
  intercompany: { pk: 'intercompany_id', labels: ['intercompany_name', 'relationship_name'] },
  uom_type: { pk: 'uom_type_id', labels: ['uom_type_name', 'name'] },
  uom_unit_of_measure: { pk: 'uom_id', labels: ['uom_name', 'uom_code', 'name'] },
  category_set: { pk: 'category_set_id', labels: ['category_set_name', 'name'] },
  item_category: { pk: 'category_id', labels: ['category_name', 'name'] },
  item_sub_category: { pk: 'sub_category_id', labels: ['sub_category_name', 'name'] },
  brand: { pk: 'brand_id', labels: ['brand_name', 'name'] },
  item_type: { pk: 'item_type_id', labels: ['item_type_name', 'name'] },
  item_master: { pk: 'item_id', labels: ['item_name', 'item_code', 'description'] },
  zone: { pk: 'zone_id', labels: ['zone_name', 'name'] },
  subinventory: { pk: 'subinventory_id', labels: ['subinventory_name', 'name'] },
  locator___bin: { pk: 'locator_id', labels: ['locator_name', 'locator_code', 'name'] },
  item_subinventory_restriction: { pk: 'restriction_id', labels: ['restriction_name'] },
  item_org_assignment: { pk: 'assignment_id', labels: ['assignment_name'] },
  uom_conv: { pk: 'conversion_id', labels: ['conversion_name'] },
  lot_master: { pk: 'lot_id', labels: ['lot_number', 'lot_name'] },
  serial_master: { pk: 'serial_id', labels: ['serial_number', 'serial_name'] },
  transaction_type: { pk: 'txn_type_id', labels: ['txn_type_name', 'transaction_type_name', 'name'] },
  transaction_reason: { pk: 'txn_reason_id', labels: ['txn_reason', 'reason_name', 'reason_code'] },
  opening_stock: { pk: 'opening_stock_id', labels: ['reference_no'] },
  inventory_transaction: { pk: 'txn_id', labels: ['transaction_number', 'reference_no'] },
  item_stock_onhand: { pk: 'stock_id', labels: ['stock_number'] },
  stock_ledger: { pk: 'ledger_id', labels: ['reference_no'] },
  stock_adjustment: { pk: 'adjustment_id', labels: ['adjustment_number'] },
  batch___serial_tracking: { pk: 'tracking_id', labels: ['tracking_number', 'remarks'] },
};

const fkTargets = {
  COMPANY_id: 'company',
  company_id: 'company',
  business_type_id: 'business_type',
  bg_id: 'business_group',
  module_id: 'module',
  location_id: 'location',
  le_id: 'legal_enity',
  op_id: 'operating_unit',
  ship_ou_id: 'operating_unit',
  sell_ou_id: 'operating_unit',
  operating_unit_id: 'operating_unit',
  inv_org_id: 'inventory_org',
  from_inv_org_id: 'inventory_org',
  to_inv_org_id: 'inventory_org',
  cost_method_id: 'cost_method',
  cost_type_id: 'cost_type',
  ship_method_id: 'ship_method',
  uom_type_id: 'uom_type',
  uom_id: 'uom_unit_of_measure',
  from_uom_id: 'uom_unit_of_measure',
  to_uom_id: 'uom_unit_of_measure',
  primary_uom_id: 'uom_unit_of_measure',
  secondary_uom_id: 'uom_unit_of_measure',
  item_id: 'item_master',
  category_set_id: 'category_set',
  category_id: 'item_category',
  sub_category_id: 'item_sub_category',
  brand_id: 'brand',
  item_type_id: 'item_type',
  zone_id: 'zone',
  subinventory_id: 'subinventory',
  to_subinventory_id: 'subinventory',
  current_subinventory_id: 'subinventory',
  locator_id: 'locator___bin',
  to_locator_id: 'locator___bin',
  current_locator_id: 'locator___bin',
  txn_type_id: 'transaction_type',
  txn_reason_id: 'transaction_reason',
  reason_id: 'transaction_reason',
  lot_id: 'lot_master',
  serial_id: 'serial_master',
  last_transaction_id: 'inventory_transaction',
  transaction_id: 'inventory_transaction',
  workday_calendar_id: 'workday_calender',
  item_master_org: 'inventory_org',
  default_ship_method_id: 'ship_method',
  departments_id: 'departments',
  dept_id: 'departments',
  roles_id: 'roles',
  role_id: 'roles',
  designation_id: 'designation',
  security_profile_id: 'security_profile',
  profile_access_id: 'profile_access',
  security_roles_id: 'security_roles',
};

const codeLabels = {
  txn_action: {
    IN: 'Stock In',
    OUT: 'Stock Out',
    TRANSFER: 'Transfer',
    ADJUSTMENT: 'Adjustment',
  },
  transfer_flag: { Y: 'Transfer', N: 'No Transfer' },
  active_flag: { Y: 'Active', N: 'Inactive', True: 'Active', False: 'Inactive', true: 'Active', false: 'Inactive' },
};

const fieldAliases = {
  'Dropdown from_inv_org_id': 'from_inv_org_id',
  'ship_method name': 'ship_method_name',
};

const labelAliases = {
  COMPANY_id: ['company_name'],
  company_id: ['company_name'],
  business_type_id: ['business_type_name'],
  bg_id: ['bg_name', 'business_group_name'],
  module_id: ['module_name'],
  location_id: ['location_name'],
  le_id: ['le_name', 'legal_entity_name'],
  op_id: ['operating_unit_name', 'ou_name'],
  ship_ou_id: ['ship_ou_name', 'ship_operating_unit_name'],
  sell_ou_id: ['sell_ou_name', 'sell_operating_unit_name'],
  operating_unit_id: ['operating_unit_name', 'ou_name'],
  inv_org_id: ['inv_org_name'],
  from_inv_org_id: ['from_inv_org_name'],
  to_inv_org_id: ['to_inv_org_name'],
  item_master_org: ['item_master_org_name'],
  cost_method_id: ['cost_method_name'],
  cost_type_id: ['cost_type_name'],
  ship_method_id: ['ship_method_name'],
  default_ship_method_id: ['default_ship_method_name'],
  uom_type_id: ['uom_type_name'],
  uom_id: ['uom_name'],
  from_uom_id: ['from_uom_name'],
  to_uom_id: ['to_uom_name'],
  primary_uom_id: ['primary_uom_name'],
  secondary_uom_id: ['secondary_uom_name'],
  item_id: ['item_name'],
  category_set_id: ['category_set_name'],
  category_id: ['category_name'],
  sub_category_id: ['sub_category_name'],
  brand_id: ['brand_name'],
  item_type_id: ['item_type_name'],
  zone_id: ['zone_name'],
  subinventory_id: ['subinventory_name'],
  to_subinventory_id: ['to_subinventory_name'],
  current_subinventory_id: ['current_subinventory_name'],
  locator_id: ['locator_name'],
  to_locator_id: ['to_locator_name'],
  current_locator_id: ['current_locator_name'],
  txn_type_id: ['txn_type_name', 'transaction_type_name'],
  txn_reason_id: ['txn_reason_name', 'reason_name'],
  lot_id: ['lot_number'],
  serial_id: ['serial_number'],
  departments_id: ['department_name'],
  dept_id: ['department_name'],
  roles_id: ['role_name'],
  role_id: ['role_name'],
  designation_id: ['designation_name'],
  security_profile_id: ['security_profile_name'],
  profile_access_id: ['profile_access_name'],
  security_roles_id: ['security_role_name'],
  workday_calendar_id: ['workday_calendar_name', 'calendar_name'],
};

function valueFrom(row, fields) {
  for (const field of fields) {
    const value = row?.[field];
    if (value !== undefined && value !== null && String(value).trim() !== '') return value;
  }
  return '';
}

function buildIndexes() {
  return Object.fromEntries(
    Object.entries(tableConfig).map(([table, cfg]) => [
      table,
      new Map((db[table] || []).map(row => [String(row[cfg.pk]), row])),
    ])
  );
}

function resolveLabel(table, id, indexes) {
  if (id === undefined || id === null || String(id).trim() === '') return '';
  const cfg = tableConfig[table];
  const match = indexes[table]?.get(String(id));
  if (!cfg || !match) return '';
  return String(valueFrom(match, cfg.labels) || '').trim();
}

function decorateRow(row, indexes = buildIndexes()) {
  if (!row || typeof row !== 'object' || Array.isArray(row)) return row;
  const out = { ...row };

  Object.entries(fieldAliases).forEach(([from, to]) => {
    if (!(from in out) || out[to]) return;
    out[to] = out[from];
  });

  Object.entries(fkTargets).forEach(([field, table]) => {
    if (!(field in out)) return;
    const label = resolveLabel(table, out[field], indexes);
    if (!label) return;
    out[`${field}_display`] = label;
    (labelAliases[field] || []).forEach(alias => {
      if (out[alias] === undefined || out[alias] === null || String(out[alias]).trim() === '') out[alias] = label;
    });
  });

  Object.entries(codeLabels).forEach(([field, labels]) => {
    if (!(field in out)) return;
    const value = out[field];
    if (value in labels) out[`${field}_display`] = labels[value];
  });

  return out;
}

function decoratePayload(payload) {
  const indexes = buildIndexes();

  if (Array.isArray(payload)) return payload.map(row => decorateRow(row, indexes));
  if (payload?.data && Array.isArray(payload.data)) {
    return { ...payload, data: payload.data.map(row => decorateRow(row, indexes)) };
  }
  if (payload?.data && typeof payload.data === 'object') {
    return { ...payload, data: decorateRow(payload.data, indexes) };
  }
  if (payload && typeof payload === 'object') return decorateRow(payload, indexes);
  return payload;
}

module.exports = { decoratePayload, decorateRow };
