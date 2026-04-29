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
  { key: 'subinventory_id', label: 'Subinventory Id' },
  { key: 'COMPANY_id', label: 'Company Id' },
  { key: 'business_type_id', label: 'Business Type Id' },
  { key: 'bg_id', label: 'Bg Id' },
  { key: 'inv_org_id', label: 'Inv Org Id' },
  { key: 'subinventory_code', label: 'Subinventory Code' },
  { key: 'subinventory_name', label: 'Subinventory Name' }
]

export default function SubinventoryPage() {
  const navigate = useNavigate()
  const table = useTableData(subinventoryApi, 'subinventory')
  const [view, setView] = useState('list') // 'list' | 'create' | 'edit' | 'view'
  const [selected, setSelected] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [formData, setFormData] = useState({})
  const v = useFormValidation('subinventory')

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

  const setField = (k, v) => {
    setFormData(p => ({ ...p, [k]: v }));
    v.clearError(k);
  }

  const handleCreate = () => {
    setFormData({ 
      active_flag: 'Y', 
      effective_from: new Date().toISOString().split('T')[0],
      module_id: 'MOD01',
      max_capacity_kg: 0,
      current_utilization_pct: 0
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
        await table.update(selected['subinventory_id'], formData)
      } else {
        await table.create(formData)
      }
      handleBack()
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to save record')
    }
  }

  const handleDelete = async () => {
    await table.remove(confirmDelete['subinventory_id'])
    setConfirmDelete(null)
  }

  if (view !== 'list') {
    return (
      <FormPage title={view==='view'?`View Subinventory`:view==='edit'?`Edit Subinventory`:`New Subinventory`}
        onBack={handleBack} onSubmit={handleSubmit} loading={table.isCreating||table.isUpdating} mode={view}>
        {v.submitFailed && <ErrorBanner message="Please fix the highlighted errors before saving." />}
        <div className="card p-6 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Field label="Subinventory Id (Auto-gen)"><Input value={formData.subinventory_id} readOnly /></Field>
            <CompanyGroup formData={formData} setField={setField} errors={v.errors} handleBlur={v.handleBlur} />

            <Field label="Inv Org Id" required error={v.fieldError('inv_org_id')}>
              <Select value={formData.inv_org_id} 
                onChange={v_val => setField('inv_org_id', v_val)} 
                onBlur={() => v.handleBlur('inv_org_id', formData)}
                options={dropdowns.inventoryOrg?.map(r=>({value:r.inv_org_id, label:r.inv_org_name||r.inv_org_id}))} 
                disabled={view === 'view'}
                placeholder={!formData.business_type_id ? "Select Business Type first" : "Select Org"}
              />
            </Field>

            <Field label="Subinventory Name" required error={v.fieldError('subinventory_name')}>
              <Input value={formData.subinventory_name} 
                onChange={e => {
                  const val = e.target.value;
                  setFormData(p => ({ 
                    ...p, 
                    subinventory_name: val,
                    subinventory_code: view === 'create' ? autoCode(val, 'SUB_INV_') : p.subinventory_code
                  }))
                }}
                onBlur={() => v.handleBlur('subinventory_name', formData)}
                error={v.fieldError('subinventory_name')}
                disabled={!formData.inv_org_id || view === 'view'}
              />
            </Field>

            <Field label="Subinventory Code" required error={v.fieldError('subinventory_code')}>
              <Input value={formData.subinventory_code} 
                onChange={e => setField('subinventory_code', e.target.value)} 
                onBlur={() => v.handleBlur('subinventory_code', formData)}
                error={v.fieldError('subinventory_code')}
                disabled={!formData.inv_org_id || view === 'view'}
              />
            </Field>

            <Field label="Zone" required error={v.fieldError('zone_id')}>
              <Select value={formData.zone_id} 
                onChange={v_val => setField('zone_id', v_val)} 
                onBlur={() => v.handleBlur('zone_id', formData)}
                options={dropdowns.zone?.map(r=>({value:r.zone_id, label:r.zone_name||r.zone_id}))} 
                disabled={!formData.inv_org_id || view === 'view'}
              />
            </Field>

            <Field label="Material Status" required error={v.fieldError('material_status')}>
              <Select value={formData.material_status} 
                onChange={v_val => setField('material_status', v_val)} 
                options={[
                  { value: 'AVAILABLE', label: 'Available' },
                  { value: 'BLOCKED', label: 'Blocked' },
                  { value: 'QUARANTINE', label: 'Quarantine' },
                  { value: 'DAMAGED', label: 'Damaged' },
                  { value: 'HOLD', label: 'Hold' }
                ]} 
                disabled={view === 'view'}
              />
            </Field>

            <Field label="Max Capacity Kg" required error={v.fieldError('max_capacity_kg')}>
              <Input type="number" value={formData.max_capacity_kg} 
                onChange={e => setField('max_capacity_kg', e.target.value)} 
                onBlur={() => v.handleBlur('max_capacity_kg', formData)}
                error={v.fieldError('max_capacity_kg')}
              />
            </Field>

            <Field label="Current Utilization Pct" error={v.fieldError('current_utilization_pct')}>
              <Input type="number" value={formData.current_utilization_pct} 
                onChange={e => setField('current_utilization_pct', e.target.value)} 
                onBlur={() => v.handleBlur('current_utilization_pct', formData)}
                error={v.fieldError('current_utilization_pct')}
              />
            </Field>

            <Field label="Description"><textarea className="input" disabled={view==='view'} rows={3} value={formData.description||''} onChange={e => setField('description',e.target.value)} /></Field>
            
            <Field label="Active"><Toggle value={formData.active_flag} onChange={v => setField('active_flag',v)} /></Field>
            
            <Field label="Effective From" required error={v.fieldError('effective_from')}>
              <DateInput value={formData.effective_from} 
                onChange={v_val => setField('effective_from', v_val)} 
                onBlur={() => v.handleBlur('effective_from', formData)}
                error={v.fieldError('effective_from')}
              />
            </Field>

            <Field label="Effective To" error={v.fieldError('effective_to')}>
              <DateInput value={formData.effective_to} 
                onChange={v_val => setField('effective_to', v_val)} 
                onBlur={() => v.handleBlur('effective_to', formData)}
                error={v.fieldError('effective_to')}
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
        title="Subinventory"
        subtitle="Manage Subinventory records"
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
