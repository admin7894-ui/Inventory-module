import React, { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
import { useTableData, useDropdownData } from '../hooks/useTableData'
import { validateLegalEntity } from '../validations/legalEntityValidation'
import { CompanyGroup } from '../components/CompanyGroup'
import { DataTable, StatusBadge, Toggle, Select, DateInput, Field, FormPage, ConfirmDialog, Input, AuditFields } from '../components/ui/index'

import {
  locationApi, legalEntityApi
} from '../services/api'

const COLUMNS = [
  { key: 'le_id', label: 'Le Id' },
  { key: 'le_name', label: 'Le Name' },
  { key: 'tax_registration_no', label: 'Tax Registration No' },
  { key: 'location_id', label: 'Location' },
  { key: 'active_flag', label: 'Status', type: 'badge' }
]

export default function LegalEntityPage() {
  const table = useTableData(legalEntityApi, 'legal_entity')
  const [view, setView] = useState('list') // 'list' | 'create' | 'edit' | 'view'
  const [selected, setSelected] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [formData, setFormData] = useState({})
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})

  const { options: locations } = useDropdownData(locationApi, 'loc_dd')

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
                options={locations?.map(r=>({value:r.location_id,label:r.location_name||r.location_id}))} 
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
        message={`Delete "${confirmDelete?.le_name}"? This cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
        loading={table.isDeleting}
      />
    </>
  )
}
