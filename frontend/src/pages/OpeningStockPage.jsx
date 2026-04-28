import React, { useState, useMemo, useCallback, useEffect } from 'react'
import toast from 'react-hot-toast'
import { useTableData, useDropdownData } from '../hooks/useTableData'
import { validate } from '../validations/validationEngine'
import { CompanyGroup } from '../components/CompanyGroup'
import { DataTable, Toggle, Select, DateInput, Field, FormPage, ConfirmDialog, Input, AuditFields, SectionHeader } from '../components/ui/index'
import { Package, MapPin, Hash, BarChart3, FileText, AlertTriangle, Ban, Plus, X, Loader2, CheckCircle2 } from 'lucide-react'
import {
  openingStockApi, moduleApi, inventoryOrgApi, subinventoryApi, locatorApi,
  itemMasterApi, uomApi, itemTypeApi, transactionReasonApi,
  itemOrgAssignmentApi, itemSubinvRestrictionApi
} from '../services/api'

const COLUMNS = [
  { key: 'opening_stock_id', label: 'ID' },
  { key: 'item_name', label: 'Item' },
  { key: 'inv_org_name', label: 'Inv Org' },
  { key: 'subinventory_name', label: 'Subinventory' },
  { key: 'opening_qty', label: 'Qty' },
  { key: 'unit_cost', label: 'Unit Cost' },
  { key: 'total_value', label: 'Total Value' },
  { key: 'active_flag', label: 'Status', render: (v) => (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
      v === 'Y' || v === 'True' || v === true 
      ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' 
      : 'bg-rose-100 text-rose-700 border border-rose-200'
    }`}>
      {v === 'Y' || v === 'True' || v === true ? 'Active' : 'Inactive'}
    </span>
  )},
]



export default function OpeningStockPage() {
  const table = useTableData(openingStockApi, 'opening_stock')
  const [view, setView] = useState('list')
  const [selected, setSelected] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [formData, setFormData] = useState({})
  const [errors, setErrors] = useState({})
  const [serialInputs, setSerialInputs] = useState([])
  const [serialMode, setSerialMode] = useState('auto') // 'auto' | 'manual'

  // Dropdowns
  const { options: modules }       = useDropdownData(moduleApi, 'mod_dd')
  const { options: inventoryOrgs } = useDropdownData(inventoryOrgApi, 'invorg_dd')
  const { options: subinventories }= useDropdownData(subinventoryApi, 'sub_dd')
  const { options: locators }      = useDropdownData(locatorApi, 'loc2_dd')
  const { options: allItems }      = useDropdownData(itemMasterApi, 'item_dd')
  const { options: uoms }          = useDropdownData(uomApi, 'uom_dd')
  const { options: itemTypes }     = useDropdownData(itemTypeApi, 'itype_dd')
  const { options: txnReasons }    = useDropdownData(transactionReasonApi, 'txnr_dd')
  const { options: assignments }   = useDropdownData(itemOrgAssignmentApi, 'item_org_assign_dd')
  const { options: restrictions }  = useDropdownData(itemSubinvRestrictionApi, 'item_subinv_restr_dd')

  // Filter reasons: active + category = 'OPENING'
  const filteredReasons = useMemo(() => {
    return (txnReasons || []).filter(r => 
      (r.active_flag === 'Y' || r.active_flag === 'True' || r.active_flag === true) && 
      r.category === 'OPENING'
    )
  }, [txnReasons])

  // Filter items: only physical + stock items
  const physicalStockItems = useMemo(() => {
    if (!allItems?.length || !itemTypes?.length || !assignments?.length || !restrictions?.length) return []
    return allItems.filter(item => {
      const type = itemTypes.find(t => String(t.item_type_id) === String(item.item_type_id))
      const isPhys = type && (type.is_physical === 'Y' || type.is_physical === true || type.is_physical === 'True')
      const isStock = item.is_stock_item === 'Y' || item.is_stock_item === true || item.is_stock_item === 'True'
      if (!isPhys || !isStock) return false

      // Check if item is assigned to at least one Org
      const isAssigned = assignments.some(a => String(a.item_id) === String(item.item_id))
      // Check if item has at least one Subinventory restriction
      const hasRestrictions = restrictions.some(r => String(r.item_id) === String(item.item_id))
      
      return isAssigned && hasRestrictions
    })
  }, [allItems, itemTypes, assignments, restrictions])

  // Selected item's config
  const selectedItem = useMemo(() => {
    if (!formData.item_id) return null
    return allItems?.find(i => String(i.item_id) === String(formData.item_id)) || null
  }, [formData.item_id, allItems])

  const isYes = (v) => v === 'Y' || v === true || v === 'True' || v === 'true'
  const isLotControlled = selectedItem && isYes(selectedItem.is_lot_controlled)
  const isSerialControlled = selectedItem && isYes(selectedItem.is_serial_controlled)
  const isExpirable = selectedItem && isYes(selectedItem.is_expirable)
  const shelfLifeDays = selectedItem ? parseInt(selectedItem.shelf_life_days || 0) : 0

  const setField = useCallback((k, v) => {
    setFormData(p => ({ ...p, [k]: v }))
    setErrors(p => { const n = { ...p }; delete n[k]; return n })
  }, [])

  // Auto-set default txn reason to 'INITIAL_STOCK'
  useEffect(() => {
    if (view === 'create' && filteredReasons.length > 0 && !formData.txn_reason_id) {
      const defaultReason = filteredReasons.find(r => r.reason_code === 'INITIAL_STOCK')
      if (defaultReason) setField('txn_reason_id', defaultReason.txn_reason_id)
    }
  }, [view, filteredReasons, formData.txn_reason_id, setField])

  // Filtered dropdowns based on Item selection
  const filteredOrgs = useMemo(() => {
    if (!formData.item_id || !inventoryOrgs?.length || !assignments?.length) return []
    const itemAssignments = assignments.filter(a => String(a.item_id) === String(formData.item_id))
    return inventoryOrgs.filter(org => itemAssignments.some(a => String(a.inv_org_id) === String(org.inv_org_id)))
  }, [formData.item_id, inventoryOrgs, assignments])

  const filteredSubinventories = useMemo(() => {
    if (!formData.item_id || !formData.inv_org_id || !subinventories?.length || !restrictions?.length) return []
    const itemRestrictions = restrictions.filter(r => 
      String(r.item_id) === String(formData.item_id) && 
      String(r.inv_org_id) === String(formData.inv_org_id)
    )
    return subinventories.filter(s => itemRestrictions.some(r => String(r.subinventory_id) === String(s.subinventory_id)))
  }, [formData.item_id, formData.inv_org_id, subinventories, restrictions])

  const filteredLocators = useMemo(() => {
    if (!formData.item_id || !formData.inv_org_id || !formData.subinventory_id || !locators?.length || !restrictions?.length) return []
    const itemRestrictions = restrictions.filter(r => 
      String(r.item_id) === String(formData.item_id) && 
      String(r.inv_org_id) === String(formData.inv_org_id) &&
      String(r.subinventory_id) === String(formData.subinventory_id)
    )
    return locators.filter(l => itemRestrictions.some(r => String(r.locator_id) === String(l.locator_id)))
  }, [formData.item_id, formData.inv_org_id, formData.subinventory_id, locators, restrictions])

  // Auto-selection logic
  useEffect(() => {
    if (view === 'create' || view === 'edit') {
      // Auto-select Org
      if (!formData.inv_org_id && filteredOrgs.length === 1) {
        setField('inv_org_id', filteredOrgs[0].inv_org_id)
      }
      // Auto-select Subinventory
      if (formData.inv_org_id && !formData.subinventory_id && filteredSubinventories.length === 1) {
        setField('subinventory_id', filteredSubinventories[0].subinventory_id)
      }
      // Auto-select Locator
      if (formData.subinventory_id && !formData.locator_id && filteredLocators.length === 1) {
        setField('locator_id', filteredLocators[0].locator_id)
      }
    }
  }, [view, formData.inv_org_id, formData.subinventory_id, formData.locator_id, filteredOrgs, filteredSubinventories, filteredLocators, setField])

  // Handle item change — reset tracking fields, auto-fill UOM
  const handleItemChange = useCallback((itemId) => {
    const item = allItems?.find(i => String(i.item_id) === String(itemId))
    setFormData(prev => ({
      ...prev,
      item_id: itemId,
      uom_id: item?.primary_uom_id || prev.uom_id,
      inv_org_id: '',
      subinventory_id: '',
      locator_id: '',
      lot_number: '',
      expiry_date: '',
    }))
    setSerialInputs([])
    setSerialMode('auto')
    setErrors({})
  }, [allItems])

  // Auto-calc total value
  const totalValue = useMemo(() => {
    const qty = parseFloat(formData.opening_qty || 0)
    const cost = parseFloat(formData.unit_cost || 0)
    return (qty * cost).toFixed(2)
  }, [formData.opening_qty, formData.unit_cost])

  // Auto-calc expiry date from shelf life
  const computedExpiry = useMemo(() => {
    if (!isExpirable || !shelfLifeDays || !formData.opening_date) return ''
    const d = new Date(formData.opening_date)
    d.setDate(d.getDate() + shelfLifeDays)
    return d.toISOString().split('T')[0]
  }, [isExpirable, shelfLifeDays, formData.opening_date])

  // Serial input management
  const handleQtyChangeForSerials = useCallback((newQty) => {
    setField('opening_qty', newQty)
    if (isSerialControlled && serialMode === 'manual') {
      const count = parseInt(newQty) || 0
      setSerialInputs(prev => {
        if (count > prev.length) return [...prev, ...Array(count - prev.length).fill('')]
        return prev.slice(0, count)
      })
    }
  }, [isSerialControlled, serialMode, setField])

  const handleCreate = () => {
    setFormData({ 
      active_flag: 'Y', 
      effective_from: new Date().toISOString().split('T')[0], 
      opening_date: new Date().toISOString().split('T')[0] 
    })
    setSerialInputs([])
    setSerialMode('auto')
    setErrors({})
    setView('create')
  }
  const handleEdit = (row) => { setSelected(row); setFormData({ ...row }); setErrors({}); setView('edit') }
  const handleView = (row) => { setSelected(row); setFormData({ ...row }); setErrors({}); setView('view') }
  const handleBack = () => { setView('list'); setSelected(null); setErrors({}) }

  const handleSubmit = async (ev) => {
    ev.preventDefault()
    const { errors: valErrors, isValid } = validate('opening_stock', formData, {
      isLotControlled, isSerialControlled, serialMode, serialInputs
    })
    setErrors(valErrors)
    if (!isValid) return toast.error('Please fix the highlighted errors')
    try {
      const payload = { ...formData, total_value: totalValue, active_flag: 'Y' }
      if (isSerialControlled && serialMode === 'manual') {
        payload.serial_numbers = serialInputs.filter(s => s.trim())
      }
      if (isExpirable && !payload.expiry_date && computedExpiry) {
        payload.expiry_date = computedExpiry
      }
      if (view === 'edit') await table.update(selected['opening_stock_id'], payload)
      else await table.create(payload)
      handleBack()
    } catch {}
  }

  const handleDelete = async () => {
    await table.remove(confirmDelete['opening_stock_id'])
    setConfirmDelete(null)
  }

  if (view !== 'list') {
    return (
      <FormPage
        title={view === 'view' ? 'View Opening Stock' : view === 'edit' ? 'Edit Opening Stock' : 'New Opening Stock'}
        onBack={handleBack} onSubmit={handleSubmit}
        loading={table.isCreating || table.isUpdating} mode={view}
      >
        <div className="card p-6 mb-5">
          <SectionHeader icon={Package} title="Organization & Item" subtitle="Primary transaction details" color="brand" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Field label="Opening Stock ID (Auto-gen)"><Input value={formData.opening_stock_id} readOnly /></Field>
            <CompanyGroup formData={formData} setField={setField} errors={errors} />
            <Field label="Item" required error={errors.item_id}>
              <Select value={formData.item_id} onChange={handleItemChange} error={errors.item_id} disabled={view === 'view' || view === 'edit'}
                options={physicalStockItems.map(r => ({ value: r.item_id, label: `${r.item_code || ''} - ${r.item_name || r.item_id}` }))} />
            </Field>

            <Field label="Transaction Reason" required error={errors.txn_reason_id}>
              <Select value={formData.txn_reason_id} onChange={v => setField('txn_reason_id', v)} error={errors.txn_reason_id} disabled={view === 'view'}
                options={filteredReasons.map(r => ({ value: r.txn_reason_id, label: `${r.reason_code} - ${r.txn_reason}` }))} />
            </Field>

            {selectedItem && (
              <Field label="Control Type">
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {isLotControlled && <span className="badge-purple">Lot Controlled</span>}
                  {isSerialControlled && <span className="badge-yellow">Serial Controlled</span>}
                  {!isLotControlled && !isSerialControlled && <span className="badge-blue">Standard (No Tracking)</span>}
                  {isExpirable && <span className="badge-red">Expirable</span>}
                </div>
              </Field>
            )}
          </div>
        </div>

        {selectedItem && (
          <div className="card p-6 mb-5 animate-slide-in">
            <SectionHeader icon={MapPin} title="Location & Quantity" subtitle="Where and how much" color="emerald" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Field label="Inventory Organization" required error={errors.inv_org_id}>
                <Select value={formData.inv_org_id} onChange={v => { setField('inv_org_id', v); setField('subinventory_id', ''); setField('locator_id', ''); }} error={errors.inv_org_id} disabled={view === 'view'}
                  options={filteredOrgs.map(r => ({ value: r.inv_org_id, label: r.inv_org_name || r.inv_org_id }))} />
              </Field>
              <Field label="Subinventory" required error={errors.subinventory_id}>
                <Select value={formData.subinventory_id} onChange={v => { setField('subinventory_id', v); setField('locator_id', ''); }} error={errors.subinventory_id} disabled={view === 'view'}
                  options={filteredSubinventories.map(r => ({ value: r.subinventory_id, label: r.subinventory_name || r.subinventory_id }))} />
              </Field>
              <Field label="Locator / Bin">
                <Select value={formData.locator_id} onChange={v => setField('locator_id', v)} disabled={view === 'view'}
                  options={filteredLocators.map(r => ({ value: r.locator_id, label: r.locator_name || r.locator_id }))} />
              </Field>
              <Field label="UOM">
                <Select value={formData.uom_id} onChange={v => setField('uom_id', v)} disabled={view === 'view'}
                  options={uoms?.map(r => ({ value: r.uom_id, label: `${r.uom_code || ''} - ${r.uom_name || r.uom_id}` }))} />
              </Field>
              <Field label="Opening Qty" required error={errors.opening_qty}>
                <Input type="number" value={formData.opening_qty} error={errors.opening_qty} disabled={view === 'view' || view === 'edit'}
                  onChange={e => handleQtyChangeForSerials(e.target.value)} />
              </Field>
              <Field label="Unit Cost" required error={errors.unit_cost}>
                <Input type="number" value={formData.unit_cost} error={errors.unit_cost} disabled={view === 'view'}
                  onChange={e => setField('unit_cost', e.target.value)} />
              </Field>
              <Field label="Total Value (Auto-calc)">
                <Input value={totalValue} readOnly className="font-semibold text-emerald-700 bg-emerald-50/50" />
              </Field>
              <Field label="Opening Date">
                <DateInput value={formData.opening_date} onChange={v => setField('opening_date', v)} disabled={view === 'view'} />
              </Field>
            </div>
          </div>
        )}

        {/* Conditional Rendering: Lot vs Serial */}
        {selectedItem && isLotControlled && (
          <div className="card p-6 mb-5 border-l-4 border-purple-500 animate-slide-in">
            <SectionHeader icon={Hash} title="Lot Details" subtitle="Required for lot-controlled items" color="purple" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Field label="Lot Number" required error={errors.lot_number}>
                <Input value={formData.lot_number} error={errors.lot_number} disabled={view === 'view' || view === 'edit'}
                  onChange={e => setField('lot_number', e.target.value)} />
              </Field>
              {isExpirable && (
                <Field label="Expiry Date">
                  <DateInput value={formData.expiry_date || computedExpiry} onChange={v => setField('expiry_date', v)} disabled={view === 'view'} />
                </Field>
              )}
            </div>
          </div>
        )}

        {selectedItem && isSerialControlled && (
          <div className="card p-6 mb-5 border-l-4 border-amber-500 animate-slide-in">
            <SectionHeader icon={Hash} title="Serial Numbers" subtitle="Required for serial-controlled items" color="amber" />
            {view === 'create' && (
              <div className="mb-4 flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" checked={serialMode === 'auto'} onChange={() => setSerialMode('auto')} className="accent-amber-500" />
                  <span className="text-sm font-medium">Auto-Generate</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" checked={serialMode === 'manual'} onChange={() => setSerialMode('manual')} className="accent-amber-500" />
                  <span className="text-sm font-medium">Enter Manually</span>
                </label>
              </div>
            )}
            
            {serialMode === 'manual' && view === 'create' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 max-h-60 overflow-y-auto pr-2">
                {serialInputs.map((val, idx) => (
                  <Input key={idx} value={val} placeholder={`Serial #${idx + 1}`}
                    onChange={e => { const a = [...serialInputs]; a[idx] = e.target.value; setSerialInputs(a) }} />
                ))}
              </div>
            )}
            
            {view !== 'create' && (
              <div className="bg-amber-50 p-3 rounded text-sm text-amber-800 border border-amber-200">
                Serial numbers are generated and tracked in Serial Master.
              </div>
            )}
          </div>
        )}

        {selectedItem && (
          <div className="card p-6 mb-5">
            <SectionHeader icon={FileText} title="Audit & Status" subtitle="Record details" color="brand" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Field label="Reference No"><Input value={formData.reference_no} onChange={e => setField('reference_no', e.target.value)} disabled={view === 'view'} /></Field>
              <Field label="Approved By"><Input value={formData.approved_by || formData.created_by || 'Auto-set on save'} readOnly className="bg-gray-50" /></Field>
              <Field label="Active Status">
                <div className="flex items-center gap-2 mt-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span className="text-sm font-medium text-emerald-700">System Forced: Active</span>
                </div>
              </Field>
              <Field label="Remarks" className="md:col-span-2">
                <textarea className="input" rows={2} value={formData.remarks || ''} onChange={e => setField('remarks', e.target.value)} disabled={view === 'view'} />
              </Field>
              <AuditFields formData={formData} />
            </div>
          </div>
        )}
      </FormPage>
    )
  }

  return (
    <>
      <DataTable
        title="Opening Stock"
        subtitle="Manage initial inventory balances for physical stock items"
        columns={COLUMNS} data={table.rows} total={table.total}
        page={table.page} pages={table.pages} loading={table.isLoading}
        onSearch={table.handleSearch} onPageChange={table.setPage}
        onSort={table.handleSort} sortBy={table.sortBy} sortOrder={table.sortOrder}
        onCreate={handleCreate}
        actions={{ onView: handleView, onEdit: handleEdit, onDelete: setConfirmDelete }}
      />
      <ConfirmDialog open={!!confirmDelete} title="Delete Opening Stock"
        message={`This will permanently delete opening stock record ${confirmDelete?.opening_stock_id}.`}
        onConfirm={handleDelete} onCancel={() => setConfirmDelete(null)} loading={table.isDeleting} />
    </>
  )
}
