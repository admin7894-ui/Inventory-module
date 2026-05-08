const db = require('../data/db');
const { generateId } = require('../utils/idGenerator');
const {
  isYes,
  asNumber,
  getControlContext,
  getSerialValues,
  findSerial,
  findLot,
  validateIssueControls,
  validateReceiptControls,
  availableQty,
  applyStandardCost
} = require('../utils/inventoryControls');
const {
  generateAutoLotNumber,
  generateAutoSerialNumbers,
  pushLotRecord,
  pushSerialRecord
} = require('../utils/lotSerialAuto');

/**
 * Inventory Transaction Processing Engine
 * Handles all stock movements, ledger updates, and tracking.
 * Supports auto lot/serial creation for Opening Stock.
 */

class InventoryEngine {
  constructor() {
    this.initTables();
  }

  initTables() {
    if (!db.inventory_transaction) db.inventory_transaction = [];
    if (!db.item_stock_onhand) db.item_stock_onhand = []; 
    if (!db.stock_ledger) db.stock_ledger = [];
    if (!db.batch___serial_tracking) db.batch___serial_tracking = [];
    if (!db.lot_master) db.lot_master = [];
    if (!db.serial_master) db.serial_master = [];
  }

  // ─── ITEM LOOKUP HELPERS ─────────────────────────────────────

  /** Look up an item from item_master */
  getItem(item_id) {
    return (db.item_master || []).find(i => i.item_id === item_id);
  }

  /** Look up an item_type from item_type table */
  getItemType(item_type_id) {
    return (db.item_type || []).find(t => t.item_type_id === item_type_id);
  }

  /** Returns true if the item is physical (is_physical = 'Y') */
  isPhysicalItem(item) {
    if (!item) return false;
    const itemType = this.getItemType(item.item_type_id);
    return itemType && (itemType.is_physical === 'Y' || itemType.is_physical === true || itemType.is_physical === 'True');
  }

  /** Returns true if the item is a stock item */
  isStockItem(item) {
    return item && (item.is_stock_item === 'Y' || item.is_stock_item === true || item.is_stock_item === 'True');
  }

  isYes(val) {
    return isYes(val);
  }

  getAssignmentRules(itemId, invOrgId) {
    const { getAssignmentRules } = require('../utils/inventoryControls');
    return getAssignmentRules(itemId, invOrgId);
  }

  /** Gets material status properties for a location (Locator > Subinventory) */
  getLocationStatus(params) {
    const { inv_org_id, subinventory_id, locator_id } = params;
    let statusText = 'Available';
    let statusId = 'MS01';

    // 1. Try Locator
    if (locator_id) {
      const locator = (db.locator___bin || []).find(l => l.locator_id === locator_id);
      if (locator && (locator.material_status || locator.material_status_id)) {
        statusText = locator.material_status || statusText;
        statusId = locator.material_status_id || statusId;
      }
    } else {
      // 2. Try Subinventory
      const subinv = (db.subinventory || []).find(s => s.subinventory_id === subinventory_id);
      if (subinv && (subinv.material_status || subinv.material_status_id)) {
        statusText = subinv.material_status || statusText;
        statusId = subinv.material_status_id || statusId;
      }
    }

    // 3. Fetch full status details
    const master = (db.material_status_master || []).find(m => 
      String(m.material_status_id) === String(statusId) || 
      String(m.status_code).toUpperCase() === String(statusText).toUpperCase()
    );

    return master || {
      material_status_id: statusId,
      status_code: statusText,
      is_saleable: 'Y',
      allow_transfer: 'Y',
      allow_reservation: 'Y',
      allow_pick: 'Y'
    };
  }

  // ─── OPENING STOCK (FULL ENGINE) ─────────────────────────────

