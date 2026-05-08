import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import toast from 'react-hot-toast'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTableData, useDropdownData } from '../hooks/useTableData'
import { CompanyGroup } from '../components/CompanyGroup'
import { validateStockAdjustment } from '../validations/stockAdjustment.validation'
import {
  DataTable, Toggle, Select, DateInput, Field, FormPage, ConfirmDialog,
  Input, AuditFields, MultiSelect, SectionHeader
} from '../components/ui/index'
import { Package, MapPin, Hash, FileText, AlertTriangle, ArrowRightLeft, CheckCircle2, ShieldCheck, Loader2, AlertCircle, RotateCcw } from 'lucide-react'
import {
  stockAdjustmentApi, inventoryOrgApi, subinventoryApi, locatorApi,
  itemMasterApi, uomApi, transactionTypeApi, transactionReasonApi, moduleApi,
  lotMasterApi, serialMasterApi, itemStockApi, shipNetworkApi,
  itemOrgAssignmentApi, itemSubinvRestrictionApi, orgParameterApi, uomConvApi
} from '../services/api'

const COLUMNS = [
  { key: 'adjustment_id', label: 'ID' },
  { key: 'item_name', label: 'Item' },
  { key: 'inv_org_name', label: 'Org' },
  { key: 'subinventory_name', label: 'Subinventory', render: (v, row) => {
    const action = String(row.txn_action || '').toUpperCase();
    const isTransfer = action.includes('TRANSFER') || row.transfer_flag === 'Y';
    if (isTransfer && row.to_subinventory_name) {
      return (
        <div className="flex items-center gap-1.5">
          <span className="text-gray-600">{v}</span>
          <ArrowRightLeft size={10} className="text-blue-400 opacity-50" />
          <span className="font-bold text-blue-700">{row.to_subinventory_name}</span>
        </div>
      );
    }
    return v;
  }},
  { key: 'locator_name', label: 'Locator/Bin', render: (v, row) => {
    const action = String(row.txn_action || '').toUpperCase();
    const isTransfer = action.includes('TRANSFER') || row.transfer_flag === 'Y';
    if (isTransfer && row.to_locator_name) {
      return (
        <div className="flex items-center gap-1.5">
          <span className="text-gray-600">{v || 'N/A'}</span>
          <ArrowRightLeft size={10} className="text-blue-400 opacity-50" />
          <span className="font-bold text-blue-700">{row.to_locator_name}</span>
        </div>
      );
    }
    return v || 'N/A';
  }},
  { key: 'txn_action', label: 'Action' },
  {
    key: 'adjustment_qty',
    label: 'Net Adjustment',
    render: (v, row) => {
      // Recompute net adjustment from stored fields for display accuracy
      const action = String(row.txn_action || '').toUpperCase();
      const isTransfer = action.includes('TRANSFER') || row.transfer_flag === 'Y';
      const physical = parseFloat(row.physical_qty || 0);
      const system = parseFloat(row.system_qty || 0);
      const storedAdj = parseFloat(row.adjustment_qty || 0);

      let netAdj;
      if (isTransfer) {
        netAdj = storedAdj !== 0 ? storedAdj : physical;
      } else if (action === 'IN' || action.includes('STOCK IN') || row.txn_type_code === 'TXN_TYPE_INC') {
        netAdj = storedAdj !== 0 ? storedAdj : physical;
      } else if (action === 'OUT' || action.includes('STOCK OUT') || row.txn_type_code === 'TXN_TYPE_OUT') {
        netAdj = storedAdj !== 0 ? storedAdj : -physical;
      } else {
        // Physical count adjustment
        netAdj = storedAdj !== 0 ? storedAdj : physical - system;
      }

      if (isTransfer) {
        return <span className="font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100">{Math.abs(netAdj)}</span>;
      }
      if (netAdj > 0) {
        return <span className="font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-100">+{netAdj}</span>;
      } else if (netAdj < 0) {
        return <span className="font-bold px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-100">{netAdj}</span>;
      }
      return <span className="text-gray-500 font-medium px-2">0</span>;
    }
  },
  {
    key: 'adjustment_value',
    label: 'Value',
    render: (v, row) => {
      const val = parseFloat(v || 0);
      const action = String(row.txn_action || '').toUpperCase();
      const isTransfer = action.includes('TRANSFER') || row.transfer_flag === 'Y';
      if (isTransfer) return <span className="text-blue-600 font-medium">{val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</span>;
      if (val > 0) return <span className="text-emerald-600 font-medium">+{val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</span>;
      if (val < 0) return <span className="text-rose-600 font-medium">{val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</span>;
      return <span>{val}</span>;
    }
  },
  {
    key: 'approval_status', label: 'Status', render: (v, row) => (
      <div className="flex flex-col gap-0.5">
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
          v === 'APPROVED' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' :
          v === 'REJECTED' ? 'bg-rose-100 text-rose-700 border border-rose-200' :
          'bg-amber-100 text-amber-700 border border-amber-200'
        }`}>
          {v || 'PENDING'}
        </span>
        {row.reversed_by && <span className="text-[9px] text-gray-400 font-medium">REVERSED</span>}
        {row.reversal_of && <span className="text-[9px] text-blue-400 font-medium">REVERSAL</span>}
      </div>
    )
  },
]

export default function StockAdjustmentPage() {
  const table = useTableData(stockAdjustmentApi, 'stock_adjustment')
  const [view, setView] = useState('list')
  const [selected, setSelected] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [confirmApprove, setConfirmApprove] = useState(null)
  const [confirmReverse, setConfirmReverse] = useState(null)
  const [formData, setFormData] = useState({})
  const [errors, setErrors] = useState({})
  const [stockSnapshot, setStockSnapshot] = useState(null)
  const [serialInputs, setSerialInputs] = useState([])
  const [serialMode, setSerialMode] = useState('manual')
  const [conversionRate, setConversionRate] = useState(1)
  const [isConverting, setIsConverting] = useState(false)
  const [shipNetworkValid, setShipNetworkValid] = useState(true)
  const [shipNetworkChecking, setShipNetworkChecking] = useState(false)

  // Dropdowns
  const { options: inventoryOrgs } = useDropdownData(inventoryOrgApi, 'invorg_dd')
  const { options: subinventories } = useDropdownData(subinventoryApi, 'sub_dd')
  const { options: locators } = useDropdownData(locatorApi, 'loc2_dd')
  const { options: items } = useDropdownData(itemMasterApi, 'item_dd')
  const { options: uoms } = useDropdownData(uomApi, 'uom_dd')
  const { options: txnTypes } = useDropdownData(transactionTypeApi, 'txntype_dd')
  const { options: txnReasons } = useDropdownData(transactionReasonApi, 'txnrsn_dd')
  const { options: modules } = useDropdownData(moduleApi, 'mod_dd')
  const { options: lots } = useDropdownData(lotMasterApi, 'lot_dd')
  const { options: serials } = useDropdownData(serialMasterApi, 'ser_dd')
  const { rows: serialRows } = useTableData(serialMasterApi, 'serial_master', { limit: 2000 })
  const { rows: lotRows } = useTableData(lotMasterApi, 'lot_master', { limit: 1000 })
  const { options: assignments } = useDropdownData(itemOrgAssignmentApi, 'item_org_assign_dd')
  const { options: restrictions } = useDropdownData(itemSubinvRestrictionApi, 'item_subinv_restr_dd')
  const { options: orgParameters } = useDropdownData(orgParameterApi, 'org_param_dd')
  const { rows: allStock } = useTableData(itemStockApi, 'item_stock_onhand', { limit: 1000 })

  const isYes = (v) => v === 'Y' || v === true || v === 'True' || v === 'true';

  const isTransfer = String(formData.txn_action || '').toUpperCase().includes('TRANSFER');

  const selectedItem = useMemo(() => {
    return (items || []).find(i => String(i.item_id) === String(formData.item_id));
  }, [items, formData.item_id]);

  const getActiveOrgParam = useCallback((orgId) => {
    const today = new Date()
    return (orgParameters || []).find(p => {
      if (String(p.inv_org_id) !== String(orgId)) return false
      if (!isYes(p.active_flag)) return false
      const from = p.effective_from ? new Date(p.effective_from) : null
      const to = p.effective_to ? new Date(p.effective_to) : null
      return (!from || today >= from) && (!to || today <= to)
    })
  }, [orgParameters])

  const selectedOrgParam = useMemo(() => getActiveOrgParam(formData.inv_org_id), [getActiveOrgParam, formData.inv_org_id])
  const selectedToOrgParam = useMemo(() => getActiveOrgParam(formData.to_inv_org_id), [getActiveOrgParam, formData.to_inv_org_id])
  const locatorRequired = !!selectedOrgParam && isYes(selectedOrgParam.locator_control)
  const destLocatorRequired = !!selectedToOrgParam && isYes(selectedToOrgParam.locator_control)
  const lotConflict = !!selectedOrgParam && selectedItem && isYes(selectedItem.is_lot_controlled) && !isYes(selectedOrgParam.lot_control_enabled);
  const serialConflict = !!selectedOrgParam && selectedItem && isYes(selectedItem.is_serial_controlled) && !isYes(selectedOrgParam.serial_control_enabled);

  const isLotControlled = !!selectedOrgParam && selectedItem && isYes(selectedOrgParam.lot_control_enabled) && isYes(selectedItem.is_lot_controlled);
  const isSerialControlled = !!selectedOrgParam && selectedItem && isYes(selectedOrgParam.serial_control_enabled) && isYes(selectedItem.is_serial_controlled);

  // canSave used locally; canSaveAll is computed later after convertedQtyPreview is defined
  const canSave = !lotConflict && !serialConflict;

  const setField = useCallback((k, v) => {
    setFormData(p => ({ ...p, [k]: v }));
    if (errors[k]) setErrors(p => ({ ...p, [k]: null }));
  }, [errors])

  const getLocationStatus = useCallback((subinvId, locId) => {
    let statusText = 'Available';
    let statusId = 'MS01';
    
    if (locId) {
      const locator = (locators || []).find(l => String(l.locator_id) === String(locId));
      if (locator) {
        statusText = locator.material_status || statusText;
        statusId = locator.material_status_id || statusId;
      }
    } else {
      const subinv = (subinventories || []).find(s => String(s.subinventory_id) === String(subinvId));
      if (subinv) {
        statusText = subinv.material_status || statusText;
        statusId = subinv.material_status_id || statusId;
      }
    }

    return { statusText, statusId };
  }, [locators, subinventories]);

  const srcStatus = useMemo(() => getLocationStatus(formData.subinventory_id, formData.locator_id), [getLocationStatus, formData.subinventory_id, formData.locator_id]);
  const destStatus = useMemo(() => getLocationStatus(formData.to_subinventory_id, formData.to_locator_id), [getLocationStatus, formData.to_subinventory_id, formData.to_locator_id]);

  const filteredItems = useMemo(() => {
    if (!items?.length || !assignments?.length || !restrictions?.length || !formData.COMPANY_id) return []
    return items.filter(item => {
      // 1. Company Filter
      if (String(item.COMPANY_id || item.company_id) !== String(formData.COMPANY_id)) return false
      // 2. Active Filter
      if (!isYes(item.active_flag)) return false
      // 3. Assignment Check (Item Org Assignment)
      const isAssigned = assignments.some(a => String(a.item_id) === String(item.item_id) && isYes(a.active_flag))
      // 4. Restriction Check (Item Subinventory Restriction)
      const hasRestrictions = restrictions.some(r => String(r.item_id) === String(item.item_id) && isYes(r.active_flag))
      return isAssigned && hasRestrictions
    })
  }, [items, assignments, restrictions, formData.COMPANY_id])

  const itemStock = useMemo(() => {
    if (!formData.item_id || !formData.inv_org_id || !formData.subinventory_id || !allStock) return []
    return allStock.filter(s => 
      String(s.item_id) === String(formData.item_id) &&
      String(s.inv_org_id) === String(formData.inv_org_id) &&
      String(s.subinventory_id) === String(formData.subinventory_id) &&
      (!locatorRequired || String(s.locator_id || '') === String(formData.locator_id || ''))
    )
  }, [formData.item_id, formData.inv_org_id, formData.subinventory_id, formData.locator_id, locatorRequired, allStock])

  const filteredAvailableSerials = useMemo(() => {
    if (!formData.item_id || !serialRows?.length) return []

    return serialRows.filter(r => {
      // 1. Must match selected item
      if (String(r.item_id) !== String(formData.item_id)) return false

      // 2. Must be AVAILABLE status
      const status = String(r.status || '').toUpperCase()
      if (status !== 'AVAILABLE' && status !== 'IN_STOCK') return false

      // 3. If subinventory selected, match the serial's current location
      //    (Serials track their own location via current_subinventory_id —
      //     same data the Serial Master table uses to show serials)
      if (formData.subinventory_id) {
        if (String(r.current_subinventory_id || '') !== String(formData.subinventory_id)) return false
      }

      return true
    })
  }, [formData.item_id, formData.subinventory_id, serialRows])

  const currentStockInfo = useMemo(() => {
    return stockSnapshot
  }, [stockSnapshot])

  useEffect(() => {
    let active = true
    const fromOrg = formData.inv_org_id
    const toOrg = formData.to_inv_org_id

    if (isTransfer && fromOrg && toOrg) {
      setShipNetworkChecking(true)
      shipNetworkApi.validate({ from_org: fromOrg, to_org: toOrg })
        .then(res => {
          if (!active) return
          setShipNetworkValid(res.valid)
          if (!res.valid) {
            setErrors(prev => ({ ...prev, to_inv_org_id: res.message }))
          } else {
            setErrors(prev => ({ ...prev, to_inv_org_id: null }))
          }
        })
        .catch(() => {
          if (!active) return
          setShipNetworkValid(false)
        })
        .finally(() => {
          if (active) setShipNetworkChecking(false)
        })
    } else {
      setShipNetworkValid(true)
      if (isTransfer) setErrors(prev => ({ ...prev, to_inv_org_id: null }))
    }
    return () => { active = false }
  }, [isTransfer, formData.inv_org_id, formData.to_inv_org_id])

  useEffect(() => {
    let active = true

    const fetchSystemQty = async () => {
      const hasBaseSelection =
        formData.item_id &&
        formData.inv_org_id &&
        formData.subinventory_id &&
        (!locatorRequired || formData.locator_id)

      if (!hasBaseSelection) {
        if (!active) return
        setStockSnapshot(null)
        setFormData(prev => {
          if (String(prev.system_qty ?? '') === '0') return prev
          return { ...prev, system_qty: 0 }
        })
        return
      }

      try {
        const params = {
          limit: 1000,
          item_id: formData.item_id,
          inv_org_id: formData.inv_org_id,
          subinventory_id: formData.subinventory_id
        }
        if (locatorRequired) params.locator_id = formData.locator_id

        if (isLotControlled && formData.lot_id) params.lot_id = formData.lot_id
        const resp = await itemStockApi.getAll(params)
        if (!active) return

        let rows = resp?.data || []
        // Remove serial filtering for stock info - onhand is for the entire location.

        const onhand_qty = rows.reduce((sum, r) => sum + parseFloat(r.onhand_qty || 0), 0)
        const reserved_qty = rows.reduce((sum, r) => sum + parseFloat(r.reserved_qty || 0), 0)
        const available_qty = rows.reduce((sum, r) => sum + parseFloat(r.available_qty || 0), 0)

        const nextSnapshot = { onhand_qty, reserved_qty, available_qty }
        setStockSnapshot(nextSnapshot)
        setFormData(prev => {
          if (String(prev.system_qty ?? '') === String(onhand_qty)) return prev
          return { ...prev, system_qty: onhand_qty }
        })
      } catch {
        if (!active) return
        setStockSnapshot(null)
        setFormData(prev => {
          if (String(prev.system_qty ?? '') === '0') return prev
          return { ...prev, system_qty: 0 }
        })
      }
    }

    fetchSystemQty()
    return () => { active = false }
  }, [
    formData.item_id,
    formData.inv_org_id,
    formData.subinventory_id,
    formData.locator_id,
    locatorRequired,
    formData.lot_id,
    isLotControlled
  ])

  // UOM Conversion Preview logic
  useEffect(() => {
    let active = true
    if (formData.item_id && formData.uom_id && selectedItem) {
      const baseUomId = selectedItem.primary_uom_id
      if (formData.uom_id === baseUomId) {
        setConversionRate(1)
        return
      }
      setIsConverting(true)
      uomConvApi.getAll({ 
        item_id: formData.item_id, 
        from_uom_id: formData.uom_id, 
        to_uom_id: baseUomId 
      }).then(resp => {
        if (!active) return
        const conv = resp.data?.[0]
        if (!conv) {
          toast.error(`No UOM conversion defined for ${selectedItem.item_code} from current UOM to base UOM.`)
        }
        setConversionRate(conv ? parseFloat(conv.conversion_rate) : null)
      }).catch((err) => {
        if (!active) return
        console.error('UOM Conversion Error:', err)
        setConversionRate(null)
      }).finally(() => {
        if (active) setIsConverting(false)
      })
    }
    return () => { active = false }
  }, [formData.item_id, formData.uom_id, selectedItem])

  const convertedQtyPreview = useMemo(() => {
    try {
      const qty = parseFloat(formData.physical_qty || 0)
      if (conversionRate === null || isNaN(qty)) return null
      return (qty * conversionRate).toFixed(4)
    } catch (err) {
      console.error('Calculation Error:', err)
      return null
    }
  }, [formData.physical_qty, conversionRate])

  // ── Item Org Assignment Rules (OUT & TRANSFER only) ──────────────
  // These MUST be declared after convertedQtyPreview and currentStockInfo
  const itemOrgAssignmentRules = useMemo(() => {
    if (!formData.item_id || !formData.inv_org_id || !assignments?.length) return null;
    const match = assignments.find(a =>
      String(a.item_id) === String(formData.item_id) &&
      String(a.inv_org_id) === String(formData.inv_org_id) &&
      isYes(a.active_flag)
    );
    if (!match) return null;
    return {
      lot_divisible_flag: isYes(match.lot_divisible_flag),
      min_qty: parseFloat(match.min_qty || 0),
      max_qty: parseFloat(match.max_qty || 0),
      safety_stock_qty: parseFloat(match.safety_stock_qty || 0)
    };
  }, [assignments, formData.item_id, formData.inv_org_id]);

  // Only applies to OUT and TRANSFER — never to IN or Opening Stock
  const isOutOrTransfer = isTransfer || String(formData.txn_action || '').toUpperCase() === 'OUT';

  // Available qty for selected lot in current location
  const lotAvailableQty = useMemo(() => {
    if (!formData.lot_id || !allStock?.length) return null;
    const rows = allStock.filter(s =>
      String(s.item_id) === String(formData.item_id) &&
      String(s.inv_org_id) === String(formData.inv_org_id) &&
      String(s.lot_id) === String(formData.lot_id)
    );
    return rows.reduce((sum, s) => sum + parseFloat(s.available_qty || 0), 0);
  }, [allStock, formData.item_id, formData.inv_org_id, formData.lot_id]);

  // Lot Divisible validation — HARD block for OUT/TRANSFER
  const lotDivisibleError = useMemo(() => {
    if (!isOutOrTransfer) return null;
    if (!isLotControlled || !formData.lot_id) return null;
    if (!itemOrgAssignmentRules) return null;
    if (itemOrgAssignmentRules.lot_divisible_flag) return null;
    const entered = parseFloat(convertedQtyPreview || 0);
    if (lotAvailableQty === null || lotAvailableQty <= 0) return null;
    if (entered === 0) return null;
    if (entered !== lotAvailableQty) {
      return `This item is configured as NON-DIVISIBLE. Partial lot transactions are not allowed. Please transact the full lot quantity (${lotAvailableQty}).`;
    }
    return null;
  }, [isOutOrTransfer, isLotControlled, formData.lot_id, itemOrgAssignmentRules, lotAvailableQty, convertedQtyPreview]);

  // Stock level warnings (non-blocking) for OUT/TRANSFER
  const stockLevelWarnings = useMemo(() => {
    const warnings = [];
    if (!isOutOrTransfer || !itemOrgAssignmentRules || !currentStockInfo) return warnings;
    const entered = parseFloat(convertedQtyPreview || 0);
    if (entered <= 0) return warnings;
    const currentAvail = parseFloat(currentStockInfo.available_qty || 0);
    const remaining = currentAvail - entered;
    if (itemOrgAssignmentRules.safety_stock_qty > 0 && remaining < itemOrgAssignmentRules.safety_stock_qty) {
      warnings.push({
        type: 'SAFETY_STOCK',
        color: 'orange',
        message: `This transaction will reduce stock below Safety Stock level (${itemOrgAssignmentRules.safety_stock_qty}).`,
        details: { currentQty: currentAvail, safetyStock: itemOrgAssignmentRules.safety_stock_qty, remaining }
      });
    }
    if (itemOrgAssignmentRules.min_qty > 0 && remaining < itemOrgAssignmentRules.min_qty) {
      warnings.push({
        type: 'MIN_QTY',
        color: 'yellow',
        message: `Remaining stock (${remaining}) will fall below Minimum Quantity level (${itemOrgAssignmentRules.min_qty}).`,
        details: { currentQty: currentAvail, minQty: itemOrgAssignmentRules.min_qty, remaining }
      });
    }
    return warnings;
  }, [isOutOrTransfer, itemOrgAssignmentRules, currentStockInfo, convertedQtyPreview]);

  // Max qty warning for IN (non-blocking)
  const maxQtyWarning = useMemo(() => {
    if (isOutOrTransfer) return null;
    if (!itemOrgAssignmentRules || itemOrgAssignmentRules.max_qty <= 0) return null;
    const entered = parseFloat(convertedQtyPreview || 0);
    if (entered <= 0) return null;
    const currentOnhand = parseFloat(currentStockInfo?.onhand_qty || 0);
    const resulting = currentOnhand + entered;
    if (resulting > itemOrgAssignmentRules.max_qty) {
      return { currentQty: currentOnhand, maxQty: itemOrgAssignmentRules.max_qty, resulting };
    }
    return null;
  }, [isOutOrTransfer, itemOrgAssignmentRules, currentStockInfo, convertedQtyPreview]);

  // canSave must also block on lot divisible error
  const canSaveAll = !lotConflict && !serialConflict && !lotDivisibleError;

  const validateField = useCallback((k, v) => {
    const val = typeof v === 'string' ? v.trim() : v;
    const { errors: newErrors } = validateStockAdjustment({ ...formData, [k]: val }, {
      stockInfo: currentStockInfo, isLotControlled, isSerialControlled, locatorRequired, destLocatorRequired, serialInputs,
      convertedQty: k === 'physical_qty' ? (parseFloat(val) * (conversionRate || 1)) : convertedQtyPreview
    })
    setErrors(prev => ({ ...prev, [k]: newErrors[k] }))
  }, [formData, currentStockInfo, isLotControlled, isSerialControlled, locatorRequired, destLocatorRequired, conversionRate, convertedQtyPreview])

  const handleTxnTypeChange = (tid) => {
    const type = (txnTypes || []).find(t => String(t.txn_type_id) === String(tid));
    if (type) {
      const transfer = type.txn_action === 'TRANSFER';
      setFormData(prev => ({
        ...prev,
        txn_type_id: tid,
        txn_type_code: type.txn_type_code,
        txn_action: type.txn_action,
        transfer_flag: transfer ? 'Y' : 'N',
        approval_status: 'PENDING'
      }));
    }
  };

  const handleItemChange = (iid) => {
    const item = (items || []).find(i => String(i.item_id) === String(iid));
    if (item) {
      setFormData(prev => ({
        ...prev,
        item_id: iid,
        uom_id: item.primary_uom_id || prev.uom_id,
        unit_cost: item.standard_cost || prev.unit_cost || 0,
        inv_org_id: '',
        subinventory_id: '',
        locator_id: '',
        to_inv_org_id: '',
        to_subinventory_id: '',
        to_locator_id: '',
        lot_id: '',
        serial_id: ''
      }));
      setSerialInputs([])
      setSerialMode('manual')
    }
  };

  const currentAdjQty = useMemo(() => {
    const physicalQty = parseFloat(convertedQtyPreview || 0);
    const systemQty = parseFloat(formData.system_qty || 0);
    const action = String(formData.txn_action || '').toUpperCase();
    const typeCode = String(formData.txn_type_code || '').toUpperCase();

    if (isTransfer) return physicalQty;
    if (action === 'IN' || action.includes('STOCK IN') || action.includes('RECEIPT') || typeCode === 'TXN_TYPE_INC') return physicalQty;
    if (action === 'OUT' || action.includes('STOCK OUT') || action.includes('ISSUE') || typeCode === 'TXN_TYPE_OUT') return -physicalQty;
    return physicalQty - systemQty;
  }, [isTransfer, convertedQtyPreview, formData.system_qty, formData.txn_action, formData.txn_type_code]);

  const projectedOnhand = useMemo(
    () => parseFloat(formData.system_qty || 0) + parseFloat(currentAdjQty || 0),
    [formData.system_qty, currentAdjQty]
  );

  const isPositiveAdj = !isTransfer && currentAdjQty > 0;
  const isNegativeAdj = !isTransfer && currentAdjQty < 0;
  const requiredSerialCount = Math.floor(Math.abs(currentAdjQty || 0));

  const handleQtyChangeForSerials = useCallback((newQty) => {
    setField('physical_qty', newQty);
  }, [setField]);

  useEffect(() => {
    if (isSerialControlled && isPositiveAdj && view === 'create') {
      const count = requiredSerialCount;
      
      setSerialInputs(prev => {
        if (count === prev.length) return prev;
        if (count > prev.length) return [...prev, ...Array(count - prev.length).fill('')];
        return prev.slice(0, count);
      });
    }
  }, [requiredSerialCount, isSerialControlled, isPositiveAdj, view]);

  const handleAutoGenerateSerials = async () => {
    const baseQty = requiredSerialCount;
    
    if (!baseQty) return toast.error('Enter valid physical quantity first');
    if (!formData.item_id) return toast.error('Select item first');
    
    try {
      const resp = await serialMasterApi.generateSerials({ 
        item_id: formData.item_id, 
        qty: baseQty 
      });
      if (resp.success && Array.isArray(resp.data)) {
        setSerialInputs(resp.data);
        toast.success(`Generated ${resp.data.length} serial numbers`);
      }
    } catch (err) {
      toast.error('Failed to generate serials');
    }
  };

  const handleAutoGenerateLot = async () => {
    if (!formData.item_id) return toast.error('Select item first');
    try {
      const lotResp = await lotMasterApi.generateLot({ item_id: formData.item_id });
      if (lotResp.success) {
        setField('lot_number', lotResp.data);
        toast.success('Lot number auto-generated');
      }
    } catch (err) {
      toast.error('Failed to generate lot number');
    }
  };

  // ── Filtered Orgs (Source): all orgs where item is assigned AND belongs to selected Company ──
  const filteredOrgs = useMemo(() => {
    if (!formData.item_id || !inventoryOrgs?.length || !assignments?.length || !formData.COMPANY_id) return []
    const itemAssignments = assignments.filter(a => String(a.item_id) === String(formData.item_id) && isYes(a.active_flag))
    return inventoryOrgs.filter(org =>
      isYes(org.active_flag) &&
      String(org.COMPANY_id || org.company_id) === String(formData.COMPANY_id) &&
      itemAssignments.some(a => String(a.inv_org_id) === String(org.inv_org_id))
    )
  }, [formData.item_id, inventoryOrgs, assignments, formData.COMPANY_id])

  // ── Source Subinventories: mapped in restriction. For transfers also need stock > 0 somewhere ──
  const filteredSubinventories = useMemo(() => {
    if (!formData.item_id || !formData.inv_org_id || !subinventories?.length || !restrictions?.length) return []
    const itemRestrictions = restrictions.filter(r =>
      isYes(r.active_flag) &&
      String(r.item_id) === String(formData.item_id) &&
      String(r.inv_org_id) === String(formData.inv_org_id)
    )
    const mapped = subinventories.filter(s => isYes(s.active_flag) && itemRestrictions.some(r => String(r.subinventory_id) === String(s.subinventory_id)))
    return mapped
  }, [formData.item_id, formData.inv_org_id, subinventories, restrictions])

  // ── Destination Orgs: same as source orgs (item assignment level) ──
  const filteredToOrgs = useMemo(() => filteredOrgs, [filteredOrgs])

  // ── Destination Subinventories: mapped in restriction. Exclude source subinv only if it has no other valid locators. ──
  const filteredToSubinventories = useMemo(() => {
    if (!formData.item_id || !formData.to_inv_org_id || !subinventories?.length || !restrictions?.length) return []
    const itemRestrictions = restrictions.filter(r =>
      isYes(r.active_flag) &&
      String(r.item_id) === String(formData.item_id) &&
      String(r.inv_org_id) === String(formData.to_inv_org_id)
    )
    const mapped = subinventories.filter(s => isYes(s.active_flag) && itemRestrictions.some(r => String(r.subinventory_id) === String(s.subinventory_id)))
    // When same org as source: if source subinventory is selected, exclude it only if
    // there are no other allowed locators in that subinventory besides the source locator
    if (formData.subinventory_id && String(formData.to_inv_org_id) === String(formData.inv_org_id)) {
      return mapped.filter(sub => {
        if (String(sub.subinventory_id) !== String(formData.subinventory_id)) return true
        // Same subinv as source – allow only if there's a different locator available in restriction
        const locIds = itemRestrictions
          .filter(r => String(r.subinventory_id) === String(sub.subinventory_id) && r.locator_id)
          .map(r => r.locator_id)
        return locIds.some(lid => lid !== formData.locator_id)
      })
    }
    return mapped
  }, [formData.item_id, formData.to_inv_org_id, formData.subinventory_id, formData.locator_id, formData.inv_org_id, subinventories, restrictions])

  // Source Locators: mapped in restriction + stock > 0 (for transfers)
  const filteredSourceLocators = useMemo(() => {
    if (!formData.item_id || !formData.inv_org_id || !formData.subinventory_id || !locators?.length || !restrictions?.length) return []
    const allowedLocIds = restrictions
      .filter(r => String(r.item_id) === String(formData.item_id) &&
        String(r.inv_org_id) === String(formData.inv_org_id) &&
        String(r.subinventory_id) === String(formData.subinventory_id) && r.locator_id)
      .map(r => r.locator_id)
    const subLocators = locators.filter(l => String(l.subinventory_id) === String(formData.subinventory_id))
    const base = allowedLocIds.length > 0 ? subLocators.filter(l => allowedLocIds.includes(l.locator_id)) : subLocators
    return base
  }, [formData.item_id, formData.inv_org_id, formData.subinventory_id, locators, restrictions])

  // Destination Locators: mapped in restriction, exclude source locator
  const filteredDestLocators = useMemo(() => {
    if (!formData.item_id || !formData.to_inv_org_id || !formData.to_subinventory_id || !locators?.length || !restrictions?.length) return []
    const allowedLocIds = restrictions
      .filter(r => String(r.item_id) === String(formData.item_id) &&
        String(r.inv_org_id) === String(formData.to_inv_org_id) &&
        String(r.subinventory_id) === String(formData.to_subinventory_id) && r.locator_id)
      .map(r => r.locator_id)
    const subLocators = locators.filter(l => String(l.subinventory_id) === String(formData.to_subinventory_id))
    const base = allowedLocIds.length > 0 ? subLocators.filter(l => allowedLocIds.includes(l.locator_id)) : subLocators
    // Exclude source locator if same org+subinv
    return base.filter(l => {
      const isSameOrg = String(formData.to_inv_org_id) === String(formData.inv_org_id)
      const isSameSub = String(formData.to_subinventory_id) === String(formData.subinventory_id)
      return !(isSameOrg && isSameSub && String(l.locator_id) === String(formData.locator_id))
    })
  }, [formData.item_id, formData.to_inv_org_id, formData.to_subinventory_id, formData.locator_id, formData.inv_org_id, formData.subinventory_id, locators, restrictions])

  // ── Auto-selection: ONLY when exactly 1 option exists ──
  useEffect(() => {
    if (view !== 'create' && view !== 'edit') return

    // Source chain
    if (!formData.inv_org_id && filteredOrgs.length === 1)
      setField('inv_org_id', filteredOrgs[0].inv_org_id)
    if (formData.inv_org_id && !formData.subinventory_id && filteredSubinventories.length === 1)
      setField('subinventory_id', filteredSubinventories[0].subinventory_id)
    if (formData.subinventory_id && !formData.locator_id && filteredSourceLocators.length === 1)
      setField('locator_id', filteredSourceLocators[0].locator_id)

    // Destination chain — only trigger AFTER source org is set to avoid race
    if (!isTransfer || !formData.inv_org_id) return
    if (!formData.to_inv_org_id && filteredToOrgs.length === 1)
      setField('to_inv_org_id', filteredToOrgs[0].inv_org_id)
    // Dest subinv: auto-select only if 1 option AND it differs from source combo
    if (formData.to_inv_org_id && !formData.to_subinventory_id && filteredToSubinventories.length === 1) {
      const onlyOpt = filteredToSubinventories[0].subinventory_id
      const sameAsSrc = onlyOpt === formData.subinventory_id &&
        formData.to_inv_org_id === formData.inv_org_id
      if (!sameAsSrc) setField('to_subinventory_id', onlyOpt)
    }
    if (formData.to_subinventory_id && !formData.to_locator_id && filteredDestLocators.length === 1)
      setField('to_locator_id', filteredDestLocators[0].locator_id)
  }, [view, isTransfer,
    formData.inv_org_id, formData.subinventory_id, formData.locator_id,
    formData.to_inv_org_id, formData.to_subinventory_id, formData.to_locator_id,
    filteredOrgs, filteredSubinventories, filteredSourceLocators,
    filteredToOrgs, filteredToSubinventories, filteredDestLocators, setField])



  const handleCreate = () => {
    setFormData({
      active_flag: 'Y',
      effective_from: new Date().toISOString().split('T')[0],
      adjustment_date: new Date().toISOString().split('T')[0],
      approval_status: 'PENDING',
      created_by: 'admin',
      auto_generate_lot: true
    })
    setSerialInputs([])
    setSerialMode('manual')
    setErrors({})
    setView('create')
  }
  const handleEdit = (row) => { setSelected(row); setFormData({ ...row }); setErrors({}); setView('edit') }
  const handleView = (row) => { setSelected(row); setFormData({ ...row }); setErrors({}); setView('view') }
  const handleBack = () => { setView('list'); setSelected(null); setErrors({}) }

  const handleDelete = async () => {
    if (!confirmDelete) return
    try {
      await table.remove(confirmDelete['adjustment_id'])
    } catch (err) {
      const msg = err.response?.data?.message || 'Delete failed';
      const code = err.response?.data?.code;
      if (code === 'APPROVED_DELETE_BLOCKED') {
        toast.error('❌ ' + msg, { duration: 6000 });
      } else {
        toast.error(msg);
      }
    }
    setConfirmDelete(null)
  }

  const handleReverse = async () => {
    if (!confirmReverse) return
    try {
      const currentUser = JSON.parse(localStorage.getItem('erp_user') || '{}')?.username || 'system'
      await stockAdjustmentApi.reverse(confirmReverse.adjustment_id, { reversal_reason: 'Manual Reversal', reversed_by: currentUser })
      toast.success(`Reversal adjustment created for ${confirmReverse.adjustment_id}`)
      table.refresh?.() // Reload list
    } catch (err) {
      toast.error(err.response?.data?.message || 'Reversal failed')
    } finally {
      setConfirmReverse(null)
    }
  }

  const handleApprove = async () => {
    if (!confirmApprove) return
    try {
      const currentUser = JSON.parse(localStorage.getItem('erp_user') || '{}')?.username || 'system'
      await table.update(confirmApprove.adjustment_id, {
        ...confirmApprove,
        approval_status: 'APPROVED',
        approved_by: confirmApprove.approved_by || currentUser
      })
      toast.success('Stock adjustment approved and posted')
    } finally {
      setConfirmApprove(null)
    }
  }

  const handleSubmit = async (ev) => {
    ev.preventDefault()

    const trimmedData = Object.fromEntries(
      Object.entries(formData).map(([k, v]) => [k, typeof v === 'string' ? v.trim() : v])
    )
    const { errors: valErrors, isValid } = validateStockAdjustment(trimmedData, {
      stockInfo: currentStockInfo, isLotControlled, isSerialControlled, locatorRequired, destLocatorRequired, serialInputs,
      convertedQty: convertedQtyPreview
    })

    setErrors(valErrors)

    if (!isValid) {
      // Specific toast for serial mismatch to satisfy user requirement
      if (valErrors.serial_ids && isSerialControlled && isPositiveAdj) {
        const req = requiredSerialCount;
        const has = serialInputs.filter(s => s.trim()).length;
        toast.error(`Serial mismatch: Need ${req}, found ${has}`);
      } else {
        toast.error('Please fix the highlighted errors');
      }
      setTimeout(() => {
        const firstError = document.querySelector('[data-error="true"], .border-red-500, .input-error')
        if (firstError) firstError.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 100)
      return
    }

    try {
      const payload = {
        ...formData,
        adjustment_qty: currentAdjQty,
        adjustment_value: (currentAdjQty * parseFloat(formData.unit_cost || 0)).toFixed(2),
        approved_by: formData.approval_status === 'APPROVED' ? formData.approved_by : undefined,
        approval_status: formData.approval_status || 'PENDING',
        active_flag: 'Y'
      }
      if (!locatorRequired) delete payload.locator_id;
      if (!destLocatorRequired) delete payload.to_locator_id;
      if (isLotControlled && formData.auto_generate_lot && currentAdjQty > 0 && !isTransfer && formData.txn_action !== 'IN' && formData.txn_action !== 'OUT') {
        payload.lot_id = undefined; // Always clear ID to force creation from number
        if (!payload.lot_number) {
          try {
            const lotResp = await lotMasterApi.generateLot({ item_id: formData.item_id });
            if (lotResp.success) {
              payload.lot_number = lotResp.data;
            }
          } catch (e) {
            toast.error('Failed to auto-generate lot number');
            return;
          }
        }
      }

      if (isSerialControlled && isPositiveAdj) {
        payload.serial_numbers = serialInputs.filter(s => s.trim());
        payload.serial_ids = undefined; // Clear old field
      }
      if (view === 'edit') await table.update(selected['adjustment_id'], payload)
      else {
        const result = await table.create(payload)
        // Show backend warnings as toasts (non-blocking)
        if (result?.warnings?.length) {
          result.warnings.forEach(w => {
            if (w.type === 'SAFETY_STOCK') toast(w.message, { icon: '🟠', duration: 6000 });
            else if (w.type === 'MIN_QTY') toast(w.message, { icon: '🟡', duration: 5000 });
            else if (w.type === 'MAX_QTY') toast(w.message, { icon: '🔵', duration: 5000 });
          });
        }
      }
      handleBack()
    } catch (err) {
      if (err.response?.data?.errors) {
        setErrors(err.response.data.errors)
        toast.error('Please fix the highlighted errors')
      } else {
        toast.error(err.response?.data?.message || 'Action failed')
      }
    }
  }

  if (view !== 'list') {
    return (
      <FormPage title={view === 'view' ? 'View Adjustment' : view === 'edit' ? 'Edit Adjustment' : 'New Adjustment'}
        onBack={handleBack} onSubmit={handleSubmit} 
        loading={table.isCreating || table.isUpdating || shipNetworkChecking} mode={view}
        disabled={!canSaveAll || (isTransfer && !shipNetworkValid)}
        tooltip={isTransfer && !shipNetworkValid ? "Cannot save because no valid shipping network exists between selected organizations." : ""}
      >
        <>
          <div className="card p-6 mb-5">
            <SectionHeader icon={Package} title="Transaction Info" subtitle="Item and type details" color="brand" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Field label="ID"><Input value={formData.adjustment_id} readOnly /></Field>
              <CompanyGroup formData={formData} setField={setField} errors={errors} />
              <Field label="Item" required error={errors.item_id}>
                <Select value={formData.item_id} onChange={handleItemChange} error={errors.item_id} disabled={view !== 'create'}
                  options={filteredItems.map(r => ({ value: r.item_id, label: `${r.item_code || ''} - ${r.item_name || r.item_id}` }))} />
              </Field>
              <Field label="Adjustment Type" required error={errors.txn_type_id}>
                <Select value={formData.txn_type_id} onChange={handleTxnTypeChange} error={errors.txn_type_id} disabled={view === 'view'}
                  options={txnTypes?.map(r => ({ value: r.txn_type_id, label: r.txn_type_name }))} />
              </Field>
              <Field label="Control Type">
                <div className="flex flex-wrap gap-2 mt-2">
                  {isLotControlled && <span className="badge-purple">Lot</span>}
                  {isSerialControlled && <span className="badge-yellow">Serial</span>}
                  {lotConflict && <span className="badge-rose">Lot (Not Allowed)</span>}
                  {serialConflict && <span className="badge-rose">Serial (Not Allowed)</span>}
                  {!isLotControlled && !isSerialControlled && !lotConflict && !serialConflict && <span className="badge-blue">Standard</span>}
                </div>
              </Field>
            </div>
          </div>

          <div className="card p-6 mb-5 animate-slide-in">
            <SectionHeader icon={MapPin} title="Locations" subtitle={isTransfer ? "Source and Destination" : "Storage location"} color="emerald" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Source Location */}
              <div className={`p-4 rounded-lg ${isTransfer ? 'bg-amber-50 border border-amber-100' : 'bg-gray-50'}`}>
                <h4 className="text-xs font-bold uppercase text-gray-500 mb-3">{isTransfer ? 'Source Location' : 'Location'}</h4>
                <div className="space-y-3">
                  <Field label="Org" required error={errors.inv_org_id}>
                    <Select value={formData.inv_org_id} onChange={v => { setField('inv_org_id', v); setField('subinventory_id', ''); setField('locator_id', ''); }} disabled={view === 'view'}
                      options={filteredOrgs.map(r => ({ value: r.inv_org_id, label: r.inv_org_name }))} />
                  </Field>
                  <Field label="Subinventory" required error={errors.subinventory_id}>
                    <Select value={formData.subinventory_id} onChange={v => { setField('subinventory_id', v); setField('locator_id', ''); }} disabled={view === 'view'}
                      options={filteredSubinventories.map(r => ({ value: r.subinventory_id, label: r.subinventory_name }))} />
                  </Field>
                  {locatorRequired && (
                    <Field label="Locator (Bin)" required error={errors.locator_id}>
                      <Select value={formData.locator_id} onChange={v => setField('locator_id', v)} disabled={view === 'view' || !formData.subinventory_id}
                        options={filteredSourceLocators.map(r => ({ value: r.locator_id, label: r.locator_name }))} />
                    </Field>
                  )}
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-gray-400">Status</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${srcStatus.statusText.toUpperCase().includes('DAMAGE') ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                      {srcStatus.statusText}
                    </span>
                  </div>
                </div>
              </div>

              {/* Destination Location (Transfers Only) */}
              {isTransfer && (
                <div className="p-4 rounded-lg bg-blue-50 border border-blue-100">
                  <h4 className="text-xs font-bold uppercase text-blue-600 mb-3">Destination Location</h4>
                  <div className="space-y-3">
                  <Field 
                    label="To Org" 
                    required 
                    error={errors.to_inv_org_id}
                    helpText={isTransfer && !shipNetworkValid && !shipNetworkChecking && formData.to_inv_org_id ? (
                      <div className="mt-1 p-2 bg-rose-50 border border-rose-200 rounded text-[10px] text-rose-700 font-medium flex items-start gap-1.5 animate-pulse">
                        <AlertTriangle size={12} className="shrink-0 mt-0.5" />
                        <div>
                          No shipping network exists between <span className="font-bold">{(inventoryOrgs || []).find(o => String(o.inv_org_id) === String(formData.inv_org_id))?.inv_org_name || 'Source Org'}</span> and <span className="font-bold">{(inventoryOrgs || []).find(o => String(o.inv_org_id) === String(formData.to_inv_org_id))?.inv_org_name || 'Destination Org'}</span>.
                          <p className="mt-1 opacity-80">Please configure a shipping network or select a valid destination organization.</p>
                        </div>
                      </div>
                    ) : null}
                  >
                    <Select 
                      value={formData.to_inv_org_id} 
                      onChange={v => { setField('to_inv_org_id', v); setField('to_subinventory_id', ''); setField('to_locator_id', ''); }} 
                      onBlur={() => validateField('to_inv_org_id', formData.to_inv_org_id)} 
                      error={errors.to_inv_org_id} 
                      disabled={view === 'view' || shipNetworkChecking}
                      displayValue={formData.to_inv_org_name}
                      options={filteredToOrgs.map(r => ({ value: r.inv_org_id, label: r.inv_org_name || r.inv_org_id }))} 
                    />
                  </Field>
                    <Field label="To Subinventory" required={isTransfer} error={errors.to_subinventory_id}>
                      <Select value={formData.to_subinventory_id} onChange={v => { setField('to_subinventory_id', v); setField('to_locator_id', ''); }} disabled={view === 'view'}
                        options={filteredToSubinventories.map(r => ({ value: r.subinventory_id, label: r.subinventory_name }))} />
                    </Field>
                    {destLocatorRequired && (
                      <Field label="To Locator (Bin)" required={isTransfer} error={errors.to_locator_id}>
                        <Select value={formData.to_locator_id} onChange={v => setField('to_locator_id', v)} disabled={view === 'view' || !formData.to_subinventory_id}
                          options={filteredDestLocators.map(r => ({ value: r.locator_id, label: r.locator_name }))} />
                      </Field>
                    )}
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold text-gray-400">Status</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${destStatus.statusText.toUpperCase().includes('DAMAGE') ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                        {destStatus.statusText}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Damaged Transfer Warning */}
              {isTransfer && !srcStatus.statusText.toUpperCase().includes('DAMAGE') && destStatus.statusText.toUpperCase().includes('DAMAGE') && (
                <div className="col-span-full bg-rose-50 border border-rose-200 p-3 rounded-lg flex items-center gap-3 animate-pulse">
                  <AlertTriangle className="text-rose-500" size={16} />
                  <p className="text-[11px] text-rose-800 font-medium">
                    Warning: You are moving good stock to a <span className="font-bold">Damaged Inventory</span> location. 
                    Ensure a "Damaged Goods" reason is selected.
                  </p>
                </div>
              )}
              {isTransfer && srcStatus.statusText.toUpperCase().includes('DAMAGE') && !destStatus.statusText.toUpperCase().includes('DAMAGE') && (
                <div className="col-span-full bg-emerald-50 border border-emerald-200 p-3 rounded-lg flex items-center gap-3 animate-pulse">
                  <ShieldCheck className="text-emerald-500" size={16} />
                  <p className="text-[11px] text-emerald-800 font-medium">
                    Recovery: Moving stock out of <span className="font-bold">Damaged Inventory</span>. 
                    Ensure a "Repaired Goods" reason is selected.
                  </p>
                </div>
              )}

              {/* Stock Summary */}
              <div className="p-4 rounded-lg bg-gray-50">
                <h4 className="text-xs font-bold uppercase text-gray-500 mb-3">Stock & Quantities</h4>
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-2 mb-2">
                    <div className="bg-white p-2 rounded border text-center">
                      <p className="text-[10px] text-gray-400 uppercase font-bold">On Hand</p>
                      <p className="text-sm font-bold text-gray-700">{currentStockInfo?.onhand_qty || 0}</p>
                    </div>
                    <div className="bg-white p-2 rounded border text-center">
                      <p className="text-[10px] text-gray-400 uppercase font-bold">Reserved</p>
                      <p className="text-sm font-bold text-amber-600">{currentStockInfo?.reserved_qty || 0}</p>
                    </div>
                    <div className="bg-white p-2 rounded border text-center">
                      <p className="text-[10px] text-gray-400 uppercase font-bold">Available</p>
                      <p className="text-sm font-bold text-emerald-600">{currentStockInfo?.available_qty || 0}</p>
                    </div>
                  </div>
                  {!isTransfer && (
                    <Field label="System Qty">
                      <Input type="number" value={formData.system_qty ?? 0} readOnly disabled />
                    </Field>
                  )}
                  <Field label={isTransfer ? "Transfer Qty" : "Physical Qty"} required error={errors.physical_qty}>
                    <div className="relative">
                      <Input type="number" value={formData.physical_qty} error={errors.physical_qty} disabled={view === 'view'}
                        onChange={e => handleQtyChangeForSerials(e.target.value)} onBlur={() => validateField('physical_qty', formData.physical_qty)} />
                      
                      {formData.uom_id && selectedItem?.primary_uom_id && formData.uom_id !== selectedItem.primary_uom_id && (
                        <div className="mt-1 flex flex-col gap-1">
                          {isConverting ? (
                            <span className="text-[10px] text-gray-400 flex items-center gap-1"><Loader2 size={10} className="animate-spin" /> Converting...</span>
                          ) : conversionRate !== null ? (
                            <>
                              <div className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                                <ShieldCheck size={10} />
                                1 {(uoms || []).find(u => u.uom_id === formData.uom_id)?.uom_code || 'Unit'} = {conversionRate} {(uoms || []).find(u => u.uom_id === selectedItem.primary_uom_id)?.uom_code || 'Base Units'}
                              </div>
                              <div className="text-[10px] text-emerald-700 font-medium">
                                ≈ {convertedQtyPreview} {(uoms || []).find(u => u.uom_id === selectedItem.primary_uom_id)?.uom_code || 'Base UOM'}
                              </div>
                            </>
                          ) : (
                            <span className="text-[10px] text-rose-500 font-medium flex items-center gap-1">
                              <AlertTriangle size={10} /> No conversion defined
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </Field>
                  <Field label="Net Adjustment">
                    <Input 
                      value={currentAdjQty > 0 && !isTransfer ? `+${currentAdjQty}` : currentAdjQty} 
                      readOnly 
                      className={`bg-white font-bold ${isTransfer ? 'text-blue-600' : currentAdjQty > 0 ? 'text-emerald-600' : currentAdjQty < 0 ? 'text-rose-600' : 'text-gray-500'}`} 
                    />
                  </Field>
                  {!isTransfer && (
                    <>
                      <Field label="Projected Onhand">
                        <Input value={projectedOnhand} readOnly className="bg-white" />
                      </Field>
                      <Field label="Projected Available">
                        <Input value={projectedOnhand} readOnly className="bg-white" />
                      </Field>
                      {currentAdjQty > 0 && (
                        <Field label="Extra Quantity">
                          <Input value={currentAdjQty} readOnly className="bg-emerald-50 text-emerald-700 font-bold border-emerald-200" />
                        </Field>
                      )}
                    </>
                  )}
                  {/* Lot Divisible Hard Error — OUT & TRANSFER only */}
                  {lotDivisibleError && (
                    <div className="mt-2 p-3 bg-rose-50 border border-rose-300 rounded-lg flex items-start gap-2">
                      <AlertCircle className="text-rose-500 mt-0.5 shrink-0" size={16} />
                      <div>
                        <p className="text-rose-800 font-bold text-[11px]">❌ Non-Divisible Lot Restriction</p>
                        <p className="text-rose-700 text-[11px] mt-0.5">{lotDivisibleError}</p>
                      </div>
                    </div>
                  )}

                  {/* Lot Divisible Info Banner (when lot selected & non-divisible) */}
                  {isOutOrTransfer && isLotControlled && formData.lot_id && itemOrgAssignmentRules && !itemOrgAssignmentRules.lot_divisible_flag && !lotDivisibleError && (
                    <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2">
                      <AlertTriangle className="text-amber-500 shrink-0" size={14} />
                      <p className="text-amber-800 text-[11px] font-medium">
                        ⚠️ This item is configured as <strong>NON-DIVISIBLE</strong>. You must transact the full lot quantity{lotAvailableQty !== null ? ` (${lotAvailableQty})` : ''}.
                      </p>
                    </div>
                  )}

                  {/* Lot Divisible Info Banner (when lot selected & divisible) */}
                  {isOutOrTransfer && isLotControlled && formData.lot_id && itemOrgAssignmentRules?.lot_divisible_flag && (
                    <div className="mt-2 p-2 bg-emerald-50 border border-emerald-100 rounded-lg flex items-center gap-2">
                      <CheckCircle2 className="text-emerald-500 shrink-0" size={14} />
                      <p className="text-emerald-800 text-[11px] font-medium">Partial lot transactions are allowed for this item.</p>
                    </div>
                  )}

                  {/* Safety Stock Warning — OUT/TRANSFER, non-blocking */}
                  {stockLevelWarnings.filter(w => w.type === 'SAFETY_STOCK').map((w, i) => (
                    <div key={i} className="mt-2 p-3 bg-orange-50 border border-orange-300 rounded-lg flex items-start gap-2">
                      <AlertTriangle className="text-orange-500 mt-0.5 shrink-0" size={15} />
                      <div>
                        <p className="text-orange-800 font-bold text-[11px]">⚠️ Below Safety Stock Level</p>
                        <p className="text-orange-700 text-[11px]">{w.message}</p>
                        <div className="flex gap-3 mt-1 text-[10px] text-orange-600">
                          <span>Current: <strong>{w.details.currentQty}</strong></span>
                          <span>Safety Stock: <strong>{w.details.safetyStock}</strong></span>
                          <span>Remaining: <strong>{w.details.remaining}</strong></span>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Min Qty Warning — OUT/TRANSFER, non-blocking */}
                  {stockLevelWarnings.filter(w => w.type === 'MIN_QTY').map((w, i) => (
                    <div key={i} className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
                      <AlertTriangle className="text-amber-500 mt-0.5 shrink-0" size={15} />
                      <div>
                        <p className="text-amber-800 font-bold text-[11px]">⚠️ Below Minimum Stock Level</p>
                        <p className="text-amber-700 text-[11px]">{w.message}</p>
                        <div className="flex gap-3 mt-1 text-[10px] text-amber-600">
                          <span>Current: <strong>{w.details.currentQty}</strong></span>
                          <span>Min Qty: <strong>{w.details.minQty}</strong></span>
                          <span>Remaining: <strong>{w.details.remaining}</strong></span>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Max Qty Warning — IN only, non-blocking */}
                  {maxQtyWarning && (
                    <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-2">
                      <AlertTriangle className="text-blue-500 mt-0.5 shrink-0" size={15} />
                      <div>
                        <p className="text-blue-800 font-bold text-[11px]">⚠️ Exceeds Maximum Stock Level</p>
                        <p className="text-blue-700 text-[11px]">Stock quantity will exceed the configured Maximum Quantity limit ({maxQtyWarning.maxQty}).</p>
                        <div className="flex gap-3 mt-1 text-[10px] text-blue-600">
                          <span>Current: <strong>{maxQtyWarning.currentQty}</strong></span>
                          <span>Max Qty: <strong>{maxQtyWarning.maxQty}</strong></span>
                          <span>Resulting: <strong>{maxQtyWarning.resulting}</strong></span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="card p-6 mb-5">
            <SectionHeader icon={Hash} title="Tracking & Value" subtitle="Lot/Serial and Financials" color="purple" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {serialConflict && (
                <div className="col-span-full bg-rose-50 border border-rose-200 p-4 rounded-lg flex items-start gap-3 animate-pulse">
                  <AlertTriangle className="text-rose-500 mt-0.5" size={20} />
                  <div>
                    <p className="text-rose-800 font-bold text-sm">Action Required: Serial Control Conflict</p>
                    <p className="text-rose-600 text-xs mt-1">
                      This item requires Serial Control, but it is disabled for this Inventory Org.
                      Enable Serial Control in Org Parameter to proceed.
                    </p>
                  </div>
                </div>
              )}

              {lotConflict && (
                <div className="col-span-full bg-rose-50 border border-rose-200 p-4 rounded-lg flex items-start gap-3 animate-pulse">
                  <AlertTriangle className="text-rose-500 mt-0.5" size={20} />
                  <div>
                    <p className="text-rose-800 font-bold text-sm">Action Required: Lot Control Conflict</p>
                    <p className="text-rose-600 text-xs mt-1">
                      This item requires Lot Control, but it is disabled for this Inventory Org.
                      Enable Lot Control in Org Parameter to proceed.
                    </p>
                  </div>
                </div>
              )}

              {isLotControlled && (
                <>
                  {currentAdjQty > 0 && !isTransfer && formData.txn_action !== 'IN' && formData.txn_action !== 'OUT' && (
                    <div className="col-span-full mb-3">
                      <label className="flex items-center gap-2 cursor-pointer p-2 bg-purple-50 rounded border border-purple-100 hover:bg-purple-100 transition-colors">
                        <input type="checkbox" checked={formData.auto_generate_lot} 
                          onChange={e => setField('auto_generate_lot', e.target.checked)}
                          className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500" />
                        <span className="text-sm font-bold text-purple-700">Auto Generate New Lot for Extra Quantity</span>
                      </label>
                    </div>
                  )}

                  <Field label={formData.auto_generate_lot && currentAdjQty > 0 && !isTransfer && formData.txn_action !== 'IN' && formData.txn_action !== 'OUT' ? "New Lot Number" : "Lot Number"} 
                    required error={formData.txn_action === 'IN' || (formData.auto_generate_lot && currentAdjQty > 0) ? errors.lot_number : errors.lot_id}>
                    
                    {formData.txn_action === 'IN' || (formData.auto_generate_lot && currentAdjQty > 0 && !isTransfer && formData.txn_action !== 'IN' && formData.txn_action !== 'OUT') ? (
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <Input value={formData.lot_number || ''} 
                            placeholder={formData.auto_generate_lot ? "Will be auto-generated..." : "Enter lot number"}
                            disabled={view === 'view'}
                            onChange={e => setField('lot_number', e.target.value)} />
                        </div>
                        {view === 'create' && (
                          <button type="button" onClick={handleAutoGenerateLot}
                            className="px-3 py-2 text-[10px] font-bold uppercase bg-purple-50 text-purple-600 border border-purple-200 rounded hover:bg-purple-100 transition-colors">
                            Auto
                          </button>
                        )}
                      </div>
                    ) : (
                        <Select value={formData.lot_id} onChange={v => setField('lot_id', v)} disabled={view === 'view'}
                          options={lotRows?.filter(r => 
                            String(r.item_id) === String(formData.item_id) &&
                            itemStock.some(s => String(s.lot_id) === String(r.lot_id) && parseFloat(s.available_qty) > 0)
                          ).map(r => {
                          const stock = itemStock.find(s => String(s.lot_id) === String(r.lot_id));
                          const qtyStr = stock ? ` (${stock.available_qty} available)` : '';
                          return { value: r.lot_id, label: `${r.lot_number}${qtyStr}` }
                        })} />
                    )}
                  </Field>
                </>
              )}
              {isSerialControlled && (
                <div className="md:col-span-2 lg:col-span-3 mt-2 animate-slide-in">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                      <Hash className="w-4 h-4 text-amber-500" />
                      Serial Numbers
                      <span className="text-[10px] font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded ml-2">
                        {isPositiveAdj ? 'Enter one serial per unit' : 'Select existing serials'}
                      </span>
                    </h4>
                    {isPositiveAdj && view === 'create' && (
                      <button type="button" onClick={handleAutoGenerateSerials}
                        className="text-[10px] font-bold uppercase tracking-wider text-amber-600 hover:text-amber-700 border border-amber-200 hover:border-amber-300 px-3 py-1 rounded-full transition-all">
                        Auto-Generate Serials
                      </button>
                    )}
                  </div>

                  {isSerialControlled && isPositiveAdj && (
                    <div className="col-span-full mb-3">
                      <div className="text-[10px] bg-blue-50 text-blue-700 p-2 rounded border border-blue-100 flex items-center gap-2">
                        <Hash size={12} />
                        <span>Required Serial Count: <strong>{requiredSerialCount}</strong> (based on {formData.physical_qty || 0} {(uoms || []).find(u => u.uom_id === formData.uom_id)?.uom_code || 'Unit'} net adjustment)</span>
                      </div>
                    </div>
                  )}

                  {isPositiveAdj ? (
                    view === 'create' ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-60 overflow-y-auto pr-2 p-3 bg-amber-50/30 rounded-lg border border-amber-100/50">
                        {serialInputs.map((val, idx) => (
                          <div key={idx} className="relative">
                            <Input value={val} placeholder={`Serial #${idx + 1}`}
                              className={!val.trim() ? 'border-amber-200' : ''}
                              onChange={e => { const a = [...serialInputs]; a[idx] = e.target.value; setSerialInputs(a); }} />
                            {!val.trim() && <div className="absolute right-2 top-1/2 -translate-y-1/2 w-1 h-1 rounded-full bg-amber-400" />}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-3 bg-gray-50 rounded border text-sm text-gray-600">
                        {formData.serial_numbers?.join(', ') || formData.serial_id || 'No serials recorded'}
                      </div>
                    )
                  ) : (
                    <Field error={errors.serial_ids}>
                      <MultiSelect value={formData.serial_ids} onChange={v => {
                        setField('serial_ids', v);
                      }} disabled={view === 'view'}
                        options={filteredAvailableSerials.map(r => ({ value: r.serial_id, label: r.serial_number }))} />
                    </Field>
                  )}
                </div>
              )}
              <Field label="UOM" required error={errors.uom_id}>
                <Select value={formData.uom_id} onChange={v => { setField('uom_id', v); validateField('uom_id', v); }} disabled={view === 'view'}
                  options={uoms?.map(r => ({ value: r.uom_id, label: r.uom_name }))} />
              </Field>
              <Field label="Unit Cost" required error={errors.unit_cost}><Input type="number" value={formData.unit_cost} onChange={e => setField('unit_cost', e.target.value)} onBlur={() => validateField('unit_cost', formData.unit_cost)} disabled={view === 'view'} /></Field>
              <Field label="Reason" required error={errors.txn_reason_id}>
                <Select value={formData.txn_reason_id} onChange={v => setField('txn_reason_id', v)} disabled={view === 'view'}
                  options={txnReasons?.map(r => ({ value: r.txn_reason_id, label: r.txn_reason }))} />
              </Field>
              <Field label="Date" required error={errors.adjustment_date}><DateInput value={formData.adjustment_date} onChange={v => setField('adjustment_date', v)} disabled={view === 'view'} /></Field>
            </div>
          </div>

          <div className="card p-6 mb-5">
            <SectionHeader icon={ShieldCheck} title="Approval & Audit" subtitle="Status and remarks" color="brand" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Field label="Status">
                <div className="flex items-center gap-2 mt-2">
                  <CheckCircle2 className={`w-4 h-4 ${formData.approval_status === 'APPROVED' ? 'text-emerald-500' : 'text-amber-500'}`} />
                  <span className="text-sm font-bold uppercase">{formData.approval_status || 'PENDING'}</span>
                </div>
              </Field>
              <Field label="Approved By"><Input value={formData.approved_by || 'Auto-set on approval'} readOnly className="bg-gray-50" /></Field>
              <Field label="Remarks" className="md:col-span-2">
                <textarea className="input" rows={2} value={formData.remarks || ''} onChange={e => setField('remarks', e.target.value)} disabled={view === 'view'} />
              </Field>
              <AuditFields formData={formData} setField={setField} />
            </div>
          </div>
        </>
      </FormPage>
    )
  }

  return (
    <>
      <DataTable
        title="Stock Adjustment"
        subtitle="Manage inventory adjustments and internal transfers"
        columns={COLUMNS} data={table.rows} total={table.total}
        page={table.page} pages={table.pages} loading={table.isLoading}
        onSearch={table.handleSearch} onPageChange={table.setPage}
        onSort={table.handleSort} sortBy={table.sortBy} sortOrder={table.sortOrder}
        onCreate={handleCreate}
        actions={{
          onView: handleView,
          onEdit: handleEdit,
          onApprove: (row) => {
            if (String(row.approval_status || '').toUpperCase() === 'APPROVED') {
              toast('Already approved')
              return
            }
            setConfirmApprove(row)
          },
          onDelete: (row) => {
            if (String(row.approval_status || '').toUpperCase() === 'APPROVED') {
              // Offer reverse instead of delete for APPROVED records
              toast(
                (t) => (
                  <div className="flex flex-col gap-2">
                    <p className="text-sm font-bold text-rose-700">❌ Cannot Delete Approved Adjustment</p>
                    <p className="text-xs text-gray-600">Approved adjustments cannot be deleted. Create a reversal instead.</p>
                    <div className="flex gap-2 mt-1">
                      <button onClick={() => { toast.dismiss(t.id); setConfirmReverse(row); }}
                        className="text-[11px] px-3 py-1 bg-orange-500 text-white rounded font-bold hover:bg-orange-600">
                        Reverse Adjustment
                      </button>
                      <button onClick={() => toast.dismiss(t.id)}
                        className="text-[11px] px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300">
                        Cancel
                      </button>
                    </div>
                  </div>
                ),
                { duration: 8000 }
              );
              return;
            }
            setConfirmDelete(row);
          }
        }}
      />
      <ConfirmDialog
        open={!!confirmApprove}
        title="Approve Stock Adjustment"
        message={`Approve and post adjustment ${confirmApprove?.adjustment_id}? This will update inventory balances.`}
        onConfirm={handleApprove}
        onCancel={() => setConfirmApprove(null)}
        confirmText="Approve"
        loading={table.isUpdating}
      />
      <ConfirmDialog open={!!confirmDelete} title="Delete Adjustment"
        message={`Delete adjustment record ${confirmDelete?.adjustment_id}?`}
        onConfirm={handleDelete} onCancel={() => setConfirmDelete(null)} loading={table.isDeleting} />
      <ConfirmDialog
        open={!!confirmReverse}
        title="Reverse Stock Adjustment"
        message={`Create a reversal for adjustment ${confirmReverse?.adjustment_id}? This will post a counter-transaction to reverse all inventory impacts.`}
        onConfirm={handleReverse}
        onCancel={() => setConfirmReverse(null)}
        confirmText="Create Reversal"
        loading={false}
      />
    </>
  )
}
