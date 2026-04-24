import React, { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
import { useTableData, useDropdownData } from '../hooks/useTableData'
import { CompanyGroup } from '../components/CompanyGroup'
import { DataTable, StatusBadge, Toggle, Select, DateInput, Field, FormPage, ConfirmDialog, Input, AuditFields } from '../components/ui/index'
import { inventoryTransactionApi } from '../services/api'
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
  { key: 'txn_id', label: 'Txn Id' },
  { key: 'COMPANY_id', label: 'Company Id' },
  { key: 'business_type_id', label: 'Business Type Id' },
  { key: 'bg_id', label: 'Bg Id' },
  { key: 'txn_action', label: 'Txn Action' },
  { key: 'item_id', label: 'Item Id' },
  { key: 'Dropdown from_inv_org_id', label: 'Dropdown From Inv Org Id' }
]

export default function InventoryTransactionPage() {
  const navigate = useNavigate()
  const table = useTableData(inventoryTransactionApi, 'inventory_transaction')
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
        await table.update(selected['txn_id'], formData)
      } else {
        await table.create(formData)
      }
      handleBack()
    } catch {}
  }

  const handleDelete = async () => {
    await table.remove(confirmDelete['txn_id'])
    setConfirmDelete(null)
  }

  if (view !== 'list') {
    return (
      <FormPage title={view==='view'?`View Inventory Transaction`:view==='edit'?`Edit Inventory Transaction`:`New Inventory Transaction`}
        onBack={handleBack} onSubmit={handleSubmit} loading={table.isCreating||table.isUpdating} mode={view}>
        <div className="card p-6 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <Field label="Txn Id (Auto-gen)"><Input value={formData.txn_id} readOnly /></Field>
      <CompanyGroup formData={formData} setField={setField} />

      <Field label="Transaction Action"><Select value={formData.txn_action} onChange={v => setField('txn_action',v)} options={["IN","OUT","TRANSFER","ADJUSTMENT"]} /></Field>
      <Field label="Item"><Select value={formData.item_id} onChange={v => setField('item_id',v)} options={dropdowns.itemMaster?.map(r=>{return{value:r.item_id,label:`${r.item_code||''} - ${r.item_name||r.item_id}`}})} /></Field>
      <Field label="Dropdown From Inv Org Id"><Input value={formData.Dropdown.from_inv_org_id} onChange={e => setField('Dropdown from_inv_org_id',e.target.value)} /></Field>
      <Field label="From Subinventory Id"><Select value={formData.from_subinventory_id} onChange={v => setField('from_subinventory_id',v)} options={dropdowns.subinventory?.map(r=>{return{value:r.subinventory_id,label:r.subinventory_name||r.subinventory_id}})} /></Field>
      <Field label="From Locator Id"><Select value={formData.from_locator_id} onChange={v => setField('from_locator_id',v)} options={dropdowns.locator?.map(r=>{return{value:r.locator_id,label:r.locator_name||r.locator_id}})} /></Field>
      <Field label="To Inv Org Id"><Select value={formData.to_inv_org_id} onChange={v => setField('to_inv_org_id',v)} options={dropdowns.inventoryOrg?.map(r=>{return{value:r.inv_org_id,label:r.inv_org_name||r.inv_org_id}})} /></Field>
      <Field label="To Subinventory Id"><Select value={formData.to_subinventory_id} onChange={v => setField('to_subinventory_id',v)} options={dropdowns.subinventory?.map(r=>{return{value:r.subinventory_id,label:r.subinventory_name||r.subinventory_id}})} /></Field>
      <Field label="To Locator Id"><Select value={formData.to_locator_id} onChange={v => setField('to_locator_id',v)} options={dropdowns.locator?.map(r=>{return{value:r.locator_id,label:r.locator_name||r.locator_id}})} /></Field>
      <Field label="Transaction Type"><Select value={formData.txn_type_id} onChange={v => setField('txn_type_id',v)} options={dropdowns.transactionType?.map(r=>{return{value:r.txn_type_id,label:r.txn_type_name||r.txn_type_id}})} /></Field>
      <Field label="Transaction Reason"><Select value={formData.txn_reason_id} onChange={v => setField('txn_reason_id',v)} options={dropdowns.transactionReason?.map(r=>{return{value:r.txn_reason_id,label:r.txn_reason||r.txn_reason_id}})} /></Field>
      <Field label="Lot"><Select value={formData.lot_id} onChange={v => setField('lot_id',v)} options={dropdowns.lotMaster?.map(r=>{return{value:r.lot_id,label:r.lot_number||r.lot_id}})} /></Field>
      <Field label="Serial"><Select value={formData.serial_id} onChange={v => setField('serial_id',v)} options={dropdowns.serialMaster?.map(r=>{return{value:r.serial_id,label:r.serial_number||r.serial_id}})} /></Field>
      <Field label="Uom Id"><Select value={formData.uom_id} onChange={v => setField('uom_id',v)} options={dropdowns.uom?.map(r=>{return{value:r.uom_id,label:`${r.uom_code||''} - ${r.uom_name||r.uom_id}`}})} /></Field>
      <Field label="Txn Qty"><Input type="number" step="any"  value={formData.txn_qty} onChange={e => setField('txn_qty',e.target.value)} /></Field>
      <Field label="Unit Cost"><Input type="number" step="any"  value={formData.unit_cost} onChange={e => setField('unit_cost',e.target.value)} /></Field>
      <Field label="Txn Value = Txn Qty × Unit Cost"><Input value={formData.txn_value = txn_qty * unit_cost} onChange={e => setField('txn_value = txn_qty × unit_cost',e.target.value)} /></Field>
      <Field label="Status"><Select value={formData.txn_status} onChange={v => setField('txn_status',v)} options={["PENDING","COMPLETED","CANCELLED","ON_HOLD"]} /></Field>
      <Field label="Txn Date"><DateInput value={formData.txn_date} onChange={v => setField('txn_date',v)} /></Field>
      <Field label="Reference No"><Input value={formData.reference_no} onChange={e => setField('reference_no',e.target.value)} /></Field>
      <Field label="Reference Type"><Input value={formData.reference_type} onChange={e => setField('reference_type',e.target.value)} /></Field>
      <Field label="Reference Id"><Input value={formData.reference_id} onChange={e => setField('reference_id',e.target.value)} /></Field>
      <Field label="Approved By"><Input value={formData.approved_by} onChange={e => setField('approved_by',e.target.value)} /></Field>
      <Field label="Remarks"><textarea className="input" disabled={view==='view'} rows={3} value={formData.remarks||''} onChange={e => setField('remarks',e.target.value)} /></Field>
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
        title="Inventory Transaction"
        subtitle="Manage Inventory Transaction records"
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
