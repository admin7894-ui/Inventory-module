import React, { useState } from 'react'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
import { useTableData, useDropdownData } from '../hooks/useTableData'
import { validate, autoCode } from '../validations/validationEngine'
import { useFormValidation } from '../validations/useFormValidation'
import { CompanyGroup } from '../components/CompanyGroup'
import { DataTable, Toggle, Select, DateInput, Field, FormPage, ConfirmDialog, Input, AuditFields } from '../components/ui/index'
import { costMethodApi, moduleApi } from '../services/api'

const COLUMNS = [
  { key: 'cost_method_id', label: 'Cost Method Id' },
  { key: 'cost_method_code', label: 'Code' },
  { key: 'cost_method_name', label: 'Name' },
  { key: 'description', label: 'Description' },
  { key: 'active_flag', label: 'Status', type: 'badge' }
]

export default function CostMethodPage() {
  const navigate = useNavigate()
  const table = useTableData(costMethodApi, 'cost_method')
  const v = useFormValidation('cost_method')
  const [view, setView] = useState('list')
  const [selected, setSelected] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [formData, setFormData] = useState({})
  const [codeEdited, setCodeEdited] = useState(false)

  const { options: modules } = useDropdownData(moduleApi, 'mod_dd')

  const existingCodes = table.rows.map(r => r.cost_method_code)
  const setField = (k, val) => {
    setFormData(p => {
      const next = { ...p, [k]: val }
      // Auto-generate code from name
      if (k === 'cost_method_name') {
        next.cost_method_code = autoCode(val, 'CM_', existingCodes)
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
      if (view === 'edit') await table.update(selected['cost_method_id'], formData)
      else await table.create(formData)
      handleBack()
    } catch {}
  }

  const handleDelete = async () => { await table.remove(confirmDelete['cost_method_id']); setConfirmDelete(null) }

  if (view !== 'list') {
    return (
      <FormPage title={view==='view'?'View Cost Method':view==='edit'?'Edit Cost Method':'New Cost Method'}
        onBack={handleBack} onSubmit={handleSubmit} loading={table.isCreating||table.isUpdating} mode={view}>

        {v.hasErrors && (
          <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-400 text-sm font-medium">
            ⚠️ Please fix the highlighted errors below before submitting.
          </div>
        )}

        <div className="card p-6 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Field label="Cost Method Id (Auto-gen)"><Input value={formData.cost_method_id} readOnly /></Field>

            <CompanyGroup formData={formData} setField={setField} errors={v.errors}
              handleBlur={(k) => v.handleBlur(k, formData)} />

            <Field label="Cost Method Name" required error={v.fieldError('cost_method_name')}>
              <Input value={formData.cost_method_name}
                onChange={e => setField('cost_method_name', e.target.value)}
                onBlur={() => v.handleBlur('cost_method_name', formData)}
                error={v.fieldError('cost_method_name')} />
            </Field>

            <Field label="Cost Method Code" required error={v.fieldError('cost_method_code')}>
              <Input value={formData.cost_method_code}
                readOnly
                onBlur={() => v.handleBlur('cost_method_code', formData)}
                error={v.fieldError('cost_method_code')}
                placeholder="Auto-generated from name" />
            </Field>

            <Field label="Description">
              <textarea className="input" disabled={view==='view'} rows={3}
                value={formData.description||''} onChange={e => setField('description', e.target.value)} />
            </Field>

            <Field label="Module" required error={v.fieldError('module_id')}>
              <Select value={formData.module_id} onChange={val => setField('module_id', val)}
                onBlur={() => v.handleBlur('module_id', formData)}
                error={v.fieldError('module_id')}
                options={modules?.map(r => ({ value: r.module_id, label: r.module_name || r.module_id }))} />
            </Field>

            <Field label="Active"><Toggle value={formData.active_flag} onChange={val => setField('active_flag', val)} /></Field>

            <Field label="Effective From" required error={v.fieldError('effective_from')}>
              <DateInput value={formData.effective_from} onChange={val => setField('effective_from', val)}
                onBlur={() => v.handleBlur('effective_from', formData)} error={v.fieldError('effective_from')} />
            </Field>
            <Field label="Effective To" error={v.fieldError('effective_to')}>
              <DateInput value={formData.effective_to} onChange={val => setField('effective_to', val)}
                onBlur={() => v.handleBlur('effective_to', formData)} error={v.fieldError('effective_to')} />
            </Field>

            <AuditFields formData={formData} setField={setField} />
          </div>
        </div>
      </FormPage>
    )
  }

  return (
    <>
      <DataTable title="Cost Method" subtitle="Manage Cost Method records" columns={COLUMNS}
        data={table.rows} total={table.total} page={table.page} pages={table.pages} loading={table.isLoading}
        onSearch={table.handleSearch} onPageChange={table.setPage} onSort={table.handleSort}
        sortBy={table.sortBy} sortOrder={table.sortOrder} onCreate={handleCreate}
        actions={{ onView: handleView, onEdit: handleEdit, onDelete: setConfirmDelete }} />
      <ConfirmDialog open={!!confirmDelete} title="Delete Record"
        message={`Delete "${confirmDelete?.cost_method_name}"? This cannot be undone.`}
        onConfirm={handleDelete} onCancel={() => setConfirmDelete(null)} loading={table.isDeleting} />
    </>
  )
}
