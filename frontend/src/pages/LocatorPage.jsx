import React, { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
import { useTableData, useDropdownData } from '../hooks/useTableData'
import { CompanyGroup } from '../components/CompanyGroup'
import { DataTable, StatusBadge, Toggle, Select, DateInput, Field, FormPage, ConfirmDialog, Input, AuditFields, ErrorBanner } from '../components/ui/index'
import { useFormValidation } from '../validations/useFormValidation'
import { autoCode } from '../validations/validationEngine'

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
  { key: 'locator_id', label: 'Locator Id' },
  { key: 'subinventory_id', label: 'Subinventory Id' },
  { key: 'COMPANY_id', label: 'Company Id' },
  { key: 'business_type_id', label: 'Business Type Id' },
  { key: 'bg_id', label: 'Bg Id' },
  { key: 'locator_code', label: 'Locator Code' },
  { key: 'locator_name', label: 'Locator Name' }
]

export default function LocatorPage() {
  const navigate = useNavigate()
  const table = useTableData(locatorApi, 'locator')
  const [view, setView] = useState('list') // 'list' | 'create' | 'edit' | 'view'
  const [selected, setSelected] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [formData, setFormData] = useState({})
  const v = useFormValidation('locator')

  // Load all needed dropdowns
  const companies = []
  const businessGroups = []
  const businessTypes = []
  const { options: locations } = useDropdownData(locationApi, 'loc_dd')
  const { options: modules } = useDropdownData(moduleApi, 'mod_dd')
  const { options: inventoryOrgs } = useDropdownData(inventoryOrgApi, 'invorg_dd')
  const { options: subinventories } = useDropdownData(subinventoryApi, 'sub_dd')
  const { options: locators } = useDropdownData(locatorApi, 'loc2_dd')
  const { options: items } = useDropdownData(itemMasterApi, 'item_dd')
  const { options: uoms } = useDropdownData(uomApi, 'uom_dd')
  const { options: uomTypes } = useDropdownData(uomTypeApi, 'uomt_dd')
  const { options: itemCategories } = useDropdownData(itemCategoryApi, 'cat_dd')
  const { options: itemSubCategories } = useDropdownData(itemSubCategoryApi, 'scat_dd')
  const { options: brands } = useDropdownData(brandApi, 'brand_dd')
  const { options: itemTypes } = useDropdownData(itemTypeApi, 'itype_dd')
  const { options: zones } = useDropdownData(zoneApi, 'zone_dd')
  const { options: lots } = useDropdownData(lotMasterApi, 'lot_dd')
  const { options: serials } = useDropdownData(serialMasterApi, 'serial_dd')
  const { options: txnTypes } = useDropdownData(transactionTypeApi, 'txntype_dd')
  const { options: txnReasons } = useDropdownData(transactionReasonApi, 'txnrsn_dd')
  const { options: categorySets } = useDropdownData(categorySetApi, 'catset_dd')
  const { options: costMethods } = useDropdownData(costMethodApi, 'cm_dd')
  const { options: costTypes } = useDropdownData(costTypeApi, 'ct_dd')
  const { options: shipMethods } = useDropdownData(shipMethodApi, 'sm_dd')
  const { options: legalEntities } = useDropdownData(legalEntityApi, 'le_dd')
  const { options: operatingUnits } = useDropdownData(operatingUnitApi, 'ou_dd')
  const { options: securityProfiles } = useDropdownData(securityProfileApi, 'sp_dd')
  const { options: profileAccesses } = useDropdownData(profileAccessApi, 'pa_dd')
  const { options: securityRolesList } = useDropdownData(securityRolesApi, 'sr_dd')
  const { options: depts } = useDropdownData(departmentsApi, 'dept_dd')
  const { options: rolesList } = useDropdownData(rolesApi, 'roles_dd')
  const { options: designations } = useDropdownData(designationApi, 'desig_dd')

  const dropdowns = {
    company: companies, businessGroup: businessGroups, businessType: businessTypes,
    location: locations, module: modules, inventoryOrg: inventoryOrgs,
    subinventory: subinventories, locator: locators, itemMaster: items,
    uom: uoms, uomType: uomTypes, itemCategory: itemCategories, itemSubCategory: itemSubCategories,
    brand: brands, itemType: itemTypes, zone: zones, lotMaster: lots, serialMaster: serials,
    transactionType: txnTypes, transactionReason: txnReasons, categorySet: categorySets,
    costMethod: costMethods, costType: costTypes, shipMethod: shipMethods,
    legalEntity: legalEntities, operatingUnit: operatingUnits,
    securityProfile: securityProfiles, profileAccess: profileAccesses,
    securityRoles: securityRolesList, departments: depts, roles: rolesList, designation: designations,
  }

  const setField = (k, val) => {
    setFormData(p => ({ ...p, [k]: val }))
    if (typeof v !== 'undefined' && v.clearError) v.clearError(k)
    if (typeof setErrors === 'function') setErrors(p => { const n = {...p}; delete n[k]; return n })
  }

  const handleCreate = () => {
    setFormData({ 
      active_flag: 'Y', 
      effective_from: new Date().toISOString().split('T')[0],
      module_id: 'MOD01'
    })
    v.reset(); setView('create')
  }
  const handleEdit = (row) => { setSelected(row); setFormData({ ...row }); v.reset(); setView('edit') }
  const handleView = (row) => { setSelected(row); setFormData({ ...row }); v.reset(); setView('view') }
  const handleBack = () => { setView('list'); setSelected(null) }

  const handleSubmit = async (e) => {
    if (e) e.preventDefault()
    if (!v.validate(formData)) return toast.error('Please fix the highlighted errors')

    try {
      if (view === 'edit') {
        await table.update(selected['locator_id'], formData)
      } else {
        await table.create(formData)
      }
      handleBack()
    } catch (err) {
      if (err.response?.data?.errors) {
        if (typeof v !== 'undefined' && v.setErrors) v.setErrors(err.response.data.errors)
        else if (typeof setErrors === 'function') setErrors(err.response.data.errors)
        toast.error('Please fix the highlighted errors')
      } else {
        toast.error(err.response?.data?.message || err.message || 'Action failed')
      }
    }
  }

  const handleDelete = async () => {
    await table.remove(confirmDelete['locator_id'])
    setConfirmDelete(null)
  }

  if (view !== 'list') {
    return (
      <FormPage title={view === 'view' ? `View Locator / Bin` : view === 'edit' ? `Edit Locator / Bin` : `New Locator / Bin`}
        onBack={handleBack} onSubmit={handleSubmit} loading={table.isCreating || table.isUpdating} mode={view}>
        {v.submitFailed && <ErrorBanner message="Please fix the highlighted errors before saving." />}
        <div className="card p-6 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Field label="Locator Id (Auto-gen)"><Input value={formData.locator_id} readOnly /></Field>
            <CompanyGroup formData={formData} setField={setField} errors={v.errors} handleBlur={v.handleBlur} />

            <Field label="Subinventory Id" required error={v.errors.subinventory_id}>
              <Select value={formData.subinventory_id} 
                onChange={v_val => setField('subinventory_id', v_val)} 
                onBlur={() => v.handleBlur('subinventory_id', formData)}
                options={dropdowns.subinventory?.map(r => ({ value: r.subinventory_id, label: r.subinventory_name || r.subinventory_id }))} 
                disabled={!formData.business_type_id || view === 'view'}
                placeholder={!formData.business_type_id ? "Select Business Type first" : "Select Subinventory"}
              />
            </Field>

            <Field label="Locator Name" required error={v.errors.locator_name}>
              <Input value={formData.locator_name} 
                onChange={e => {
                  const val = e.target.value;
                  setFormData(p => ({ 
                    ...p, 
                    locator_name: val,
                    locator_code: view === 'create' ? autoCode(val, 'L_') : p.locator_code
                  }))
                }}
                onBlur={() => v.handleBlur('locator_name', formData)}
                error={v.errors.locator_name}
                disabled={!formData.subinventory_id || view === 'view'}
              />
            </Field>

            <Field label="Locator Code" required error={v.errors.locator_code}>
              <Input value={formData.locator_code} 
                onChange={e => setField('locator_code', e.target.value)} 
                onBlur={() => v.handleBlur('locator_code', formData)}
                error={v.errors.locator_code}
                disabled={!formData.subinventory_id || view === 'view'}
              />
            </Field>

            <Field label="Aisle Code"><Input value={formData.aisle_code} onChange={e => setField('aisle_code', e.target.value)} disabled={view==='view'} /></Field>
            <Field label="Rack No"><Input value={formData.rack_no} onChange={e => setField('rack_no', e.target.value)} disabled={view==='view'} /></Field>
            <Field label="Shelf No"><Input value={formData.shelf_no} onChange={e => setField('shelf_no', e.target.value)} disabled={view==='view'} /></Field>
            <Field label="Bin No"><Input value={formData.bin_no} onChange={e => setField('bin_no', e.target.value)} disabled={view==='view'} /></Field>

            <Field label="Locator Type" required error={v.errors.locator_type}>
              <Select value={formData.locator_type} 
                onChange={v_val => setField('locator_type', v_val)} 
                options={[
                  { value: 'BIN', label: 'Bin' },
                  { value: 'SHELF', label: 'Shelf' },
                  { value: 'FLOOR', label: 'Floor' },
                  { value: 'PALLET', label: 'Pallet' },
                  { value: 'LOCATOR', label: 'Locator' },
                  { value: 'VIRTUAL', label: 'Virtual' }
                ]} 
                disabled={view==='view'}
              />
            </Field>

            <Field label="Locator Usage" required error={v.errors.locator_usage}>
              <Select value={formData.locator_usage} 
                onChange={v_val => setField('locator_usage', v_val)} 
                options={[
                  { value: 'STORAGE', label: 'Storage' },
                  { value: 'STAGING', label: 'Staging' },
                  { value: 'RECEIVING', label: 'Receiving' },
                  { value: 'QC', label: 'QC' },
                  { value: 'PICK', label: 'Pick' },
                  { value: 'REJECT', label: 'Reject' }
                ]} 
                disabled={view==='view'}
              />
            </Field>

            <Field label="Max Weight Kg" error={v.errors.max_weight_kg}>
              <Input type="number" step="any" value={formData.max_weight_kg} 
                onChange={e => setField('max_weight_kg', e.target.value)} 
                onBlur={() => v.handleBlur('max_weight_kg', formData)}
                error={v.errors.max_weight_kg}
                disabled={view==='view'}
              />
            </Field>

            <Field label="Max Volume Cbm" error={v.errors.max_volume_cbm}>
              <Input type="number" step="any" value={formData.max_volume_cbm} 
                onChange={e => setField('max_volume_cbm', e.target.value)} 
                onBlur={() => v.handleBlur('max_volume_cbm', formData)}
                error={v.errors.max_volume_cbm}
                disabled={view==='view'}
              />
            </Field>

            <Field label="Material Status" required error={v.errors.material_status}>
              <Select value={formData.material_status} 
                onChange={v_val => setField('material_status', v_val)} 
                options={[
                  { value: 'AVAILABLE', label: 'Available' },
                  { value: 'BLOCKED', label: 'Blocked' },
                  { value: 'QUARANTINE', label: 'Quarantine' },
                  { value: 'DAMAGED', label: 'Damaged' },
                  { value: 'HOLD', label: 'Hold' }
                ]} 
                disabled={view==='view'}
              />
            </Field>

            <Field label="Temperature Range" required error={v.errors.temperature_range}>
              <Select value={formData.temperature_range} 
                onChange={v_val => setField('temperature_range', v_val)} 
                options={[
                  { value: 'AMBIENT', label: 'Ambient' },
                  { value: 'COLD', label: 'Cold' },
                  { value: 'FROZEN', label: 'Frozen' },
                  { value: '2-8C', label: '2-8°C' }
                ]} 
                disabled={view==='view'}
              />
            </Field>

            <Field label="Active"><Toggle value={formData.active_flag} onChange={v_val => setField('active_flag', v_val)} /></Field>
            
            <Field label="Effective From" required error={v.errors.effective_from}>
              <DateInput value={formData.effective_from} 
                onChange={v_val => setField('effective_from', v_val)} 
                onBlur={() => v.handleBlur('effective_from', formData)}
                error={v.errors.effective_from}
              />
            </Field>

            <Field label="Effective To" error={v.errors.effective_to}>
              <DateInput value={formData.effective_to} 
                onChange={v_val => setField('effective_to', v_val)} 
                onBlur={() => v.handleBlur('effective_to', formData)}
                error={v.errors.effective_to}
              />
            </Field>

            <AuditFields formData={formData} setField={setField} />
          </div>
        </div>
      </FormPage>
    )
  }

  return (
    <>
      <DataTable
        title="Locator / Bin"
        subtitle="Manage Locator / Bin records"
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
        actions={{ onView: handleView, onEdit: handleEdit, onDelete: setConfirmDelete }}
      />
      <ConfirmDialog
        open={!!confirmDelete}
        title="Delete Record"
        message={`Delete "${confirmDelete?.['{pk_field}']}"? This cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
        loading={table.isDeleting}
      />
    </>
  )
}



