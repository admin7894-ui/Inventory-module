import React, { useState } from 'react'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
import { useTableData, useDropdownData } from '../hooks/useTableData'
import { validate, autoCode } from '../validations/validationEngine'
import { useFormValidation } from '../validations/useFormValidation'
import { CompanyGroup } from '../components/CompanyGroup'
import { DataTable, Toggle, Select, DateInput, Field, FormPage, ConfirmDialog, Input, AuditFields } from '../components/ui/index'
import {
  orgParameterApi, moduleApi, inventoryOrgApi, costMethodApi, costTypeApi, workdayCalendarApi
} from '../services/api'

const COLUMNS = [
  { key: 'org_param_id', label: 'Org Param Id' },
  { key: 'inv_org_id', label: 'Inv Org Id' },
  { key: 'org_code', label: 'Org Code' },
  { key: 'workday_calendar_id', label: 'Calendar' },
  { key: 'cost_method_id', label: 'Cost Method' },
  { key: 'cost_type_id', label: 'Cost Type' },
  { key: 'active_flag', label: 'Status', type: 'badge' }
]

export default function OrgParameterPage() {
  const navigate = useNavigate()
  const table = useTableData(orgParameterApi, 'org_parameter')
  const v = useFormValidation('org_parameter')
  const [view, setView] = useState('list')
  const [selected, setSelected] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [formData, setFormData] = useState({})
  const [codeEdited, setCodeEdited] = useState(false)

  const { options: modules }          = useDropdownData(moduleApi, 'mod_dd')
  const { options: inventoryOrgs }    = useDropdownData(inventoryOrgApi, 'invorg_dd')
  const { options: costMethods }      = useDropdownData(costMethodApi, 'cm_dd')
  const { options: costTypes }        = useDropdownData(costTypeApi, 'ct_dd')
  const { options: workdayCalendars } = useDropdownData(workdayCalendarApi, 'wc_dd')

  const existingCodes = table.rows.map(r => r.org_code)
  const setField = (k, val) => {
    setFormData(p => {
      const next = { ...p, [k]: val }
      // Auto-generate org_code from selected Inventory Org name
      if (k === 'inv_org_id') {
        const org = inventoryOrgs?.find(o => String(o.inv_org_id) === String(val))
        if (org) {
          next.org_code = autoCode(org.inv_org_name || org.inv_org_code || '', 'ORG_PARA_', existingCodes)
        }
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
      if (view === 'edit') await table.update(selected['org_param_id'], formData)
      else await table.create(formData)
      handleBack()
    } catch {}
  }

  const handleDelete = async () => { await table.remove(confirmDelete['org_param_id']); setConfirmDelete(null) }

  if (view !== 'list') {
    return (
      <FormPage title={view==='view'?'View Org Parameter':view==='edit'?'Edit Org Parameter':'New Org Parameter'}
        onBack={handleBack} onSubmit={handleSubmit} loading={table.isCreating||table.isUpdating} mode={view}>

        {v.hasErrors && (
          <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-400 text-sm font-medium">
            ⚠️ Please fix the highlighted errors below before submitting.
          </div>
        )}

        <div className="card p-6 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Field label="Org Param Id (Auto-gen)"><Input value={formData.org_param_id} readOnly /></Field>

            <CompanyGroup formData={formData} setField={setField} errors={v.errors}
              handleBlur={(k) => v.handleBlur(k, formData)} />

            <Field label="Inv Org" required error={v.fieldError('inv_org_id')}>
              <Select value={formData.inv_org_id} onChange={val => setField('inv_org_id', val)}
                onBlur={() => v.handleBlur('inv_org_id', formData)}
                error={v.fieldError('inv_org_id')}
                options={inventoryOrgs?.map(r => ({ value: r.inv_org_id, label: r.inv_org_name || r.inv_org_id }))} />
            </Field>

            <Field label="Org Code" required error={v.fieldError('org_code')}>
              <Input value={formData.org_code}
                readOnly
                onBlur={() => v.handleBlur('org_code', formData)}
                error={v.fieldError('org_code')}
                placeholder="Auto-generated from Inv Org" />
            </Field>

            <Field label="Item Master Org">
              <Input value={formData.item_master_org} onChange={e => setField('item_master_org', e.target.value)} />
            </Field>

            <Field label="Workday Calendar" required error={v.fieldError('workday_calendar_id')}>
              <Select value={formData.workday_calendar_id} onChange={val => setField('workday_calendar_id', val)}
                onBlur={() => v.handleBlur('workday_calendar_id', formData)}
                error={v.fieldError('workday_calendar_id')}
                options={workdayCalendars?.map(r => ({ value: r.workday_calendar_id || r.calendar_id, label: r.calendar_name || r.workday_calendar_id }))} />
            </Field>

            <Field label="Locator Control"><Toggle value={formData.locator_control} onChange={val => setField('locator_control', val)} /></Field>

            <Field label="Move Order Timeout Days" error={v.fieldError('move_order_timeout_days')}>
              <Input type="number" value={formData.move_order_timeout_days}
                onChange={e => setField('move_order_timeout_days', e.target.value)}
                onBlur={() => v.handleBlur('move_order_timeout_days', formData)}
                error={v.fieldError('move_order_timeout_days')} />
            </Field>

            <Field label="Move Order Timeout Action">
              <Input value={formData.move_order_timeout_action} onChange={e => setField('move_order_timeout_action', e.target.value)} />
            </Field>

            <Field label="Cost Method" required error={v.fieldError('cost_method_id')}>
              <Select value={formData.cost_method_id} onChange={val => setField('cost_method_id', val)}
                onBlur={() => v.handleBlur('cost_method_id', formData)}
                error={v.fieldError('cost_method_id')}
                options={costMethods?.map(r => ({ value: r.cost_method_id, label: r.cost_method_name || r.cost_method_id }))} />
            </Field>

            <Field label="Cost Type" required error={v.fieldError('cost_type_id')}>
              <Select value={formData.cost_type_id} onChange={val => setField('cost_type_id', val)}
                onBlur={() => v.handleBlur('cost_type_id', formData)}
                error={v.fieldError('cost_type_id')}
                options={costTypes?.map(r => ({ value: r.cost_type_id, label: r.cost_type_name || r.cost_type_id }))} />
            </Field>

            <Field label="Lot Control Enabled"><Toggle value={formData.lot_control_enabled} onChange={val => setField('lot_control_enabled', val)} /></Field>
            <Field label="Serial Control Enabled"><Toggle value={formData.serial_control_enabled} onChange={val => setField('serial_control_enabled', val)} /></Field>

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
      <DataTable title="Org Parameter" subtitle="Manage Org Parameter records" columns={COLUMNS}
        data={table.rows} total={table.total} page={table.page} pages={table.pages} loading={table.isLoading}
        onSearch={table.handleSearch} onPageChange={table.setPage} onSort={table.handleSort}
        sortBy={table.sortBy} sortOrder={table.sortOrder} onCreate={handleCreate}
        actions={{ onView: handleView, onEdit: handleEdit, onDelete: setConfirmDelete }} />
      <ConfirmDialog open={!!confirmDelete} title="Delete Record"
        message={`Delete Org Parameter "${confirmDelete?.org_code}"? This cannot be undone.`}
        onConfirm={handleDelete} onCancel={() => setConfirmDelete(null)} loading={table.isDeleting} />
    </>
  )
}
