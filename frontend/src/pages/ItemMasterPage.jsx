import React, { useState, useEffect, useMemo, useCallback } from 'react'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
import { useTableData, useDropdownData } from '../hooks/useTableData'
import { validate } from '../validations/validationEngine'
import { CompanyGroup } from '../components/CompanyGroup'
import { DataTable, StatusBadge, Toggle, Select, DateInput, Field, FormPage, ConfirmDialog, Input, AuditFields } from '../components/ui/index'
import { Package, Monitor, Box, Truck, BarChart3, DollarSign, Shield, FileText, AlertTriangle } from 'lucide-react'

import {
  companyApi, businessGroupApi, businessTypeApi, locationApi, moduleApi,
  inventoryOrgApi, subinventoryApi, locatorApi, itemMasterApi, uomApi, uomTypeApi,
  itemCategoryApi, itemSubCategoryApi, brandApi, itemTypeApi, zoneApi,
  lotMasterApi, serialMasterApi, transactionTypeApi, transactionReasonApi,
  categorySetApi, costMethodApi, costTypeApi, shipMethodApi, legalEntityApi,
  operatingUnitApi, securityProfileApi, profileAccessApi, securityRolesApi,
  departmentsApi, rolesApi, designationApi,
} from '../services/api'

const COLUMNS = [
  { key: 'item_id', label: 'Item Id' },
  { key: 'item_code', label: 'Item Code' },
  { key: 'item_name', label: 'Item Name' },
  { key: 'item_type_id', label: 'Item Type' },
  { key: 'brand_id', label: 'Brand' },
  { key: 'active_flag', label: 'Status', type: 'badge' }
]

// Fields to reset when switching to non-physical
const PHYSICAL_ONLY_FIELDS = [
  'is_stock_item','is_serial_controlled','is_lot_controlled','is_expirable',
  'shelf_life_days','weight_kg','volume_cbm','reorder_point','min_order_qty',
  'max_order_qty','lead_time_days','hsn_code'
]
// Fields to reset when switching to physical
const SOFTWARE_ONLY_FIELDS = ['is_license_required','license_type','max_users']

// Section Header component
function SectionHeader({ icon: Icon, title, subtitle, color = 'brand' }) {
  const colors = {
    brand: 'from-blue-600 to-indigo-600 text-white',
    emerald: 'from-emerald-600 to-teal-600 text-white',
    amber: 'from-amber-500 to-orange-500 text-white',
    purple: 'from-purple-600 to-violet-600 text-white',
    rose: 'from-rose-500 to-pink-500 text-white',
    sky: 'from-sky-500 to-cyan-500 text-white',
  }
  return (
    <div className={`flex items-center gap-3 mb-4 px-4 py-2.5 rounded-lg bg-gradient-to-r ${colors[color]} shadow-sm`}>
      {Icon && <Icon className="w-4 h-4 flex-shrink-0" />}
      <div>
        <h3 className="text-sm font-semibold tracking-wide">{title}</h3>
        {subtitle && <p className="text-xs opacity-80">{subtitle}</p>}
      </div>
    </div>
  )
}

// Validation warning badge
function ValidationWarning({ message }) {
  if (!message) return null
  return (
    <div className="flex items-center gap-2 px-3 py-2 mt-1 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg">
      <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
      <span className="text-xs text-amber-700 dark:text-amber-400">{message}</span>
    </div>
  )
}

