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
import { Package, MapPin, Hash, FileText, AlertTriangle, ArrowRightLeft, CheckCircle2, ShieldCheck, Loader2 } from 'lucide-react'
import {
  stockAdjustmentApi, inventoryOrgApi, subinventoryApi, locatorApi,
  itemMasterApi, uomApi, transactionTypeApi, transactionReasonApi, moduleApi,
  lotMasterApi, serialMasterApi, itemStockApi,
  itemOrgAssignmentApi, itemSubinvRestrictionApi, orgParameterApi, uomConvApi
} from '../services/api'

const COLUMNS = [
  { key: 'adjustment_id', label: 'ID' },
  { key: 'item_name', label: 'Item' },
  { key: 'inv_org_name', label: 'Org' },
  { key: 'txn_action', label: 'Action' },
  { key: 'adjustment_qty', label: 'Adj Qty' },
  { key: 'adjustment_value', label: 'Value' },
  {
    key: 'approval_status', label: 'Status', render: (v) => (
      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${v === 'APPROVED' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' :
        v === 'REJECTED' ? 'bg-rose-100 text-rose-700 border border-rose-200' :
          'bg-amber-100 text-amber-700 border border-amber-200'
        }`}>
        {v || 'PENDING'}
      </span>
    )
  },
]

export default function StockAdjustmentPage() {
  const table = useTableData(stockAdjustmentApi, 'stock_adjustment')
  const [view, setView] = useState('list')
  const [selected, setSelected] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [confirmApprove, setConfirmApprove] = useState(null)
  const [formData, setFormData] = useState({})
  const [errors, setErrors] = useState({})
  const [stockSnapshot, setStockSnapshot] = useState(null)
  const [serialInputs, setSerialInputs] = useState([])
  const [serialMode, setSerialMode] = useState('manual')
  const [conversionRate, setConversionRate] = useState(1)
  const [isConverting, setIsConverting] = useState(false)

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

  const isTransfer = formData.txn_action === 'TRANSFER';

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

  const canSave = !lotConflict && !serialConflict;

  const setField = useCallback((k, v) => {
    setFormData(p => ({ ...p, [k]: v }));
    if (errors[k]) setErrors(p => ({ ...p, [k]: null }));
  }, [errors])

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

  const handleQtyChangeForSerials = useCallback((newQty) => {
    setField('physical_qty', newQty);
  }, [setField]);

  useEffect(() => {
    if (isSerialControlled && formData.txn_action === 'IN' && view === 'create') {
      const qty = parseFloat(formData.physical_qty || 0);
      const rate = conversionRate !== null ? conversionRate : 1;
      const count = Math.max(0, Math.floor(qty * rate));
      
      setSerialInputs(prev => {
        if (count === prev.length) return prev;
        if (count > prev.length) return [...prev, ...Array(count - prev.length).fill('')];
        return prev.slice(0, count);
      });
    }
  }, [formData.physical_qty, conversionRate, isSerialControlled, formData.txn_action, view]);

  const handleAutoGenerateSerials = async () => {
    const rate = conversionRate !== null ? conversionRate : 1;
    const baseQty = Math.max(0, Math.floor(parseFloat(formData.physical_qty || 0) * rate));
    
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

  const currentAdjQty = useMemo(() => {
    const physicalQty = parseFloat(convertedQtyPreview || 0);
    const systemQty = parseFloat(formData.system_qty || 0);
    const action = String(formData.txn_action || '').toUpperCase();
    const typeCode = String(formData.txn_type_code || '').toUpperCase();

    if (isTransfer) return physicalQty;
    if (action === 'IN' || typeCode === 'TXN_TYPE_INC') return physicalQty;
    if (action === 'OUT' || typeCode === 'TXN_TYPE_OUT') return -physicalQty;
    return physicalQty - systemQty;
  }, [isTransfer, convertedQtyPreview, formData.system_qty, formData.txn_action, formData.txn_type_code]);

  const projectedOnhand = useMemo(
    () => parseFloat(formData.system_qty || 0) + parseFloat(currentAdjQty || 0),
    [formData.system_qty, currentAdjQty]
  );

  const handleCreate = () => {
    setFormData({
      active_flag: 'Y',
      effective_from: new Date().toISOString().split('T')[0],
      adjustment_date: new Date().toISOString().split('T')[0],
      approval_status: 'PENDING',
      created_by: 'admin'
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
    await table.remove(confirmDelete['adjustment_id'])
    setConfirmDelete(null)
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
      if (valErrors.serial_ids && isSerialControlled && formData.txn_action === 'IN') {
        const req = Math.floor(parseFloat(convertedQtyPreview || 0));
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
      if (isSerialControlled && formData.txn_action === 'IN') {
        payload.serial_numbers = serialInputs.filter(s => s.trim());
        payload.serial_ids = undefined; // Clear old field
      }
      if (view === 'edit') await table.update(selected['adjustment_id'], payload)
      else await table.create(payload)
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
        onBack={handleBack} onSubmit={handleSubmit} loading={table.isCreating || table.isUpdating} mode={view}
        disabled={!canSave}>
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
                </div>
              </div>

              {/* Destination Location (Transfers Only) */}
              {isTransfer && (
                <div className="p-4 rounded-lg bg-blue-50 border border-blue-100">
                  <h4 className="text-xs font-bold uppercase text-blue-600 mb-3">Destination Location</h4>
                  <div className="space-y-3">
                    <Field label="To Org" required={isTransfer} error={errors.to_inv_org_id}>
                      <Select value={formData.to_inv_org_id} onChange={v => { setField('to_inv_org_id', v); setField('to_subinventory_id', ''); setField('to_locator_id', ''); }} disabled={view === 'view'}
                        options={filteredToOrgs.map(r => ({ value: r.inv_org_id, label: r.inv_org_name }))} />
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
                  </div>
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
                    <Input value={currentAdjQty} readOnly className="bg-white font-bold" />
                  </Field>
                  {!isTransfer && (
                    <>
                      <Field label="Projected Onhand">
                        <Input value={projectedOnhand} readOnly className="bg-white" />
                      </Field>
                      <Field label="Projected Available">
                        <Input value={projectedOnhand} readOnly className="bg-white" />
                      </Field>
                    </>
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
                <Field label="Lot Number" required error={formData.txn_action === 'IN' ? errors.lot_number : errors.lot_id}>
                  {formData.txn_action === 'IN' ? (
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <Input value={formData.lot_number || ''} 
                          placeholder="Auto-generated if empty"
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
              )}
              {isSerialControlled && (
                <div className="md:col-span-2 lg:col-span-3 mt-2 animate-slide-in">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                      <Hash className="w-4 h-4 text-amber-500" />
                      Serial Numbers
                      <span className="text-[10px] font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded ml-2">
                        {formData.txn_action === 'IN' ? 'Enter one serial per unit' : 'Select existing serials'}
                      </span>
                    </h4>
                    {formData.txn_action === 'IN' && view === 'create' && (
                      <button type="button" onClick={handleAutoGenerateSerials}
                        className="text-[10px] font-bold uppercase tracking-wider text-amber-600 hover:text-amber-700 border border-amber-200 hover:border-amber-300 px-3 py-1 rounded-full transition-all">
                        Auto-Generate Serials
                      </button>
                    )}
                  </div>

                  {isSerialControlled && formData.txn_action === 'IN' && (
                    <div className="col-span-full mb-3">
                      <div className="text-[10px] bg-blue-50 text-blue-700 p-2 rounded border border-blue-100 flex items-center gap-2">
                        <Hash size={12} />
                        <span>Required Serial Count: <strong>{Math.floor(parseFloat(convertedQtyPreview || 0))}</strong> (based on {formData.physical_qty || 0} {(uoms || []).find(u => u.uom_id === formData.uom_id)?.uom_code || 'Unit'})</span>
                      </div>
                    </div>
                  )}

                  {formData.txn_action === 'IN' ? (
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
                        // NOTE: Do NOT set physical_qty here — serial selection must NOT change the quantity.
                        // Qty is controlled only by user input and UOM conversion.
                      }} disabled={view === 'view'}
                        options={filteredAvailableSerials.map(r => ({ value: r.serial_id, label: r.serial_number }))} />
                    </Field>
                  )}
                </div>
              )}
              <Field label="UOM" error={errors.uom_id}>
                <Select value={formData.uom_id} onChange={v => setField('uom_id', v)} disabled={view === 'view'}
                  options={uoms?.map(r => ({ value: r.uom_id, label: r.uom_name }))} />
              </Field>
              <Field label="Unit Cost" error={errors.unit_cost}><Input type="number" value={formData.unit_cost} onChange={e => setField('unit_cost', e.target.value)} disabled={view === 'view'} /></Field>
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
          onDelete: setConfirmDelete
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
    </>
  )
}
