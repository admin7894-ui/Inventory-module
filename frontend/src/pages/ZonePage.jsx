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
  { key: 'zone_id', label: 'Zone Id' },
  { key: 'COMPANY_id', label: 'Company Id' },
  { key: 'business_type_id', label: 'Business Type Id' },
  { key: 'bg_id', label: 'Bg Id' },
  { key: 'zone_code', label: 'Zone Code' },
  { key: 'zone_name', label: 'Zone Name' },
  { key: 'zone_type', label: 'Zone Type' }
]

export default function ZonePage() {
  const navigate = useNavigate()
  const table = useTableData(zoneApi, 'zone')
  const [view, setView] = useState('list') // 'list' | 'create' | 'edit' | 'view'
  const [selected, setSelected] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [formData, setFormData] = useState({})
  const v = useFormValidation('zone')

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
        await table.update(selected['zone_id'], formData)
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
    await table.remove(confirmDelete['zone_id'])
    setConfirmDelete(null)
  }

  if (view !== 'list') {
    return (
      <FormPage title={view === 'view' ? `View Zone` : view === 'edit' ? `Edit Zone` : `New Zone`}
        onBack={handleBack} onSubmit={handleSubmit} loading={table.isCreating || table.isUpdating} mode={view}>
        {v.submitFailed && <ErrorBanner message="Please fix the highlighted errors before saving." />}
        <div className="card p-6 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Field label="Zone Id (Auto-gen)"><Input value={formData.zone_id} readOnly /></Field>
            <CompanyGroup formData={formData} setField={setField} errors={v.errors} handleBlur={v.handleBlur} />

            <Field label="Zone Name" required error={v.errors.zone_name}>
              <Input value={formData.zone_name} 
                onChange={e => {
                  const val = e.target.value;
                  setFormData(p => ({ 
                    ...p, 
                    zone_name: val,
                    zone_code: view === 'create' ? autoCode(val, 'Z_') : p.zone_code
                  }))
                }}
                onBlur={() => v.handleBlur('zone_name', formData)}
                error={v.errors.zone_name}
              />
            </Field>

            <Field label="Zone Code" required error={v.errors.zone_code}>
              <Input value={formData.zone_code}    
                onChange={e => setField('zone_code', e.target.value)} 
                onBlur={() => v.handleBlur('zone_code', formData)}
                error={v.errors.zone_code}
              />
            </Field>

            <Field label="Zone Type" required error={v.errors.zone_type}>
              <Select value={formData.zone_type} 
                onChange={v_val => setField('zone_type', v_val)} 
                options={[
                  { value: 'STORAGE', label: 'Storage' },
                  { value: 'COLD', label: 'Cold' },
                  { value: 'GENERAL', label: 'General' }
                ]} 
              />
            </Field>

            <Field label="Active"><Toggle value={formData.active_flag} onChange={v => setField('active_flag',v)} /></Field>
            
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
        title="Zone"
        subtitle="Manage Zone records"
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



