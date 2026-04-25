const db = require('../data/db');
const { generateId } = require('../utils/idGenerator');

/**
 * Inventory Transaction Processing Engine
 * Handles all stock movements, ledger updates, and tracking.
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

    // 1. Idempotency Check
    const existing = db.inventory_transaction.find(t => 
      t.reference_id === reference_id && 
      t.reference_type === reference_type && 
      t.txn_action === txn_action &&
      t.item_id === item_id &&
      t.inv_org_id === inv_org_id
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
          db.serial_master[serialIdx].current_subinventory_id = action === 'IN' ? inv_org_id : '';
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
   * Processes Opening Stock
   */
  async processOpeningStock(data, user) {
    return this.processTransaction({
      ...data,
      txn_action: 'IN',
      txn_qty: data.opening_qty,
      reference_type: 'OPENING_STOCK',
      reference_id: data.opening_stock_id,
      reference_no: data.reference_no
    }, user);
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
