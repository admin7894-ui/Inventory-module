import React, { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
import { useTableData, useDropdownData } from '../hooks/useTableData'
import { CompanyGroup } from '../components/CompanyGroup'
import { DataTable, StatusBadge, Toggle, Select, DateInput, Field, FormPage, ConfirmDialog, Input, AuditFields } from '../components/ui/index'

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
  { key: 'COMPANY_id', label: 'Company Id' },
  { key: 'business_type_id', label: 'Business Type Id' },
  { key: 'bg_id', label: 'Bg Id' },
  { key: 'item_code', label: 'Item Code' },
  { key: 'item_name', label: 'Item Name' },
  { key: 'item_type_id', label: 'Item Type Id' }
]

export default function ItemMasterPage() {
  const navigate = useNavigate()
  const table = useTableData(itemMasterApi, 'item_master')
  const [view, setView] = useState('list') // 'list' | 'create' | 'edit' | 'view'
  const [selected, setSelected] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [formData, setFormData] = useState({})

  // Load all needed dropdowns
  const companies = []
  const businessGroups = []
  const businessTypes = []
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
    if (!formData.COMPANY_id || !formData.business_type_id || !formData.bg_id) {
      return toast.error('Please select Company, Business Group and Business Type')
    }

    e.preventDefault()
    try {
      if (view === 'edit') {
        await table.update(selected['item_id'], formData)
      } else {
        await table.create(formData)
      }
      handleBack()
    } catch {}
  }

  const handleDelete = async () => {
    await table.remove(confirmDelete['item_id'])
    setConfirmDelete(null)
  }

  if (view !== 'list') {
    return (
      <FormPage title={view==='view'?`View Item Master`:view==='edit'?`Edit Item Master`:`New Item Master`}
        onBack={handleBack} onSubmit={handleSubmit} loading={table.isCreating||table.isUpdating} mode={view}>
        <div className="card p-6 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <Field label="Item Id (Auto-gen)"><Input value={formData.item_id} readOnly /></Field>
      <CompanyGroup formData={formData} setField={setField} />

      <Field label="Item Code"><Input value={formData.item_code} onChange={e => setField('item_code',e.target.value)} /></Field>
      <Field label="Item Name"><Input value={formData.item_name} onChange={e => setField('item_name',e.target.value)} /></Field>
      <Field label="Item Type"><Select value={formData.item_type_id} onChange={v => setField('item_type_id',v)} options={dropdowns.itemType?.map(r=>{return{value:r.item_type_id,label:r.item_type_name||r.item_type_id}})} /></Field>
      <Field label="Brand"><Select value={formData.brand_id} onChange={v => setField('brand_id',v)} options={dropdowns.brand?.map(r=>{return{value:r.brand_id,label:r.brand_name||r.brand_id}})} /></Field>
      <Field label="Category"><Select value={formData.category_id} onChange={v => setField('category_id',v)} options={dropdowns.itemCategory?.map(r=>{return{value:r.category_id,label:r.category_name||r.category_id}})} /></Field>
      <Field label="Sub Category"><Select value={formData.sub_category_id} onChange={v => setField('sub_category_id',v)} options={dropdowns.itemSubCategory?.map(r=>{return{value:r.sub_category_id,label:r.sub_category_name||r.sub_category_id}})} /></Field>
      <Field label="Primary Uom Id"><Select value={formData.primary_uom_id} onChange={v => setField('primary_uom_id',v)} options={dropdowns.uom?.map(r=>{return{value:r.uom_id,label:`${r.uom_code||''} - ${r.uom_name||r.uom_id}`}})} /></Field>
      <Field label="Secondary Uom Id"><Select value={formData.secondary_uom_id} onChange={v => setField('secondary_uom_id',v)} options={dropdowns.uom?.map(r=>{return{value:r.uom_id,label:`${r.uom_code||''} - ${r.uom_name||r.uom_id}`}})} /></Field>
      <Field label="Is Stock Item"><Toggle value={formData.is_stock_item} onChange={v => setField('is_stock_item',v)} /></Field>
      <Field label="Is Serial Controlled"><Toggle value={formData.is_serial_controlled} onChange={v => setField('is_serial_controlled',v)} /></Field>
      <Field label="Is Lot Controlled"><Toggle value={formData.is_lot_controlled} onChange={v => setField('is_lot_controlled',v)} /></Field>
      <Field label="Is Expirable"><Toggle value={formData.is_expirable} onChange={v => setField('is_expirable',v)} /></Field>
      <Field label="Shelf Life Days"><Input type="number" step="any"  value={formData.shelf_life_days} onChange={e => setField('shelf_life_days',e.target.value)} /></Field>
      <Field label="Lead Time Days"><Input type="number" step="any"  value={formData.lead_time_days} onChange={e => setField('lead_time_days',e.target.value)} /></Field>
      <Field label="Reorder Point"><Input type="number" step="any"  value={formData.reorder_point} onChange={e => setField('reorder_point',e.target.value)} /></Field>
      <Field label="Min Order Qty"><Input type="number" step="any"  value={formData.min_order_qty} onChange={e => setField('min_order_qty',e.target.value)} /></Field>
      <Field label="Max Order Qty"><Input type="number" step="any"  value={formData.max_order_qty} onChange={e => setField('max_order_qty',e.target.value)} /></Field>
      <Field label="Standard Cost"><Input type="number" step="any"  value={formData.standard_cost} onChange={e => setField('standard_cost',e.target.value)} /></Field>
      <Field label="List Price"><Input type="number" step="any"  value={formData.list_price} onChange={e => setField('list_price',e.target.value)} /></Field>
      <Field label="Tax Category"><Input value={formData.tax_category} onChange={e => setField('tax_category',e.target.value)} /></Field>
      <Field label="Hsn Code"><Input value={formData.hsn_code} onChange={e => setField('hsn_code',e.target.value)} /></Field>
      <Field label="Weight Kg"><Input value={formData.weight_kg} onChange={e => setField('weight_kg',e.target.value)} /></Field>
      <Field label="Volume Cbm"><Input value={formData.volume_cbm} onChange={e => setField('volume_cbm',e.target.value)} /></Field>
      <Field label="Is License Required"><Toggle value={formData.is_license_required} onChange={v => setField('is_license_required',v)} /></Field>
      <Field label="License Type"><Select value={formData.license_type} onChange={v => setField('license_type',v)} options={["DRUG_LICENSE","SUBSCRIPTION","IMPORT","NONE"]} /></Field>
      <Field label="Max Users"><Input value={formData.max_users} onChange={e => setField('max_users',e.target.value)} /></Field>
      <Field label="Description"><textarea className="input" disabled={view==='view'} rows={3} value={formData.description||''} onChange={e => setField('description',e.target.value)} /></Field>
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
        message={`Delete "${confirmDelete?.['{pk_field}']}"? This cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
        loading={table.isDeleting}
      />
    </>
  )
}
