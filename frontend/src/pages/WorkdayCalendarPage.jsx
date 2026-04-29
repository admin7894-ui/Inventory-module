import React, { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
import { Plus, Trash2 } from 'lucide-react'
import { useTableData, useDropdownData } from '../hooks/useTableData'
import { CompanyGroup } from '../components/CompanyGroup'
import { DataTable, StatusBadge, Toggle, Select, DateInput, Field, FormPage, ConfirmDialog, Input, AuditFields } from '../components/ui/index'
import { workdayCalendarApi } from '../services/api'
import { validate, autoCode } from '../validations/validationEngine'

const COLUMNS = [
  { key: 'calendar_id', label: 'Calendar ID' },
  { key: 'calendar_code', label: 'Code' },
  { key: 'calendar_name', label: 'Calendar Name' },
  { key: 'year', label: 'Year' },
  { key: 'weekly_off_days', label: 'Weekly Off', render: (val) => Array.isArray(val) ? val.join(', ') : val },
  { key: 'active_flag', label: 'Status', type: 'badge' },
  { key: 'effective_from', label: 'From' },
  { key: 'effective_to', label: 'To' }
]

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function WorkdayCalendarPage() {
  const navigate = useNavigate()
  const table = useTableData(workdayCalendarApi, 'workday_calendar')
  const [view, setView] = useState('list') // 'list' | 'create' | 'edit' | 'view'
  const [selected, setSelected] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [formData, setFormData] = useState({ holidays: [] })
  const [errors, setErrors] = useState({})

  const [codeEdited, setCodeEdited] = useState(false)

  const existingCodes = table.rows.map(r => r.calendar_code)
  const setField = (k, v) => {
    setFormData(p => {
      const next = { ...p, [k]: v }
      if (k === 'calendar_name' && !codeEdited) {
        next.calendar_code = autoCode(v, 'WC_', existingCodes)
      }
      return next
    })
    if (errors[k]) setErrors(p => { const newE = { ...p }; delete newE[k]; return newE; })
  }

  const handleCreate = () => {
    setFormData({ 
      active_flag: 'Y', 
      effective_from: new Date().toISOString().split('T')[0],
      weekly_off_days: [],
      holidays: []
    })
    setCodeEdited(false)
    setErrors({})
    setView('create')
  }

  const handleEdit = async (row) => {
    try {
      const res = await workdayCalendarApi.getOne(row.calendar_id)
      setSelected(row)
      setFormData({ ...res.data, holidays: res.data.holidays || [] })
      setCodeEdited(true)
      setErrors({})
      setView('edit')
    } catch (e) {
      if (e.response?.data?.errors) {
        if (typeof v !== 'undefined' && v.setErrors) v.setErrors(e.response.data.errors)
        else if (typeof setErrors === 'function') setErrors(e.response.data.errors)
        toast.error('Please fix the highlighted errors')
      } else {
        toast.error(e.response?.data?.message || e.message || 'Action failed')
      }
    }
  }

  const handleView = async (row) => {
    try {
      const res = await workdayCalendarApi.getOne(row.calendar_id)
      setSelected(row)
      setFormData({ ...res.data, holidays: res.data.holidays || [] })
      setView('view')
    } catch (e) {
      if (e.response?.data?.errors) {
        if (typeof v !== 'undefined' && v.setErrors) v.setErrors(e.response.data.errors)
        else if (typeof setErrors === 'function') setErrors(e.response.data.errors)
        toast.error('Please fix the highlighted errors')
      } else {
        toast.error(e.response?.data?.message || e.message || 'Action failed')
      }
    }
  }

  const handleBack = () => { setView('list'); setSelected(null); setErrors({}) }

  const addHoliday = () => {
    setFormData(p => ({
      ...p,
      holidays: [...p.holidays, { holiday_name: '', holiday_date: '', description: '' }]
    }))
  }

  const removeHoliday = (idx) => {
    setFormData(p => ({
      ...p,
      holidays: p.holidays.filter((_, i) => i !== idx)
    }))
  }

  const updateHoliday = (idx, k, v) => {
    setFormData(p => {
      const newH = [...p.holidays]
      newH[idx] = { ...newH[idx], [k]: v }
      return { ...p, holidays: newH }
    })
    const errKey = `${k}_${idx}`
    if (errors[errKey]) setErrors(p => { const newE = { ...p }; delete newE[errKey]; return newE; })
  }

  const toggleDay = (day) => {
    const current = formData.weekly_off_days || []
    const updated = current.includes(day) 
      ? current.filter(d => d !== day)
      : [...current, day]
    setField('weekly_off_days', updated)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const { errors: valErrors, isValid } = validate('workday_calendar', formData)
    if (!isValid) {
        setErrors(valErrors);
        setTimeout(() => { document.querySelector('.input-error')?.scrollIntoView({ behavior: 'smooth', block: 'center' }) }, 80);
        toast.error('Please fix the highlighted errors');
        return;
      }

    try {
      if (view === 'edit') {
        await table.update(selected.calendar_id, formData)
      } else {
        await table.create(formData)
      }
      handleBack()
    } catch (err) {
      if (err.response?.data?.errors) {
        if (typeof v !== 'undefined' && v.setErrors) v.setErrors(err.response.data.errors)
        else if (typeof setErrors === 'function') setErrors(err.response.data.errors)
        toast.error('Please fix the highlighted errors')
      } else {
        toast.error(err.response?.data?.message || err.message || 'Action failed')
      }
    }
  }

  const handleDelete = async () => {
    try {
      await table.remove(confirmDelete.calendar_id)
      toast.success("Deleted successfully")
      setConfirmDelete(null)
    } catch (e) {
      if (e.response?.data?.errors) {
        if (typeof v !== 'undefined' && v.setErrors) v.setErrors(e.response.data.errors)
        else if (typeof setErrors === 'function') setErrors(e.response.data.errors)
        toast.error('Please fix the highlighted errors')
      } else {
        toast.error(e.response?.data?.message || e.message || 'Action failed')
      }
    }
  }

  if (view !== 'list') {
    return (
      <FormPage 
        title={view === 'view' ? `View Workday Calendar` : view === 'edit' ? `Edit Workday Calendar` : `New Workday Calendar`}
        onBack={handleBack} 
        onSubmit={handleSubmit} 
        loading={table.isCreating || table.isUpdating} 
        mode={view}
      >
        <div className="space-y-6">
          <div className="card p-6 glass-effect">
            <h3 className="text-lg font-semibold mb-4 text-brand-700">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Field label="Calendar ID (Auto-gen)"><Input value={formData.calendar_id} readOnly /></Field>
              <CompanyGroup formData={formData} setField={setField} errors={errors} />
              
              <Field label="Calendar Code" required error={errors.calendar_code}>
                <Input value={formData.calendar_code} readOnly placeholder="Auto-generated from name" />
              </Field>
              <Field label="Calendar Name" required error={errors.calendar_name}>
                <Input value={formData.calendar_name} onChange={e => setField('calendar_name', e.target.value)} placeholder="e.g. India Work Calendar" />
              </Field>
              <Field label="Year" required error={errors.year}>
                <Input type="number" value={formData.year} onChange={e => setField('year', e.target.value)} placeholder="e.g. 2026" />
              </Field>
              
              <Field label="Active"><Toggle value={formData.active_flag} onChange={v => setField('active_flag', v)} /></Field>
              <Field label="Effective From" required error={errors.effective_from}><DateInput value={formData.effective_from} onChange={v => setField('effective_from', v)} /></Field>
              <Field label="Effective To" error={errors.effective_to}><DateInput value={formData.effective_to} onChange={v => setField('effective_to', v)} /></Field>
            </div>
            <div className="mt-4">
              <Field label="Description"><textarea className="input" disabled={view === 'view'} rows={2} value={formData.description || ''} onChange={e => setField('description', e.target.value)} /></Field>
            </div>
          </div>

          <div className="card p-6 glass-effect">
            <h3 className="text-lg font-semibold mb-2 text-brand-700">Weekly Off Days</h3>
            <p className="text-sm text-gray-500 mb-4">Select days that are considered weekly holidays</p>
            {errors.weekly_off_days && <p className="text-xs text-red-500 mb-2">{errors.weekly_off_days}</p>}
            <div className="flex flex-wrap gap-3">
              {DAYS.map(day => {
                const isSelected = (formData.weekly_off_days || []).includes(day)
                return (
                  <button
                    key={day}
                    type="button"
                    disabled={view === 'view'}
                    onClick={() => toggleDay(day)}
                    className={`px-4 py-2 rounded-lg border transition-all ${
                      isSelected 
                        ? 'bg-brand-600 border-brand-600 text-white shadow-md' 
                        : 'bg-white border-gray-200 text-gray-600 hover:border-brand-400'
                    } disabled:opacity-70 disabled:cursor-not-allowed`}
                  >
                    {day}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="card p-6 glass-effect overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-brand-700">Holidays List</h3>
              {view !== 'view' && (
                <button type="button" onClick={addHoliday} className="btn-secondary btn-sm flex items-center gap-1">
                  <Plus className="w-4 h-4" /> Add Holiday
                </button>
              )}
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800 text-left">
                    <th className="p-3 font-semibold text-gray-600 dark:text-gray-400">Holiday Name</th>
                    <th className="p-3 font-semibold text-gray-600 dark:text-gray-400">Date</th>
                    <th className="p-3 font-semibold text-gray-600 dark:text-gray-400">Description</th>
                    {view !== 'view' && <th className="p-3 font-semibold text-gray-600 dark:text-gray-400 text-center">Action</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {formData.holidays?.length === 0 ? (
                    <tr><td colSpan={4} className="p-4 text-center text-gray-400">No holidays added yet</td></tr>
                  ) : (
                    formData.holidays.map((h, idx) => (
                      <tr key={idx}>
                        <td className="p-2">
                          <Input 
                            value={h.holiday_name} 
                            onChange={e => updateHoliday(idx, 'holiday_name', e.target.value)} 
                            error={errors[`holiday_name_${idx}`]}
                            placeholder="e.g. Christmas"
                          />
                        </td>
                        <td className="p-2 w-48">
                          <DateInput 
                            value={h.holiday_date} 
                            onChange={v => updateHoliday(idx, 'holiday_date', v)} 
                            error={errors[`holiday_date_${idx}`]}
                          />
                        </td>
                        <td className="p-2">
                          <Input 
                            value={h.description} 
                            onChange={e => updateHoliday(idx, 'description', e.target.value)} 
                            placeholder="Optional"
                          />
                        </td>
                        {view !== 'view' && (
                          <td className="p-2 text-center">
                            <button type="button" onClick={() => removeHoliday(idx)} className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card p-6 glass-effect">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <AuditFields formData={formData} setField={setField} />
            </div>
          </div>
        </div>
      </FormPage>
    )
  }

  return (
    <>
      <DataTable
        title="Workday Calendar"
        subtitle="Manage working days, weekly offs, and holidays"
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
        message={`Delete calendar "${confirmDelete?.calendar_name}"? All associated holidays will also be removed.`}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
        loading={table.isDeleting}
      />
    </>
  )
}


