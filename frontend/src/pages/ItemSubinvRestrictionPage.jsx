import React, { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
import { useTableData, useDropdownData } from '../hooks/useTableData'
import { CompanyGroup } from '../components/CompanyGroup'
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
import { validate, autoCode } from '../validations/validationEngine'
import { ErrorBanner } from '../components/ui/index'

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
  const [errors, setErrors] = useState({})

  // Load all needed dropdowns
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

  // Filtered dropdowns
  const filteredSubinventories = dropdowns.subinventory?.filter(s => !formData.inv_org_id || s.inv_org_id === formData.inv_org_id)
  const filteredLocators = dropdowns.locator?.filter(l => !formData.subinventory_id || l.subinventory_id === formData.subinventory_id)

  const validateField = (k, v) => {
    const val = typeof v === 'string' ? v.trim() : v;
    const { errors: newErrors } = validate('item_subinv_restriction', { ...formData, [k]: val });
    setErrors(prev => ({ ...prev, [k]: newErrors[k] }));
  }

  const setField = (k, v) => {
    setFormData(p => {
      const next = { ...p, [k]: v }
      // Reset dependent fields
      if (k === 'inv_org_id') { next.subinventory_id = ''; next.locator_id = '' }
      if (k === 'subinventory_id') { next.locator_id = '' }
      return next
    })
    if (errors[k]) setErrors(p => ({ ...p, [k]: null }))
  }

  const handleCreate = () => {
    setFormData({ active_flag:'Y', effective_from:new Date().toISOString().split('T')[0] })
    setErrors({})
    setView('create')
  }
  const handleEdit = (row) => { setSelected(row); setFormData({ ...row }); setErrors({}); setView('edit') }
  const handleView = (row) => { setSelected(row); setFormData({ ...row }); setErrors({}); setView('view') }
  const handleBack = () => { setView('list'); setSelected(null); setErrors({}) }

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const trimmedData = Object.fromEntries(
      Object.entries(formData).map(([k, v]) => [k, typeof v === 'string' ? v.trim() : v])
    );
    const { errors: valErrors, isValid } = validate('item_subinv_restriction', trimmedData);
    
    if (!isValid) {
      setErrors(valErrors);
      return toast.error('Please fix the highlighted errors');
    }

    try {
      if (view === 'edit') {
        await table.update(selected['item_subinv_id'], formData)
      } else {
        await table.create(formData)
      }
      handleBack()
    } catch (err) {
      if (err.response?.data?.errors) setErrors(err.response.data.errors)
    }
  }

  const handleDelete = async () => {
    await table.remove(confirmDelete['item_subinv_id'])
    setConfirmDelete(null)
  }

  if (view !== 'list') {
    return (
      <FormPage title={view==='view'?`View Item-Subinv Rules`:view==='edit'?`Edit Item-Subinv Rules`:`New Item-Subinv Rules`}
        onBack={handleBack} onSubmit={handleSubmit} loading={table.isCreating||table.isUpdating} mode={view}>
        <ErrorBanner message={Object.keys(errors).length > 0 ? "Please fix the highlighted errors" : null} />
        <div className="card p-6 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <Field label="Item Subinv Id (Auto-gen)"><Input value={formData.item_subinv_id} readOnly /></Field>
      <CompanyGroup formData={formData} setField={setField} errors={errors} handleBlur={validateField} />
      
      <Field label="Item" required error={errors.item_id}>
        <Select value={formData.item_id} onChange={v => setField('item_id',v)} onBlur={() => validateField('item_id', formData.item_id)}
          options={dropdowns.itemMaster?.map(r=>({value:r.item_id,label:`${r.item_code||''} - ${r.item_name||r.item_id}`}))} />
      </Field>
      <Field label="Inv Org Id" required error={errors.inv_org_id}>
        <Select value={formData.inv_org_id} onChange={v => setField('inv_org_id',v)} onBlur={() => validateField('inv_org_id', formData.inv_org_id)}
          options={dropdowns.inventoryOrg?.map(r=>({value:r.inv_org_id,label:r.inv_org_name||r.inv_org_id}))} />
      </Field>
      <Field label="Subinventory Id" required error={errors.subinventory_id}>
        <Select value={formData.subinventory_id} onChange={v => setField('subinventory_id',v)} onBlur={() => validateField('subinventory_id', formData.subinventory_id)}
          options={filteredSubinventories?.map(r=>({value:r.subinventory_id,label:r.subinventory_name||r.subinventory_id}))}
          disabled={!formData.inv_org_id} placeholder={!formData.inv_org_id ? "Select Org first" : "-- Select --"} />
      </Field>
      <Field label="Locator Id" required error={errors.locator_id}>
        <Select value={formData.locator_id} onChange={v => setField('locator_id',v)} onBlur={() => validateField('locator_id', formData.locator_id)}
          options={filteredLocators?.map(r=>({value:r.locator_id,label:r.locator_name||r.locator_id}))}
          disabled={!formData.subinventory_id} placeholder={!formData.subinventory_id ? "Select Subinventory first" : "-- Select --"} />
      </Field>
      <Field label="Module" required error={errors.module_id}>
        <Select value={formData.module_id} onChange={v => setField('module_id',v)} options={dropdowns.module?.map(r=>({value:r.module_id,label:r.module_name||r.module_id}))} />
      </Field>
      <Field label="Active"><Toggle value={formData.active_flag} onChange={v => setField('active_flag',v)} /></Field>
      <Field label="Effective From" required error={errors.effective_from}><DateInput value={formData.effective_from} onChange={v => setField('effective_from',v)} onBlur={() => validateField('effective_from', formData.effective_from)} /></Field>
      <Field label="Effective To" error={errors.effective_to}><DateInput value={formData.effective_to} onChange={v => setField('effective_to',v)} onBlur={() => validateField('effective_to', formData.effective_to)} /></Field>
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