  /**
   * Processes Opening Stock with auto lot/serial creation.
   * Steps: Validate → Lot → Serial → Transaction → On-Hand
   */
  /**
   * Helper to ensure lot/serial records exist.
   * Reuses existing if found, or creates new ones.
   */
  async ensureLotAndSerial(item, data, qty, user, controlsOverride = null, allowAutoCreate = true) {
    const controls = controlsOverride || getControlContext(data, data.opening_date || data.adjustment_date || new Date());
    let lot_id = data.lot_id || '';
    const qtyInt = Math.max(0, Math.floor(Number(qty) || 0));

    if (controls.lotRequired) {
      if (!allowAutoCreate) {
        if (!data.lot_id && !data.lot_number) throw new Error('Lot is required');
        const existingLot = findLot({
          item_id: data.item_id,
          inv_org_id: data.inv_org_id,
          lot_id: data.lot_id,
          lot_number: data.lot_number
        });
        if (!existingLot) throw new Error('Lot must exist for issue');
        lot_id = existingLot.lot_id;
        data.lot_id = lot_id;
        data.lot_number = data.lot_number || existingLot.lot_number;
      } else {
        let existingLot = null;
        if (data.lot_id) {
          existingLot = (db.lot_master || []).find(l => String(l.lot_id) === String(data.lot_id));
        } else if (data.lot_number) {
          existingLot = (db.lot_master || []).find(l =>
            String(l.item_id) === String(data.item_id) && String(l.lot_number) === String(data.lot_number)
          );
        }
        if (existingLot) {
          lot_id = existingLot.lot_id;
          data.lot_id = lot_id;
          data.lot_number = data.lot_number || existingLot.lot_number;
        } else {
          const lotNumber = data.lot_number || generateAutoLotNumber(item, data.opening_date || data.adjustment_date || new Date());
          const rec = pushLotRecord({ data, item, lot_number: lotNumber, user });
          lot_id = rec.lot_id;
          data.lot_id = lot_id;
          data.lot_number = lotNumber;
        }
      }
    }

    let serial_ids = [];
    if (controls.serialRequired) {
      if (!allowAutoCreate) {
        const serials = getSerialValues(data);
        if (!serials.length) throw new Error('Serial list is required');
        serial_ids = serials.map(v => {
          const r = findSerial(v, data.item_id, data.inv_org_id);
          if (!r) throw new Error(`Serial ${v} must exist for issue`);
          return r.serial_id;
        });
        data.serial_ids = serial_ids;
      } else if (qtyInt > 0) {
        let serialNumbers = Array.isArray(data.serial_numbers) ? data.serial_numbers.map(s => String(s).trim()).filter(Boolean) : [];
        if (!serialNumbers.length) {
          serialNumbers = generateAutoSerialNumbers(item, qtyInt);
          data.serial_numbers = serialNumbers;
        }
        for (const sn of serialNumbers) {
          let row = (db.serial_master || []).find(s =>
            String(s.item_id) === String(data.item_id) &&
            (String(s.serial_number) === String(sn) || String(s.serial_id) === String(sn))
          );
          if (!row) {
            row = pushSerialRecord({ data, item, serial_number: sn, user });
          }
          serial_ids.push(row.serial_id);
        }
        data.serial_ids = serial_ids;
      }
    }

    return { lot_id, serial_ids };
  }

  async processOpeningStock(data, user) {
    const item = this.getItem(data.item_id);
    if (!item) throw new Error(`Item ${data.item_id} not found`);

    if (!this.isPhysicalItem(item)) throw new Error('Opening stock is only allowed for physical items');
    if (!this.isStockItem(item)) throw new Error('Opening stock is only allowed for stock items');

    const qty = parseFloat(data.opening_qty || 0);
    if (qty <= 0) throw new Error('Opening quantity must be greater than 0');

    const controls = getControlContext(data, data.opening_date || new Date());
    const { lot_id, serial_ids } = await this.ensureLotAndSerial(item, data, qty, user, controls);

    // Create Transactions
    if (controls.serialRequired && serial_ids.length > 0) {
      const results = [];
      for (const sid of serial_ids) {
        const serialRow = (db.serial_master || []).find(s => String(s.serial_id) === String(sid));
        const txn = await this.processTransaction({
          ...data,
          txn_action: 'IN',
          txn_qty: 1,
          lot_id,
          serial_id: sid,
          serial_number: serialRow?.serial_number || '',
          serial_ids: undefined,
          serial_numbers: undefined,
          allow_existing_serial_receipt: true,
          reference_type: 'OPENING_STOCK',
          reference_id: data.opening_stock_id,
          reference_no: data.reference_no || data.opening_stock_id
        }, user);
        results.push(txn);
      }
      return { transactions: results, lot_id, serial_ids };
    } else {
      const txn = await this.processTransaction({
        ...data,
        txn_action: 'IN',
        txn_qty: qty,
        lot_id,
        reference_type: 'OPENING_STOCK',
        reference_id: data.opening_stock_id,
        reference_no: data.reference_no || data.opening_stock_id
      }, user);
      return { transactions: [txn], lot_id, serial_ids };
    }
  }

