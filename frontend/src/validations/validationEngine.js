// ══════════════════════════════════════════════════════════════
// UNIFIED VALIDATION ENGINE — Single file for ALL inventory modules
// Usage: import { validate } from '../validations/validationEngine'
//        const { errors, isValid } = validate('inventory_org', formData, options)
// ══════════════════════════════════════════════════════════════

// ── Helpers ──────────────────────────────────────────────────
const isEmpty = (v) => v === null || v === undefined || String(v).trim() === '';
const isPositiveNumber = (v) => !isNaN(v) && Number(String(v).trim()) > 0;
const isNonNegativeNumber = (v) => !isNaN(v) && Number(String(v).trim()) >= 0;
const isValidDate = (v) => !isEmpty(v) && !isNaN(new Date(v).getTime());
const isFutureDate = (v) => isValidDate(v) && new Date(v) > new Date();

const REGEX = {
  NAME:     /^[A-Za-z0-9 &()\-]{3,100}$/,
  CODE:     /^[A-Z0-9_]{2,20}$/,
  GST:      /^[0-9A-Z]{15}$/,
  CURRENCY: /^[A-Z]{3}$/,
  HSN:      /^[0-9]{4,8}$/,
};

// Require a field; returns error string or null
const req = (val, label) => isEmpty(val) ? 'This field is required' : null;
const reqDrop = (val, label) => isEmpty(val) ? 'This field is required' : null;
const posNum = (val, label) => !isEmpty(val) && !isPositiveNumber(val) ? 'Invalid format' : null;
const nonNeg = (val, label) => !isEmpty(val) && !isNonNegativeNumber(val) ? 'Invalid format' : null;

// Common: Company Group cascade
function validateCompanyGroup(e, d) {
  if (isEmpty(d.bg_id)) e.bg_id = 'This field is required';
  if (isEmpty(d.COMPANY_id)) e.COMPANY_id = 'This field is required';
  if (isEmpty(d.business_type_id)) e.business_type_id = 'This field is required';
}

// Common: Date range
function validateDates(e, d) {
  if (isEmpty(d.effective_from)) e.effective_from = 'This field is required';
  if (d.effective_from && d.effective_to && new Date(d.effective_to) < new Date(d.effective_from)) {
    e.effective_to = 'Invalid format';
  }
}

// ── Module Rule Sets ─────────────────────────────────────────

