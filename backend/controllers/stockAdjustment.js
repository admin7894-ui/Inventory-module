const db = require('../data/db');
const { applyScopeFilter } = require('../utils/scopeFilter');
const { generateId } = require('../utils/idGenerator');
const inventoryEngine = require('../services/inventoryEngine');
const { getAssignmentRules } = require('../utils/inventoryControls');
const {
  getControlContext,
  validateIssueControls,
  validateReceiptControls,
  validateLocator,
  availableQty,
  applyStandardCost,
  isYes
} = require('../utils/inventoryControls');
const { convertToBaseUOM, getItemBaseUOM } = require('../utils/uomHelper');
const MOCK_USER = 'admin';

const TABLE = 'stock_adjustment';
const PK = 'adjustment_id';

function applyRLS(data, user) {
  return applyScopeFilter(data, user);
}

exports.getAll = (req, res) => {
  try {
    let rawData = (db[TABLE] || []).map(r => ({
      ...r,
      COMPANY_id: r.COMPANY_id || r.company_id || '',
      bg_id: r.bg_id || '',
      business_type_id: r.business_type_id || ''
    }));
    rawData = applyRLS(rawData, req.user);

    const data = rawData.map(row => {
      const item = (db.item_master || []).find(i => i.item_id === row.item_id);
      const company = (db.company || []).find(c => c.company_id === row.COMPANY_id || c.company_id === row.company_id);
      const bg = (db.business_group || []).find(b => b.bg_id === row.bg_id);
      const bt = (db.business_type || []).find(b => b.business_type_id === row.business_type_id);
      const org = (db.inventory_org || []).find(o => o.inv_org_id === row.inv_org_id);
      const subinv = (db.subinventory || []).find(s => s.subinventory_id === row.subinventory_id);
      const locator = (db.locator___bin || []).find(l => l.locator_id === row.locator_id);
      const toSubinv = (db.subinventory || []).find(s => s.subinventory_id === row.to_subinventory_id);
      const toLocator = (db.locator___bin || []).find(l => l.locator_id === row.to_locator_id);
      return {
        ...row,
        item_name: item ? item.item_name : '',
        item_code: item ? item.item_code : '',
        company_name: company ? company.company_name : '',
        bg_name: bg ? bg['Business Group Name'] : '',
        business_group_name: bg ? bg['Business Group Name'] : '',
        business_type_name: bt ? bt.name : '',
        inv_org_name: org ? org.inv_org_name : '',
        subinventory_name: subinv ? subinv.subinventory_name : '',
        locator_name: locator ? locator.locator_name : '',
        to_subinventory_name: toSubinv ? toSubinv.subinventory_name : '',
        to_locator_name: toLocator ? toLocator.locator_name : ''
      };
    });
    const { search, page = 1, limit = 50 } = req.query;
    let filtered = data;
    if (search) { const q = search.toLowerCase(); filtered = filtered.filter(r => Object.values(r).some(v => String(v || '').toLowerCase().includes(q))); }
    const total = filtered.length, p = parseInt(page), l = parseInt(limit);
    res.json({ success: true, data: filtered.slice((p - 1) * l, p * l), total, page: p, pages: Math.ceil(total / l) });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

exports.getById = (req, res) => {
  const row = (db[TABLE] || []).find(r => r[PK] === req.params.id);
  if (!row) return res.status(404).json({ success: false, message: 'Not found' });
  const item = (db.item_master || []).find(i => i.item_id === row.item_id);
  const company = (db.company || []).find(c => c.company_id === row.COMPANY_id || c.company_id === row.company_id);
  const bg = (db.business_group || []).find(b => b.bg_id === row.bg_id);
  const bt = (db.business_type || []).find(b => b.business_type_id === row.business_type_id);
  const org = (db.inventory_org || []).find(o => o.inv_org_id === row.inv_org_id);
  const subinv = (db.subinventory || []).find(s => s.subinventory_id === row.subinventory_id);
  const locator = (db.locator___bin || []).find(l => l.locator_id === row.locator_id);
  const toSubinv = (db.subinventory || []).find(s => s.subinventory_id === row.to_subinventory_id);
  const toLocator = (db.locator___bin || []).find(l => l.locator_id === row.to_locator_id);
  const data = {
    ...row,
    COMPANY_id: row.COMPANY_id || row.company_id || '',
    item_name: item ? item.item_name : '',
    item_code: item ? item.item_code : '',
    company_name: company ? company.company_name : '',
    bg_name: bg ? bg['Business Group Name'] : '',
    business_group_name: bg ? bg['Business Group Name'] : '',
    business_type_name: bt ? bt.name : '',
    inv_org_name: org ? org.inv_org_name : '',
    subinventory_name: subinv ? subinv.subinventory_name : '',
    locator_name: locator ? locator.locator_name : '',
    to_subinventory_name: toSubinv ? toSubinv.subinventory_name : '',
    to_locator_name: toLocator ? toLocator.locator_name : ''
  };
  res.json({ success: true, data });
};

async function autoCreateTransaction(adj, user) {
  return inventoryEngine.processStockAdjustment(adj, user);
}

exports.create = async (req, res) => {
  try {
    const body = { ...req.body };
    if (!body[PK]) body[PK] = generateId(TABLE);
    body.COMPANY_id = body.COMPANY_id || body.company_id;
    const fieldErrors = {};

    // ── 1. Basic Field Validation ───────────────────────────────
    const requiredFields = ['bg_id', 'COMPANY_id', 'business_type_id', 'item_id', 'txn_type_id', 'inv_org_id', 'subinventory_id', 'uom_id', 'unit_cost', 'adjustment_date'];
    for (const f of requiredFields) {
      if (!body[f]) return res.status(400).json({ success: false, message: `${f.replace('_id', '').replace('COMPANY', 'Company')} is required` });
    }

    const item = (db.item_master || []).find(i => i.item_id === body.item_id);
    if (!item && body.item_id) fieldErrors.item_id = 'Invalid Item';

    const isYes = (v) => v === 'Y' || v === true || v === 'True' || v === 'true';
    const controls = getControlContext(body, body.adjustment_date || new Date());
    applyStandardCost(body, controls);

    // UOM Conversion Logic
    const baseUomId = getItemBaseUOM(body.item_id);
    const enteredUomId = body.uom_id;
    
    // For Stock Adjustment, physical_qty is often the input
    const rawInputQty = parseFloat(body.physical_qty || 0);
    const convertedInputQty = convertToBaseUOM(body.item_id, enteredUomId, rawInputQty);

    body.entered_qty = rawInputQty;
    body.entered_uom = enteredUomId;
    body.converted_qty = convertedInputQty;
    body.base_uom = baseUomId;

    // Use converted quantity for internal logic
    body.physical_qty = convertedInputQty;
    body.uom_id = baseUomId;

    // Also need to convert system_qty for comparison if it's not already in base UOM
    // But system_qty is usually fetched from onhand_qty which IS already in base UOM.
    // Let's assume system_qty is in base UOM.

    const isLotControlled = controls.lotRequired;
    const isSerialControlled = controls.serialRequired;
    const isTransfer = body.txn_action === 'TRANSFER' || body.transfer_flag === 'Y' || body.txn_type_id === 'TT03';

    const physical = parseFloat(convertedInputQty || 0);
    const system = parseFloat(body.system_qty || 0);
    
    let netAdj = 0;
    if (isTransfer) {
      netAdj = physical;
    } else if (body.txn_action === 'IN' || body.txn_type_code === 'TXN_TYPE_INC' || body.txn_action === 'STOCK IN' || body.txn_action === 'STOCK_IN' || body.txn_action?.includes('RECEIPT')) {
      netAdj = physical;
    } else if (body.txn_action === 'OUT' || body.txn_type_code === 'TXN_TYPE_OUT' || body.txn_action === 'STOCK OUT' || body.txn_action === 'STOCK_OUT' || body.txn_action?.includes('ISSUE')) {
      netAdj = -physical;
    } else {
      netAdj = physical - system;
    }
    body.adjustment_qty = netAdj;

    const isPositiveAdj = body.txn_action === 'IN' || (!isTransfer && netAdj > 0);
    const isNegativeAdj = body.txn_action === 'OUT' || (!isTransfer && netAdj < 0);

    // ── 2. Lot/Serial Validation ────────────────────────────────
    if (isLotControlled) {
      if (isPositiveAdj) {
        if (!body.lot_id && !body.lot_number) fieldErrors.lot_id = 'Lot is required for this item';
      } else {
        if (!body.lot_id) fieldErrors.lot_id = 'Lot is required for this item';
      }
    }
    if (isSerialControlled) {
      const requiredCount = Math.floor(Math.abs(netAdj));
      if (isPositiveAdj) {
        // IN: serials are submitted as serial_numbers (text entries from serial inputs)
        const serials = (body.serial_numbers || []).filter(s => String(s).trim());
        if (serials.length !== requiredCount) {
          fieldErrors.serial_numbers = `Need exactly ${requiredCount} serial numbers for the adjusted quantity in Base UOM`;
        }
        body.serial_ids = serials;
        body.serial_numbers = serials;
      } else if (isNegativeAdj || isTransfer) {
        // OUT / TRANSFER: serials are submitted as serial_ids (IDs from the MultiSelect dropdown)
        const serialIds = (Array.isArray(body.serial_ids) ? body.serial_ids : []).filter(s => String(s).trim());
        if (serialIds.length === 0) {
          fieldErrors.serial_ids = 'Serial numbers are required for this transaction';
        } else if (serialIds.length !== requiredCount) {
          fieldErrors.serial_ids = `Serial count (${serialIds.length}) must match quantity in Base UOM (${requiredCount})`;
        }
        // Preserve the frontend serial_ids (do not overwrite)
        body.serial_ids = serialIds;
      }
    }

    // ── 3. Stock Sufficiency Check ──────────────────────────────
    // Get current stock info
    let onhandQty = 0;
    let availableQtyVal = 0;

    if (isSerialControlled) {
      // For serial controlled items, we check availability of specifically selected serials
      const stocks = (db.item_stock_onhand || []).filter(s =>
        String(s.item_id) === String(body.item_id) &&
        String(s.inv_org_id) === String(body.inv_org_id) &&
        String(s.subinventory_id) === String(body.subinventory_id) &&
        (controls.locatorRequired ? (String(s.locator_id || '') === String(body.locator_id || '')) : true) &&
        body.serial_ids.includes(s.serial_id)
      );
      onhandQty = stocks.length;
      availableQtyVal = stocks.filter(s => parseFloat(s.available_qty || 0) > 0).length;
    } else {
      // For non-serial (Lot or None), we sum the available quantity across all matching records
      onhandQty = availableQty(body, controls);
      availableQtyVal = onhandQty;
    }

    if (isTransfer) {
      // Transfer Logic
      if (body.inv_org_id && body.to_inv_org_id && String(body.inv_org_id) !== String(body.to_inv_org_id)) {
        const hasShipNetwork = (db.ship_network || []).some(sn => 
          (String(sn.from_inv_org_id) === String(body.inv_org_id) || String(sn['Dropdown from_inv_org_id']) === String(body.inv_org_id)) && 
          String(sn.to_inv_org_id) === String(body.to_inv_org_id) && 
          isYes(sn.active_flag)
        );
        if (!hasShipNetwork) {
          return res.status(400).json({ success: false, message: 'Shipping network does not exist between selected locations' });
        }
      }

      if (!body.to_inv_org_id) fieldErrors.to_inv_org_id = 'Destination Org is required';
      if (!body.to_subinventory_id) fieldErrors.to_subinventory_id = 'Destination Subinventory is required';
      if (!body.subinventory_id) fieldErrors.subinventory_id = 'Subinventory is required';
      if (controls.locatorRequired && !body.locator_id) fieldErrors.locator_id = 'Locator is required';

      const requested = parseFloat(body.physical_qty || body.adjustment_qty || 0);
      if (requested <= 0) fieldErrors.physical_qty = 'Transfer quantity must be > 0';
      if (requested > availableQtyVal) {
        fieldErrors.physical_qty = `Insufficient stock (Available: ${availableQtyVal})`;
      }

      // Block same loc
      if (body.inv_org_id === body.to_inv_org_id && body.subinventory_id === body.to_subinventory_id && (body.locator_id || '') === (body.to_locator_id || '') && body.subinventory_id) {
        fieldErrors.to_subinventory_id = 'Source and destination cannot be same';
        fieldErrors.to_locator_id = 'Source and destination cannot be same';
      }

      // Restriction check
      const destRestriction = (db.item_subinventory_restriction || []).find(r =>
        isYes(r.active_flag) && String(r.item_id) === String(body.item_id) &&
        String(r.inv_org_id) === String(body.to_inv_org_id) &&
        String(r.subinventory_id) === String(body.to_subinventory_id) &&
        (!r.locator_id || !body.to_locator_id || String(r.locator_id) === String(body.to_locator_id))
      );
      if (!destRestriction) {
        fieldErrors.to_subinventory_id = 'Destination location is not mapped/active for this item';
      }

      body.adjustment_qty = requested;
      body.transfer_flag = 'Y';
      body.approval_status = body.approval_status || 'PENDING';
      if (body.approval_status === 'APPROVED') {
        body.approved_by = body.approved_by || req.user?.username || MOCK_USER;
      } else {
        delete body.approved_by;
      }

      validateIssueControls(body, controls, requested);
      const destControls = getControlContext({ ...body, inv_org_id: body.to_inv_org_id }, body.adjustment_date || new Date());
      if (destControls.locatorRequired) validateLocator(body.to_subinventory_id, body.to_locator_id);

      // --- Damaged Inventory Validations ---
      const srcStatus = inventoryEngine.getLocationStatus({ inv_org_id: body.inv_org_id, subinventory_id: body.subinventory_id, locator_id: body.locator_id });
      const destStatus = inventoryEngine.getLocationStatus({ inv_org_id: body.to_inv_org_id, subinventory_id: body.to_subinventory_id, locator_id: body.to_locator_id });

      if (!isYes(srcStatus.allow_transfer)) {
        fieldErrors.subinventory_id = `Transfer not allowed from location with status: ${srcStatus.status_code}`;
      }
      if (!isYes(destStatus.allow_transfer)) {
        fieldErrors.to_subinventory_id = `Transfer not allowed to location with status: ${destStatus.status_code}`;
      }

      // If source is NOT damaged and destination IS damaged, it's a "Damage Transfer"
      const isSrcDamaged = !isYes(srcStatus.is_saleable);
      const isDestDamaged = !isYes(destStatus.is_saleable);

      if (!isSrcDamaged && isDestDamaged) {
        // Moving good stock to damaged area
        if (!body.txn_reason_id || !body.txn_reason_id.includes('DMG')) {
          fieldErrors.txn_reason_id = 'A damage-related reason is required when moving stock to a Damaged location';
        }
      } else if (isSrcDamaged && !isDestDamaged) {
        // Moving damaged stock back to good area (Repair/Recovery)
        if (!body.txn_reason_id || !body.txn_reason_id.includes('REP')) {
          fieldErrors.txn_reason_id = 'A repair-related reason is required when moving stock from a Damaged location';
        }
      }
    } else {
      // Adjustment Logic (IN / OUT / etc)
      const locStatus = inventoryEngine.getLocationStatus({ inv_org_id: body.inv_org_id, subinventory_id: body.subinventory_id, locator_id: body.locator_id });
      
      if (body.txn_action === 'OUT') {
        if (locStatus.is_saleable === 'Y' && locStatus.allow_pick === 'N') {
          fieldErrors.subinventory_id = `Picking/Issue not allowed from location with status: ${locStatus.status_code}`;
        }
      }

      if (body.txn_action === 'OUT' && physical > system) {
        fieldErrors.physical_qty = 'Physical quantity cannot exceed available stock for OUT transaction';
      }


      if (isSerialControlled && isNegativeAdj) {
        const serialCount = Array.isArray(body.serial_ids) ? body.serial_ids.filter(Boolean).length : 0;
        const requiredCount = Math.floor(Math.abs(netAdj));
        if (serialCount > 0 && serialCount !== requiredCount) {
          fieldErrors.serial_ids = `Serial count (${serialCount}) must match quantity (${requiredCount})`;
        }
      }

      if (netAdj < 0) {
        // Reduction: ensure we have enough available
        const reduction = Math.abs(netAdj);
        if (reduction > availableQtyVal) {
          fieldErrors.physical_qty = `Insufficient stock (Available: ${availableQtyVal})`;
        }
      }

      body.adjustment_qty = netAdj;
      body.approval_status = body.approval_status || 'PENDING';
      if (body.approval_status === 'APPROVED') body.approved_by = body.approved_by || req.user?.username || MOCK_USER;

      if (netAdj < 0) {
        const outQty = Math.abs(netAdj);
        validateIssueControls(body, controls, outQty);
      }
      
      if (isSerialControlled && isPositiveAdj) {
        const serialValidationQty = Math.floor(Math.abs(netAdj));
        const serialCount = Array.isArray(body.serial_numbers) ? body.serial_numbers.filter(Boolean).length : 0;
        if (serialCount > 0 && serialCount !== serialValidationQty) {
          fieldErrors.serial_ids = `Serial count (${serialCount}) must match quantity (${serialValidationQty})`;
        }
      }

      if (isPositiveAdj) {
        validateReceiptControls(body, controls, Math.floor(Math.abs(netAdj)));
      }
    }

    // ── Item Org Assignment Rules (OUT & TRANSFER only) ──────────
    // Only apply for OUT and TRANSFER — never for IN or Opening Stock
    const isOutOrTransfer = isTransfer || body.txn_action === 'OUT' || isNegativeAdj;
    const stockWarnings = [];
    if (isOutOrTransfer && body.item_id && body.inv_org_id) {
      const assignRules = getAssignmentRules(body.item_id, body.inv_org_id);
      if (assignRules) {
        const txnQty = parseFloat(body.physical_qty || 0);
        const currentAvail = availableQtyVal;
        const remainingQty = currentAvail - txnQty;

        // A. Lot Divisible Flag — HARD BLOCK for OUT/TRANSFER
        if (isLotControlled && body.lot_id && !assignRules.lot_divisible_flag) {
          // Find the available qty for this specific lot
          const lotStockRows = (db.item_stock_onhand || []).filter(s =>
            String(s.item_id) === String(body.item_id) &&
            String(s.inv_org_id) === String(body.inv_org_id) &&
            String(s.lot_id) === String(body.lot_id)
          );
          const lotAvailQty = lotStockRows.reduce((sum, s) => sum + parseFloat(s.available_qty || 0), 0);
          if (lotAvailQty > 0 && txnQty !== lotAvailQty) {
            fieldErrors.physical_qty = `This item is configured as NON-DIVISIBLE. Partial lot transactions are not allowed. Please transact the full lot quantity (${lotAvailQty}).`;
          }
        }

        // B. Min Qty Warning (non-blocking)
        if (assignRules.min_qty > 0 && remainingQty < assignRules.min_qty) {
          stockWarnings.push({
            type: 'MIN_QTY',
            message: `Remaining stock (${remainingQty}) will fall below Minimum Quantity level (${assignRules.min_qty}).`,
            currentQty: currentAvail,
            minQty: assignRules.min_qty,
            remainingQty
          });
        }

        // C. Safety Stock Warning (non-blocking)
        if (assignRules.safety_stock_qty > 0 && remainingQty < assignRules.safety_stock_qty) {
          stockWarnings.push({
            type: 'SAFETY_STOCK',
            message: `This transaction will reduce stock below Safety Stock level (${assignRules.safety_stock_qty}). Remaining will be ${remainingQty}.`,
            currentQty: currentAvail,
            safetyStockQty: assignRules.safety_stock_qty,
            remainingQty
          });
        }
      }
    }

    // Max Qty Warning for IN/Opening (non-blocking)
    if (!isOutOrTransfer && body.item_id && body.inv_org_id) {
      const assignRules = getAssignmentRules(body.item_id, body.inv_org_id);
      if (assignRules && assignRules.max_qty > 0) {
        const txnQty = parseFloat(body.physical_qty || 0);
        const currentOnhand = parseFloat(body.system_qty || 0);
        const resultingQty = currentOnhand + txnQty;
        if (resultingQty > assignRules.max_qty) {
          stockWarnings.push({
            type: 'MAX_QTY',
            message: `Stock quantity (${resultingQty}) will exceed configured Maximum Quantity limit (${assignRules.max_qty}).`,
            currentQty: currentOnhand,
            maxQty: assignRules.max_qty,
            resultingQty
          });
        }
      }
    }

    if (Object.keys(fieldErrors).length > 0) {
      return res.status(400).json({ success: false, errors: fieldErrors });
    }

    body.adjustment_value = (body.adjustment_qty * parseFloat(body.unit_cost || 0)).toFixed(4);
    body.active_flag = 'Y';
    body.created_by = req.user?.username || MOCK_USER;
    body.updated_by = req.user?.username || MOCK_USER;
    body.created_at = new Date().toISOString();
    body.updated_at = new Date().toISOString();

    if (body.approval_status === 'APPROVED') await autoCreateTransaction(body, req.user);

    if (!db[TABLE]) db[TABLE] = [];
    db[TABLE].push(body);

    res.status(201).json({ success: true, data: body, message: 'Stock adjustment saved', warnings: stockWarnings });
  } catch (e) { res.status(400).json({ success: false, message: e.message }); }
};

exports.update = async (req, res) => {
  try {
    const idx = (db[TABLE] || []).findIndex(r => r[PK] === req.params.id);
    if (idx === -1) return res.status(404).json({ success: false, message: 'Not found' });
    const prev = db[TABLE][idx];
    const body = { ...req.body };
    body.COMPANY_id = body.COMPANY_id || body.company_id;
    const updated = { ...prev, ...body, [PK]: req.params.id, updated_by: req.user?.username || MOCK_USER, updated_at: new Date().toISOString() };
    const isTransfer = updated.txn_action === 'TRANSFER' || updated.transfer_flag === 'Y' || updated.txn_type_id === 'TT03';
    if (!isTransfer) {
      const physical = parseFloat(updated.physical_qty || 0);
      const system = parseFloat(updated.system_qty || 0);
      const action = String(updated.txn_action || '').toUpperCase();
      const typeCode = String(updated.txn_type_code || '').toUpperCase();

      if (action === 'IN' || action.includes('STOCK IN') || action.includes('STOCK_IN') || action.includes('RECEIPT') || typeCode === 'TXN_TYPE_INC') {
        updated.adjustment_qty = physical;
      } else if (action === 'OUT' || action.includes('STOCK OUT') || action.includes('STOCK_OUT') || action.includes('ISSUE') || typeCode === 'TXN_TYPE_OUT') {
        updated.adjustment_qty = -physical;
      } else {
        updated.adjustment_qty = physical - system;
      }
    }
    updated.adjustment_value = (updated.adjustment_qty * parseFloat(updated.unit_cost || 0)).toFixed(4);
    if (updated.approval_status === 'APPROVED' && !updated.approved_by) {
      updated.approved_by = req.user?.username || MOCK_USER;
    }
    db[TABLE][idx] = updated;
    if (prev.approval_status !== 'APPROVED' && updated.approval_status === 'APPROVED') {
      await autoCreateTransaction(updated, req.user);
    }
    res.json({ success: true, data: updated });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

exports.remove = (req, res) => {
  try {
    const idx = (db[TABLE] || []).findIndex(r => r[PK] === req.params.id);
    if (idx === -1) return res.status(404).json({ success: false, message: 'Not found' });

    const record = db[TABLE][idx];
    // ── Guard: APPROVED adjustments cannot be deleted ──
    if (String(record.approval_status || '').toUpperCase() === 'APPROVED') {
      return res.status(409).json({
        success: false,
        message: 'Approved inventory adjustments cannot be deleted. Please create a reversal adjustment instead.',
        code: 'APPROVED_DELETE_BLOCKED'
      });
    }

    const [del] = db[TABLE].splice(idx, 1);
    res.json({ success: true, data: del });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

// ── Reverse an APPROVED adjustment ──
exports.reverse = async (req, res) => {
  try {
    const original = (db[TABLE] || []).find(r => r[PK] === req.params.id);
    if (!original) return res.status(404).json({ success: false, message: 'Adjustment not found' });
    if (String(original.approval_status || '').toUpperCase() !== 'APPROVED') {
      return res.status(400).json({ success: false, message: 'Only APPROVED adjustments can be reversed' });
    }
    if (original.reversal_of) {
      return res.status(400).json({ success: false, message: 'This adjustment is already a reversal' });
    }
    if (original.reversed_by) {
      return res.status(400).json({ success: false, message: 'This adjustment has already been reversed' });
    }

    const user = req.user?.username || MOCK_USER;
    const reversalId = generateId(TABLE);
    const originalAdjQty = parseFloat(original.adjustment_qty || 0);
    const reversedAdjQty = -originalAdjQty;

    // Determine reversal action
    const isTransfer = original.txn_action === 'TRANSFER' || original.transfer_flag === 'Y';
    let reversalAction = original.txn_action;
    if (!isTransfer) {
      reversalAction = originalAdjQty > 0 ? 'OUT' : 'IN';
    }

    const reversal = {
      ...original,
      [PK]: reversalId,
      adjustment_qty: reversedAdjQty,
      adjustment_value: (reversedAdjQty * parseFloat(original.unit_cost || 0)).toFixed(4),
      physical_qty: Math.abs(reversedAdjQty),
      txn_action: reversalAction,
      approval_status: 'APPROVED',
      approved_by: user,
      reversal_of: original[PK],
      reversed_by: undefined,
      reversed_date: undefined,
      reversal_reason: req.body?.reversal_reason || 'Manual Reversal',
      remarks: `REVERSAL of ${original[PK]}. ${original.remarks || ''}`.trim(),
      created_by: user,
      updated_by: user,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Post reversal inventory transactions
    await inventoryEngine.processStockAdjustment(reversal, req.user);

    // Save reversal record
    if (!db[TABLE]) db[TABLE] = [];
    db[TABLE].push(reversal);

    // Mark original as REVERSED
    const origIdx = db[TABLE].findIndex(r => r[PK] === original[PK]);
    if (origIdx !== -1) {
      db[TABLE][origIdx] = {
        ...db[TABLE][origIdx],
        reversed_by: user,
        reversed_date: new Date().toISOString().split('T')[0],
        reversal_reference_id: reversalId,
        updated_by: user,
        updated_at: new Date().toISOString()
      };
    }

    res.status(201).json({
      success: true,
      message: `Reversal adjustment ${reversalId} created successfully`,
      data: reversal,
      original: db[TABLE][origIdx]
    });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};
