import React, { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
import { useTableData, useDropdownData } from '../hooks/useTableData'
import { CompanyGroup } from '../components/CompanyGroup'
import { DataTable, StatusBadge, Toggle, Select, DateInput, Field, FormPage, ConfirmDialog, Input, AuditFields } from '../components/ui/index'
import { useFormValidation } from '../validations/useFormValidation'
import { shipNetworkApi } from '../services/api'
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
  { key: 'ship_network_id', label: 'Ship Network Id' },
  { key: 'COMPANY_id', label: 'Company Id' },
  { key: 'from_inv_org_id', label: 'From Inv Org Id' },
  { key: 'to_inv_org_id', label: 'To Inv Org Id' },
  { key: 'transfer_type', label: 'Transfer Type' },
  { key: 'default_ship_method_id', label: 'Default Ship Method Id' },
  { key: 'intransit_lead_time_days', label: 'Intransit Lead Time Days' }
]

export default function ShipNetworkPage() {
  const navigate = useNavigate()
  const table = useTableData(shipNetworkApi, 'ship_network')
  const v = useFormValidation('ship_network')
  const [view, setView] = useState('list') // 'list' | 'create' | 'edit' | 'view'
  const [selected, setSelected] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [formData, setFormData] = useState({})

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
    v.clearError(k)
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
  const handleBack = () => { setView('list'); setSelected(null); v.reset() }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!v.runValidation(formData)) return toast.error('Please fix the highlighted errors')
    try {
      if (view === 'edit') await table.update(selected['ship_network_id'], formData)
      else await table.create(formData)
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
    await table.remove(confirmDelete['ship_network_id'])
    setConfirmDelete(null)
  }
  if (view !== 'list') {
    return (
      <FormPage title={view === 'view' ? `View Ship Network` : view === 'edit' ? `Edit Ship Network` : `New Ship Network`}
        onBack={handleBack} onSubmit={handleSubmit} loading={table.isCreating || table.isUpdating} mode={view}>
        {v.hasErrors && (
          <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-400 text-sm font-medium">
            ⚠️ Please fix the highlighted errors below before submitting.
          </div>
        )}

        <div className="card p-6 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Field label="Ship Network Id (Auto-gen)"><Input value={formData.ship_network_id} readOnly /></Field>
            <CompanyGroup formData={formData} setField={setField} errors={v.errors} handleBlur={v.handleBlur} />
            
            <Field label="From Inv Org" required error={v.errors.from_inv_org_id}>
              <Select value={formData.from_inv_org_id} 
                onChange={v => setField('from_inv_org_id', v)} 
                onBlur={() => v.handleBlur('from_inv_org_id', formData)}
                error={v.errors.from_inv_org_id}
                options={dropdowns.inventoryOrg?.map(r => ({ value: r.inv_org_id, label: r.inv_org_name || r.inv_org_id }))} />
            </Field>

            <Field label="To Inv Org" required error={v.errors.to_inv_org_id}>
              <Select value={formData.to_inv_org_id} 
                onChange={v => setField('to_inv_org_id', v)} 
                onBlur={() => v.handleBlur('to_inv_org_id', formData)}
                error={v.errors.to_inv_org_id}
                options={dropdowns.inventoryOrg?.map(r => ({ value: r.inv_org_id, label: r.inv_org_name || r.inv_org_id }))} />
            </Field>

            <Field label="Transfer Type" required error={v.errors.transfer_type}>
              <Input value={formData.transfer_type} 
                onChange={e => setField('transfer_type', e.target.value)}
                onBlur={() => v.handleBlur('transfer_type', formData)}
                error={v.errors.transfer_type} />
            </Field>

            <Field label="Default Ship Method" required error={v.errors.default_ship_method_id}>
              <Select value={formData.default_ship_method_id} 
                onChange={v => setField('default_ship_method_id', v)} 
                onBlur={() => v.handleBlur('default_ship_method_id', formData)}
                error={v.errors.default_ship_method_id}
                options={dropdowns.shipMethod?.map(r => ({ value: r.ship_method_id, label: r.ship_method_name || r.ship_method_id }))} />
            </Field>

            <Field label="Intransit Lead Time Days" required error={v.errors.intransit_lead_time_days}>
              <Input type="number" value={formData.intransit_lead_time_days} 
                onChange={e => setField('intransit_lead_time_days', e.target.value)}
                onBlur={() => v.handleBlur('intransit_lead_time_days', formData)}
                error={v.errors.intransit_lead_time_days} />
            </Field>

            <Field label="Active"><Toggle value={formData.active_flag} onChange={v => setField('active_flag', v)} /></Field>
            
            <Field label="Effective From" required error={v.errors.effective_from}>
              <DateInput value={formData.effective_from} 
                onChange={v => setField('effective_from', v)}
                onBlur={() => v.handleBlur('effective_from', formData)}
                error={v.errors.effective_from} />
            </Field>

            <Field label="Effective To" error={v.errors.effective_to}>
              <DateInput value={formData.effective_to} 
                onChange={v => setField('effective_to', v)}
                onBlur={() => v.handleBlur('effective_to', formData)}
                error={v.errors.effective_to} />
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
        title="Ship Network"
        subtitle="Manage Ship Network records"
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
        message={`Delete "${confirmDelete?.['ship_network_id']}"? This cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
        loading={table.isDeleting}
      />
    </>
  )
}


