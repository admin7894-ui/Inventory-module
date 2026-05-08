import React, { useState } from 'react'
import toast from 'react-hot-toast'
import { useTableData } from '../hooks/useTableData'
import { CompanyGroup } from '../components/CompanyGroup'
import { DataTable, Toggle, DateInput, Field, FormPage, ConfirmDialog, Input, AuditFields } from '../components/ui/index'
import { useFormValidation } from '../validations/useFormValidation'
import { transferTypesApi } from '../services/api'

const COLUMNS = [
  { key: 'id', label: 'Transfer Type Id' },
  { key: 'transfer_type_code', label: 'Transfer Type Code' },
  { key: 'transfer_type_name', label: 'Transfer Type Name' },
  { key: 'business_group_id', label: 'Business Group Id' },
  { key: 'company_id', label: 'Company Id' },
  { key: 'business_type_id', label: 'Business Type Id' },
  { key: 'is_active', label: 'Active' },
]

const toTransferTypeCode = (name) => {
  const cleaned = String(name || '').toUpperCase().replace(/[^A-Z0-9]/g, '')
  return cleaned ? `TT-${cleaned}` : ''
}

export default function TransferTypePage() {
  const table = useTableData(transferTypesApi, 'transfer_types')
  const v = useFormValidation('transfer_type')
  const [view, setView] = useState('list')
  const [selected, setSelected] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [formData, setFormData] = useState({})

  const setField = (k, value) => {
    setFormData((prev) => {
      const next = { ...prev, [k]: value }
      if (k === 'transfer_type_name') next.transfer_type_code = toTransferTypeCode(value)
      if (k === 'bg_id') next.business_group_id = value
      if (k === 'COMPANY_id') next.company_id = value
      return next
    })
    v.clearError(k)
  }

  const handleCreate = () => {
    setFormData({
      is_active: 'Y',
      active_flag: 'Y',
      module_id: 'MOD01',
      effective_from: new Date().toISOString().split('T')[0],
    })
    v.reset()
    setView('create')
  }
  const handleEdit = (row) => { setSelected(row); setFormData({ ...row, bg_id: row.bg_id || row.business_group_id, COMPANY_id: row.COMPANY_id || row.company_id }); v.reset(); setView('edit') }
  const handleView = (row) => { setSelected(row); setFormData({ ...row, bg_id: row.bg_id || row.business_group_id, COMPANY_id: row.COMPANY_id || row.company_id }); v.reset(); setView('view') }
  const handleBack = () => { setView('list'); setSelected(null); v.reset() }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const payload = {
      ...formData,
      transfer_type_code: toTransferTypeCode(formData.transfer_type_name),
      business_group_id: formData.bg_id || formData.business_group_id,
      company_id: formData.COMPANY_id || formData.company_id,
      is_active: formData.is_active ?? formData.active_flag ?? 'Y',
      active_flag: formData.is_active ?? formData.active_flag ?? 'Y',
    }
    if (!v.runValidation(payload)) return toast.error('Please fix the highlighted errors')
    try {
      if (view === 'edit') await table.update(selected.id, payload)
      else await table.create(payload)
      handleBack()
    } catch (err) {
      if (err.response?.data?.errors) {
        v.setErrors(err.response.data.errors)
        toast.error('Please fix the highlighted errors')
      } else {
        toast.error(err.response?.data?.message || 'Action failed')
      }
    }
  }

  const handleDelete = async () => {
    await table.remove(confirmDelete.id)
    setConfirmDelete(null)
  }

  if (view !== 'list') {
    return (
      <FormPage title={view === 'view' ? 'View Transfer Type' : view === 'edit' ? 'Edit Transfer Type' : 'New Transfer Type'}
        onBack={handleBack} onSubmit={handleSubmit} loading={table.isCreating || table.isUpdating} mode={view}>
        <div className="card p-6 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Field label="Transfer Type Id (Auto-gen)"><Input value={formData.id} readOnly /></Field>
            <CompanyGroup formData={formData} setField={setField} errors={v.errors} handleBlur={v.handleBlur} />
            <Field label="Transfer Type Code" required error={v.errors.transfer_type_code}>
              <Input value={toTransferTypeCode(formData.transfer_type_name)} readOnly className="bg-gray-50" />
            </Field>
            <Field label="Transfer Type Name" required error={v.errors.transfer_type_name}>
              <Input value={formData.transfer_type_name} onChange={e => setField('transfer_type_name', e.target.value)} onBlur={() => v.handleBlur('transfer_type_name', formData)} error={v.errors.transfer_type_name} />
            </Field>
            <Field label="Description"><Input value={formData.description} onChange={e => setField('description', e.target.value)} /></Field>
            <Field label="Active"><Toggle value={formData.is_active ?? formData.active_flag} onChange={val => { setField('is_active', val); setField('active_flag', val) }} /></Field>
            <Field label="Effective From" required error={v.errors.effective_from}>
              <DateInput value={formData.effective_from} onChange={val => setField('effective_from', val)} onBlur={() => v.handleBlur('effective_from', formData)} error={v.errors.effective_from} />
            </Field>
            <Field label="Effective To" error={v.errors.effective_to}>
              <DateInput value={formData.effective_to} onChange={val => setField('effective_to', val)} onBlur={() => v.handleBlur('effective_to', formData)} error={v.errors.effective_to} />
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
        title="Transfer Type"
        subtitle="Manage Transfer Types"
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
        message={`Delete "${confirmDelete?.id}"? This cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
        loading={table.isDeleting}
      />
    </>
  )
}
