import React, { useState, useMemo, useCallback } from 'react'
import toast from 'react-hot-toast'
import { useTableData, useDropdownData } from '../hooks/useTableData'
import { CompanyGroup } from '../components/CompanyGroup'
import { DataTable, StatusBadge, Toggle, Select, DateInput, Field, FormPage, ConfirmDialog, Input, AuditFields } from '../components/ui/index'
import { ArrowRightLeft, Package, MapPin, FileText, AlertTriangle, ArrowDown, ArrowUp } from 'lucide-react'
import {
  inventoryTransactionApi, moduleApi, inventoryOrgApi, subinventoryApi,
  locatorApi, itemMasterApi, uomApi, itemTypeApi,
  lotMasterApi, serialMasterApi, transactionTypeApi, transactionReasonApi,
} from '../services/api'

const COLUMNS = [
  { key: 'txn_id', label: 'Txn Id' }, 
  { key: 'txn_date', label: 'Date' },
  { key: 'txn_action', label: 'Action' },
  { key: 'item_id', label: 'Item' },
  { key: 'txn_qty', label: 'Qty' },
  { key: 'txn_status', label: 'Status', type: 'badge' },
  { key: 'reference_no', label: 'Ref No' }
]

function SectionHeader({ icon: Icon, title, subtitle, color = 'brand' }) {
  const colors = {
    brand: 'from-blue-600 to-indigo-600', emerald: 'from-emerald-600 to-teal-600',
    amber: 'from-amber-500 to-orange-500', purple: 'from-purple-600 to-violet-600',
    rose: 'from-rose-500 to-pink-500', sky: 'from-sky-500 to-cyan-500',
  }
  return (
    <div className={`flex items-center gap-3 mb-4 px-4 py-2.5 rounded-lg bg-gradient-to-r ${colors[color]} text-white shadow-sm`}>
      {Icon && <Icon className="w-4 h-4 flex-shrink-0" />}
      <div>
        <h3 className="text-sm font-semibold tracking-wide">{title}</h3>
        {subtitle && <p className="text-xs opacity-80">{subtitle}</p>}
      </div>
    </div>
  )
}

