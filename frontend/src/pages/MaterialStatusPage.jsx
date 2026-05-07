import React, { useState } from 'react'
import toast from 'react-hot-toast'
import { useTableData } from '../hooks/useTableData'
import { DataTable, StatusBadge, Toggle, Field, FormPage, ConfirmDialog, Input, AuditFields, ErrorBanner } from '../components/ui/index'
import { useFormValidation } from '../validations/useFormValidation'
import { autoCode } from '../validations/validationEngine'
import { materialStatusApi } from '../services/api'
import { Check, X } from 'lucide-react'

const COLUMNS = [
  { key: 'status_code', label: 'Status Code' },
  { key: 'status_name', label: 'Status Name' },
  { key: 'is_saleable', label: 'Saleable', render: (val) => val ? <Check className="w-4 h-4 text-green-500" /> : <X className="w-4 h-4 text-red-500" /> },
  { key: 'allow_transfer', label: 'Allow Transfer', render: (val) => val ? <Check className="w-4 h-4 text-green-500" /> : <X className="w-4 h-4 text-red-500" /> },
  { key: 'allow_reservation', label: 'Allow Reservation', render: (val) => val ? <Check className="w-4 h-4 text-green-500" /> : <X className="w-4 h-4 text-red-500" /> },
  { key: 'allow_pick', label: 'Allow Pick', render: (val) => val ? <Check className="w-4 h-4 text-green-500" /> : <X className="w-4 h-4 text-red-500" /> },
  { key: 'active_flag', label: 'Active Status', render: (val) => <StatusBadge status={val} /> },
  { key: 'created_at', label: 'Created Date', render: (val) => val ? new Date(val).toLocaleDateString() : '-' }
]

export default function MaterialStatusPage() {
  const table = useTableData(materialStatusApi, 'material_status_master')
  const [view, setView] = useState('list')
  const [selected, setSelected] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [formData, setFormData] = useState({})
  const v = useFormValidation('material_status')

  const setField = (k, val) => {
    setFormData(p => ({ ...p, [k]: val }))
    if (v.clearError) v.clearError(k)
  }

  const handleCreate = () => {
    setFormData({ 
      active_flag: 'Y', 
      is_saleable: true,
      allow_transfer: true,
      allow_reservation: true,
      allow_pick: true
    })
    v.reset()
    setView('create')
  }

  const handleEdit = (row) => { setSelected(row); setFormData({ ...row }); v.reset(); setView('edit') }
  const handleView = (row) => { setSelected(row); setFormData({ ...row }); v.reset(); setView('view') }
  const handleBack = () => { setView('list'); setSelected(null) }

  const handleSubmit = async (e) => {
    if (e) e.preventDefault()
    if (!v.validate(formData)) return toast.error('Please fix the highlighted errors')

    try {
      if (view === 'edit') {
        await table.update(selected.material_status_id, formData)
      } else {
        await table.create(formData)
      }
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
    await table.remove(confirmDelete.material_status_id)
    setConfirmDelete(null)
  }

  const toggleActive = async (row) => {
    try {
      await materialStatusApi.toggleStatus(row.material_status_id)
      table.refresh()
      toast.success('Status updated')
    } catch (err) {
      toast.error('Failed to update status')
    }
  }

  if (view !== 'list') {
    return (
      <FormPage title={view === 'view' ? 'View Material Status' : view === 'edit' ? 'Edit Material Status' : 'New Material Status'}
        onBack={handleBack} onSubmit={handleSubmit} loading={table.isCreating || table.isUpdating} mode={view}>
        {v.submitFailed && <ErrorBanner message="Please fix the highlighted errors before saving." />}
        <div className="card p-6 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Field label="Status Name" required error={v.errors.status_name}>
              <Input value={formData.status_name} 
                disabled={view === 'view'}
                onChange={e => {
                  const val = e.target.value;
                  setFormData(p => ({ 
                    ...p, 
                    status_name: val,
                    status_code: view === 'create' ? autoCode(val) : p.status_code
                  }))
                }}
                onBlur={() => v.handleBlur('status_name', formData)}
              />
            </Field>

            <Field label="Status Code" required error={v.errors.status_code}>
              <Input value={formData.status_code} 
                disabled={view === 'view'}
                onChange={e => setField('status_code', e.target.value)} 
                onBlur={() => v.handleBlur('status_code', formData)}
              />
            </Field>

            <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg border border-gray-100 dark:border-gray-700">
              <Field label="Saleable"><Toggle value={formData.is_saleable} disabled={view === 'view'} onChange={v => setField('is_saleable', v)} /></Field>
              <Field label="Allow Transfer"><Toggle value={formData.allow_transfer} disabled={view === 'view'} onChange={v => setField('allow_transfer', v)} /></Field>
              <Field label="Allow Reservation"><Toggle value={formData.allow_reservation} disabled={view === 'view'} onChange={v => setField('allow_reservation', v)} /></Field>
              <Field label="Allow Pick"><Toggle value={formData.allow_pick} disabled={view === 'view'} onChange={v => setField('allow_pick', v)} /></Field>
            </div>

            <Field label="Active Status"><Toggle value={formData.active_flag} disabled={view === 'view'} onChange={v => setField('active_flag', v)} /></Field>
            
            <AuditFields formData={formData} />
          </div>
        </div>
      </FormPage>
    )
  }

  return (
    <>
      <DataTable
        title="Material Status"
        subtitle="Manage inventory material statuses"
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
        actions={{ 
          onView: handleView, 
          onEdit: handleEdit, 
          onDelete: setConfirmDelete,
          custom: (row) => (
            <button onClick={() => toggleActive(row)} className="text-xs text-brand-600 hover:underline">
              {row.active_flag === 'Y' || row.active_flag === true ? 'Deactivate' : 'Activate'}
            </button>
          )
        }}
      />
      <ConfirmDialog
        open={!!confirmDelete}
        title="Delete Record"
        message={`Delete "${confirmDelete?.status_name}"? This cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
        loading={table.isDeleting}
      />
    </>
  )
}
