// Validation helpers for all 46 tables

const PATTERNS = {
  // IDs
  bg_id: /^BG\d{2,5}$/,
  company_id: /^C\d{2,5}$/,
  item_id: /^ITEM-\d{3,6}$/,
  txn_id: /^TXN\d{2,5}$/,
  stock_id: /^STK-\d{3,6}$/,
  ledger_id: /^SLG-\d{3,6}$/,
  adjustment_id: /^ADJ-\d{3,6}$/,
  tracking_id: /^TRK-\d{3,6}$/,
  opening_stock_id: /^OPS-\d{3,6}$/,
  locator_id: /^BIN-\d{3,6}$/,
  lot_id: /^LOT\d{2,5}$/,
  serial_id: /^SER\d{2,5}$/,
  uom_id: /^UOM\d{2,5}$/,

  // Fields
  PAN: /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/,
  GST: /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/,
  item_code: /^[A-Z0-9-]{3,30}$/,
  calendar_code: /^[A-Z0-9]{3,10}$/,
  active_flag: /^(Y|N)$/,
  effective_from: /^\d{4}-\d{2}-\d{2}$/,
  effective_to: /^(\d{4}-\d{2}-\d{2})?$/,
  hsn_code: /^[0-9]{6,8}$/,
  reference_no: /^[A-Z0-9-]{3,30}$/,
  fiscal_year: /^FY\d{4}$/,
  period_name: /^[A-Z]{3}-\d{4}$/,
};

const LOV = {
  active_flag: ['Y', 'N'],
  txn_action: ['IN', 'OUT', 'TRANSFER', 'ADJUSTMENT'],
  txn_status: ['PENDING', 'COMPLETED', 'CANCELLED', 'ON_HOLD'],
  locator_type: ['BIN', 'SHELF', 'FLOOR', 'VIRTUAL', 'LOCATOR', 'PALLET'],
  locator_usage: ['QC', 'Storage', 'Staging', 'Receiving', 'Pick', 'Reject'],
  material_status: ['AVAILABLE', 'BLOCKED', 'QUARANTINE', 'DAMAGED', 'Hold'],
  temperature_range: ['Ambient', 'Cold', 'Frozen', '2-8°C', 'AMBIENT'],
  tracking_type: ['SERIAL', 'BATCH', 'NONE'],
  approval_status: ['PENDING', 'APPROVED', 'REJECTED'],
  adjustment_type: ['POSITIVE', 'NEGATIVE', 'WRITEOFF', 'RECOUNT'],
  relation_type: ['Internal', 'External'],
  conversion_type: ['Item', 'Standard'],
  license_type: ['DRUG_LICENSE', 'SUBSCRIPTION', 'IMPORT', 'NONE'],
  source_document_type: ['PURCHASE_ORDER', 'SALES_ORDER', 'MOVE_ORDER', 'MANUAL', 'ADJUSTMENT'],
  transaction_type_code: ['PURCHASE_RECEIPT', 'SALES_ISSUE', 'TRANSFER_IN', 'TRANSFER_OUT', 'ADJUSTMENT', 'OPENING'],
  txn_category: ['OPENING', 'ADJUSTMENT', 'TRANSFER', 'PURCHASE', 'SALES', 'SYSTEM'],
};

function validate(data, rules) {
  const errors = [];
  for (const [field, rule] of Object.entries(rules)) {
    const val = data[field];
    if (rule.required && (val === undefined || val === null || val === '')) {
      errors.push(`${field} is required`);
      continue;
    }
    if (!rule.required && (val === undefined || val === null || val === '')) continue;
    if (rule.pattern && !rule.pattern.test(String(val))) {
      errors.push(`${field} format invalid: ${val}`);
    }
    if (rule.lov && !rule.lov.includes(val)) {
      errors.push(`${field} must be one of: ${rule.lov.join(', ')}`);
    }
    if (rule.min !== undefined && Number(val) < rule.min) {
      errors.push(`${field} must be ≥ ${rule.min}`);
    }
  }
  return errors;
}

module.exports = { validate, PATTERNS, LOV };