const RULES = {

  // ━━━━━━━━━━━━━━ LEGAL ENTITY ━━━━━━━━━━━━━━
  legal_entity: (d) => {
    const e = {};
    validateCompanyGroup(e, d);
    if (isEmpty(d.le_name)) e.le_name = 'This field is required';
    else if (!REGEX.NAME.test(String(d.le_name).trim())) e.le_name = 'Invalid format';
    if (isEmpty(d.tax_registration_no)) e.tax_registration_no = 'This field is required';
    else if (!REGEX.GST.test(String(d.tax_registration_no).trim())) e.tax_registration_no = 'Invalid format';
    if (isEmpty(d.location_id)) e.location_id = 'This field is required';
    if (isEmpty(d.currency_code)) e.currency_code = 'This field is required';
    else if (!REGEX.CURRENCY.test(String(d.currency_code).trim())) e.currency_code = 'Invalid format';
    if (isEmpty(d.module_id)) e.module_id = 'This field is required';
    validateDates(e, d);
    return e;
  },

  // ━━━━━━━━━━━━━━ OPERATING UNIT ━━━━━━━━━━━━━━
  operating_unit: (d) => {
    const e = {};
    validateCompanyGroup(e, d);
    if (isEmpty(d.le_id)) e.le_id = 'This field is required';
    if (isEmpty(d.ou_name)) e.ou_name = 'This field is required';
    else if (!REGEX.NAME.test(String(d.ou_name).trim())) e.ou_name = 'Invalid format';
    if (isEmpty(d.ou_short_code)) e.ou_short_code = 'This field is required';
    else if (!REGEX.CODE.test(String(d.ou_short_code).trim())) e.ou_short_code = 'Invalid format';
    if (isEmpty(d.location_id)) e.location_id = 'This field is required';
    if (isEmpty(d.currency_code)) e.currency_code = 'This field is required';
    else if (!REGEX.CURRENCY.test(String(d.currency_code).trim())) e.currency_code = 'Invalid format';
    if (isEmpty(d.module_id)) e.module_id = 'This field is required';
    validateDates(e, d);
    return e;
  },

  // ━━━━━━━━━━━━━━ INVENTORY ORGANIZATION ━━━━━━━━━━━━━━
  inventory_org: (d) => {
    const e = {};
    validateCompanyGroup(e, d);
    if (isEmpty(d.inv_org_name)) e.inv_org_name = 'This field is required';
    if (isEmpty(d.inv_org_code)) e.inv_org_code = 'This field is required';
    else if (!REGEX.CODE.test(String(d.inv_org_code).trim())) e.inv_org_code = 'Invalid format';
    if (isEmpty(d.le_id)) e.le_id = 'This field is required';
    if (isEmpty(d.location_id)) e.location_id = 'This field is required';
    if (isEmpty(d.module_id)) e.module_id = 'This field is required';
    validateDates(e, d);
    return e;
  },

  // ━━━━━━━━━━━━━━ ITEM MASTER ━━━━━━━━━━━━━━
  item_master: (d, opts = {}) => {
    const e = {};
    validateCompanyGroup(e, d);
    if (isEmpty(d.item_name)) e.item_name = 'This field is required';
    else if (!REGEX.NAME.test(String(d.item_name).trim())) e.item_name = 'Invalid format';
    if (isEmpty(d.item_type_id)) e.item_type_id = 'This field is required';
    if (!isEmpty(d.item_code) && !REGEX.CODE.test(String(d.item_code).trim())) e.item_code = 'Invalid format';

    const isPhysical = opts.isPhysical;
    if (isPhysical === true) {
      if (isEmpty(d.primary_uom_id)) e.primary_uom_id = 'This field is required';
      if (isEmpty(d.category_id)) e.category_id = 'This field is required';
      if (d.is_serial_controlled === 'Y' && d.is_lot_controlled === 'Y')
        e.is_lot_controlled = 'Invalid format';
      if ((d.is_expirable === 'Y' || d.is_expirable === true) && isEmpty(d.shelf_life_days))
        e.shelf_life_days = 'This field is required';
      const wErr = nonNeg(d.weight_kg, 'Weight'); if (wErr) e.weight_kg = wErr;
      const vErr = nonNeg(d.volume_cbm, 'Volume'); if (vErr) e.volume_cbm = vErr;
      const minErr = posNum(d.min_order_qty, 'Min qty'); if (minErr) e.min_order_qty = minErr;
      const maxErr = posNum(d.max_order_qty, 'Max qty'); if (maxErr) e.max_order_qty = maxErr;
      if (!isEmpty(d.min_order_qty) && !isEmpty(d.max_order_qty) && Number(d.min_order_qty) > Number(d.max_order_qty))
        e.max_order_qty = 'Max qty must be ≥ Min qty';
    }
    if (isPhysical === false) {
      if (d.is_license_required === 'Y' || d.is_license_required === true) {
        if (isEmpty(d.license_type)) e.license_type = 'License type is required';
        if (isEmpty(d.max_users)) e.max_users = 'Max users is required';
        else if (!isPositiveNumber(d.max_users)) e.max_users = 'Max users must be > 0';
      }
    }
    const scErr = nonNeg(d.standard_cost, 'Standard cost'); if (scErr) e.standard_cost = scErr;
    const lpErr = nonNeg(d.list_price, 'List price'); if (lpErr) e.list_price = lpErr;
    validateDates(e, d);
    return e;
  },

  // ━━━━━━━━━━━━━━ OPENING STOCK ━━━━━━━━━━━━━━
  opening_stock: (d, opts = {}) => {
    const e = {};
    validateCompanyGroup(e, d);
    if (isEmpty(d.item_id)) e.item_id = 'Please select Item';
    if (isEmpty(d.inv_org_id)) e.inv_org_id = 'Please select Inventory Org';
    if (isEmpty(d.subinventory_id)) e.subinventory_id = 'Please select Subinventory';
    if (isEmpty(d.txn_reason_id)) e.txn_reason_id = 'Please select Transaction Reason';
    if (isEmpty(d.opening_qty)) e.opening_qty = 'Quantity is required';
    else if (!isPositiveNumber(d.opening_qty)) e.opening_qty = 'Quantity must be > 0';
    if (isEmpty(d.unit_cost)) e.unit_cost = 'Unit cost is required';
    else if (!isNonNegativeNumber(d.unit_cost)) e.unit_cost = 'Unit cost must be ≥ 0';
    if (!isEmpty(d.opening_date) && isFutureDate(d.opening_date))
      e.opening_date = 'Opening date cannot be in the future';
    // Lot/Serial conditional
    if (opts.isLotControlled && isEmpty(d.lot_number)) e.lot_number = 'Lot number is required';
    if (opts.isSerialControlled && opts.serialMode === 'manual') {
      const serials = opts.serialInputs || [];
      const validSerials = serials.filter(s => s && s.trim());
      const qty = parseInt(d.opening_qty) || 0;
      if (validSerials.length !== qty) e.serial_numbers = `Need exactly ${qty} serial numbers`;
    }
    return e;
  },

  // ━━━━━━━━━━━━━━ ITEM STOCK (ONHAND) ━━━━━━━━━━━━━━
  item_stock: (d) => {
    const e = {};
    if (isEmpty(d.item_id)) e.item_id = 'Please select Item';
    if (isEmpty(d.inv_org_id)) e.inv_org_id = 'Please select Inventory Org';
    if (isEmpty(d.subinventory_id)) e.subinventory_id = 'Please select Subinventory';
    if (isEmpty(d.onhand_qty)) e.onhand_qty = 'Onhand quantity is required';
    else if (!isNonNegativeNumber(d.onhand_qty)) e.onhand_qty = 'Onhand qty must be ≥ 0';
    if (!isEmpty(d.available_qty) && !isNonNegativeNumber(d.available_qty))
      e.available_qty = 'Available qty must be ≥ 0';
    if (!isEmpty(d.reserved_qty) && !isNonNegativeNumber(d.reserved_qty))
      e.reserved_qty = 'Reserved qty must be ≥ 0';
    if (!isEmpty(d.available_qty) && !isEmpty(d.onhand_qty) && Number(d.available_qty) > Number(d.onhand_qty))
      e.available_qty = 'Available qty cannot exceed onhand qty';
    const ucErr = nonNeg(d.unit_cost, 'Unit cost'); if (ucErr) e.unit_cost = ucErr;
    if (isEmpty(d.uom_id)) e.uom_id = 'Please select UOM';
    return e;
  },

  // ━━━━━━━━━━━━━━ STOCK ADJUSTMENT ━━━━━━━━━━━━━━
  stock_adjustment: (d, opts = {}) => {
    const e = {};
    validateCompanyGroup(e, d);
    if (isEmpty(d.item_id)) e.item_id = 'Please select Item';
    if (isEmpty(d.txn_type_id)) e.txn_type_id = 'Please select Adjustment Type';
    if (isEmpty(d.inv_org_id)) e.inv_org_id = 'Please select Source Org';
    if (isEmpty(d.subinventory_id)) e.subinventory_id = 'Please select Subinventory';

    const isTransfer = opts.isTransfer || d.txn_action === 'TRANSFER';
    if (isTransfer) {
      if (isEmpty(d.to_inv_org_id)) e.to_inv_org_id = 'Destination Org is required';
      if (isEmpty(d.to_subinventory_id)) e.to_subinventory_id = 'Destination Subinventory is required';
      if (!isEmpty(d.inv_org_id) && !isEmpty(d.to_inv_org_id) &&
          !isEmpty(d.subinventory_id) && !isEmpty(d.to_subinventory_id) &&
          d.inv_org_id === d.to_inv_org_id && d.subinventory_id === d.to_subinventory_id)
        e.to_subinventory_id = 'Destination must differ from source';
    }

    if (isEmpty(d.physical_qty)) e.physical_qty = 'Quantity is required';
    else if (isTransfer && !isPositiveNumber(d.physical_qty)) e.physical_qty = 'Transfer qty must be > 0';
    else if (!isTransfer && !isNonNegativeNumber(d.physical_qty)) e.physical_qty = 'Qty must be ≥ 0';

    // Adjustment qty cannot be 0 (non-transfer)
    if (!isTransfer && !isEmpty(d.physical_qty) && !isEmpty(d.system_qty)) {
      const adjQty = Number(d.physical_qty) - Number(d.system_qty);
      if (adjQty === 0) e.physical_qty = 'Adjustment quantity cannot be 0';
    }

    // Prevent negative resulting stock
    if (!isTransfer && !isEmpty(d.system_qty) && !isEmpty(d.physical_qty)) {
      if (Number(d.physical_qty) < 0) e.physical_qty = 'Cannot result in negative stock';
    }

    const ucErr = nonNeg(d.unit_cost, 'Unit cost'); if (ucErr) e.unit_cost = ucErr;
    if (!isEmpty(d.adjustment_date) && isFutureDate(d.adjustment_date))
      e.adjustment_date = 'Adjustment date cannot be in the future';

    // Lot/Serial conditional
    if (opts.isLotControlled && isEmpty(d.lot_id)) e.lot_id = 'Lot is required';
    if (opts.isSerialControlled && (!d.serial_ids || d.serial_ids.length === 0))
      e.serial_ids = 'Serial numbers are required';

    return e;
  },

  // ━━━━━━━━━━━━━━ INVENTORY TRANSACTION ━━━━━━━━━━━━━━
  inventory_transaction: (d) => {
    const e = {};
    if (isEmpty(d.item_id)) e.item_id = 'Please select Item';
    if (isEmpty(d.txn_type_id)) e.txn_type_id = 'Please select Transaction Type';
    if (isEmpty(d.txn_action)) e.txn_action = 'Transaction Action is required';
    else if (!['IN', 'OUT', 'TRANSFER'].includes(d.txn_action))
      e.txn_action = 'Action must be IN, OUT, or TRANSFER';
    if (isEmpty(d.inv_org_id)) e.inv_org_id = 'Please select Inventory Org';
    if (isEmpty(d.subinventory_id)) e.subinventory_id = 'Please select Subinventory';
    if (isEmpty(d.txn_qty)) e.txn_qty = 'Quantity is required';
    else if (!isPositiveNumber(d.txn_qty)) e.txn_qty = 'Quantity must be > 0';
    if (isEmpty(d.uom_id)) e.uom_id = 'Please select UOM';
    const ucErr = nonNeg(d.unit_cost, 'Unit cost'); if (ucErr) e.unit_cost = ucErr;
    if (isEmpty(d.txn_date)) e.txn_date = 'Transaction date is required';
    else if (isFutureDate(d.txn_date)) e.txn_date = 'Transaction date cannot be in the future';
    if (isEmpty(d.txn_reason_id)) e.txn_reason_id = 'Please select Reason';
    return e;
  },

  // ━━━━━━━━━━━━━━ TRANSACTION TYPE ━━━━━━━━━━━━━━
  transaction_type: (d) => {
    const e = {};
    validateCompanyGroup(e, d);
    if (isEmpty(d.txn_type_name)) e.txn_type_name = 'This field is required';
    if (isEmpty(d.txn_type_code)) e.txn_type_code = 'This field is required';
    else if (!REGEX.CODE.test(String(d.txn_type_code).trim())) e.txn_type_code = 'Invalid format';
    if (isEmpty(d.txn_action)) e.txn_action = 'This field is required';
    if (isEmpty(d.txn_category)) e.txn_category = 'This field is required';
    if (isEmpty(d.module_id)) e.module_id = 'This field is required';
    validateDates(e, d);
    return e;
  },

  // ━━━━━━━━━━━━━━ TRANSACTION REASON ━━━━━━━━━━━━━━
  transaction_reason: (d) => {
    const e = {};
    validateCompanyGroup(e, d);
    if (isEmpty(d.txn_reason)) e.txn_reason = 'This field is required';
    if (isEmpty(d.reason_code)) e.reason_code = 'This field is required';
    else if (!REGEX.CODE.test(String(d.reason_code).trim())) e.reason_code = 'Invalid format';
    if (isEmpty(d.module_id)) e.module_id = 'This field is required';
    validateDates(e, d);
    return e;
  },

  // ━━━━━━━━━━━━━━ ITEM SUBINV RESTRICTION ━━━━━━━━━━━━━━
  item_subinv_restriction: (d) => {
    const e = {};
    validateCompanyGroup(e, d);
    if (isEmpty(d.item_id)) e.item_id = 'This field is required';
    if (isEmpty(d.inv_org_id)) e.inv_org_id = 'This field is required';
    if (isEmpty(d.subinventory_id)) e.subinventory_id = 'This field is required';
    if (isEmpty(d.locator_id)) e.locator_id = 'This field is required';
    if (isEmpty(d.module_id)) e.module_id = 'This field is required';
    validateDates(e, d);
    return e;
  },

  // ━━━━━━━━━━━━━━ ITEM ORG ASSIGNMENT ━━━━━━━━━━━━━━
  item_org_assignment: (d) => {
    const e = {};
    validateCompanyGroup(e, d);
    if (isEmpty(d.item_id)) e.item_id = 'This field is required';
    if (isEmpty(d.inv_org_id)) e.inv_org_id = 'This field is required';
    
    // Stock Policy
    if (isEmpty(d.min_qty)) e.min_qty = 'This field is required';
    else if (!isNonNegativeNumber(d.min_qty)) e.min_qty = 'Invalid format';
    
    if (isEmpty(d.max_qty)) e.max_qty = 'This field is required';
    else if (!isPositiveNumber(d.max_qty)) e.max_qty = 'Invalid format';
    else if (!isEmpty(d.min_qty) && Number(d.max_qty) <= Number(d.min_qty)) 
      e.max_qty = 'Invalid format';

    if (isEmpty(d.safety_stock_qty)) e.safety_stock_qty = 'This field is required';
    else if (!isNonNegativeNumber(d.safety_stock_qty)) e.safety_stock_qty = 'Invalid format';

    if (isEmpty(d.module_id)) e.module_id = 'This field is required';
    validateDates(e, d);
    return e;
  },

  // ━━━━━━━━━━━━━━ WORKDAY CALENDAR ━━━━━━━━━━━━━━
  workday_calendar: (d) => {
    const e = {};
    validateCompanyGroup(e, d);
    if (isEmpty(d.calendar_name)) e.calendar_name = 'This field is required';
    else if (!REGEX.NAME.test(String(d.calendar_name).trim())) e.calendar_name = 'Invalid format';
    if (isEmpty(d.calendar_code)) e.calendar_code = 'This field is required';
    else if (!REGEX.CODE.test(String(d.calendar_code).trim())) e.calendar_code = 'Invalid format';
    if (isEmpty(d.year)) e.year = 'This field is required';
    else if (!isPositiveNumber(d.year) || Number(d.year) < 2000 || Number(d.year) > 2100)
      e.year = 'Invalid format';
    if (!d.weekly_off_days || !Array.isArray(d.weekly_off_days) || d.weekly_off_days.length === 0)
      e.weekly_off_days = 'This field is required';
    validateDates(e, d);
    // Holiday validation
    if (d.holidays && Array.isArray(d.holidays)) {
      d.holidays.forEach((h, i) => {
        if (isEmpty(h.holiday_name)) e[`holiday_name_${i}`] = 'This field is required';
        if (isEmpty(h.holiday_date)) e[`holiday_date_${i}`] = 'This field is required';
      });
    }
    return e;
  },

  // ━━━━━━━━━━━━━━ COST METHOD ━━━━━━━━━━━━━━
  cost_method: (d) => {
    const e = {};
    validateCompanyGroup(e, d);
    if (isEmpty(d.cost_method_name)) e.cost_method_name = 'This field is required';
    else if (!REGEX.NAME.test(String(d.cost_method_name).trim())) e.cost_method_name = 'Invalid format';
    if (isEmpty(d.cost_method_code)) e.cost_method_code = 'This field is required';
    else if (!REGEX.CODE.test(String(d.cost_method_code).trim())) e.cost_method_code = 'Invalid format';
    if (isEmpty(d.module_id)) e.module_id = 'This field is required';
    validateDates(e, d);
    return e;
  },

  // ━━━━━━━━━━━━━━ COST TYPE ━━━━━━━━━━━━━━
  cost_type: (d) => {
    const e = {};
    validateCompanyGroup(e, d);
    if (isEmpty(d.cost_type_name)) e.cost_type_name = 'This field is required';
    else if (!REGEX.NAME.test(String(d.cost_type_name).trim())) e.cost_type_name = 'Invalid format';
    if (isEmpty(d.cost_type_code)) e.cost_type_code = 'This field is required';
    else if (!REGEX.CODE.test(String(d.cost_type_code).trim())) e.cost_type_code = 'Invalid format';
    if (isEmpty(d.module_id)) e.module_id = 'This field is required';
    validateDates(e, d);
    return e;
  },

  // ━━━━━━━━━━━━━━ ORG PARAMETER ━━━━━━━━━━━━━━
  org_parameter: (d) => {
    const e = {};
    validateCompanyGroup(e, d);
    if (isEmpty(d.inv_org_id)) e.inv_org_id = 'This field is required';
    if (isEmpty(d.org_code)) e.org_code = 'This field is required';
    else if (!REGEX.CODE.test(String(d.org_code).trim())) e.org_code = 'Invalid format';
    if (isEmpty(d.workday_calendar_id)) e.workday_calendar_id = 'This field is required';
    if (isEmpty(d.cost_method_id)) e.cost_method_id = 'This field is required';
    if (isEmpty(d.cost_type_id)) e.cost_type_id = 'This field is required';
    if (!isEmpty(d.move_order_timeout_days) && !isNonNegativeNumber(d.move_order_timeout_days))
      e.move_order_timeout_days = 'Invalid format';
    if (isEmpty(d.module_id)) e.module_id = 'This field is required';
    validateDates(e, d);
    return e;
  },

  // ━━━━━━━━━━━━━━ SHIP METHOD ━━━━━━━━━━━━━━
  ship_method: (d) => {
    const e = {};
    validateCompanyGroup(e, d);
    if (isEmpty(d.ship_method_name)) e.ship_method_name = 'This field is required';
    else if (!REGEX.NAME.test(String(d.ship_method_name).trim())) e.ship_method_name = 'Invalid format';
    if (isEmpty(d.method_code)) e.method_code = 'This field is required';
    else if (!REGEX.CODE.test(String(d.method_code).trim())) e.method_code = 'Invalid format';
    if (isEmpty(d.module_id)) e.module_id = 'This field is required';
    validateDates(e, d);
    return e;
  },

  // ━━━━━━━━━━━━━━ SHIP NETWORK ━━━━━━━━━━━━━━
  ship_network: (d) => {
    const e = {};
    validateCompanyGroup(e, d);
    if (isEmpty(d.from_inv_org_id)) e.from_inv_org_id = 'This field is required';
    if (isEmpty(d.to_inv_org_id)) e.to_inv_org_id = 'This field is required';
    if (!isEmpty(d.from_inv_org_id) && !isEmpty(d.to_inv_org_id) && String(d.from_inv_org_id) === String(d.to_inv_org_id))
      e.to_inv_org_id = 'Invalid format';
    if (isEmpty(d.transfer_type)) e.transfer_type = 'This field is required';
    if (isEmpty(d.default_ship_method_id)) e.default_ship_method_id = 'This field is required';
    if (isEmpty(d.intransit_lead_time_days)) e.intransit_lead_time_days = 'This field is required';
    else if (!isNonNegativeNumber(d.intransit_lead_time_days)) e.intransit_lead_time_days = 'Invalid format';
    if (isEmpty(d.module_id)) e.module_id = 'This field is required';
    validateDates(e, d);
    return e;
  },

  // ━━━━━━━━━━━━━━ INTERCOMPANY ━━━━━━━━━━━━━━
  intercompany: (d) => {
    const e = {};
    validateCompanyGroup(e, d);
    if (isEmpty(d.ship_ou_id)) e.ship_ou_id = 'This field is required';
    if (isEmpty(d.sell_ou_id)) e.sell_ou_id = 'This field is required';
    if (!isEmpty(d.ship_ou_id) && !isEmpty(d.sell_ou_id) && String(d.ship_ou_id) === String(d.sell_ou_id))
      e.sell_ou_id = 'Invalid format';
    if (isEmpty(d.relation_type)) e.relation_type = 'This field is required';
    if (isEmpty(d.ar_inv_method_id)) e.ar_inv_method_id = 'This field is required';
    if (isEmpty(d.ap_inv_method_id)) e.ap_inv_method_id = 'This field is required';
    if (d.description && d.description.length > 250) e.description = 'Invalid format';
    if (isEmpty(d.module_id)) e.module_id = 'This field is required';
    validateDates(e, d);
    return e;
  },

  // ━━━━━━━━━━━━━━ UOM TYPE ━━━━━━━━━━━━━━
  uom_type: (d) => {
    const e = {};
    validateCompanyGroup(e, d);
    if (isEmpty(d.uom_type_name)) e.uom_type_name = 'This field is required';
    else if (!REGEX.NAME.test(String(d.uom_type_name).trim())) e.uom_type_name = 'Invalid format';
    if (isEmpty(d.uom_type_code)) e.uom_type_code = 'This field is required';
    else if (!REGEX.CODE.test(String(d.uom_type_code).trim())) e.uom_type_code = 'Invalid format';
    if (isEmpty(d.module_id)) e.module_id = 'This field is required';
    validateDates(e, d);
    return e;
  },

  // ━━━━━━━━━━━━━━ UOM ━━━━━━━━━━━━━━
  uom: (d) => {
    const e = {};
    validateCompanyGroup(e, d);
    if (isEmpty(d.uom_type_id)) e.uom_type_id = 'This field is required';
    if (isEmpty(d.uom_name)) e.uom_name = 'This field is required';
    else if (!REGEX.NAME.test(String(d.uom_name).trim())) e.uom_name = 'Invalid format';
    if (isEmpty(d.uom_code)) e.uom_code = 'This field is required';
    else if (!REGEX.CODE.test(String(d.uom_code).trim())) e.uom_code = 'Invalid format';
    if (isEmpty(d.decimal_precision)) e.decimal_precision = 'This field is required';
    else {
      const prec = Number(d.decimal_precision);
      if (isNaN(prec) || prec < 0 || prec > 6) e.decimal_precision = 'Invalid format';
    }
    if (isEmpty(d.module_id)) e.module_id = 'This field is required';
    validateDates(e, d);
    return e;
  },

  // ━━━━━━━━━━━━━━ UOM CONVERSION ━━━━━━━━━━━━━━
  uom_conv: (d) => {
    const e = {};
    validateCompanyGroup(e, d);
    if (isEmpty(d.item_id)) e.item_id = 'This field is required';
    if (isEmpty(d.from_uom_id)) e.from_uom_id = 'This field is required';
    if (isEmpty(d.to_uom_id)) e.to_uom_id = 'This field is required';
    else if (!isEmpty(d.from_uom_id) && String(d.from_uom_id) === String(d.to_uom_id)) e.to_uom_id = 'Invalid format';
    if (isEmpty(d.conversion_rate)) e.conversion_rate = 'This field is required';
    else if (!isPositiveNumber(d.conversion_rate)) e.conversion_rate = 'Invalid format';
    if (isEmpty(d.conversion_type)) e.conversion_type = 'This field is required';
    if (isEmpty(d.module_id)) e.module_id = 'This field is required';
    validateDates(e, d);
    return e;
  },

  // ━━━━━━━━━━━━━━ CATEGORY SET ━━━━━━━━━━━━━━
  category_set: (d) => {
    const e = {};
    validateCompanyGroup(e, d);
    if (isEmpty(d.category_set_name)) e.category_set_name = 'This field is required';
    else if (!REGEX.NAME.test(String(d.category_set_name).trim())) e.category_set_name = 'Invalid format';
    if (isEmpty(d.category_set_code)) e.category_set_code = 'This field is required';
    else if (!REGEX.CODE.test(String(d.category_set_code).trim())) e.category_set_code = 'Invalid format';
    if (isEmpty(d.module_id)) e.module_id = 'This field is required';
    validateDates(e, d);
    return e;
  },

  // ━━━━━━━━━━━━━━ ITEM CATEGORY ━━━━━━━━━━━━━━
  item_category: (d) => {
    const e = {};
    validateCompanyGroup(e, d);
    if (isEmpty(d.category_set_id)) e.category_set_id = 'This field is required';
    if (isEmpty(d.category_name)) e.category_name = 'This field is required';
    else if (!REGEX.NAME.test(String(d.category_name).trim())) e.category_name = 'Invalid format';
    if (isEmpty(d.category_code)) e.category_code = 'This field is required';
    else if (!REGEX.CODE.test(String(d.category_code).trim())) e.category_code = 'Invalid format';
    if (isEmpty(d.module_id)) e.module_id = 'This field is required';
    validateDates(e, d);
    return e;
  },

  // ━━━━━━━━━━━━━━ ITEM SUB CATEGORY ━━━━━━━━━━━━━━
  item_sub_category: (d) => {
    const e = {};
    validateCompanyGroup(e, d);
    if (isEmpty(d.category_id)) e.category_id = 'This field is required';
    if (isEmpty(d.sub_category_name)) e.sub_category_name = 'This field is required';
    else if (!REGEX.NAME.test(String(d.sub_category_name).trim())) e.sub_category_name = 'Invalid format';
    if (isEmpty(d.sub_category_code)) e.sub_category_code = 'This field is required';
    else if (!REGEX.CODE.test(String(d.sub_category_code).trim())) e.sub_category_code = 'Invalid format';
    if (isEmpty(d.module_id)) e.module_id = 'This field is required';
    validateDates(e, d);
    return e;
  },

  brand: (d) => {
    const e = {};
    validateCompanyGroup(e, d);
    if (isEmpty(d.brand_name)) e.brand_name = 'This field is required';
    else if (!REGEX.NAME.test(String(d.brand_name).trim())) e.brand_name = 'Invalid format';
    if (isEmpty(d.brand_code)) e.brand_code = 'This field is required';
    else if (!REGEX.CODE.test(String(d.brand_code).trim())) e.brand_code = 'Invalid format';
    if (isEmpty(d.module_id)) e.module_id = 'This field is required';
    validateDates(e, d);
    return e;
  },

  item_type: (d) => {
    const e = {};
    validateCompanyGroup(e, d);
    if (isEmpty(d.item_type_name)) e.item_type_name = 'This field is required';
    if (isEmpty(d.module_id)) e.module_id = 'This field is required';
    validateDates(e, d);
    return e;
  },

  zone: (d) => {
    const e = {};
    validateCompanyGroup(e, d);
    if (isEmpty(d.zone_name)) e.zone_name = 'This field is required';
    if (isEmpty(d.zone_code)) e.zone_code = 'This field is required';
    else if (!REGEX.CODE.test(String(d.zone_code).trim())) e.zone_code = 'Invalid format';
    if (isEmpty(d.zone_type)) e.zone_type = 'This field is required';
    if (isEmpty(d.module_id)) e.module_id = 'This field is required';
    validateDates(e, d);
    return e;
  },

  subinventory: (d) => {
    const e = {};
    validateCompanyGroup(e, d);
    if (isEmpty(d.inv_org_id)) e.inv_org_id = 'This field is required';
    if (isEmpty(d.subinventory_name)) e.subinventory_name = 'This field is required';
    if (isEmpty(d.subinventory_code)) e.subinventory_code = 'This field is required';
    else if (!REGEX.CODE.test(String(d.subinventory_code).trim())) e.subinventory_code = 'Invalid format';
    if (isEmpty(d.zone_id)) e.zone_id = 'This field is required';
    if (isEmpty(d.material_status)) e.material_status = 'This field is required';
    if (isEmpty(d.module_id)) e.module_id = 'This field is required';
    validateDates(e, d);
    return e;
  },

  locator: (d) => {
    const e = {};
    validateCompanyGroup(e, d);
    if (isEmpty(d.subinventory_id)) e.subinventory_id = 'This field is required';
    if (isEmpty(d.locator_name)) e.locator_name = 'This field is required';
    if (isEmpty(d.locator_code)) e.locator_code = 'This field is required';
    else if (!REGEX.CODE.test(String(d.locator_code).trim())) e.locator_code = 'Invalid format';
    if (isEmpty(d.locator_type)) e.locator_type = 'This field is required';
    if (isEmpty(d.locator_usage)) e.locator_usage = 'This field is required';
    if (isEmpty(d.material_status)) e.material_status = 'This field is required';
    if (isEmpty(d.module_id)) e.module_id = 'This field is required';
    validateDates(e, d);
    return e;
  },

  // ━━━━━━━━━━━━━━ GENERIC FALLBACK ━━━━━━━━━━━━━━
  // For simple master pages that just need company group + dates
  _generic: (d, opts = {}) => {
    const e = {};
    if (opts.requireCompanyGroup !== false) validateCompanyGroup(e, d);
    if (opts.requiredFields) {
      for (const f of opts.requiredFields) {
        if (isEmpty(d[f.key])) e[f.key] = f.label ? `${f.label} is required` : `${f.key} is required`;
      }
    }
    if (opts.numericFields) {
      for (const f of opts.numericFields) {
        const err = f.positive ? posNum(d[f.key], f.label) : nonNeg(d[f.key], f.label);
        if (err) e[f.key] = err;
      }
    }
    if (opts.dropdownFields) {
      for (const f of opts.dropdownFields) {
        if (isEmpty(d[f.key])) e[f.key] = `Please select ${f.label}`;
      }
    }
    validateDates(e, d);
    return e;
  }
};

