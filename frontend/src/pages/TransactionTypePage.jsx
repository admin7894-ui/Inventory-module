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
  inventoryTransactionApi, stockLedgerApi
} from '../services/api'
import { validate, autoCode } from '../validations/validationEngine'
import { ErrorBanner } from '../components/ui/index'

const COLUMNS = [
  { key: 'txn_type_id', label: 'Txn Type Id' },
  { key: 'COMPANY_id', label: 'Company Id' },
  { key: 'business_type_id', label: 'Business Type Id' },
  { key: 'bg_id', label: 'Bg Id' },
  { key: 'txn_type_code', label: 'Txn Type Code' },
  { key: 'txn_type_name', label: 'Txn Type Name' },
  { key: 'txn_action', label: 'Txn Action' }
]

const TXN_CATEGORIES = ['OPENING', 'ADJUSTMENT', 'TRANSFER', 'PURCHASE', 'SALES', 'SYSTEM'];

export default function TransactionTypePage() {
  const navigate = useNavigate()
  const table = useTableData(transactionTypeApi, 'transaction_type')
  const [view, setView] = useState('list') // 'list' | 'create' | 'edit' | 'view'
  const [selected, setSelected] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [formData, setFormData] = useState({})
  const [errors, setErrors] = useState({})
  const [isUsed, setIsUsed] = useState(false)

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

  const { rows: allTransactions } = useTableData(inventoryTransactionApi, 'inventory_transaction')
  const { rows: allLedgers } = useTableData(stockLedgerApi, 'stock_ledger')

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

  useEffect(() => {
    if (view === 'edit' && selected) {
      const used = (allTransactions || []).some(t => t.txn_type_id === selected.txn_type_id) ||
                   (allLedgers || []).some(l => l.txn_type_id === selected.txn_type_id);
      setIsUsed(used);
    } else {
      setIsUsed(false);
    }
  }, [view, selected, allTransactions, allLedgers]);

  const validateField = (k, v) => {
    const val = typeof v === 'string' ? v.trim() : v;
    const { errors: newErrors } = validate('transaction_type', { ...formData, [k]: val });
    setErrors(prev => ({ ...prev, [k]: newErrors[k] }));
  }

  const setField = (k, v) => {
    setFormData(p => {
      const next = { ...p, [k]: v };
      if (k === 'txn_type_name' && view === 'create') {
        next.txn_type_code = autoCode(v, 'TXN_TYPE_');
      }
      return next;
    });
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
    const { errors: valErrors, isValid } = validate('transaction_type', trimmedData);
    
    if (!isValid) {
        setErrors(valErrors);
        setTimeout(() => { document.querySelector('.input-error')?.scrollIntoView({ behavior: 'smooth', block: 'center' }) }, 80);
        return toast.error('Please fix the highlighted errors');
      }

    try {
      if (view === 'edit') {
        await table.update(selected['txn_type_id'], formData)
      } else {
        await table.create(formData)
      }
      handleBack()
    } catch (err) {
      console.error('Submission error:', err);
      if (err.response?.data?.errors) {
        setErrors(err.response.data.errors);
      } else {
        toast.error(err.response?.data?.message || 'Save failed');
      }
    }
  }

  const handleDelete = async () => {
    await table.remove(confirmDelete['txn_type_id'])
    setConfirmDelete(null)
  }

  if (view !== 'list') {
    return (
      <FormPage title={view==='view'?`View Transaction Type`:view==='edit'?`Edit Transaction Type`:`New Transaction Type`}
        onBack={handleBack} onSubmit={handleSubmit} loading={table.isCreating||table.isUpdating} mode={view}>
        <ErrorBanner message={Object.keys(errors).length > 0 ? "Please fix the highlighted errors" : null} />
        <div className="card p-6 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <Field label="Txn Type Id (Auto-gen)"><Input value={formData.txn_type_id} readOnly /></Field>
      <CompanyGroup formData={formData} setField={setField} errors={errors} handleBlur={validateField} />

      <Field label="Txn Type Code" required error={errors.txn_type_code}><Input value={formData.txn_type_code} readOnly className="bg-gray-50" /></Field>
      <Field label="Txn Type Name" required error={errors.txn_type_name}><Input value={formData.txn_type_name} onChange={e => setField('txn_type_name',e.target.value)} onBlur={() => validateField('txn_type_name', formData.txn_type_name)} /></Field>
      <Field label="Transaction Action" required error={errors.txn_action}><Select value={formData.txn_action} onChange={v => setField('txn_action',v)} onBlur={() => validateField('txn_action', formData.txn_action)} options={["IN","OUT","TRANSFER","ADJUSTMENT"]} /></Field>
      <Field label="Txn Category" required error={errors.txn_category}>
        <Select 
          value={formData.txn_category} 
          onChange={v => setField('txn_category',v)} 
          options={TXN_CATEGORIES} 
          disabled={view === 'edit' && isUsed}
          error={errors.txn_category}
        />
        {isUsed && view === 'edit' && <p className="text-xs text-amber-600 mt-1">Cannot change category: record is used in transactions</p>}
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
        title="Transaction Type"
        subtitle="Manage Transaction Type records"
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

