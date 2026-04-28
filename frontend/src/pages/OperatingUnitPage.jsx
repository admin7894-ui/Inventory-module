import React, { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
import { useTableData, useDropdownData } from '../hooks/useTableData'
import { validate, generateOUShortCode } from '../validations/validationEngine'
import { CompanyGroup } from '../components/CompanyGroup'
import { DataTable, StatusBadge, Toggle, Select, DateInput, Field, FormPage, ConfirmDialog, Input, AuditFields } from '../components/ui/index'

import {
  locationApi, moduleApi, legalEntityApi, operatingUnitApi,
} from '../services/api'

const COLUMNS = [
  { key: 'op_id', label: 'Op Id' },
  { key: 'ou_name', label: 'OU Name' },
  { key: 'ou_short_code', label: 'Short Code' },
  { key: 'le_id', label: 'Legal Entity' },
  { key: 'currency_code', label: 'Currency' },
  { key: 'active_flag', label: 'Status', type: 'badge' }
]

export default function OperatingUnitPage() {
  const navigate = useNavigate()
  const table = useTableData(operatingUnitApi, 'operating_unit')
  const [view, setView] = useState('list')
  const [selected, setSelected] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [formData, setFormData] = useState({})
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})

  // Dropdowns — only load what's needed
  const { options: locations }      = useDropdownData(locationApi, 'loc_dd')
  const { options: modules }        = useDropdownData(moduleApi, 'mod_dd')
  const { options: legalEntities }  = useDropdownData(legalEntityApi, 'le_dd')

  const setField = (k, v) => {
    setFormData(p => {
      const next = { ...p, [k]: v }
      // Auto-generate OU Short Code when OU Name changes
      if (k === 'ou_name') {
        next.ou_short_code = generateOUShortCode(v)
      }
      return next
    })
    if (errors[k]) {
      setErrors(p => { const n = { ...p }; delete n[k]; return n })
    }
  }

  const handleBlur = (k) => {
    setTouched(p => ({ ...p, [k]: true }))
    const { errors: valErrors } = validateOperatingUnit(formData)
    setErrors(valErrors)
  }

  const handleCreate = () => {
    setFormData({ active_flag: 'Y', effective_from: new Date().toISOString().split('T')[0] })
    setErrors({})
    setTouched({})
    setView('create')
  }
  const handleEdit = (row) => { setSelected(row); setFormData({ ...row }); setErrors({}); setTouched({}); setView('edit') }
  const handleView = (row) => { setSelected(row); setFormData({ ...row }); setErrors({}); setTouched({}); setView('view') }
  const handleBack = () => { setView('list'); setSelected(null); setErrors({}); setTouched({}) }

  const handleSubmit = async (e) => {
    e.preventDefault()

    const { errors: valErrors, isValid } = validate('operating_unit', formData)
    setErrors(valErrors)
    // Mark all fields as touched
    setTouched(Object.keys(formData).reduce((acc, key) => ({ ...acc, [key]: true }), {}))

    if (!isValid) {
      return toast.error('Please fix the highlighted errors')
    }

    try {
      if (view === 'edit') {
        await table.update(selected['op_id'], formData)
      } else {
        await table.create(formData)
      }
      handleBack()
    } catch {}
  }

  const handleDelete = async () => {
    await table.remove(confirmDelete['op_id'])
    setConfirmDelete(null)
  }

  if (view !== 'list') {
    return (
      <FormPage title={view==='view'?`View Operating Unit`:view==='edit'?`Edit Operating Unit`:`New Operating Unit`}
        onBack={handleBack} onSubmit={handleSubmit} loading={table.isCreating||table.isUpdating} mode={view}>

        {/* Top error banner */}
        {Object.keys(errors).length > 0 && Object.keys(touched).length > 0 && (
          <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-400 text-sm font-medium">
            ⚠️ Please fix the highlighted errors below before submitting.
          </div>
        )}

        <div className="card p-6 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Field label="Op Id (Auto-gen)"><Input value={formData.op_id} readOnly /></Field>

            <CompanyGroup formData={formData} setField={setField} errors={errors} handleBlur={handleBlur} />

            <Field label="Legal Entity" required error={touched.le_id && errors.le_id}>
              <Select value={formData.le_id} onChange={v => setField('le_id', v)}
                onBlur={() => handleBlur('le_id')}
                error={touched.le_id && errors.le_id}
                options={legalEntities?.map(r => ({ value: r.le_id, label: r.le_name || r.le_id }))} />
            </Field>

            <Field label="OU Name" required error={touched.ou_name && errors.ou_name}>
              <Input value={formData.ou_name}
                onChange={e => setField('ou_name', e.target.value)}
                onBlur={() => handleBlur('ou_name')}
                error={touched.ou_name && errors.ou_name} />
            </Field>

            <Field label="OU Short Code" required error={touched.ou_short_code && errors.ou_short_code}>
              <Input value={formData.ou_short_code}
                onChange={e => setField('ou_short_code', e.target.value)}
                onBlur={() => handleBlur('ou_short_code')}
                error={touched.ou_short_code && errors.ou_short_code}
                className="bg-gray-50 dark:bg-gray-700 font-mono" />
              <span className="text-xs text-gray-400 mt-1 block">Auto-generated from OU Name (editable)</span>
            </Field>

            <Field label="Location" required error={touched.location_id && errors.location_id}>
              <Select value={formData.location_id} onChange={v => setField('location_id', v)}
                onBlur={() => handleBlur('location_id')}
                error={touched.location_id && errors.location_id}
                options={locations?.map(r => ({ value: r.location_id, label: r.location_name || r.location_id }))} />
            </Field>

            <Field label="Currency Code" required error={touched.currency_code && errors.currency_code}>
              <Input value={formData.currency_code}
                onChange={e => setField('currency_code', e.target.value.toUpperCase())}
                onBlur={() => handleBlur('currency_code')}
                error={touched.currency_code && errors.currency_code}
                placeholder="e.g. INR" maxLength={3} />
            </Field>

            <Field label="Module" required error={touched.module_id && errors.module_id}>
              <Select value={formData.module_id} onChange={v => setField('module_id', v)}
                onBlur={() => handleBlur('module_id')}
                error={touched.module_id && errors.module_id}
                options={modules?.map(r => ({ value: r.module_id, label: r.module_name || r.module_id }))} />
            </Field>

            <Field label="Active" required error={touched.active_flag && errors.active_flag}>
              <Toggle value={formData.active_flag} onChange={v => setField('active_flag', v)} />
            </Field>

            <Field label="Effective From" required error={touched.effective_from && errors.effective_from}>
              <DateInput value={formData.effective_from}
                onChange={v => setField('effective_from', v)}
                onBlur={() => handleBlur('effective_from')}
                error={touched.effective_from && errors.effective_from} />
            </Field>

            <Field label="Effective To" error={touched.effective_to && errors.effective_to}>
              <DateInput value={formData.effective_to}
                onChange={v => setField('effective_to', v)}
                onBlur={() => handleBlur('effective_to')}
                error={touched.effective_to && errors.effective_to} />
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
        title="Operating Unit"
        subtitle="Manage Operating Unit records"
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
        message={`Delete "${confirmDelete?.ou_name}"? This cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
        loading={table.isDeleting}
      />
    </>
  )
}
