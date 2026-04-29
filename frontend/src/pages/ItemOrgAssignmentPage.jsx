import React, { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
import { useTableData, useDropdownData } from '../hooks/useTableData'
import { CompanyGroup } from '../components/CompanyGroup'
import { DataTable, StatusBadge, Toggle, Select, DateInput, Field, FormPage, ConfirmDialog, Input, AuditFields } from '../components/ui/index'
import { itemOrgAssignmentApi } from '../services/api'
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
  { key: 'item_org_assign_id', label: 'Item Org Assign Id' },
  { key: 'COMPANY_id', label: 'Company Id' },
  { key: 'business_type_id', label: 'Business Type Id' },
  { key: 'bg_id', label: 'Bg Id' },
  { key: 'item_id', label: 'Item Id' },
  { key: 'inv_org_id', label: 'Inv Org Id' }
]

export default function ItemOrgAssignmentPage() {
  const navigate = useNavigate()
  const table = useTableData(itemOrgAssignmentApi, 'item_org_assignment')
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

  const validateField = (k, v) => {
    const val = typeof v === 'string' ? v.trim() : v;
    const { errors: newErrors } = validate('item_org_assignment', { ...formData, [k]: val });
    setErrors(prev => ({ ...prev, [k]: newErrors[k] }));
  }

  const setField = (k, v) => {
    setFormData(p => ({ ...p, [k]: v }));
    if (errors[k]) setErrors(p => ({ ...p, [k]: null }));
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
    const { errors: valErrors, isValid } = validate('item_org_assignment', trimmedData);
    
    if (!isValid) {
      setErrors(valErrors);
      return toast.error('Please fix the highlighted errors');
    }

    try {
      if (view === 'edit') {
        await table.update(selected['item_org_assign_id'], formData)
      } else {
        await table.create(formData)
      }
      handleBack()
    } catch (err) {
      if (err.response?.data?.errors) setErrors(err.response.data.errors)
    }
  }

  const handleDelete = async () => {
    await table.remove(confirmDelete['item_org_assign_id'])
    setConfirmDelete(null)
  }

  if (view !== 'list') {
    return (
      <FormPage title={view==='view'?`View Item Org Assignment`:view==='edit'?`Edit Item Org Assignment`:`New Item Org Assignment`}
        onBack={handleBack} onSubmit={handleSubmit} loading={table.isCreating||table.isUpdating} mode={view}>
        <ErrorBanner message={Object.keys(errors).length > 0 ? "Please fix the highlighted errors" : null} />
        <div className="card p-6 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <Field label="Item Org Assign Id (Auto-gen)"><Input value={formData.item_org_assign_id} readOnly /></Field>
      <CompanyGroup formData={formData} setField={setField} errors={errors} handleBlur={validateField} />

      <Field label="Item" required error={errors.item_id}>
        <Select value={formData.item_id} onChange={v => setField('item_id',v)} onBlur={() => validateField('item_id', formData.item_id)}
          options={dropdowns.itemMaster?.map(r=>({value:r.item_id,label:`${r.item_code||''} - ${r.item_name||r.item_id}`}))} />
      </Field>
      <Field label="Inv Org Id" required error={errors.inv_org_id}>
        <Select value={formData.inv_org_id} onChange={v => setField('inv_org_id',v)} onBlur={() => validateField('inv_org_id', formData.inv_org_id)}
          options={dropdowns.inventoryOrg?.map(r=>({value:r.inv_org_id,label:r.inv_org_name||r.inv_org_id}))} />
      </Field>
      <Field label="Min Qty" required error={errors.min_qty}>
        <Input type="number" step="any" value={formData.min_qty} onChange={e => setField('min_qty',e.target.value)} onBlur={() => validateField('min_qty', formData.min_qty)} />
      </Field>
      <Field label="Max Qty" required error={errors.max_qty}>
        <Input type="number" step="any" value={formData.max_qty} onChange={e => setField('max_qty',e.target.value)} onBlur={() => validateField('max_qty', formData.max_qty)} />
      </Field>
      <Field label="Safety Stock Qty" required error={errors.safety_stock_qty}>
        <Input type="number" step="any" value={formData.safety_stock_qty} onChange={e => setField('safety_stock_qty',e.target.value)} onBlur={() => validateField('safety_stock_qty', formData.safety_stock_qty)} />
      </Field>
      <Field label="Lot Divisible Flag"><Toggle value={formData.lot_divisible_flag} onChange={v => setField('lot_divisible_flag',v)} /></Field>
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
        title="Item Org Assignment"
        subtitle="Manage Item Org Assignment records"
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