export default function ItemMasterPage() {
  const navigate = useNavigate()
  const table = useTableData(itemMasterApi, 'item_master')
  const [view, setView] = useState('list')
  const [selected, setSelected] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [formData, setFormData] = useState({})
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})

  // Load dropdowns
  const companies = [], businessGroups = [], businessTypes = []
  const { options: modules }          = useDropdownData(moduleApi, 'mod_dd')
  const { options: uoms }             = useDropdownData(uomApi, 'uom_dd')
  const { options: itemCategories }   = useDropdownData(itemCategoryApi, 'cat_dd')
  const { options: itemSubCategories }= useDropdownData(itemSubCategoryApi, 'scat_dd')
  const { options: brands }           = useDropdownData(brandApi, 'brand_dd')
  const { options: itemTypes }        = useDropdownData(itemTypeApi, 'itype_dd')

  const dropdowns = {
    company:companies, businessGroup:businessGroups, businessType:businessTypes,
    module:modules, uom:uoms, itemCategory:itemCategories,
    itemSubCategory:itemSubCategories, brand:brands, itemType:itemTypes,
  }

  // Derive item type flags from the selected item type
  const selectedItemType = useMemo(() => {
    if (!formData.item_type_id || !dropdowns.itemType?.length) return null
    return dropdowns.itemType.find(t => String(t.item_type_id) === String(formData.item_type_id))
  }, [formData.item_type_id, dropdowns.itemType])

  const isPhysical = selectedItemType ? (selectedItemType.is_physical === 'Y' || selectedItemType.is_physical === true) : null
  const hasTypeSelected = selectedItemType !== null

  const validateField = useCallback((k, v) => {
    const val = typeof v === 'string' ? v.trim() : v;
    const { errors: newErrors } = validate('item_master', { ...formData, [k]: val }, { isPhysical });
    setErrors(prev => ({ ...prev, [k]: newErrors[k] }));
  }, [formData, isPhysical])

  const setField = useCallback((k, v) => {
    setFormData(p => ({ ...p, [k]: v }))
    if (errors[k]) setErrors(p => ({ ...p, [k]: null }))
  }, [errors])

  // Handle Item Type change — reset irrelevant fields
  const handleItemTypeChange = useCallback((typeId) => {
    const type = dropdowns.itemType?.find(t => String(t.item_type_id) === String(typeId))
    const phys = type ? (type.is_physical === 'Y' || type.is_physical === true) : null

    setFormData(prev => {
      const next = { ...prev, item_type_id: typeId }
      if (phys === true) {
        // Physical: reset software fields
        SOFTWARE_ONLY_FIELDS.forEach(f => { next[f] = '' })
        next.is_license_required = 'N'
      } else if (phys === false) {
        // Non-physical: reset & force-set physical fields
        PHYSICAL_ONLY_FIELDS.forEach(f => { next[f] = '' })
        next.is_stock_item = 'N'
        next.is_serial_controlled = 'N'
        next.is_lot_controlled = 'N'
        next.is_expirable = 'N'
        next.shelf_life_days = ''
        next.weight_kg = ''
        next.volume_cbm = ''
      }
      return next
    })
    setErrors({})
  }, [dropdowns.itemType])

  // Serial / Lot mutual exclusivity
  const handleSerialChange = useCallback((v) => {
    setFormData(p => {
      const next = { ...p, is_serial_controlled: v }
      if (v === 'Y') next.is_lot_controlled = 'N'
      return next
    })
  }, [])

  const handleLotChange = useCallback((v) => {
    setFormData(p => {
      const next = { ...p, is_lot_controlled: v }
      if (v === 'Y') next.is_serial_controlled = 'N'
      return next
    })
  }, [])

  // Expirable toggle
  const handleExpirableChange = useCallback((v) => {
    setFormData(p => {
      const next = { ...p, is_expirable: v }
      if (v === 'N') next.shelf_life_days = ''
      return next
    })
  }, [])

  const handleBlur = useCallback((k, v) => {
    validateField(k, v !== undefined ? v : formData[k]);
  }, [validateField, formData])

  const handleCreate = () => {
    setFormData({ active_flag:'Y', effective_from:new Date().toISOString().split('T')[0] })
    setErrors({}); setTouched({})
    setView('create')
  }
  const handleEdit = (row) => { setSelected(row); setFormData({ ...row }); setErrors({}); setTouched({}); setView('edit') }
  const handleView = (row) => { setSelected(row); setFormData({ ...row }); setErrors({}); setTouched({}); setView('view') }
  const handleBack = () => { setView('list'); setSelected(null); setErrors({}); setTouched({}) }

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    
    const trimmedData = Object.fromEntries(
      Object.entries(formData).map(([k, v]) => [k, typeof v === 'string' ? v.trim() : v])
    );
    const { errors: valErrors, isValid } = validate('item_master', trimmedData, { isPhysical });
    
    setErrors(valErrors);
    if (!isValid) return toast.error('Please fix the highlighted errors');
    try {
      if (view === 'edit') await table.update(selected['item_id'], formData)
      else await table.create(formData)
      handleBack()
    } catch {}
  }

  const handleDelete = async () => {
    await table.remove(confirmDelete['item_id'])
    setConfirmDelete(null)
  }

  // ─── FORM VIEW ──────────────────────────────────────────────
  if (view !== 'list') {
    const isExp = formData.is_expirable === 'Y' || formData.is_expirable === true
    const isLicReq = formData.is_license_required === 'Y' || formData.is_license_required === true
    const readOnly = view === 'view'

    return (
      <FormPage
        title={view==='view'?'View Item Master':view==='edit'?'Edit Item Master':'New Item Master'}
        onBack={handleBack} onSubmit={handleSubmit}
        loading={table.isCreating||table.isUpdating} mode={view}
      >
        {/* ── SECTION: Identity (Always Visible) ── */}
        <div className="card p-6 mb-5">
          <SectionHeader icon={FileText} title="Item Identity" subtitle="Basic item information" color="brand" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Field label="Item Id (Auto-gen)"><Input value={formData.item_id} readOnly /></Field>
            <CompanyGroup formData={formData} setField={setField} errors={errors} handleBlur={handleBlur} />
            <Field label="Item Code"><Input value={formData.item_code} onChange={e => setField('item_code',e.target.value)} onBlur={() => handleBlur('item_code')} /></Field>
            <Field label="Item Name" required error={errors.item_name}>
              <Input value={formData.item_name} onChange={e => setField('item_name',e.target.value)} onBlur={() => handleBlur('item_name')} error={errors.item_name} />
            </Field>
            <Field label="Item Type" required error={errors.item_type_id}>
              <Select value={formData.item_type_id} onChange={handleItemTypeChange} onBlur={() => handleBlur('item_type_id')}
                error={errors.item_type_id}
                options={dropdowns.itemType?.map(r=>({value:r.item_type_id,label:r.item_type_name||r.item_type_id}))} />
              {hasTypeSelected && (
                <span className={`inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded text-xs font-medium ${isPhysical ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'}`}>
                  {isPhysical ? <Package className="w-3 h-3" /> : <Monitor className="w-3 h-3" />}
                  {isPhysical ? 'Physical Item' : 'Non-Physical (Software)'}
                </span>
              )}
            </Field>
            <Field label="Brand">
              <Select value={formData.brand_id} onChange={v => setField('brand_id',v)}
                options={dropdowns.brand?.map(r=>({value:r.brand_id,label:r.brand_name||r.brand_id}))} />
            </Field>
            <Field label="Category">
              <Select value={formData.category_id} onChange={v => setField('category_id',v)}
                options={dropdowns.itemCategory?.map(r=>({value:r.category_id,label:r.category_name||r.category_id}))} />
            </Field>
            <Field label="Sub Category">
              <Select value={formData.sub_category_id} onChange={v => setField('sub_category_id',v)}
                options={dropdowns.itemSubCategory?.map(r=>({value:r.sub_category_id,label:r.sub_category_name||r.sub_category_id}))} />
            </Field>
            <Field label="Description" >
              <textarea className="input" disabled={readOnly} rows={2}
                value={formData.description||''} onChange={e => setField('description',e.target.value)} />
            </Field>
          </div>
        </div>

        {/* ── SECTION: Physical — Inventory & Tracking ── */}
        {hasTypeSelected && isPhysical && (
          <div className="card p-6 mb-5 animate-slide-in">
            <SectionHeader icon={Box} title="Inventory & Tracking" subtitle="Stock control settings for physical items" color="emerald" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Field label="Is Stock Item"><Toggle value={formData.is_stock_item} onChange={v => setField('is_stock_item',v)} /></Field>
              <Field label="Is Serial Controlled" error={errors.is_serial_controlled}>
                <Toggle value={formData.is_serial_controlled} onChange={handleSerialChange} />
                {formData.is_serial_controlled === 'Y' && (
                  <span className="text-xs text-gray-500 mt-1 block">Lot control will be disabled</span>
                )}
              </Field>
              <Field label="Is Lot Controlled" error={errors.is_lot_controlled}>
                <Toggle value={formData.is_lot_controlled} onChange={handleLotChange} />
                {errors.is_lot_controlled && <ValidationWarning message={errors.is_lot_controlled} />}
                {formData.is_lot_controlled === 'Y' && (
                  <span className="text-xs text-gray-500 mt-1 block">Serial control will be disabled</span>
                )}
              </Field>
              <Field label="Is Expirable"><Toggle value={formData.is_expirable} onChange={handleExpirableChange} /></Field>
              {isExp && (
                <Field label="Shelf Life Days" required error={errors.shelf_life_days}>
                  <Input type="number" value={formData.shelf_life_days} error={errors.shelf_life_days}
                    onChange={e => setField('shelf_life_days',e.target.value)} placeholder="e.g. 365" />
                </Field>
              )}
            </div>
          </div>
        )}

        {/* ── SECTION: Physical — Storage & Logistics ── */}
        {hasTypeSelected && isPhysical && (
          <div className="card p-6 mb-5 animate-slide-in">
            <SectionHeader icon={Truck} title="Storage & Logistics" subtitle="UOM, weight and volume details" color="sky" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Field label="Primary UOM" required error={errors.primary_uom_id}>
                <Select value={formData.primary_uom_id} onChange={v => setField('primary_uom_id',v)}
                  error={errors.primary_uom_id}
                  options={dropdowns.uom?.map(r=>({value:r.uom_id,label:`${r.uom_code||''} - ${r.uom_name||r.uom_id}`}))} />
              </Field>
              <Field label="Secondary UOM">
                <Select value={formData.secondary_uom_id} onChange={v => setField('secondary_uom_id',v)}
                  options={dropdowns.uom?.map(r=>({value:r.uom_id,label:`${r.uom_code||''} - ${r.uom_name||r.uom_id}`}))} />
              </Field>
              <Field label="Weight (Kg)">
                <Input type="number" step="any" value={formData.weight_kg} onChange={e => setField('weight_kg',e.target.value)} />
              </Field>
              <Field label="Volume (Cbm)">
                <Input type="number" step="any" value={formData.volume_cbm} onChange={e => setField('volume_cbm',e.target.value)} />
              </Field>
            </div>
          </div>
        )}

        {/* ── SECTION: Physical — Stock Planning ── */}
        {hasTypeSelected && isPhysical && (
          <div className="card p-6 mb-5 animate-slide-in">
            <SectionHeader icon={BarChart3} title="Stock Planning" subtitle="Reorder and lead time configuration" color="amber" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Field label="Lead Time Days"><Input type="number" value={formData.lead_time_days} onChange={e => setField('lead_time_days',e.target.value)} /></Field>
              <Field label="Reorder Point"><Input type="number" value={formData.reorder_point} onChange={e => setField('reorder_point',e.target.value)} /></Field>
              <Field label="Min Order Qty"><Input type="number" value={formData.min_order_qty} onChange={e => setField('min_order_qty',e.target.value)} /></Field>
              <Field label="Max Order Qty"><Input type="number" value={formData.max_order_qty} onChange={e => setField('max_order_qty',e.target.value)} /></Field>
            </div>
          </div>
        )}

        {/* ── SECTION: Physical — Costing ── */}
        {hasTypeSelected && isPhysical && (
          <div className="card p-6 mb-5 animate-slide-in">
            <SectionHeader icon={DollarSign} title="Costing & Pricing" subtitle="Cost, price and tax configuration" color="rose" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Field label="Standard Cost"><Input type="number" step="any" value={formData.standard_cost} onChange={e => setField('standard_cost',e.target.value)} /></Field>
              <Field label="List Price"><Input type="number" step="any" value={formData.list_price} onChange={e => setField('list_price',e.target.value)} /></Field>
              <Field label="Tax Category"><Input value={formData.tax_category} onChange={e => setField('tax_category',e.target.value)} /></Field>
              <Field label="HSN Code"><Input value={formData.hsn_code} onChange={e => setField('hsn_code',e.target.value)} /></Field>
            </div>
          </div>
        )}

        {/* ── SECTION: Software — License & Usage ── */}
        {hasTypeSelected && !isPhysical && (
          <div className="card p-6 mb-5 animate-slide-in">
            <SectionHeader icon={Shield} title="License & Usage" subtitle="Software licensing configuration" color="purple" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Field label="Is License Required"><Toggle value={formData.is_license_required} onChange={v => setField('is_license_required',v)} /></Field>
              {isLicReq && (
                <>
                  <Field label="License Type" required error={errors.license_type}>
                    <Select value={formData.license_type} onChange={v => setField('license_type',v)}
                      error={errors.license_type}
                      options={["SUBSCRIPTION","PERPETUAL","TRIAL","NONE"].map(o => ({ value: o, label: o }))} />
                  </Field>
                  <Field label="Max Users" required error={errors.max_users}>
                    <Input type="number" value={formData.max_users} error={errors.max_users}
                      onChange={e => setField('max_users',e.target.value)} placeholder="e.g. 100" />
                  </Field>
                </>
              )}
            </div>
          </div>
        )}

        {/* ── SECTION: Software — Pricing ── */}
        {hasTypeSelected && !isPhysical && (
          <div className="card p-6 mb-5 animate-slide-in">
            <SectionHeader icon={DollarSign} title="Pricing" subtitle="Software pricing and tax" color="rose" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Field label="List Price"><Input type="number" step="any" value={formData.list_price} onChange={e => setField('list_price',e.target.value)} /></Field>
              <Field label="Tax Category"><Input value={formData.tax_category} onChange={e => setField('tax_category',e.target.value)} /></Field>
              <Field label="Standard Cost">
                <Input type="number" step="any" value={formData.standard_cost} onChange={e => setField('standard_cost',e.target.value)} placeholder="For internal tracking" />
              </Field>
            </div>
          </div>
        )}

        {/* ── SECTION: Common — Module & Status ── */}
        <div className="card p-6 mb-5">
          <SectionHeader icon={FileText} title="Status & Dates" subtitle="Module assignment and effectivity" color="brand" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Field label="Module">
              <Select value={formData.module_id} onChange={v => setField('module_id',v)}
                options={dropdowns.module?.map(r=>({value:r.module_id,label:r.module_name||r.module_id}))} />
            </Field>
            <Field label="Active"><Toggle value={formData.active_flag} onChange={v => setField('active_flag',v)} /></Field>
            <Field label="Effective From"><DateInput value={formData.effective_from} onChange={v => setField('effective_from',v)} /></Field>
            <Field label="Effective To"><DateInput value={formData.effective_to} onChange={v => setField('effective_to',v)} /></Field>
            <AuditFields formData={formData} setField={setField} />
          </div>
        </div>

        {/* Prompt to select Item Type if not yet selected */}
        {!hasTypeSelected && view !== 'view' && (
          <div className="card p-8 mb-5 text-center border-2 border-dashed border-gray-300 dark:border-gray-600">
            <Package className="w-10 h-10 mx-auto text-gray-400 mb-3" />
            <p className="text-gray-500 dark:text-gray-400 font-medium">Select an Item Type above to see additional fields</p>
            <p className="text-xs text-gray-400 mt-1">Fields will appear based on whether the item is Physical or Software</p>
          </div>
        )}
      </FormPage>
    )
  }

  // ─── LIST VIEW ──────────────────────────────────────────────
  return (
    <>
      <DataTable
        title="Item Master"
        subtitle="Manage Item Master records"
        columns={COLUMNS}
        data={table.rows}
        total={table.total}
        page={table.page}
        pages={table.pages}
        loading={table.isLoading}
        onSearch={table.handleSearch}
        onPageChange={table.setPage}
        onSort={table.handleSort}
        sortBy={table.sortBy}
        sortOrder={table.sortOrder}
        onCreate={handleCreate}
        actions={{ onView:handleView, onEdit:handleEdit, onDelete:setConfirmDelete }}
      />
      <ConfirmDialog
        open={!!confirmDelete}
        title="Delete Record"
        message={`Delete "${confirmDelete?.item_id}"? This cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
        loading={table.isDeleting}
      />
    </>
  )
}
