import React, { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
import { useTableData, useDropdownData } from '../hooks/useTableData'
import { CompanyGroup } from '../components/CompanyGroup'
import { DataTable, StatusBadge, Toggle, Select, DateInput, Field, FormPage, ConfirmDialog, Input, AuditFields } from '../components/ui/index'
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
  { key: 'uom_id', label: 'Uom Id' },
  { key: 'COMPANY_id', label: 'Company Id' },
  { key: 'business_type_id', label: 'Business Type Id' },
  { key: 'bg_id', label: 'Bg Id' },
  { key: 'uom_type_id', label: 'Uom Type Id' },
  { key: 'uom_code', label: 'Uom Code' },
  { key: 'uom_name', label: 'Uom Name' }
]

export default function UomPage() {
  const navigate = useNavigate()
  const table = useTableData(uomApi, 'uom')
  const v = useFormValidation('uom')
  const [view, setView] = useState('list') // 'list' | 'create' | 'edit' | 'view'
  const [selected, setSelected] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [formData, setFormData] = useState({})
  const existingCodes = table.rows.map(r => r.uom_code)

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

  const setField = (k, val) => {
    setFormData(p => {
      const next = { ...p, [k]: val }
      if (k === 'uom_name') {
        next.uom_code = autoCode(val, 'UOM_', existingCodes)
      }
      return next
    })
    v.clearError(k)
  }

  const handleCreate = () => {
    setFormData({ 
      active_flag: 'Y', 
      effective_from: new Date().toISOString().split('T')[0],
      module_id: 'MOD01',
      decimal_precision: 0,
      base_uom_flag: 'N'
    })
    v.reset(); setView('create')
  }
  const handleEdit = (row) => { setSelected(row); setFormData({ ...row }); v.reset(); setView('edit') }
  const handleView = (row) => { setSelected(row); setFormData({ ...row }); v.reset(); setView('view') }
  const handleBack = () => { setView('list'); setSelected(null); v.reset() }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!v.runValidation(formData)) return toast.error('Please fix the highlighted errors')
    try {
      if (view === 'edit') await table.update(selected['uom_id'], formData)
      else await table.create(formData)
      handleBack()
    } catch { }
  }

  const handleDelete = async () => {
    await table.remove(confirmDelete['uom_id'])
    setConfirmDelete(null)
  }

  if (view !== 'list') {
    return (
      <FormPage title={view==='view'?`View UOM`:view==='edit'?`Edit UOM`:`New UOM`}
        onBack={handleBack} onSubmit={handleSubmit} loading={table.isCreating||table.isUpdating} mode={view}>
        {v.hasErrors && (
          <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-400 text-sm font-medium">
            ⚠️ Please fix the highlighted errors below before submitting.
          </div>
        )}

        <div className="card p-6 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Field label="Uom Id (Auto-gen)"><Input value={formData.uom_id} readOnly /></Field>
            <CompanyGroup formData={formData} setField={setField} errors={v.errors} handleBlur={v.handleBlur} />

            <Field label="UOM Type" required error={v.fieldError('uom_type_id')}>
              <Select value={formData.uom_type_id} 
                onChange={v => setField('uom_type_id', v)} 
                onBlur={() => v.handleBlur('uom_type_id', formData)}
                error={v.fieldError('uom_type_id')}
                options={dropdowns.uomType?.map(r => ({ value: r.uom_type_id, label: r.uom_type_name || r.uom_type_id }))} />
            </Field>

            <Field label="Uom Name" required error={v.fieldError('uom_name')}>
              <Input value={formData.uom_name} 
                onChange={e => setField('uom_name', e.target.value)}
                onBlur={() => v.handleBlur('uom_name', formData)}
                error={v.fieldError('uom_name')} />
            </Field>

            <Field label="Uom Code" required error={v.fieldError('uom_code')}>
              <Input value={formData.uom_code} 
                readOnly
                onBlur={() => v.handleBlur('uom_code', formData)}
                error={v.fieldError('uom_code')}
                placeholder="Auto-generated from name" />
            </Field>

            <Field label="Base Uom Flag"><Toggle value={formData.base_uom_flag} onChange={v => setField('base_uom_flag', v)} /></Field>

            <Field label="Decimal Precision" required error={v.fieldError('decimal_precision')}>
              <Input type="number" step="1" min="0" max="6" value={formData.decimal_precision} 
                onChange={e => setField('decimal_precision', e.target.value)}
                onBlur={() => v.handleBlur('decimal_precision', formData)}
                error={v.fieldError('decimal_precision')} />
            </Field>

            <Field label="Active"><Toggle value={formData.active_flag} onChange={v => setField('active_flag', v)} /></Field>

            <Field label="Effective From" required error={v.fieldError('effective_from')}>
              <DateInput value={formData.effective_from} 
                onChange={v => setField('effective_from', v)}
                onBlur={() => v.handleBlur('effective_from', formData)}
                error={v.fieldError('effective_from')} />
            </Field>

            <Field label="Effective To" error={v.fieldError('effective_to')}>
              <DateInput value={formData.effective_to} 
                onChange={v => setField('effective_to', v)}
                onBlur={() => v.handleBlur('effective_to', formData)}
                error={v.fieldError('effective_to')} />
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
        title="UOM"
        subtitle="Manage UOM records"
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
