import React, { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
import { useTableData, useDropdownData } from '../hooks/useTableData'
import { validate, autoCode } from '../validations/validationEngine'
import { useFormValidation } from '../validations/useFormValidation'
import { CompanyGroup } from '../components/CompanyGroup'
import { DataTable, StatusBadge, Toggle, Select, DateInput, Field, FormPage, ConfirmDialog, Input, AuditFields } from '../components/ui/index'

import {
  locationApi, moduleApi, legalEntityApi, operatingUnitApi, inventoryOrgApi
} from '../services/api'

const COLUMNS = [
  { key: 'inv_org_id', label: 'Inv Org Id' },
  { key: 'inv_org_name', label: 'Inv Org Name' },
  { key: 'inv_org_code', label: 'Inv Org Code' },
  { key: 'le_id', label: 'Le Id' },
  { key: 'location_id', label: 'Location' },
  { key: 'active_flag', label: 'Status', type: 'badge' }
]

export default function InventoryOrgPage() {
  const navigate = useNavigate()
  const table = useTableData(inventoryOrgApi, 'inventory_org')
  const v = useFormValidation('inventory_org')
  const [view, setView] = useState('list')
  const [selected, setSelected] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [formData, setFormData] = useState({})
  const [codeEdited, setCodeEdited] = useState(false)

  const { options: locations }      = useDropdownData(locationApi, 'loc_dd')
  const { options: modules }        = useDropdownData(moduleApi, 'mod_dd')
  const { options: legalEntities }  = useDropdownData(legalEntityApi, 'le_dd')

  const existingCodes = table.rows.map(r => r.inv_org_code)
  const setField = (k, val) => {
    setFormData(p => {
      const next = { ...p, [k]: val }
      if (k === 'inv_org_name') {
        next.inv_org_code = autoCode(val, 'INV_', existingCodes)
      }
      return next
    })
    v.clearError(k)
  }

  const handleCreate = () => {
    setFormData({ active_flag: 'Y', effective_from: new Date().toISOString().split('T')[0] })
    setCodeEdited(false); v.reset(); setView('create')
  }
  const handleEdit = (row) => { setSelected(row); setFormData({ ...row }); setCodeEdited(true); v.reset(); setView('edit') }
  const handleView = (row) => { setSelected(row); setFormData({ ...row }); v.reset(); setView('view') }
  const handleBack = () => { setView('list'); setSelected(null); v.reset() }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!v.runValidation(formData)) return toast.error('Please fix the highlighted errors')
    try {
      if (view === 'edit') await table.update(selected['inv_org_id'], formData)
      else await table.create(formData)
      handleBack()
    } catch {}
  }

  const handleDelete = async () => {
    await table.remove(confirmDelete['inv_org_id'])
    setConfirmDelete(null)
  }

  if (view !== 'list') {
    return (
      <FormPage title={view==='view'?'View Inventory Org':view==='edit'?'Edit Inventory Org':'New Inventory Org'}
        onBack={handleBack} onSubmit={handleSubmit} loading={table.isCreating||table.isUpdating} mode={view}>

        {v.hasErrors && (
          <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-400 text-sm font-medium">
            ⚠️ Please fix the highlighted errors below before submitting.
          </div>
        )}

        <div className="card p-6 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Field label="Inv Org Id (Auto-gen)"><Input value={formData.inv_org_id} readOnly /></Field>

            <CompanyGroup formData={formData} setField={setField} errors={v.errors}
              handleBlur={(k) => v.handleBlur(k, formData)} />

            <Field label="Legal Entity" required error={v.fieldError('le_id')}>
              <Select value={formData.le_id} onChange={val => setField('le_id', val)}
                onBlur={() => v.handleBlur('le_id', formData)}
                error={v.fieldError('le_id')}
                options={legalEntities?.map(r => ({ value: r.le_id, label: r.le_name || r.le_id }))} />
            </Field>

            <Field label="Inv Org Name" required error={v.fieldError('inv_org_name')}>
              <Input value={formData.inv_org_name}
                onChange={e => setField('inv_org_name', e.target.value)}
                onBlur={() => v.handleBlur('inv_org_name', formData)}
                error={v.fieldError('inv_org_name')} />
            </Field>

            <Field label="Inv Org Code" required error={v.fieldError('inv_org_code')}>
              <Input value={formData.inv_org_code}
                readOnly
                onBlur={() => v.handleBlur('inv_org_code', formData)}
                error={v.fieldError('inv_org_code')}
                placeholder="Auto-generated from name" />
            </Field>

            <Field label="Location" required error={v.fieldError('location_id')}>
              <Select value={formData.location_id} onChange={val => setField('location_id', val)}
                onBlur={() => v.handleBlur('location_id', formData)}
                error={v.fieldError('location_id')}
                options={locations?.map(r => ({ value: r.location_id, label: r.location_name || r.location_id }))} />
            </Field>

            <Field label="Module" required error={v.fieldError('module_id')}>
              <Select value={formData.module_id} onChange={val => setField('module_id', val)}
                onBlur={() => v.handleBlur('module_id', formData)}
                error={v.fieldError('module_id')}
                options={modules?.map(r => ({ value: r.module_id, label: r.module_name || r.module_id }))} />
            </Field>

            <Field label="Active"><Toggle value={formData.active_flag} onChange={val => setField('active_flag', val)} /></Field>

            <Field label="Effective From" required error={v.fieldError('effective_from')}>
              <DateInput value={formData.effective_from}
                onChange={val => setField('effective_from', val)}
                onBlur={() => v.handleBlur('effective_from', formData)}
                error={v.fieldError('effective_from')} />
            </Field>

            <Field label="Effective To" error={v.fieldError('effective_to')}>
              <DateInput value={formData.effective_to}
                onChange={val => setField('effective_to', val)}
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
        title="Inventory Org"
        subtitle="Manage Inventory Org records"
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
        message={`Delete "${confirmDelete?.inv_org_name}"? This cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
        loading={table.isDeleting}
      />
    </>
  )
}
