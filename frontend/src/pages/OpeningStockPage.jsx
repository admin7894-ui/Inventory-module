import React, { useState, useMemo, useCallback } from 'react'
import toast from 'react-hot-toast'
import { useTableData, useDropdownData } from '../hooks/useTableData'
import { CompanyGroup } from '../components/CompanyGroup'
import { DataTable, Toggle, Select, DateInput, Field, FormPage, ConfirmDialog, Input, AuditFields } from '../components/ui/index'
import { Package, MapPin, Hash, BarChart3, FileText, AlertTriangle, Ban, Plus, X, Loader2 } from 'lucide-react'
import {
  openingStockApi, moduleApi, inventoryOrgApi, subinventoryApi, locatorApi,
  itemMasterApi, uomApi, itemTypeApi,
} from '../services/api'

const COLUMNS = [
  { key: 'opening_stock_id', label: 'ID' },
  { key: 'item_id', label: 'Item' },
  { key: 'inv_org_id', label: 'Inv Org' },
  { key: 'subinventory_id', label: 'Subinventory' },
  { key: 'opening_qty', label: 'Qty' },
  { key: 'unit_cost', label: 'Unit Cost' },
  { key: 'total_value', label: 'Total Value' },
]

function SectionHeader({ icon: Icon, title, subtitle, color = 'brand' }) {
  const colors = {
    brand: 'from-blue-600 to-indigo-600', emerald: 'from-emerald-600 to-teal-600',
    amber: 'from-amber-500 to-orange-500', purple: 'from-purple-600 to-violet-600',
    rose: 'from-rose-500 to-pink-500',
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

export default function OpeningStockPage() {
  const table = useTableData(openingStockApi, 'opening_stock')
  const [view, setView] = useState('list')
  const [selected, setSelected] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [formData, setFormData] = useState({})
  const [errors, setErrors] = useState({})
  const [serialInputs, setSerialInputs] = useState([])
  const [serialMode, setSerialMode] = useState('auto') // 'auto' | 'manual'

  // Dropdowns - only what's needed
  const { options: modules }       = useDropdownData(moduleApi, 'mod_dd')
  const { options: inventoryOrgs } = useDropdownData(inventoryOrgApi, 'invorg_dd')
  const { options: subinventories }= useDropdownData(subinventoryApi, 'sub_dd')
  const { options: locators }      = useDropdownData(locatorApi, 'loc2_dd')
  const { options: allItems }      = useDropdownData(itemMasterApi, 'item_dd')
  const { options: uoms }          = useDropdownData(uomApi, 'uom_dd')
  const { options: itemTypes }     = useDropdownData(itemTypeApi, 'itype_dd')

  // Filter items: only physical + stock items
  const physicalStockItems = useMemo(() => {
    if (!allItems?.length || !itemTypes?.length) return []
    return allItems.filter(item => {
      const type = itemTypes.find(t => String(t.item_type_id) === String(item.item_type_id))
      const isPhys = type && (type.is_physical === 'Y' || type.is_physical === true)
      const isStock = item.is_stock_item === 'Y' || item.is_stock_item === true
      return isPhys && isStock
    })
  }, [allItems, itemTypes])

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

  // Handle item change — reset tracking fields, auto-fill UOM
  const handleItemChange = useCallback((itemId) => {
    const item = allItems?.find(i => String(i.item_id) === String(itemId))
    setFormData(prev => ({
      ...prev,
      item_id: itemId,
      uom_id: item?.primary_uom_id || prev.uom_id,
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
    setFormData({ active_flag: 'Y', effective_from: new Date().toISOString().split('T')[0], opening_date: new Date().toISOString().split('T')[0] })
    setSerialInputs([])
    setSerialMode('auto')
    setErrors({})
    setView('create')
  }
  const handleEdit = (row) => { setSelected(row); setFormData({ ...row }); setErrors({}); setView('edit') }
  const handleView = (row) => { setSelected(row); setFormData({ ...row }); setErrors({}); setView('view') }
  const handleBack = () => { setView('list'); setSelected(null); setErrors({}) }

  const validate = () => {
    const e = {}
    if (!formData.COMPANY_id) e.COMPANY_id = 'Required'
    if (!formData.business_type_id) e.business_type_id = 'Required'
    if (!formData.bg_id) e.bg_id = 'Required'
    if (!formData.item_id) e.item_id = 'Select a physical stock item'
    if (!formData.inv_org_id) e.inv_org_id = 'Required'
    if (!formData.subinventory_id) e.subinventory_id = 'Required'
    const qty = parseFloat(formData.opening_qty || 0)
    if (qty <= 0) e.opening_qty = 'Quantity must be > 0'
    if (!formData.unit_cost) e.unit_cost = 'Unit cost is required'
    if (isLotControlled && !formData.lot_number) e.lot_number = 'Lot number is required'
    if (isExpirable && !formData.expiry_date && !computedExpiry) e.expiry_date = 'Expiry date required'
    if (isSerialControlled && serialMode === 'manual') {
      const validSerials = serialInputs.filter(s => s.trim())
      if (validSerials.length !== qty) e.serial_numbers = `Need exactly ${qty} serial numbers (have ${validSerials.length})`
    }
    return e
  }

  const handleSubmit = async (ev) => {
    ev.preventDefault()
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return toast.error('Please fix validation errors') }
    try {
      const payload = { ...formData, total_value: totalValue }
      // Attach serial numbers for engine
      if (isSerialControlled && serialMode === 'manual') {
        payload.serial_numbers = serialInputs.filter(s => s.trim())
      }
      // Attach computed expiry if not manually set
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

  // ─── FORM VIEW ──────────────────────────────────────────────
  if (view !== 'list') {
    return (
      <FormPage
        title={view === 'view' ? 'View Opening Stock' : view === 'edit' ? 'Edit Opening Stock' : 'New Opening Stock'}
        onBack={handleBack} onSubmit={handleSubmit}
        loading={table.isCreating || table.isUpdating} mode={view}
      >
        {/* ── Item Selection ── */}
        <div className="card p-6 mb-5">
          <SectionHeader icon={Package} title="Item Selection" subtitle="Only physical stock items are available" color="brand" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Field label="Opening Stock ID (Auto-gen)"><Input value={formData.opening_stock_id} readOnly /></Field>
            <CompanyGroup formData={formData} setField={setField} errors={errors} />
            <Field label="Item" required error={errors.item_id}>
              <Select value={formData.item_id} onChange={handleItemChange} error={errors.item_id}
                options={physicalStockItems.map(r => ({ value: r.item_id, label: `${r.item_code || ''} - ${r.item_name || r.item_id}` }))} />
              {physicalStockItems.length === 0 && (
                <span className="text-xs text-amber-600 mt-1 block">No physical stock items found. Create items with is_physical=Y and is_stock_item=Y first.</span>
              )}
            </Field>

            {/* Show item config badges */}
            {selectedItem && (
              <Field label="Item Configuration">
                <div className="flex flex-wrap gap-1.5 mt-1">
                  <span className="badge-blue">Physical</span>
                  <span className="badge-green">Stock Item</span>
                  {isLotControlled && <span className="badge-purple">Lot Controlled</span>}
                  {isSerialControlled && <span className="badge-yellow">Serial Controlled</span>}
                  {isExpirable && <span className="badge-red">Expirable{shelfLifeDays > 0 ? ` (${shelfLifeDays}d)` : ''}</span>}
                </div>
              </Field>
            )}
          </div>
        </div>

        {/* ── Location ── */}
        {selectedItem && (
          <div className="card p-6 mb-5 animate-slide-in">
            <SectionHeader icon={MapPin} title="Location & Quantity" subtitle="Where and how much stock to add" color="emerald" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Field label="Inventory Organization" required error={errors.inv_org_id}>
                <Select value={formData.inv_org_id} onChange={v => setField('inv_org_id', v)} error={errors.inv_org_id}
                  options={inventoryOrgs?.map(r => ({ value: r.inv_org_id, label: r.inv_org_name || r.inv_org_id }))} />
              </Field>
              <Field label="Subinventory" required error={errors.subinventory_id}>
                <Select value={formData.subinventory_id} onChange={v => setField('subinventory_id', v)} error={errors.subinventory_id}
                  options={subinventories?.map(r => ({ value: r.subinventory_id, label: r.subinventory_name || r.subinventory_id }))} />
              </Field>
              <Field label="Locator / Bin">
                <Select value={formData.locator_id} onChange={v => setField('locator_id', v)}
                  options={locators?.map(r => ({ value: r.locator_id, label: r.locator_name || r.locator_id }))} />
              </Field>
              <Field label="UOM">
                <Select value={formData.uom_id} onChange={v => setField('uom_id', v)}
                  options={uoms?.map(r => ({ value: r.uom_id, label: `${r.uom_code || ''} - ${r.uom_name || r.uom_id}` }))} />
              </Field>
              <Field label="Opening Qty" required error={errors.opening_qty}>
                <Input type="number" step="1" min="1" value={formData.opening_qty}
                  error={errors.opening_qty}
                  onChange={e => handleQtyChangeForSerials(e.target.value)} placeholder="e.g. 100" />
              </Field>
              <Field label="Unit Cost" required error={errors.unit_cost}>
                <Input type="number" step="any" value={formData.unit_cost} error={errors.unit_cost}
                  onChange={e => setField('unit_cost', e.target.value)} placeholder="e.g. 500.00" />
              </Field>
              <Field label="Total Value (Auto-calc)">
                <Input value={totalValue} readOnly className="font-semibold text-emerald-700" />
              </Field>
              <Field label="Opening Date">
                <DateInput value={formData.opening_date} onChange={v => setField('opening_date', v)} />
              </Field>
            </div>
          </div>
        )}

        {/* ── Lot Section (INPUT, not dropdown) ── */}
        {selectedItem && isLotControlled && (
          <div className="card p-6 mb-5 animate-slide-in">
            <SectionHeader icon={Hash} title="Lot Information" subtitle="Enter lot number — record will be auto-created in Lot Master" color="purple" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Field label="Lot Number" required error={errors.lot_number}>
                <Input value={formData.lot_number} error={errors.lot_number}
                  onChange={e => setField('lot_number', e.target.value)}
                  placeholder="e.g. LOT-2024-001" />
                <span className="text-xs text-gray-500 mt-1 block">This will auto-create a Lot Master record</span>
              </Field>
              {isExpirable && (
                <>
                  <Field label="Expiry Date" error={errors.expiry_date}>
                    <DateInput value={formData.expiry_date || computedExpiry}
                      onChange={v => setField('expiry_date', v)} />
                    {computedExpiry && !formData.expiry_date && (
                      <span className="text-xs text-blue-600 mt-1 block">
                        Auto-calculated: {computedExpiry} (shelf life: {shelfLifeDays} days)
                      </span>
                    )}
                  </Field>
                  <Field label="Shelf Life Days">
                    <Input value={shelfLifeDays} readOnly />
                  </Field>
                </>
              )}
            </div>
          </div>
        )}

        {/* ── Serial Section (INPUT / AUTO-GEN, not dropdown) ── */}
        {selectedItem && isSerialControlled && (
          <div className="card p-6 mb-5 animate-slide-in">
            <SectionHeader icon={Hash} title="Serial Numbers" subtitle="Auto-generate or manually enter serial numbers" color="amber" />
            <div className="mb-4 flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="serialMode" checked={serialMode === 'auto'}
                  onChange={() => { setSerialMode('auto'); setSerialInputs([]) }}
                  className="accent-amber-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Auto-Generate Serials</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="serialMode" checked={serialMode === 'manual'}
                  onChange={() => {
                    setSerialMode('manual')
                    const count = parseInt(formData.opening_qty) || 0
                    setSerialInputs(Array(count).fill(''))
                  }}
                  className="accent-amber-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Enter Manually</span>
              </label>
            </div>

            {serialMode === 'auto' && (
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-700">
                <p className="text-sm text-blue-700 dark:text-blue-400">
                  <strong>{parseInt(formData.opening_qty) || 0}</strong> serial number(s) will be auto-generated when you save.
                  Format: <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">{formData.item_id || 'ITEM-XXX'}-XXXXX-0001</code>
                </p>
              </div>
            )}

            {serialMode === 'manual' && (
              <div>
                {errors.serial_numbers && (
                  <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg">
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                    <span className="text-xs text-red-600 dark:text-red-400">{errors.serial_numbers}</span>
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-60 overflow-y-auto">
                  {serialInputs.map((val, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="text-xs text-gray-400 w-8 text-right">#{idx + 1}</span>
                      <Input value={val} placeholder={`Serial ${idx + 1}`}
                        onChange={e => {
                          const arr = [...serialInputs]
                          arr[idx] = e.target.value
                          setSerialInputs(arr)
                        }} />
                    </div>
                  ))}
                </div>
                {serialInputs.length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-4">Enter a quantity first to add serial fields</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Additional Info ── */}
        {selectedItem && (
          <div className="card p-6 mb-5">
            <SectionHeader icon={FileText} title="Additional Information" subtitle="Reference, remarks and status" color="brand" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Field label="Fiscal Year"><Input value={formData.fiscal_year} onChange={e => setField('fiscal_year', e.target.value)} /></Field>
              <Field label="Period Name"><Input value={formData.period_name} onChange={e => setField('period_name', e.target.value)} /></Field>
              <Field label="Post Date"><DateInput value={formData.post_date} onChange={v => setField('post_date', v)} /></Field>
              <Field label="Reference No"><Input value={formData.reference_no} onChange={e => setField('reference_no', e.target.value)} /></Field>
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

        {/* Prompt if no item selected */}
        {!selectedItem && view !== 'view' && (
          <div className="card p-8 mb-5 text-center border-2 border-dashed border-gray-300 dark:border-gray-600">
            <Package className="w-10 h-10 mx-auto text-gray-400 mb-3" />
            <p className="text-gray-500 dark:text-gray-400 font-medium">Select a physical stock item to configure opening stock</p>
            <p className="text-xs text-gray-400 mt-1">Only items with is_physical=Y and is_stock_item=Y are shown</p>
          </div>
        )}
      </FormPage>
    )
  }

  // ─── LIST VIEW ──────────────────────────────────────────────
  return (
    <>
      <DataTable
        title="Opening Stock"
        subtitle="Opening stock entries for physical stock items — auto-creates lot, serial, transactions and on-hand"
        columns={COLUMNS} data={table.rows} total={table.total}
        page={table.page} pages={table.pages} loading={table.isLoading}
        onSearch={table.handleSearch} onPageChange={table.setPage}
        onSort={table.handleSort} sortBy={table.sortBy} sortOrder={table.sortOrder}
        onCreate={handleCreate}
        actions={{ onView: handleView, onEdit: handleEdit, onDelete: setConfirmDelete }}
      />
      <ConfirmDialog open={!!confirmDelete} title="Delete Record"
        message={`Delete "${confirmDelete?.opening_stock_id}"? This cannot be undone.`}
        onConfirm={handleDelete} onCancel={() => setConfirmDelete(null)} loading={table.isDeleting} />
    </>
  )
}
