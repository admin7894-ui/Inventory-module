const db = require('../data/db');
const { generateId } = require('../utils/idGenerator');

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
    return itemType && (itemType.is_physical === 'Y' || itemType.is_physical === true);
  }

  /** Returns true if the item is a stock item */
  isStockItem(item) {
    return item && (item.is_stock_item === 'Y' || item.is_stock_item === true);
  }

  isYes(val) {
    return val === 'Y' || val === true || val === 'True' || val === 'true';
  }

  // ─── OPENING STOCK (FULL ENGINE) ─────────────────────────────

  /**
   * Processes Opening Stock with auto lot/serial creation.
   * Steps: Validate → Lot → Serial → Transaction → On-Hand
   */
  async processOpeningStock(data, user) {
    const item = this.getItem(data.item_id);
    if (!item) throw new Error(`Item ${data.item_id} not found`);

    // STEP 0: Validate item is physical + stock item
    if (!this.isPhysicalItem(item)) {
      throw new Error('Opening stock is only allowed for physical items');
    }
    if (!this.isStockItem(item)) {
      throw new Error('Opening stock is only allowed for stock items (is_stock_item = Y)');
    }

    // Cannot have both serial and lot
    if (this.isYes(item.is_serial_controlled) && this.isYes(item.is_lot_controlled)) {
      throw new Error('Item has both serial and lot control enabled — this is an invalid configuration');
    }

    const qty = parseFloat(data.opening_qty || 0);
    if (qty <= 0) throw new Error('Opening quantity must be greater than 0');
    if (!data.inv_org_id) throw new Error('Inventory Organization is required');
    if (!data.subinventory_id) throw new Error('Subinventory is required');

    const openingDate = data.opening_date || new Date().toISOString().split('T')[0];
    let lot_id = '';
    let serial_ids = [];

    // STEP 1: AUTO-CREATE LOT (if lot controlled)
    if (this.isYes(item.is_lot_controlled)) {
      if (!data.lot_number) throw new Error('Lot number is required for lot-controlled items');

      let expiry_date = '';
      if (this.isYes(item.is_expirable)) {
        if (data.expiry_date) {
          expiry_date = data.expiry_date;
        } else if (item.shelf_life_days && parseInt(item.shelf_life_days) > 0) {
          const d = new Date(openingDate);
          d.setDate(d.getDate() + parseInt(item.shelf_life_days));
          expiry_date = d.toISOString().split('T')[0];
        } else {
          throw new Error('Expiry date or shelf life days required for expirable items');
        }
      }

      const lotRecord = {
        lot_id: generateId('lot_master'),
        COMPANY_id: data.COMPANY_id,
        business_type_id: data.business_type_id,
        bg_id: data.bg_id,
        item_id: data.item_id,
        lot_number: data.lot_number,
        inv_org_id: data.inv_org_id,
        subinventory_id: data.subinventory_id,
        lot_qty: qty,
        manufacture_date: openingDate,
        expiry_date: expiry_date,
        status: 'ACTIVE',
        module_id: data.module_id || 'MOD01',
        active_flag: 'Y',
        effective_from: openingDate,
        effective_to: '',
        created_by: user?.username || 'system',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      db.lot_master.push(lotRecord);
      lot_id = lotRecord.lot_id;
    }

    // STEP 2: AUTO-CREATE SERIALS (if serial controlled)
    if (this.isYes(item.is_serial_controlled)) {
      const serialNumbers = data.serial_numbers || [];
      if (serialNumbers.length > 0 && serialNumbers.length !== qty) {
        throw new Error(`Serial count (${serialNumbers.length}) must match quantity (${qty})`);
      }

      for (let i = 0; i < qty; i++) {
        const serial_number = serialNumbers[i] || this.generateSerialNumber(data.item_id, i + 1);
        const serialRecord = {
          serial_id: generateId('serial_master'),
          COMPANY_id: data.COMPANY_id,
          business_type_id: data.business_type_id,
          bg_id: data.bg_id,
          item_id: data.item_id,
          serial_number: serial_number,
          inv_org_id: data.inv_org_id,
          subinventory_id: data.subinventory_id,
          locator_id: data.locator_id || '',
          current_subinventory_id: data.subinventory_id,
          current_locator_id: data.locator_id || '',
          status: 'AVAILABLE',
          receipt_date: openingDate,
          module_id: data.module_id || 'MOD01',
          active_flag: 'Y',
          effective_from: openingDate,
          effective_to: '',
          created_by: user?.username || 'system',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        db.serial_master.push(serialRecord);
        serial_ids.push(serialRecord.serial_id);
      }
    }

    // STEP 3: CREATE INVENTORY TRANSACTION
    // For serial-controlled items, create one txn per serial; otherwise one txn for the whole qty
    if (this.isYes(item.is_serial_controlled) && serial_ids.length > 0) {
      const results = [];
      for (const sid of serial_ids) {
        const txn = await this.processTransaction({
          ...data,
          txn_action: 'IN',
          txn_qty: 1,
          lot_id: lot_id,
          serial_id: sid,
          reference_type: 'OPENING_STOCK',
          reference_id: data.opening_stock_id,
          reference_no: data.reference_no || data.opening_stock_id,
          txn_type_id: data.txn_type_id || 'TT06'
        }, user);
        results.push(txn);
      }
      return { transactions: results, lot_id, serial_ids };
    } else {
      const txn = await this.processTransaction({
        ...data,
        txn_action: 'IN',
        txn_qty: qty,
        lot_id: lot_id,
        reference_type: 'OPENING_STOCK',
        reference_id: data.opening_stock_id,
        reference_no: data.reference_no || data.opening_stock_id,
        txn_type_id: data.txn_type_id || 'TT06'
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
    const {
      item_id,
      inv_org_id,
      subinventory_id,
      locator_id = '',
      lot_id = '',
      serial_id = '',
      txn_qty,
      unit_cost,
      txn_type_id,
      txn_action, // IN / OUT
      reference_type,
      reference_id,
      reference_no,
      remarks = '',
      COMPANY_id,
      business_type_id,
      bg_id,
      module_id = 'MOD01'
    } = params;

    // Block non-physical items from inventory transactions
    const item = this.getItem(item_id);
    if (item && !this.isPhysicalItem(item)) {
      throw new Error('Inventory transactions are not allowed for non-physical (software) items');
    }

    // 1. Idempotency Check
    const existing = db.inventory_transaction.find(t => 
      t.reference_id === reference_id && 
      t.reference_type === reference_type && 
      t.txn_action === txn_action &&
      t.item_id === item_id &&
      t.inv_org_id === inv_org_id &&
      (t.serial_id || '') === (serial_id || '')
    );
    if (existing) return existing;

    const qty = parseFloat(txn_qty || 0);
    const cost = parseFloat(unit_cost || 0);
    const action = txn_action.toUpperCase();

    // 2. Status Validation for OUT movements
    if (action === 'OUT' && serial_id) {
      const serial = db.serial_master.find(s => s.serial_id === serial_id);
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
      lot_id,
      serial_id,
      txn_type_id,
      txn_action: action,
      txn_qty: qty,
      unit_cost: cost,
      txn_value: (qty * cost).toFixed(4),
      txn_date: new Date().toISOString().split('T')[0],
      reference_type,
      reference_id,
      reference_no,
      txn_status: 'COMPLETED',
      remarks,
      created_by: user?.username || 'system',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    db.inventory_transaction.push(txnRecord);

    // 4. Update On-Hand Stock
    this.updateStock({
      COMPANY_id,
      item_id,
      inv_org_id,
      subinventory_id,
      locator_id,
      lot_id,
      serial_id,
      qty,
      cost,
      action
    });

    // 5. Create Stock Ledger Entry
    this.createLedgerEntry(txnRecord, user);

    // 6. Update Batch/Serial Tracking & Serial Master
    if (lot_id || serial_id) {
      this.updateTracking(txnRecord, user);
      
      if (serial_id) {
        const serialIdx = db.serial_master.findIndex(s => s.serial_id === serial_id);
        if (serialIdx !== -1) {
          db.serial_master[serialIdx].status = action === 'IN' ? 'AVAILABLE' : 'ISSUED';
          db.serial_master[serialIdx].current_subinventory_id = action === 'IN' ? subinventory_id : '';
          db.serial_master[serialIdx].current_locator_id = action === 'IN' ? locator_id : '';
          db.serial_master[serialIdx].updated_at = new Date().toISOString();
        }
      }
    }

    return txnRecord;
  }

  updateStock(params) {
    const { COMPANY_id, item_id, inv_org_id, subinventory_id, locator_id, lot_id, serial_id, qty, cost, action } = params;

    const stockMatch = (s) => 
      s.COMPANY_id === COMPANY_id &&
      s.item_id === item_id &&
      s.inv_org_id === inv_org_id &&
      (s.subinventory_id || '') === (subinventory_id || '') &&
      (s.locator_id || '') === (locator_id || '') &&
      (s.lot_id || '') === (lot_id || '') &&
      (s.serial_id || '') === (serial_id || '');

    let stock = db.item_stock_onhand.find(stockMatch);

    if (!stock && action === 'IN') {
      stock = {
        stock_id: generateId('item_stock_onhand'),
        COMPANY_id,
        item_id,
        inv_org_id,
        subinventory_id,
        locator_id,
        lot_id,
        serial_id,
        onhand_qty: 0,
        reserved_qty: 0,
        available_qty: 0,
        in_transit_qty: 0,
        unit_cost: cost,
        total_cost_value: 0,
        created_at: new Date().toISOString()
      };
      db.item_stock_onhand.push(stock);
    }

    if (stock) {
      if (action === 'IN') {
        stock.onhand_qty = (parseFloat(stock.onhand_qty) || 0) + qty;
      } else if (action === 'OUT') {
        stock.onhand_qty = Math.max(0, (parseFloat(stock.onhand_qty) || 0) - qty);
      }
      
      // Recalculate derived fields
      stock.available_qty = Math.max(0, stock.onhand_qty - (parseFloat(stock.reserved_qty) || 0));
      stock.total_cost_value = (stock.onhand_qty * (parseFloat(stock.unit_cost) || cost)).toFixed(4);
      stock.updated_at = new Date().toISOString();
    }
  }

  createLedgerEntry(txn, user) {
    const lastEntry = [...db.stock_ledger]
      .filter(l => l.COMPANY_id === txn.COMPANY_id && l.item_id === txn.item_id && l.inv_org_id === txn.inv_org_id)
      .pop();
    
    const prevBal = parseFloat(lastEntry?.balance_qty || 0);
    const dr = txn.txn_action === 'IN' ? txn.txn_qty : 0;
    const cr = txn.txn_action === 'OUT' ? txn.txn_qty : 0;

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
      transaction_id: txn.txn_id,
      transaction_date: txn.txn_date,
      txn_type_id: txn.txn_type_id,
      dr_qty: dr,
      cr_qty: cr,
      balance_qty: prevBal + dr - cr,
      unit_cost: txn.unit_cost,
      transaction_value: txn.txn_value,
      reference_no: txn.reference_no,
      remarks: txn.remarks,
      created_by: user?.username || 'system',
      created_at: new Date().toISOString()
    };
    db.stock_ledger.push(ledgerEntry);
  }

  updateTracking(txn, user) {
    const tracking = {
      tracking_id: generateId('batch___serial_tracking'),
      COMPANY_id: txn.COMPANY_id,
      item_id: txn.item_id,
      lot_id: txn.lot_id,
      serial_id: txn.serial_id,
      txn_id: txn.txn_id,
      txn_type_id: txn.txn_type_id,
      inv_org_id: txn.inv_org_id,
      subinventory_id: txn.subinventory_id,
      locator_id: txn.locator_id,
      tracking_qty: txn.txn_qty,
      tracking_date: txn.txn_date,
      tracking_type: txn.serial_id ? 'SERIAL' : 'BATCH',
      status: txn.txn_action === 'IN' ? 'AVAILABLE' : 'ISSUED',
      remarks: txn.remarks,
      created_by: user?.username || 'system',
      created_at: new Date().toISOString()
    };
    db.batch___serial_tracking.push(tracking);
  }

  /**
   * Processes Stock Adjustment (including Transfers)
   */
  async processStockAdjustment(adj, user) {
    const isTransfer = adj.txn_action === 'TRANSFER' || adj.transfer_flag === 'Y' || adj.txn_type_id === 'TT03';

    if (isTransfer) {
      // Leg 1: Source OUT
      const outTxn = await this.processTransaction({
        ...adj,
        txn_action: 'OUT',
        txn_qty: adj.adjustment_qty,
        reference_type: 'TRANSFER_OUT',
        reference_id: adj.adjustment_id,
        reference_no: adj.adjustment_id
      }, user);

      // Leg 2: Destination IN
      const inTxn = await this.processTransaction({
        ...adj,
        inv_org_id: adj.to_inv_org_id,
        subinventory_id: adj.to_subinventory_id,
        locator_id: adj.to_locator_id || '',
        txn_action: 'IN',
        txn_qty: adj.adjustment_qty,
        reference_type: 'TRANSFER_IN',
        reference_id: adj.adjustment_id,
        reference_no: adj.adjustment_id
      }, user);

      return { outTxn, inTxn };
    } else {
      // Normal Adjustment
      const qty = parseFloat(adj.adjustment_qty);
      return this.processTransaction({
        ...adj,
        txn_action: qty >= 0 ? 'IN' : 'OUT',
        txn_qty: Math.abs(qty),
        reference_type: 'ADJUSTMENT',
        reference_id: adj.adjustment_id,
        reference_no: adj.adjustment_id
      }, user);
    }
  }
}

module.exports = new InventoryEngine();