// ── Public API ───────────────────────────────────────────────

/**
 * Validate form data for a specific module.
 * @param {string} formName - Module key (e.g. 'inventory_org', 'item_master')
 * @param {object} data     - Form data object
 * @param {object} options  - Extra context (isPhysical, isTransfer, isLotControlled, etc.)
 * @returns {{ errors: object, isValid: boolean }}
 */
export const validate = (formName, data, options = {}) => {
  const ruleFn = RULES[formName] || RULES._generic;
  const errors = ruleFn(data, options);
  return { errors, isValid: Object.keys(errors).length === 0 };
};

/**
 * Universal auto-code generator from a name string.
 * Uppercase → remove special chars → replace spaces with _ → max 20 chars
 * @param {string} name  - Source name (e.g. "Standard Cost Method")
 * @param {string} prefix - Optional prefix (e.g. "OU_", "CM_")
 * @returns {string} Generated code (e.g. "STANDARD_COST_METHOD")
 */
export const autoCode = (name, prefix = '', existingCodes = []) => {
  if (!name || !name.trim()) return '';
  // Convert to UPPERCASE, replace non-alphanumeric with _, trim underscores
  const cleanName = name.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, '');
  let code = prefix + cleanName;
  
  // Enforce max length (20 chars)
  if (code.length > 20) code = code.substring(0, 20);

  // Uniqueness check (numeric suffix if duplicate)
  if (existingCodes && existingCodes.length > 0 && existingCodes.includes(code)) {
    let suffix = 1;
    let candidate = code;
    while (existingCodes.includes(candidate)) {
      const suffixStr = `_${suffix}`;
      const baseLen = 20 - suffixStr.length;
      candidate = code.substring(0, baseLen) + suffixStr;
      suffix++;
    }
    code = candidate;
  }
  return code;
};

// Backward compat alias
export const generateOUShortCode = (name) => autoCode(name, 'OU_');

/**
 * Legacy schema-based validation (backward compat for TransactionTypePage etc.)
 */
export const validators = {
  required: (value) => (!value && value !== 0 ? 'This field is required' : null),
  minLength: (min) => (value) => (value && value.length < min ? `Minimum ${min} characters` : null),
  maxLength: (max) => (value) => (value && value.length > max ? `Maximum ${max} characters` : null),
  pattern: (regex, msg) => (value) => (value && !regex.test(value) ? (msg || 'Invalid format') : null),
};

export const validateForm = (formData, schema) => {
  const errors = {};
  for (const [field, rules] of Object.entries(schema)) {
    for (const rule of rules) {
      const error = rule(formData[field]);
      if (error) { errors[field] = error; break; }
    }
  }
  return errors;
};

export default validate;

