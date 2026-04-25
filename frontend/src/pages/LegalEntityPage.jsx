import React, { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
import { useTableData, useDropdownData } from '../hooks/useTableData'
import { validateLegalEntity } from '../validations/legalEntityValidation'
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
  { key: 'le_id', label: 'Le Id' },
  { key: 'COMPANY_id', label: 'Company Id' },
  { key: 'bg_id', label: 'Bg Id' },
  { key: 'business_type_id', label: 'Business Type Id' },
  { key: 'le_name', label: 'Le Name' },
  { key: 'tax_registration_no', label: 'Tax Registration No' },
  { key: 'location_id', label: 'Location Id' }
]

export default function LegalEntityPage() {
  const navigate = useNavigate()
  const table = useTableData(legalEntityApi, 'legal_entity')
  const [view, setView] = useState('list') // 'list' | 'create' | 'edit' | 'view'
  const [selected, setSelected] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [formData, setFormData] = useState({})
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})

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
    setFormData(p => ({ ...p, [k]: v }))
    if (errors[k]) {
      setErrors(p => {
        const newErrors = { ...p }
        delete newErrors[k]
        return newErrors
      })
    }
  }

  const handleBlur = (k) => {
    setTouched(p => ({ ...p, [k]: true }))
    const { errors: valErrors } = validateLegalEntity(formData)
    setErrors(valErrors)
  }

  const handleCreate = () => {
    setFormData({ active_flag:'Y', effective_from:new Date().toISOString().split('T')[0] })
    setErrors({})
    setTouched({})
    setView('create')
  }
  const handleEdit = (row) => { 
    setSelected(row); 
    setFormData({ ...row }); 
    setErrors({});
    setTouched({});
    setView('edit') 
  }
  const handleView = (row) => { 
    setSelected(row); 
    setFormData({ ...row }); 
    setErrors({});
    setTouched({});
    setView('view') 
  }
  const handleBack = () => { setView('list'); setSelected(null) }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    const { errors: valErrors, isValid } = validateLegalEntity(formData)
    setErrors(valErrors)
    setTouched(Object.keys(formData).reduce((acc, key) => ({ ...acc, [key]: true }), {}))

    if (!isValid) {
      return toast.error('Please fix the highlighted errors')
    }

    try {
      if (view === 'edit') {
        await table.update(selected['le_id'], formData)
      } else {
        await table.create(formData)
      }
      handleBack()
    } catch {}
  }

  const handleDelete = async () => {
    await table.remove(confirmDelete['le_id'])
    setConfirmDelete(null)
  }

  if (view !== 'list') {
    return (
      <FormPage title={view==='view'?`View Legal Entity`:view==='edit'?`Edit Legal Entity`:`New Legal Entity`}
        onBack={handleBack} onSubmit={handleSubmit} loading={table.isCreating||table.isUpdating} mode={view}>
        <div className="card p-6 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <Field label="Le Id (Auto-gen)"><Input value={formData.le_id} readOnly /></Field>
      <CompanyGroup formData={formData} setField={setField} errors={errors} handleBlur={handleBlur} />

      <Field label="Le Name" required error={touched.le_name && errors.le_name}>
        <Input 
          value={formData.le_name} 
          onChange={e => setField('le_name',e.target.value)} 
          onBlur={() => handleBlur('le_name')}
          error={touched.le_name && errors.le_name}
        />
      </Field>
      <Field label="Tax Registration No" required error={touched.tax_registration_no && errors.tax_registration_no}>
        <Input 
          value={formData.tax_registration_no} 
          onChange={e => setField('tax_registration_no',e.target.value)} 
          onBlur={() => handleBlur('tax_registration_no')}
          error={touched.tax_registration_no && errors.tax_registration_no}
        />
      </Field>
      <Field label="Location" required error={touched.location_id && errors.location_id}>
        <Select 
          value={formData.location_id} 
          onChange={v => setField('location_id',v)} 
          onBlur={() => handleBlur('location_id')}
          error={touched.location_id && errors.location_id}
          options={dropdowns.location?.map(r=>{return{value:r.location_id,label:r.location_name||r.location_id}})} 
        />
      </Field>
      <Field label="Currency Code" required error={touched.currency_code && errors.currency_code}>
        <Input 
          value={formData.currency_code} 
          onChange={e => setField('currency_code',e.target.value)} 
          onBlur={() => handleBlur('currency_code')}
          error={touched.currency_code && errors.currency_code}
        />
      </Field>
      <Field label="Module" required error={touched.module_id && errors.module_id}>
        <Select 
          value={formData.module_id} 
          onChange={v => setField('module_id',v)} 
          onBlur={() => handleBlur('module_id')}
          error={touched.module_id && errors.module_id}
          options={dropdowns.module?.map(r=>{return{value:r.module_id,label:r.module_name||r.module_id}})} 
        />
      </Field>
      <Field label="Active" required error={touched.active_flag && errors.active_flag}>
        <Toggle value={formData.active_flag} onChange={v => setField('active_flag',v)} />
      </Field>
      <Field label="Effective From" required error={touched.effective_from && errors.effective_from}>
        <DateInput 
          value={formData.effective_from} 
          onChange={v => setField('effective_from',v)} 
          onBlur={() => handleBlur('effective_from')}
          error={touched.effective_from && errors.effective_from}
        />
      </Field>
      <Field label="Effective To" error={touched.effective_to && errors.effective_to}>
        <DateInput 
          value={formData.effective_to} 
          onChange={v => setField('effective_to',v)} 
          onBlur={() => handleBlur('effective_to')}
          error={touched.effective_to && errors.effective_to}
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
        title="Legal Entity"
        subtitle="Manage Legal Entity records"
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