export default function InventoryTransactionPage() {
  const table = useTableData(inventoryTransactionApi, 'inventory_transaction')
  const [view, setView] = useState('list')
  const [selected, setSelected] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [formData, setFormData] = useState({})
  const [errors, setErrors] = useState({})

  // Dropdowns
  const { options: modules }       = useDropdownData(moduleApi, 'mod_dd')
  const { options: inventoryOrgs } = useDropdownData(inventoryOrgApi, 'invorg_dd')
  const { options: subinventories }= useDropdownData(subinventoryApi, 'sub_dd')
  const { options: locators }      = useDropdownData(locatorApi, 'loc2_dd')
  const { options: allItems }      = useDropdownData(itemMasterApi, 'item_dd')
  const { options: uoms }          = useDropdownData(uomApi, 'uom_dd')
  const { options: itemTypes }     = useDropdownData(itemTypeApi, 'itype_dd')
  const { options: lots }          = useDropdownData(lotMasterApi, 'lot_dd')
  const { options: serials }       = useDropdownData(serialMasterApi, 'serial_dd')
  const { options: txnTypes }      = useDropdownData(transactionTypeApi, 'txntype_dd')
  const { options: txnReasons }    = useDropdownData(transactionReasonApi, 'txnrsn_dd')

  // Filter: only physical items
  const physicalItems = useMemo(() => {
    if (!allItems?.length || !itemTypes?.length) return []
    return allItems.filter(item => {
      const type = itemTypes.find(t => String(t.item_type_id) === String(item.item_type_id))
      return type && (type.is_physical === 'Y' || type.is_physical === true)
    })
  }, [allItems, itemTypes])

  const isYes = (v) => v === 'Y' || v === true || v === 'True' || v === 'true'

  // Selected item info
  const selectedItem = useMemo(() => {
    if (!formData.item_id) return null
    return allItems?.find(i => String(i.item_id) === String(formData.item_id)) || null
  }, [formData.item_id, allItems])

  const isLotControlled = selectedItem && isYes(selectedItem.is_lot_controlled)
  const isSerialControlled = selectedItem && isYes(selectedItem.is_serial_controlled)
  const isTransfer = formData.txn_action === 'TRANSFER'

  // Filter lots/serials for the selected item
  const itemLots = useMemo(() => {
    if (!formData.item_id || !lots?.length) return []
    return lots.filter(l => l.item_id === formData.item_id && (l.status === 'ACTIVE' || isYes(l.active_flag)))
  }, [formData.item_id, lots])

  const itemSerials = useMemo(() => {
    if (!formData.item_id || !serials?.length) return []
    return serials.filter(s => s.item_id === formData.item_id && s.status === 'AVAILABLE')
  }, [formData.item_id, serials])

  const setField = useCallback((k, v) => {
    setFormData(p => ({ ...p, [k]: v }))
    setErrors(p => { const n = { ...p }; delete n[k]; return n })
  }, [])

  const handleItemChange = useCallback((itemId) => {
    const item = allItems?.find(i => String(i.item_id) === String(itemId))
    setFormData(prev => ({
      ...prev,
      item_id: itemId,
      uom_id: item?.primary_uom_id || prev.uom_id,
      lot_id: '',
      serial_id: '',
    }))
  }, [allItems])

  // Auto-calc txn_value
  const txnValue = useMemo(() => {
    const qty = parseFloat(formData.txn_qty || 0)
    const cost = parseFloat(formData.unit_cost || 0)
    return (qty * cost).toFixed(2)
  }, [formData.txn_qty, formData.unit_cost])

  const handleCreate = () => {
    setFormData({
      active_flag: 'Y',
      effective_from: new Date().toISOString().split('T')[0],
      txn_date: new Date().toISOString().split('T')[0],
      txn_status: 'PENDING'
    })
    setErrors({})
    setView('create')
  }
  const handleEdit = (row) => { setSelected(row); setFormData({ ...row }); setErrors({}); setView('edit') }
  const handleView = (row) => { setSelected(row); setFormData({ ...row }); setErrors({}); setView('view') }
  const handleBack = () => { setView('list'); setSelected(null); setErrors({}) }

  const validate = () => {
    const e = {}
    if (!formData.COMPANY_id) e.COMPANY_id = 'Required'
    if (!formData.item_id) e.item_id = 'Required'
    if (!formData.txn_action) e.txn_action = 'Required'
    if (!formData.inv_org_id && !formData.from_inv_org_id) e.inv_org_id = 'Required'
    const qty = parseFloat(formData.txn_qty || 0)
    if (qty <= 0) e.txn_qty = 'Qty must be > 0'
    if (!formData.txn_type_id) e.txn_type_id = 'Required'
    if (isTransfer) {
      if (!formData.to_inv_org_id) e.to_inv_org_id = 'Destination org required'
      if (!formData.to_subinventory_id) e.to_subinventory_id = 'Destination subinventory required'
    }
    return e
  }

  const handleSubmit = async (ev) => {
    ev.preventDefault()
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return toast.error('Please fix validation errors') }
    try {
      const payload = { ...formData, txn_value: txnValue }
      // Map from_ fields for engine compatibility
      if (!payload.inv_org_id) payload.inv_org_id = payload.from_inv_org_id
      if (!payload.subinventory_id) payload.subinventory_id = payload.from_subinventory_id
      if (!payload.locator_id) payload.locator_id = payload.from_locator_id
      if (view === 'edit') await table.update(selected['txn_id'], payload)
      else await table.create(payload)
      handleBack()
    } catch {}
  }

  const handleDelete = async () => {
    await table.remove(confirmDelete['txn_id'])
    setConfirmDelete(null)
  }

  // ─── FORM VIEW ──────────────────────────────────────────────
  if (view !== 'list') {
    const actionIcon = formData.txn_action === 'IN' ? ArrowDown : formData.txn_action === 'OUT' ? ArrowUp : ArrowRightLeft
    return (
      <FormPage
        title={view === 'view' ? 'View Inventory Transaction' : view === 'edit' ? 'Edit Inventory Transaction' : 'New Inventory Transaction'}
        onBack={handleBack} onSubmit={handleSubmit}
        loading={table.isCreating || table.isUpdating} mode={view}
      >
        {/* ── Transaction Info ── */}
        <div className="card p-6 mb-5">
          <SectionHeader icon={ArrowRightLeft} title="Transaction Details" subtitle="Only physical items can have inventory transactions" color="brand" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Field label="Txn ID (Auto-gen)"><Input value={formData.txn_id} readOnly /></Field>
            <CompanyGroup formData={formData} setField={setField} errors={errors} />
            <Field label="Transaction Action" required error={errors.txn_action}>
              <Select value={formData.txn_action} onChange={v => setField('txn_action', v)} error={errors.txn_action}
                options={['IN', 'OUT', 'TRANSFER', 'ADJUSTMENT'].map(o => ({ value: o, label: o }))} />
            </Field>
            <Field label="Item" required error={errors.item_id}>
              <Select value={formData.item_id} onChange={handleItemChange} error={errors.item_id}
                options={physicalItems.map(r => ({ value: r.item_id, label: `${r.item_code || ''} - ${r.item_name || r.item_id}` }))} />
              {selectedItem && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {isLotControlled && <span className="badge-purple text-[10px]">Lot</span>}
                  {isSerialControlled && <span className="badge-yellow text-[10px]">Serial</span>}
                </div>
              )}
            </Field>
            <Field label="Transaction Type" required error={errors.txn_type_id}>
              <Select value={formData.txn_type_id} onChange={v => setField('txn_type_id', v)} error={errors.txn_type_id}
                options={txnTypes?.map(r => ({ value: r.txn_type_id, label: r.txn_type_name || r.txn_type_id }))} />
            </Field>
            <Field label="Transaction Reason">
              <Select value={formData.txn_reason_id} onChange={v => setField('txn_reason_id', v)}
                options={txnReasons?.map(r => ({ value: r.txn_reason_id, label: r.txn_reason || r.txn_reason_id }))} />
            </Field>
            <Field label="Txn Date"><DateInput value={formData.txn_date} onChange={v => setField('txn_date', v)} /></Field>
            <Field label="Status">
              <Select value={formData.txn_status} onChange={v => setField('txn_status', v)}
                options={['PENDING', 'COMPLETED', 'CANCELLED', 'ON_HOLD'].map(o => ({ value: o, label: o }))} />
            </Field>
          </div>
        </div>

        {/* ── Source Location ── */}
        {selectedItem && (
          <div className="card p-6 mb-5 animate-slide-in">
            <SectionHeader icon={MapPin} title={isTransfer ? 'Source Location' : 'Location'} subtitle="Inventory org, subinventory and locator" color="emerald" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Field label={isTransfer ? 'From Inv Org' : 'Inv Org'} required error={errors.inv_org_id}>
                <Select value={formData.from_inv_org_id || formData.inv_org_id}
                  onChange={v => setField(isTransfer ? 'from_inv_org_id' : 'inv_org_id', v)}
                  error={errors.inv_org_id}
                  options={inventoryOrgs?.map(r => ({ value: r.inv_org_id, label: r.inv_org_name || r.inv_org_id }))} />
              </Field>
              <Field label={isTransfer ? 'From Subinventory' : 'Subinventory'}>
                <Select value={formData.from_subinventory_id || formData.subinventory_id}
                  onChange={v => setField(isTransfer ? 'from_subinventory_id' : 'subinventory_id', v)}
                  options={subinventories?.map(r => ({ value: r.subinventory_id, label: r.subinventory_name || r.subinventory_id }))} />
              </Field>
              <Field label={isTransfer ? 'From Locator' : 'Locator'}>
                <Select value={formData.from_locator_id || formData.locator_id}
                  onChange={v => setField(isTransfer ? 'from_locator_id' : 'locator_id', v)}
                  options={locators?.map(r => ({ value: r.locator_id, label: r.locator_name || r.locator_id }))} />
              </Field>
            </div>
          </div>
        )}

        {/* ── Destination (Transfer only) ── */}
        {selectedItem && isTransfer && (
          <div className="card p-6 mb-5 animate-slide-in">
            <SectionHeader icon={MapPin} title="Destination Location" subtitle="Where stock is being transferred to" color="sky" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Field label="To Inv Org" required error={errors.to_inv_org_id}>
                <Select value={formData.to_inv_org_id} onChange={v => setField('to_inv_org_id', v)} error={errors.to_inv_org_id}
                  options={inventoryOrgs?.map(r => ({ value: r.inv_org_id, label: r.inv_org_name || r.inv_org_id }))} />
              </Field>
              <Field label="To Subinventory" required error={errors.to_subinventory_id}>
                <Select value={formData.to_subinventory_id} onChange={v => setField('to_subinventory_id', v)} error={errors.to_subinventory_id}
                  options={subinventories?.map(r => ({ value: r.subinventory_id, label: r.subinventory_name || r.subinventory_id }))} />
              </Field>
              <Field label="To Locator">
                <Select value={formData.to_locator_id} onChange={v => setField('to_locator_id', v)}
                  options={locators?.map(r => ({ value: r.locator_id, label: r.locator_name || r.locator_id }))} />
              </Field>
            </div>
          </div>
        )}

        {/* ── Quantity & Tracking ── */}
        {selectedItem && (
          <div className="card p-6 mb-5 animate-slide-in">
            <SectionHeader icon={Package} title="Quantity & Tracking" subtitle="Quantities, costs and lot/serial tracking" color="amber" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Field label="UOM">
                <Select value={formData.uom_id} onChange={v => setField('uom_id', v)}
                  options={uoms?.map(r => ({ value: r.uom_id, label: `${r.uom_code || ''} - ${r.uom_name || r.uom_id}` }))} />
              </Field>
              <Field label="Txn Qty" required error={errors.txn_qty}>
                <Input type="number" step="1" min="1" value={formData.txn_qty} error={errors.txn_qty}
                  onChange={e => setField('txn_qty', e.target.value)} />
              </Field>
              <Field label="Unit Cost">
                <Input type="number" step="any" value={formData.unit_cost}
                  onChange={e => setField('unit_cost', e.target.value)} />
              </Field>
              <Field label="Txn Value (Auto-calc)">
                <Input value={txnValue} readOnly className="font-semibold text-emerald-700" />
              </Field>

              {/* Lot Dropdown — from existing lot_master */}
              {isLotControlled && (
                <Field label="Lot (from existing stock)">
                  <Select value={formData.lot_id} onChange={v => setField('lot_id', v)}
                    placeholder={itemLots.length === 0 ? 'No lots available' : '-- Select Lot --'}
                    options={itemLots.map(r => ({ value: r.lot_id, label: r.lot_number || r.lot_id }))} />
                  {itemLots.length === 0 && (
                    <span className="text-xs text-amber-600 mt-1 block">Create Opening Stock first to generate lots</span>
                  )}
                </Field>
              )}

              {/* Serial Dropdown — from existing serial_master */}
              {isSerialControlled && (
                <Field label="Serial (from existing stock)">
                  <Select value={formData.serial_id} onChange={v => setField('serial_id', v)}
                    placeholder={itemSerials.length === 0 ? 'No serials available' : '-- Select Serial --'}
                    options={itemSerials.map(r => ({ value: r.serial_id, label: r.serial_number || r.serial_id }))} />
                  {itemSerials.length === 0 && (
                    <span className="text-xs text-amber-600 mt-1 block">Create Opening Stock first to generate serials</span>
                  )}
                </Field>
              )}
            </div>
          </div>
        )}

        {/* ── Reference & Meta ── */}
        {selectedItem && (
          <div className="card p-6 mb-5">
            <SectionHeader icon={FileText} title="Reference & Status" subtitle="Reference details and audit" color="brand" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Field label="Reference No"><Input value={formData.reference_no} onChange={e => setField('reference_no', e.target.value)} /></Field>
              <Field label="Reference Type"><Input value={formData.reference_type} onChange={e => setField('reference_type', e.target.value)} /></Field>
              <Field label="Reference Id"><Input value={formData.reference_id} onChange={e => setField('reference_id', e.target.value)} /></Field>
              <Field label="Approved By"><Input value={formData.approved_by} onChange={e => setField('approved_by', e.target.value)} /></Field>
              <Field label="Remarks">
                <textarea className="input" disabled={view === 'view'} rows={2}
                  value={formData.remarks || ''} onChange={e => setField('remarks', e.target.value)} />
              </Field>
              <Field label="Module">
                <Select value={formData.module_id} onChange={v => setField('module_id', v)}
                  options={modules?.map(r => ({ value: r.module_id, label: r.module_name || r.module_id }))} />
              </Field>
              <Field label="Active"><Toggle value={formData.active_flag} onChange={v => setField('active_flag', v)} /></Field>
              <Field label="Effective From"><DateInput value={formData.effective_from} onChange={v => setField('effective_from', v)} /></Field>
              <Field label="Effective To"><DateInput value={formData.effective_to} onChange={v => setField('effective_to', v)} /></Field>
              <AuditFields formData={formData} setField={setField} />
            </div>
          </div>
        )}

        {/* Prompt if no item */}
        {!selectedItem && view !== 'view' && (
          <div className="card p-8 mb-5 text-center border-2 border-dashed border-gray-300 dark:border-gray-600">
            <Package className="w-10 h-10 mx-auto text-gray-400 mb-3" />
            <p className="text-gray-500 dark:text-gray-400 font-medium">Select an item to see transaction fields</p>
            <p className="text-xs text-gray-400 mt-1">Only physical items are available for inventory transactions</p>
          </div>
        )}
      </FormPage>
    )
  }

  // ─── LIST VIEW ──────────────────────────────────────────────
  return (
    <>
      <DataTable
        title="Inventory Transaction"
        subtitle="Transaction ledger — physical items only"
        columns={COLUMNS} data={table.rows} total={table.total}
        page={table.page} pages={table.pages} loading={table.isLoading}
        onSearch={table.handleSearch} onPageChange={table.setPage}
        onSort={table.handleSort} sortBy={table.sortBy} sortOrder={table.sortOrder}
        onCreate={handleCreate}
        actions={{ onView: handleView, onEdit: handleEdit, onDelete: setConfirmDelete }}
      />
      <ConfirmDialog open={!!confirmDelete} title="Delete Record"
        message={`Delete "${confirmDelete?.txn_id}"? This cannot be undone.`}
        onConfirm={handleDelete} onCancel={() => setConfirmDelete(null)} loading={table.isDeleting} />
    </>
  )
}
