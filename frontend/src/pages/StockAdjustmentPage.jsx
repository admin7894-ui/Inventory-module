import React, { useState, useEffect, useMemo, useCallback } from 'react'
import toast from 'react-hot-toast'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTableData, useDropdownData } from '../hooks/useTableData'
import { CompanyGroup } from '../components/CompanyGroup'
import { validateStockAdjustment } from '../validations/stockAdjustment.validation'
import {
  DataTable, Toggle, Select, DateInput, Field, FormPage, ConfirmDialog,
  Input, AuditFields, MultiSelect, SectionHeader
} from '../components/ui/index'
import { Package, MapPin, Hash, FileText, AlertTriangle, ArrowRightLeft, CheckCircle2, ShieldCheck } from 'lucide-react'
import {
  stockAdjustmentApi, inventoryOrgApi, subinventoryApi, locatorApi,
  itemMasterApi, uomApi, transactionTypeApi, transactionReasonApi, moduleApi,
  lotMasterApi, serialMasterApi, itemStockApi,
  itemOrgAssignmentApi, itemSubinvRestrictionApi
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
  const [formData, setFormData] = useState({})
  const [errors, setErrors] = useState({})

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
  const { options: assignments } = useDropdownData(itemOrgAssignmentApi, 'item_org_assign_dd')
  const { options: restrictions } = useDropdownData(itemSubinvRestrictionApi, 'item_subinv_restr_dd')
  const { rows: allStock } = useTableData(itemStockApi, 'item_stock_onhand', { limit: 1000 })

  const isYes = (v) => v === 'Y' || v === true || v === 'True' || v === 'true';

  const isTransfer = formData.txn_action === 'TRANSFER';

  const selectedItem = useMemo(() => {
    return (items || []).find(i => String(i.item_id) === String(formData.item_id));
  }, [items, formData.item_id]);

  const isLotControlled = selectedItem && isYes(selectedItem.is_lot_controlled);
  const isSerialControlled = selectedItem && isYes(selectedItem.is_serial_controlled);

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
    if (!formData.item_id || !allStock) return []
    return allStock.filter(s => String(s.item_id) === String(formData.item_id))
  }, [formData.item_id, allStock])

  const currentStockInfo = useMemo(() => {
    if (!formData.item_id || !formData.inv_org_id || !formData.subinventory_id) return null
    return itemStock.find(s =>
      String(s.inv_org_id) === String(formData.inv_org_id) &&
      String(s.subinventory_id) === String(formData.subinventory_id) &&
      (String(s.locator_id || '')) === (String(formData.locator_id || '')) &&
      (isLotControlled ? String(s.lot_id) === String(formData.lot_id) : true) &&
      (isSerialControlled ? (formData.serial_ids?.includes(s.serial_id) || s.serial_id === formData.serial_id) : true)
    )
  }, [formData.item_id, formData.inv_org_id, formData.subinventory_id, formData.locator_id, formData.lot_id, formData.serial_id, formData.serial_ids, itemStock, isLotControlled, isSerialControlled])

  const validateField = useCallback((k, v) => {
    const val = typeof v === 'string' ? v.trim() : v;
    const { errors: newErrors } = validateStockAdjustment({ ...formData, [k]: val }, {
      stockInfo: currentStockInfo, isLotControlled, isSerialControlled
    })
    setErrors(prev => ({ ...prev, [k]: newErrors[k] }))
  }, [formData, currentStockInfo, isLotControlled, isSerialControlled])

  const handleTxnTypeChange = (tid) => {
    const type = (txnTypes || []).find(t => String(t.txn_type_id) === String(tid));
    if (type) {
      const transfer = type.txn_action === 'TRANSFER';
      setFormData(prev => ({
        ...prev,
        txn_type_id: tid,
        txn_action: type.txn_action,
        transfer_flag: transfer ? 'Y' : 'N',
        approval_status: transfer ? 'APPROVED' : 'PENDING'
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
    if (!isTransfer) return mapped
    // For transfers: only show subinventories where stock > 0 at at least one locator
    return mapped.filter(sub => (allStock || []).some(s =>
      String(s.item_id) === String(formData.item_id) &&
      String(s.inv_org_id) === String(formData.inv_org_id) &&
      String(s.subinventory_id) === String(sub.subinventory_id) &&
      parseFloat(s.available_qty) > 0
    ))
  }, [formData.item_id, formData.inv_org_id, subinventories, restrictions, allStock, isTransfer])

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
    if (!isTransfer) return base
    // For transfers: only show locators where stock > 0
    return base.filter(l => (allStock || []).some(s =>
      String(s.item_id) === String(formData.item_id) &&
      String(s.inv_org_id) === String(formData.inv_org_id) &&
      String(s.subinventory_id) === String(formData.subinventory_id) &&
      String(s.locator_id) === String(l.locator_id) &&
      parseFloat(s.available_qty) > 0
    ))
  }, [formData.item_id, formData.inv_org_id, formData.subinventory_id, locators, restrictions, allStock, isTransfer])

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
    if (isTransfer) return parseFloat(formData.physical_qty || 0);
    return parseFloat(formData.physical_qty || 0) - parseFloat(formData.system_qty || 0);
  }, [isTransfer, formData.physical_qty, formData.system_qty]);

  const handleCreate = () => {
    setFormData({
      active_flag: 'Y',
      effective_from: new Date().toISOString().split('T')[0],
      adjustment_date: new Date().toISOString().split('T')[0],
      approval_status: 'PENDING'
    })
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

  const handleSubmit = async (ev) => {
    ev.preventDefault()

    const trimmedData = Object.fromEntries(
      Object.entries(formData).map(([k, v]) => [k, typeof v === 'string' ? v.trim() : v])
    )
    const { errors: valErrors, isValid } = validateStockAdjustment(trimmedData, {
      stockInfo: currentStockInfo, isLotControlled, isSerialControlled
    })

    setErrors(valErrors)

    if (!isValid) {
      const errorList = Object.values(valErrors).join('\n• ')
      toast.error(`Please fix the following errors:\n• ${errorList}`, { duration: 4000 })
      setTimeout(() => {
        const firstError = document.querySelector('[data-error="true"], .border-red-500')
        if (firstError) firstError.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 100)
      return
    }

    try {
      const payload = {
        ...formData,
        adjustment_qty: currentAdjQty,
        adjustment_value: (currentAdjQty * parseFloat(formData.unit_cost || 0)).toFixed(2),
        approved_by: isTransfer ? (formData.created_by || 'system') : formData.approved_by,
        active_flag: 'Y'
      }
      if (view === 'edit') await table.update(selected['adjustment_id'], payload)
      else await table.create(payload)
      handleBack()
    } catch (err) {
      if (err.response?.data?.errors) {
        setErrors(err.response.data.errors)
        toast.error(Object.values(err.response.data.errors)[0] || 'Please fix the highlighted errors')
      } else {
        toast.error(err.response?.data?.message || 'Action failed')
      }
    }
  }

  if (view !== 'list') {
    return (
      <FormPage title={view === 'view' ? 'View Adjustment' : view === 'edit' ? 'Edit Adjustment' : 'New Adjustment'}
        onBack={handleBack} onSubmit={handleSubmit} loading={table.isCreating || table.isUpdating} mode={view}>
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
                <div className="flex gap-2 mt-2">
                  {isLotControlled && <span className="badge-purple">Lot</span>}
                  {isSerialControlled && <span className="badge-yellow">Serial</span>}
                  {!isLotControlled && !isSerialControlled && <span className="badge-blue">Standard</span>}
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
                  <Field label="Subinventory">
                    <Select value={formData.subinventory_id} onChange={v => { setField('subinventory_id', v); setField('locator_id', ''); }} disabled={view === 'view'}
                      options={filteredSubinventories.map(r => ({ value: r.subinventory_id, label: r.subinventory_name }))} />
                  </Field>
                  <Field label="Locator (Bin)">
                    <Select value={formData.locator_id} onChange={v => setField('locator_id', v)} disabled={view === 'view' || !formData.subinventory_id}
                      options={filteredSourceLocators.map(r => ({ value: r.locator_id, label: r.locator_name }))} />
                  </Field>
                </div>
              </div>

              {/* Destination Location (Transfers Only) */}
              {isTransfer && (
                <div className="p-4 rounded-lg bg-blue-50 border border-blue-100">
                  <h4 className="text-xs font-bold uppercase text-blue-600 mb-3">Destination Location</h4>
                  <div className="space-y-3">
                    <Field label="To Org" required error={errors.to_inv_org_id}>
                      <Select value={formData.to_inv_org_id} onChange={v => { setField('to_inv_org_id', v); setField('to_subinventory_id', ''); setField('to_locator_id', ''); }} disabled={view === 'view'}
                        options={filteredToOrgs.map(r => ({ value: r.inv_org_id, label: r.inv_org_name }))} />
                    </Field>
                    <Field label="To Subinventory" required error={errors.to_subinventory_id}>
                      <Select value={formData.to_subinventory_id} onChange={v => { setField('to_subinventory_id', v); setField('to_locator_id', ''); }} disabled={view === 'view'}
                        options={filteredToSubinventories.map(r => ({ value: r.subinventory_id, label: r.subinventory_name }))} />
                    </Field>
                    <Field label="To Locator (Bin)" error={errors.to_locator_id}>
                      <Select value={formData.to_locator_id} onChange={v => setField('to_locator_id', v)} disabled={view === 'view' || !formData.to_subinventory_id}
                        options={filteredDestLocators.map(r => ({ value: r.locator_id, label: r.locator_name }))} />
                    </Field>
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
                      <Input type="number" value={formData.system_qty} onChange={e => setField('system_qty', e.target.value)} disabled={view === 'view'} />
                    </Field>
                  )}
                  <Field label={isTransfer ? "Transfer Qty" : "Physical Qty"}>
                    <Input type="number" value={formData.physical_qty} onChange={e => setField('physical_qty', e.target.value)} disabled={view === 'view'} />
                  </Field>
                  <Field label="Net Adjustment">
                    <Input value={currentAdjQty} readOnly className="bg-white font-bold" />
                  </Field>
                </div>
              </div>
            </div>
          </div>

          <div className="card p-6 mb-5">
            <SectionHeader icon={Hash} title="Tracking & Value" subtitle="Lot/Serial and Financials" color="purple" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {isLotControlled && (
                <Field label="Lot" required error={errors.lot_id}>
                  <Select value={formData.lot_id} onChange={v => setField('lot_id', v)} disabled={view === 'view'}
                    options={lots?.filter(r => {
                      if (!isTransfer) return true
                      return itemStock.some(s => String(s.lot_id) === String(r.lot_id) && parseFloat(s.available_qty) > 0)
                    }).map(r => ({ value: r.lot_id, label: r.lot_number }))} />
                </Field>
              )}
              {isSerialControlled && (
                <Field label="Serials" required error={errors.serial_ids}>
                  <MultiSelect value={formData.serial_ids} onChange={v => {
                    setField('serial_ids', v);
                    setField('physical_qty', v.length);
                  }} disabled={view === 'view'}
                    options={serials?.filter(r => {
                      if (!isTransfer) return true
                      return itemStock.some(s => String(s.serial_id) === String(r.serial_id) && parseFloat(s.available_qty) > 0)
                    }).map(r => ({ value: r.serial_id, label: r.serial_number }))} />
                </Field>
              )}
              <Field label="UOM">
                <Select value={formData.uom_id} onChange={v => setField('uom_id', v)} disabled={view === 'view'}
                  options={uoms?.map(r => ({ value: r.uom_id, label: r.uom_name }))} />
              </Field>
              <Field label="Unit Cost"><Input type="number" value={formData.unit_cost} onChange={e => setField('unit_cost', e.target.value)} disabled={view === 'view'} /></Field>
              <Field label="Reason">
                <Select value={formData.txn_reason_id} onChange={v => setField('txn_reason_id', v)} disabled={view === 'view'}
                  options={txnReasons?.map(r => ({ value: r.txn_reason_id, label: r.txn_reason }))} />
              </Field>
              <Field label="Date"><DateInput value={formData.adjustment_date} onChange={v => setField('adjustment_date', v)} disabled={view === 'view'} /></Field>
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
              <AuditFields formData={formData} />
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
        actions={{ onView: handleView, onEdit: handleEdit, onDelete: setConfirmDelete }}
      />
      <ConfirmDialog open={!!confirmDelete} title="Delete Adjustment"
        message={`Delete adjustment record ${confirmDelete?.adjustment_id}?`}
        onConfirm={handleDelete} onCancel={() => setConfirmDelete(null)} loading={table.isDeleting} />
    </>
  )
}
