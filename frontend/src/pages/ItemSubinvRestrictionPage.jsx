import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTableData, useDropdownData } from '../hooks/useTableData'
import { DataTable, StatusBadge, Toggle, Select, DateInput, Field, FormPage, ConfirmDialog, Input, AuditFields } from '../components/ui/index'
import { itemSubinvRestrictionApi } from '../services/api'
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
  { key: 'item_subinv_id', label: 'Item Subinv Id' },
  { key: 'COMPANY_id', label: 'Company Id' },
  { key: 'business_type_id', label: 'Business Type Id' },
  { key: 'item_id', label: 'Item Id' },
  { key: 'inv_org_id', label: 'Inv Org Id' },
  { key: 'subinventory_id', label: 'Subinventory Id' },
  { key: 'locator_id', label: 'Locator Id' }
]

export default function ItemSubinvRestrictionPage() {
  const navigate = useNavigate()
  const table = useTableData(itemSubinvRestrictionApi, 'item_subinv_restriction')
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

  const setField = (k, v) => setFormData(p => ({ ...p, [k]: v }))

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
        await table.update(selected['item_subinv_id'], formData)
      } else {
        await table.create(formData)
      }
      handleBack()
    } catch {}
  }

  const handleDelete = async () => {
    await table.remove(confirmDelete['item_subinv_id'])
    setConfirmDelete(null)
  }

  if (view !== 'list') {
    return (
      <FormPage title={view==='view'?`View Item-Subinv Rules`:view==='edit'?`Edit Item-Subinv Rules`:`New Item-Subinv Rules`}
        onBack={handleBack} onSubmit={handleSubmit} loading={table.isCreating||table.isUpdating} mode={view}>
        <div className="card p-6 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <Field label="Item Subinv Id (Auto-gen)"><Input value={formData.item_subinv_id} readOnly /></Field>
      <Field label="Company"><Select value={formData.COMPANY_id} onChange={v => setField('COMPANY_id',v)} options={dropdowns.company?.map(r=>{return{value:r.company_id,label:r.company_name||r.company_id}})} /></Field>
      <Field label="Business Type"><Select value={formData.business_type_id} onChange={v => setField('business_type_id',v)} options={dropdowns.businessType?.map(r=>{return{value:r.business_type_id,label:r.name||r.business_type_id}})} /></Field>
      <Field label="Item"><Select value={formData.item_id} onChange={v => setField('item_id',v)} options={dropdowns.itemMaster?.map(r=>{return{value:r.item_id,label:`${r.item_code||''} - ${r.item_name||r.item_id}`}})} /></Field>
      <Field label="Inv Org Id"><Select value={formData.inv_org_id} onChange={v => setField('inv_org_id',v)} options={dropdowns.inventoryOrg?.map(r=>{return{value:r.inv_org_id,label:r.inv_org_name||r.inv_org_id}})} /></Field>
      <Field label="Subinventory Id"><Select value={formData.subinventory_id} onChange={v => setField('subinventory_id',v)} options={dropdowns.subinventory?.map(r=>{return{value:r.subinventory_id,label:r.subinventory_name||r.subinventory_id}})} /></Field>
      <Field label="Locator Id"><Select value={formData.locator_id} onChange={v => setField('locator_id',v)} options={dropdowns.locator?.map(r=>{return{value:r.locator_id,label:r.locator_name||r.locator_id}})} /></Field>
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
        title="Item-Subinv Rules"
        subtitle="Manage Item-Subinv Rules records"
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