  /** Generate a unique serial number */
  generateSerialNumber(item_id, index) {
    const ts = Date.now().toString(36).toUpperCase();
    return `${item_id}-${ts}-${String(index).padStart(4, '0')}`;
  }

  // ─── CORE TRANSACTION PROCESSOR ───────────────────────────────

  /**
   * Processes a single inventory transaction leg.
   * @param {Object} params - Transaction data
   * @param {Object} user - User context
   */
  async processTransaction(params, user) {
    const controls = getControlContext(params, params.txn_date || new Date());
    const {
      item_id,
      inv_org_id,
      subinventory_id,
      locator_id = '',
      lot_id = '',
      serial_id = '',
      lot_number = '',
      serial_number = '',
      uom_id,
      txn_qty,
      unit_cost,
      txn_type_id,
      txn_reason_id = '',
      txn_action, // IN / OUT
      reference_type,
      reference_id,
      reference_no,
      remarks = '',
      approved_by = '',
      COMPANY_id,
      business_type_id,
      bg_id,
      module_id = 'MOD01'
    } = params;

    const item = controls.item;
    const qty = parseFloat(txn_qty || 0);
    const action = txn_action.toUpperCase();
    if (!['IN', 'OUT'].includes(action)) throw new Error('Transaction action must be IN or OUT');
    if (qty <= 0) throw new Error('Transaction quantity must be greater than 0');

    applyStandardCost(params, controls);
    const cost = parseFloat(params.unit_cost || unit_cost || 0);

    const serialValues = getSerialValues(params);
    if (controls.serialRequired && serialValues.length > 1 && !params.__singleSerial) {
      if (action === 'IN') validateReceiptControls(params, controls, qty, { allowExistingSerial: params.allow_existing_serial_receipt });
      else validateIssueControls(params, controls, qty);
      const transactions = [];
      for (const serialValue of serialValues) {
        const serial = action === 'OUT' ? findSerial(serialValue, item_id, inv_org_id) : null;
        const txn = await this.processTransaction({
          ...params,
          __singleSerial: true,
          serial_ids: undefined,
          serial_numbers: undefined,
          serial_id: serial?.serial_id || '',
          serial_number: serial?.serial_number || serialValue,
          txn_qty: 1
        }, user);
        transactions.push(txn);
      }
      return { transactions };
    }

    // 0. Validate Assignments (Org and Subinventory)
    this.validateAssignments({ item_id, inv_org_id, subinventory_id, locator_id, controls });

    if (controls.lotRequired && action === 'IN' && !params.lot_id && !params.lot_number && !lot_number) {
      params.lot_number = generateAutoLotNumber(controls.item, params.txn_date || params.opening_date || new Date());
    }

    // 0. Lot Divisible Check
    if (controls.lotRequired && (params.lot_id || lot_id)) {
      const rules = this.getAssignmentRules(item_id, inv_org_id);
      if (rules && !rules.lot_divisible_flag) {
        // If not divisible, qty must match full lot quantity in this location
        const lotId = params.lot_id || lot_id;
        const lotStock = (db.item_stock_onhand || []).find(s => 
          String(s.item_id) === String(item_id) &&
          String(s.inv_org_id) === String(inv_org_id) &&
          String(s.lot_id) === String(lotId) &&
          String(s.subinventory_id) === String(subinventory_id) &&
          (!controls.locatorRequired || String(s.locator_id || '') === String(locator_id || ''))
        );
        const lotQty = lotStock ? parseFloat(lotStock.onhand_qty) : 0;
        if (action === 'OUT' && qty !== lotQty && lotQty > 0) {
          throw new Error(`This item is configured as NON-DIVISIBLE. Partial lot transactions are not allowed. Please transact the full lot quantity (${lotQty}).`);
        }
      }
    }

    if (action === 'IN') validateReceiptControls(params, controls, qty, { allowExistingSerial: params.allow_existing_serial_receipt });
    if (action === 'OUT') validateIssueControls(params, controls, qty);

    let effectiveLotId = params.lot_id || lot_id;
    let effectiveLotNumber = params.lot_number || lot_number;
    if (controls.lotRequired && action === 'IN' && !effectiveLotId) {
      const ln = effectiveLotNumber || params.lot_no || generateAutoLotNumber(controls.item, params.txn_date || params.opening_date || new Date());
      const lotRecord = pushLotRecord({
        data: { ...params, inv_org_id, item_id, COMPANY_id, business_type_id, bg_id, module_id },
        item: controls.item,
        lot_number: ln,
        user
      });
      effectiveLotId = lotRecord.lot_id;
      effectiveLotNumber = lotRecord.lot_number;
    }

    let effectiveSerialId = serial_id;
    let effectiveSerialNumber = serial_number;
    if (controls.serialRequired && action === 'IN') {
      effectiveSerialNumber = effectiveSerialNumber || serialValues[0];
      const existingSerial = params.allow_existing_serial_receipt ? findSerial(effectiveSerialId || effectiveSerialNumber, item_id, inv_org_id) : null;
      const serialRecord = existingSerial || {
        serial_id: generateId('serial_master'),
        COMPANY_id,
        business_type_id,
        bg_id,
        inv_org_id,
        item_id,
        serial_number: effectiveSerialNumber,
        current_subinventory_id: subinventory_id,
        current_locator_id: locator_id || '',
        status: 'AVAILABLE',
        receipt_date: new Date().toISOString().split('T')[0],
        module_id: module_id || 'MOD01',
        active_flag: 'Y',
        created_by: user?.username || 'system',
        created_at: new Date().toISOString()
      };
      if (!existingSerial) db.serial_master.push(serialRecord);
      effectiveSerialId = serialRecord.serial_id;
      effectiveSerialNumber = serialRecord.serial_number;
    } else if (controls.serialRequired && action === 'OUT') {
      const serialRecord = findSerial(effectiveSerialId || effectiveSerialNumber || serialValues[0], item_id, inv_org_id);
      effectiveSerialId = serialRecord?.serial_id || effectiveSerialId;
      effectiveSerialNumber = serialRecord?.serial_number || effectiveSerialNumber;
    }

    // 1. Idempotency Check
    const existing = db.inventory_transaction.find(t => 
      t.reference_id === reference_id && 
      t.reference_type === reference_type && 
      t.txn_action === action &&
      t.item_id === item_id &&
      t.inv_org_id === inv_org_id &&
      (t.serial_id || '') === (effectiveSerialId || '')
    );
    if (existing) return existing;

    // 2. Status Validation for OUT movements
    if (action === 'OUT' && effectiveSerialId) {
      const serial = db.serial_master.find(s => s.serial_id === effectiveSerialId);
      if (serial && (serial.status === 'RESERVED' || serial.status === 'BLOCKED')) {
        throw new Error(`Serial ${serial.serial_number} is ${serial.status} and cannot be moved.`);
      }
    }

    // 3. Create Inventory Transaction Record
    const txnRecord = {
      txn_id: generateId('inventory_transaction'),
      COMPANY_id,
      business_type_id,
      bg_id,
      module_id,
      item_id,
      inv_org_id,
      subinventory_id,
      locator_id,
      lot_id: effectiveLotId,
      serial_id: effectiveSerialId,
      lot_number: effectiveLotNumber || (effectiveLotId ? db.lot_master.find(l => l.lot_id === effectiveLotId)?.lot_number : ''),
      serial_number: effectiveSerialNumber || (effectiveSerialId ? db.serial_master.find(s => s.serial_id === effectiveSerialId)?.serial_number : ''),
      uom_id: uom_id || item?.primary_uom_id,
      txn_type_id,
      txn_reason_id,
      txn_action: action,
      txn_qty: qty,
      signed_txn_qty: action === 'OUT' ? -qty : qty,
      unit_cost: cost,
      txn_value: (qty * cost).toFixed(4),
      txn_date: new Date().toISOString().split('T')[0],
      reference_type,
      reference_id,
      reference_no,
      txn_status: 'COMPLETED',
      approved_by: approved_by || user?.username || 'system',
      active_flag: 'Y',
      remarks,
      created_by: user?.username || 'system',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    db.inventory_transaction.push(txnRecord);

    // 3.5. Add Stock Level Warnings
    const rules = this.getAssignmentRules(item_id, inv_org_id);
    if (rules) {
      const currentStock = availableQty(params, controls);
      const nextStock = action === 'IN' ? currentStock + qty : currentStock - qty;
      
      if (action === 'OUT' && nextStock < rules.safety_stock_qty && currentStock >= rules.safety_stock_qty) {
        txnRecord.warnings = txnRecord.warnings || [];
        txnRecord.warnings.push({
          type: 'SAFETY_STOCK',
          message: `Remaining stock will become ${nextStock} which is below safety stock level (${rules.safety_stock_qty}).`
        });
      }
      
      if (nextStock < rules.min_qty) {
        txnRecord.warnings = txnRecord.warnings || [];
        txnRecord.warnings.push({
          type: 'MIN_STOCK',
          message: `Warning: Stock quantity has fallen below the minimum stock level (${rules.min_qty}).`
        });
      }
      
      if (action === 'IN' && nextStock > rules.max_qty) {
        txnRecord.warnings = txnRecord.warnings || [];
        txnRecord.warnings.push({
          type: 'MAX_STOCK',
          message: `Warning: Stock quantity exceeds the configured maximum stock level (${rules.max_qty}).`
        });
      }
    }

    // 4. Update On-Hand Stock
    this.updateStock({
      COMPANY_id,
      business_type_id,
      bg_id,
      item_id,
      inv_org_id,
      subinventory_id,
      locator_id,
      lot_id: effectiveLotId,
      serial_id: effectiveSerialId,
      lot_number: txnRecord.lot_number,
      uom_id: txnRecord.uom_id,
      qty,
      cost,
      action,
      txn_id: txnRecord.txn_id,
      locatorRequired: controls.locatorRequired
    });

    // 5. Create Stock Ledger Entry
    this.createLedgerEntry(txnRecord, user);

    // Sync lot master quantity for all lot-related transactions
    if (effectiveLotId) {
      this.syncLotMasterQuantity(txnRecord, user);
    }

    // 6. Update Batch/Serial Tracking & Serial Master
    if (effectiveLotId || effectiveSerialId || txnRecord.lot_number || txnRecord.serial_number) {
      this.updateTracking(txnRecord, user);
      
      if (effectiveSerialId) {
        const serialIdx = db.serial_master.findIndex(s => s.serial_id === effectiveSerialId);
        if (serialIdx !== -1) {
          const locStatus = this.getLocationStatus({ inv_org_id, subinventory_id, locator_id });
          
          if (action === 'IN') {
            db.serial_master[serialIdx].status = !this.isYes(locStatus.is_saleable) ? 'DAMAGED' : 'AVAILABLE';
            db.serial_master[serialIdx].current_subinventory_id = subinventory_id;
            db.serial_master[serialIdx].current_locator_id = locator_id;
          } else {
            db.serial_master[serialIdx].status = 'ISSUED';
            db.serial_master[serialIdx].current_subinventory_id = '';
            db.serial_master[serialIdx].current_locator_id = '';
          }
          db.serial_master[serialIdx].updated_at = new Date().toISOString();
        }
      }
    }

    return txnRecord;
  }

  updateStock(params) {
    const { COMPANY_id, business_type_id, bg_id, item_id, inv_org_id, subinventory_id, locator_id, lot_id, serial_id, lot_number, uom_id, qty, cost, action, txn_id, locatorRequired = true } = params;

    const stockMatch = (s) => 
      s.COMPANY_id === COMPANY_id &&
      s.item_id === item_id &&
      s.inv_org_id === inv_org_id &&
      (s.subinventory_id || '') === (subinventory_id || '') &&
      (locatorRequired ? ((s.locator_id || '') === (locator_id || '')) : true) &&
      (s.lot_id || '') === (lot_id || '') &&
      (s.serial_id || '') === (serial_id || '');

    let stock = db.item_stock_onhand.find(stockMatch);

    if (!stock && action === 'IN') {
      stock = {
        stock_id: generateId('item_stock_onhand'),
        COMPANY_id,
        business_type_id,
        bg_id,
        item_id,
        inv_org_id,
        subinventory_id,
        locator_id,
        lot_id,
        serial_id,
        lot_number,
        uom_id,
        onhand_qty: 0,
        reserved_qty: 0,
        available_qty: 0,
        hold_qty: 0,
        damaged_qty: 0,
        in_transit_qty: 0,
        unit_cost: cost,
        total_cost_value: 0,
        last_transaction_id: txn_id,
        active_flag: 'Y',
        created_at: new Date().toISOString()
      };
      db.item_stock_onhand.push(stock);
    }

    if (stock) {
      const locStatus = this.getLocationStatus({ inv_org_id, subinventory_id, locator_id });
      const isDamaged = locStatus.status_code.toUpperCase().includes('DAMAGE') || !this.isYes(locStatus.is_saleable);
      const isHold = locStatus.status_code.toUpperCase().includes('HOLD');

      if (action === 'IN') {
        stock.onhand_qty = (parseFloat(stock.onhand_qty) || 0) + qty;
        if (isDamaged) stock.damaged_qty = (parseFloat(stock.damaged_qty) || 0) + qty;
        else if (isHold) stock.hold_qty = (parseFloat(stock.hold_qty) || 0) + qty;
      } else if (action === 'OUT') {
        stock.onhand_qty = Math.max(0, (parseFloat(stock.onhand_qty) || 0) - qty);
        if (isDamaged) stock.damaged_qty = Math.max(0, (parseFloat(stock.damaged_qty) || 0) - qty);
        else if (isHold) stock.hold_qty = Math.max(0, (parseFloat(stock.hold_qty) || 0) - qty);
      }
      
      // Recalculate derived fields
      stock.reserved_qty = parseFloat(stock.reserved_qty) || 0;
      stock.damaged_qty = parseFloat(stock.damaged_qty) || 0;
      stock.hold_qty = parseFloat(stock.hold_qty) || 0;
      stock.in_transit_qty = parseFloat(stock.in_transit_qty) || 0;
      
      // available_qty excludes reserved, damaged, and hold stock
      stock.available_qty = Math.max(0, 
        (parseFloat(stock.onhand_qty) || 0) - 
        (parseFloat(stock.reserved_qty) || 0) - 
        (parseFloat(stock.damaged_qty) || 0) - 
        (parseFloat(stock.hold_qty) || 0)
      );
      stock.total_cost_value = ((parseFloat(stock.onhand_qty) || 0) * (parseFloat(stock.unit_cost) || cost)).toFixed(4);
      stock.last_transaction_id = txn_id;
      stock.updated_at = new Date().toISOString();
    }
  }

  createLedgerEntry(txn, user) {
    const lastEntry = [...db.stock_ledger]
      .filter(l => 
        l.COMPANY_id === txn.COMPANY_id && 
        l.item_id === txn.item_id && 
        l.inv_org_id === txn.inv_org_id &&
        String(l.subinventory_id || '') === String(txn.subinventory_id || '') &&
        String(l.locator_id || '') === String(txn.locator_id || '')
      )
      .pop();
    
    const prevBal = parseFloat(lastEntry?.balance_qty || 0);
    const dr = txn.txn_action === 'IN' ? txn.txn_qty : 0;
    const cr = txn.txn_action === 'OUT' ? txn.txn_qty : 0;
    const nextBal = prevBal + dr - cr;

    const ledgerEntry = {
      ledger_id: generateId('stock_ledger'),
      COMPANY_id: txn.COMPANY_id,
      business_type_id: txn.business_type_id,
      bg_id: txn.bg_id,
      item_id: txn.item_id,
      inv_org_id: txn.inv_org_id,
      subinventory_id: txn.subinventory_id,
      locator_id: txn.locator_id,
      lot_id: txn.lot_id,
      serial_id: txn.serial_id,
      lot_number: txn.lot_number,
      serial_number: txn.serial_number,
      uom_id: txn.uom_id,
      transaction_id: txn.txn_id,
      txn_reason_id: txn.txn_reason_id || '',
      transaction_date: txn.txn_date,
      txn_type_id: txn.txn_type_id,
      movement_type: txn.txn_action,
      before_qty: prevBal,
      dr_qty: dr,
      cr_qty: cr,
      after_qty: nextBal,
      balance_qty: nextBal,
      unit_cost: txn.unit_cost,
      transaction_value: txn.txn_value,
      reference_no: txn.reference_no,
      remarks: txn.remarks,
      active_flag: 'Y',
      created_by: user?.username || 'system',
      created_at: new Date().toISOString()
    };
    db.stock_ledger.push(ledgerEntry);
  }

  syncLotMasterQuantity(txn, user) {
    if (!txn?.lot_id) return;

    const lotIdx = (db.lot_master || []).findIndex(l =>
      String(l.lot_id) === String(txn.lot_id) &&
      String(l.item_id) === String(txn.item_id)
    );
    if (lotIdx === -1) return;

    // Calculate total onhand qty for this lot across all subinventories/locators in this org
    const lotQty = (db.item_stock_onhand || [])
      .filter(s =>
        String(s.item_id) === String(txn.item_id) &&
        String(s.inv_org_id) === String(txn.inv_org_id) &&
        String(s.lot_id || '') === String(txn.lot_id || '')
      )
      .reduce((sum, row) => sum + (parseFloat(row.onhand_qty) || 0), 0);

    db.lot_master[lotIdx].current_qty = lotQty;
    db.lot_master[lotIdx].status = lotQty <= 0 ? 'DEPLETED' : 'ACTIVE';
    db.lot_master[lotIdx].updated_by = user?.username || 'system';
    db.lot_master[lotIdx].updated_at = new Date().toISOString();
  }

  updateTracking(txn, user) {
    const item = this.getItem(txn.item_id);
    const tracking = {
      tracking_id: generateId('batch___serial_tracking'),
      COMPANY_id: txn.COMPANY_id,
      business_type_id: txn.business_type_id,
      bg_id: txn.bg_id,
      item_id: txn.item_id,
      lot_id: txn.lot_id,
      serial_id: txn.serial_id,
      lot_number: txn.lot_number,
      serial_number: txn.serial_number,
      uom_id: txn.uom_id,
      txn_id: txn.txn_id,
      txn_type_id: txn.txn_type_id,
      txn_reason_id: txn.txn_reason_id || '',
      inv_org_id: txn.inv_org_id,
      subinventory_id: txn.subinventory_id,
      locator_id: txn.locator_id,
      tracking_qty: txn.txn_qty,
      tracking_date: txn.txn_date,
      receipt_date: txn.txn_date,
      manufacture_date: txn.txn_date, // Default to txn_date if not known
      tracking_type: txn.serial_id ? 'SERIAL' : 'BATCH',
      status: txn.txn_action === 'IN' ? 'AVAILABLE' : 'ISSUED',
      reference_type: txn.reference_type,
      reference_id: txn.reference_id,
      reference_no: txn.reference_no,
      remarks: txn.remarks,
      active_flag: 'Y',
      created_by: user?.username || 'system',
      created_at: new Date().toISOString()
    };

    // If expirable, set expiry date
    if (item && this.isYes(item.is_expirable)) {
      const d = new Date(txn.txn_date);
      d.setFullYear(d.getFullYear() + 1);
      tracking.expiry_date = d.toISOString().split('T')[0];
    }

    db.batch___serial_tracking.push(tracking);
  }

  /**
   * Processes Stock Adjustment (including Transfers)
   */
  async processStockAdjustment(adj, user) {
    const isTransfer = adj.txn_action === 'TRANSFER' || adj.transfer_flag === 'Y' || adj.txn_type_id === 'TT03';
    const item = this.getItem(adj.item_id);

    if (isTransfer) {
      // Leg 1: Source OUT
      const outTxn = await this.processTransaction({
        ...adj,
        uom_id: adj.uom_id || item?.primary_uom_id,
        txn_action: 'OUT',
        txn_qty: adj.adjustment_qty,
        reference_type: 'TRANSFER_OUT',
        reference_id: adj.adjustment_id,
        reference_no: adj.adjustment_id,
        approved_by: adj.approved_by || user?.username || 'system'
      }, user);

      // Leg 2: Destination IN
      const inTxn = await this.processTransaction({
        ...adj,
        uom_id: adj.uom_id || item?.primary_uom_id,
        inv_org_id: adj.to_inv_org_id,
        subinventory_id: adj.to_subinventory_id,
        locator_id: adj.to_locator_id || '',
        allow_existing_serial_receipt: true,
        txn_action: 'IN',
        txn_qty: adj.adjustment_qty,
        reference_type: 'TRANSFER_IN',
        reference_id: adj.adjustment_id,
        reference_no: adj.adjustment_id,
        approved_by: adj.approved_by || user?.username || 'system'
      }, user);

      return { outTxn, inTxn };
    } else {
      // Normal Adjustment (IN / OUT / generic ADJUSTMENT)
      const qty = parseFloat(adj.adjustment_qty);

      // Prefer explicit txn_action when it's IN or OUT.
      // For generic ADJUSTMENT types the sign of adjustment_qty drives direction.
      let action;
      if (adj.txn_action === 'IN') {
        action = 'IN';
      } else if (adj.txn_action === 'OUT') {
        action = 'OUT';
      } else {
        // Generic adjustment: derive from sign
        action = qty >= 0 ? 'IN' : 'OUT';
      }

      const absQty = Math.abs(qty);
      if (absQty <= 0) {
        throw new Error('Adjustment quantity must be greater than 0');
      }

    const controlsAdj = getControlContext(adj, adj.adjustment_date || new Date());
    const allowAuto = action === 'IN';
    const { lot_id, serial_ids } = await this.ensureLotAndSerial(item, adj, absQty, user, controlsAdj, allowAuto);

    if (controlsAdj.serialRequired && serial_ids.length > 0) {
      const results = [];
      for (const sid of serial_ids) {
        const serialRow = (db.serial_master || []).find(s => String(s.serial_id) === String(sid));
        const txn = await this.processTransaction({
          ...adj,
          txn_action: action,
          txn_qty: 1,
          lot_id,
          serial_id: sid,
          serial_number: serialRow?.serial_number || '',
          serial_ids: undefined,
          serial_numbers: undefined,
          allow_existing_serial_receipt: true,
          reference_type: action === 'OUT' ? 'ADJUSTMENT_OUT' : 'ADJUSTMENT',
          reference_id: adj.adjustment_id,
          reference_no: adj.adjustment_id
        }, user);
        results.push(txn);
      }
      return { transactions: results };
    } else {
      return this.processTransaction({
        ...adj,
        txn_action: action,
        txn_qty: absQty,
        lot_id,
        reference_type: action === 'OUT' ? 'ADJUSTMENT_OUT' : 'ADJUSTMENT',
        reference_id: adj.adjustment_id,
        reference_no: adj.adjustment_id
      }, user);
    }
    }
  }

  // ─── VALIDATION HELPERS ───────────────────────────────────────

  /**
   * Validates that the item is correctly assigned to the Org
   * and restricted to the specified Subinventory/Locator.
   */
  validateAssignments({ item_id, inv_org_id, subinventory_id, locator_id, controls }) {
    // 1. Check Item Org Assignment
    const orgAssignment = (db.item_org_assignment || []).find(a =>
      a.item_id === item_id && a.inv_org_id === inv_org_id
    );
    if (!orgAssignment) {
      throw new Error(`Item ${item_id} is not assigned to Inventory Organization ${inv_org_id}. Please assign it first in Item Org Assignment.`);
    }

    // 2. Check Org Parameters for Locator Control
    const locatorControlEnabled = controls ? controls.locatorRequired : false;

    if (locatorControlEnabled && !locator_id) {
      throw new Error(`Locator is mandatory for Inventory Organization ${inv_org_id} (Locator Control is enabled).`);
    }
    if (!locatorControlEnabled && locator_id) {
      throw new Error(`Locator not allowed for Inventory Organization ${inv_org_id} (Locator Control is disabled).`);
    }

    // 3. Check Subinventory Restriction - must have at least one rule for this item+org
    const restrictions = (db.item_subinventory_restriction || []).filter(r =>
      r.item_id === item_id && r.inv_org_id === inv_org_id
    );

    if (restrictions.length === 0) {
      throw new Error(`Item ${item_id} has no Subinventory Rules defined for Org ${inv_org_id}. Please map the item to a subinventory first.`);
    }

    // 4. Check if this specific subinventory (and locator) is allowed
    const subRestrictions = restrictions.filter(r => r.subinventory_id === subinventory_id);
    if (subRestrictions.length === 0) {
      throw new Error(`Item ${item_id} is not allowed in Subinventory ${subinventory_id} for Org ${inv_org_id}.`);
    }

    // 5. If locator control is enabled and a locator is provided, check locator mapping
    if (locatorControlEnabled && locator_id) {
      // Check if any restriction has a specific locator_id — if yes, enforce strict match
      const restrictionsWithLocators = subRestrictions.filter(r => r.locator_id);
      if (restrictionsWithLocators.length > 0) {
        const locatorAllowed = restrictionsWithLocators.some(r => r.locator_id === locator_id);
        if (!locatorAllowed) {
          throw new Error(`Item ${item_id} is not allowed in Locator ${locator_id} of Subinventory ${subinventory_id}. Check Item-Subinventory Restrictions.`);
        }
      }
      // If no restriction has locator_id set, allow any locator in the mapped subinventory
    }
  }
}


module.exports = new InventoryEngine();
