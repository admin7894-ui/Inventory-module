import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTableData, useDropdownData } from '../hooks/useTableData'
import { DataTable, StatusBadge, Toggle, Select, DateInput, Field, FormPage, ConfirmDialog, Input, AuditFields } from '../components/ui/index'
import { tableAccessApi } from '../services/api'
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
  { key: 'table_access_id', label: 'Table Access Id' },
  { key: 'security_roles_id', label: 'Security Roles Id' },
  { key: 'user_name', label: 'User Name' },
  { key: 'table_name', label: 'Table Name' },
  { key: 'can_create', label: 'Can Create' },
  { key: 'can_read', label: 'Can Read' },
  { key: 'can_update', label: 'Can Update' }
]

export default function TableAccessPage() {
  const navigate = useNavigate()
  const table = useTableData(tableAccessApi, 'table_access')
  const [view, setView] = useState('list') // 'list' | 'create' | 'edit' | 'view'
  const [selected, setSelected] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [formData, setFormData] = useState({})

  // Load all needed dropdowns
  const { options: companies }        = useDropdownData(companyApi, 'company_dd')
  const { options: businessGroups }   = useDropdownData(businessGroupApi, 'bg_dd')
  const { options: businessTypes }    = useDropdownData(businessTypeApi, 'bt_dd')
  const { options: locations }        = useDropdownData(locationApi, 'loc_dd')
  const { options: modules }          = useDropdownData(moduleApi, 'mod_dd')
  const { options: inventoryOrgs }    = useDropdownData(inventoryOrgApi, 'invorg_dd')
  const { options: subinventories }   = useDropdownData(subinventoryApi, 'sub_dd')
  const { options: locators }         = useDropdownData(locatorApi, 'loc2_dd')
  const { options: items }            = useDropdownData(itemMasterApi, 'item_dd')
  const { options: uoms }             = useDropdownData(uomApi, 'uom_dd')
  const { options: uomTypes }         = useDropdownData(uomTypeApi, 'uomt_dd')
  const { options: itemCategories }   = useDropdownData(itemCategoryApi, 'cat_dd')
  const { options: itemSubCategories }= useDropdownData(itemSubCategoryApi, 'scat_dd')
  const { options: brands }           = useDropdownData(brandApi, 'brand_dd')
  const { options: itemTypes }        = useDropdownData(itemTypeApi, 'itype_dd')
  const { options: zones }            = useDropdownData(zoneApi, 'zone_dd')
  const { options: lots }             = useDropdownData(lotMasterApi, 'lot_dd')
  const { options: serials }          = useDropdownData(serialMasterApi, 'serial_dd')
  const { options: txnTypes }         = useDropdownData(transactionTypeApi, 'txntype_dd')
  const { options: txnReasons }       = useDropdownData(transactionReasonApi, 'txnrsn_dd')
  const { options: categorySets }     = useDropdownData(categorySetApi, 'catset_dd')
  const { options: costMethods }      = useDropdownData(costMethodApi, 'cm_dd')
  const { options: costTypes }        = useDropdownData(costTypeApi, 'ct_dd')
  const { options: shipMethods }      = useDropdownData(shipMethodApi, 'sm_dd')
  const { options: legalEntities }    = useDropdownData(legalEntityApi, 'le_dd')
  const { options: operatingUnits }   = useDropdownData(operatingUnitApi, 'ou_dd')
  const { options: securityProfiles } = useDropdownData(securityProfileApi, 'sp_dd')
  const { options: profileAccesses }  = useDropdownData(profileAccessApi, 'pa_dd')
  const { options: securityRolesList }= useDropdownData(securityRolesApi, 'sr_dd')
  const { options: depts }            = useDropdownData(departmentsApi, 'dept_dd')
  const { options: rolesList }        = useDropdownData(rolesApi, 'roles_dd')
  const { options: designations }     = useDropdownData(designationApi, 'desig_dd')

  const dropdowns = {
    company:companies, businessGroup:businessGroups, businessType:businessTypes,
    location:locations, module:modules, inventoryOrg:inventoryOrgs,
    subinventory:subinventories, locator:locators, itemMaster:items,
    uom:uoms, uomType:uomTypes, itemCategory:itemCategories, itemSubCategory:itemSubCategories,
    brand:brands, itemType:itemTypes, zone:zones, lotMaster:lots, serialMaster:serials,
    transactionType:txnTypes, transactionReason:txnReasons, categorySet:categorySets,
    costMethod:costMethods, costType:costTypes, shipMethod:shipMethods,
    legalEntity:legalEntities, operatingUnit:operatingUnits,
    securityProfile:securityProfiles, profileAccess:profileAccesses,
    securityRoles:securityRolesList, departments:depts, roles:rolesList, designation:designations,
  }

  const setField = (k, val) => {
    setFormData(p => ({ ...p, [k]: val }))
    if (typeof v !== 'undefined' && v.clearError) v.clearError(k)
    if (typeof setErrors === 'function') setErrors(p => { const n = {...p}; delete n[k]; return n })
  }

  const handleCreate = () => {
    setFormData({ active_flag:'Y', effective_from:new Date().toISOString().split('T')[0] })
    setView('create')
  }
  const handleEdit = (row) => { setSelected(row); setFormData({ ...row }); setView('edit') }
  const handleView = (row) => { setSelected(row); setFormData({ ...row }); setView('view') }
  const handleBack = () => { setView('list'); setSelected(null) }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (view === 'edit') {
        await table.update(selected['table_access_id'], formData)
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
        toast.error(err.response?.data?.message || 'Action failed')
      }
    }
  }

  const handleDelete = async () => {
    await table.remove(confirmDelete['table_access_id'])
    setConfirmDelete(null)
  }

  if (view !== 'list') {
    return (
      <FormPage title={view==='view'?`View Table Access`:view==='edit'?`Edit Table Access`:`New Table Access`}
        onBack={handleBack} onSubmit={handleSubmit} loading={table.isCreating||table.isUpdating} mode={view}>
        <div className="card p-6 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <Field label="Table Access Id (Auto-gen)"><Input value={formData.table_access_id} readOnly /></Field>
      <Field label="Security Role"><Select value={formData.security_roles_id} onChange={v => setField('security_roles_id',v)} options={dropdowns.securityRoles?.map(r=>{return{value:r.security_roles_id,label:r.user_name||r.security_roles_id}})} /></Field>
      <Field label="User Name"><Input value={formData.user_name} onChange={e => setField('user_name',e.target.value)} /></Field>
      <Field label="Table Name"><Input value={formData.table_name} onChange={e => setField('table_name',e.target.value)} /></Field>
      <Field label="Can Create"><Input value={formData.can_create} onChange={e => setField('can_create',e.target.value)} /></Field>
      <Field label="Can Read"><Input value={formData.can_read} onChange={e => setField('can_read',e.target.value)} /></Field>
      <Field label="Can Update"><DateInput value={formData.can_update} onChange={v => setField('can_update',v)} /></Field>
      <Field label="Can Delete"><Input value={formData.can_delete} onChange={e => setField('can_delete',e.target.value)} /></Field>
      <Field label="Module"><Select value={formData.module_id} onChange={v => setField('module_id',v)} options={dropdowns.module?.map(r=>{return{value:r.module_id,label:r.module_name||r.module_id}})} /></Field>
      <Field label="Active"><Toggle value={formData.active_flag} onChange={v => setField('active_flag',v)} /></Field>
      <Field label="Effective From"><DateInput value={formData.effective_from} onChange={v => setField('effective_from',v)} /></Field>
      <Field label="Effective To"><DateInput value={formData.effective_to} onChange={v => setField('effective_to',v)} /></Field>
      <AuditFields formData={formData} setField={setField} />
      </div>
        </div>
      </FormPage>
    )
  }

  return (
    <>
      <DataTable
        title="Table Access"
        subtitle="Manage Table Access records"
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
        message={`Delete "${confirmDelete?.['{pk_field}']}"? This cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
        loading={table.isDeleting}
      />
    </>
  )
}


