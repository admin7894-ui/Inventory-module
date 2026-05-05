import React, { useState } from 'react'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
import { useTableData, useDropdownData } from '../hooks/useTableData'
import { validate, autoCode } from '../validations/validationEngine'
import { useFormValidation } from '../validations/useFormValidation'
import { CompanyGroup } from '../components/CompanyGroup'
import { DataTable, Toggle, Select, DateInput, Field, FormPage, ConfirmDialog, Input, AuditFields } from '../components/ui/index'
import {
  orgParameterApi, moduleApi, inventoryOrgApi, costMethodApi, costTypeApi, workdayCalendarApi, locatorApi
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

const cleanFormData = (data = {}) => {
  const { item_master_org, item_master_org_display, item_master_org_name, ...clean } = data
  return clean
}

export default function OrgParameterPage() {
  const navigate = useNavigate()
  const table = useTableData(orgParameterApi, 'org_parameter')
  const v = useFormValidation('org_parameter')
  const [view, setView] = useState('list')
  const [selected, setSelected] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [formData, setFormData] = useState({})
  const [codeEdited, setCodeEdited] = useState(false)
  const [showLocatorWarning, setShowLocatorWarning] = useState(false)
  const [pendingLocatorChange, setPendingLocatorChange] = useState(null)
  const [migrationModalOpen, setMigrationModalOpen] = useState(false)
  const [migrationLocatorId, setMigrationLocatorId] = useState('')
  const [affectedStockCount, setAffectedStockCount] = useState(0)
  const [locators, setLocators] = useState([])

  const { options: modules }          = useDropdownData(moduleApi, 'mod_dd')
  const { options: inventoryOrgs }    = useDropdownData(inventoryOrgApi, 'invorg_dd')
  const { options: costMethods }      = useDropdownData(costMethodApi, 'cm_dd')
  const { options: costTypes }        = useDropdownData(costTypeApi, 'ct_dd')
  const { options: workdayCalendars } = useDropdownData(workdayCalendarApi, 'wc_dd')

  const existingCodes = table.rows.map(r => r.org_code)

  // Collect all inv_org_ids that already have an org_parameter record
  const usedInvOrgIds = new Set(table.rows.map(r => r.inv_org_id).filter(Boolean))

  // In create mode: exclude already-used orgs.
  // In edit/view mode: always include the currently selected org (even if it's "used").
  const availableInvOrgs = inventoryOrgs?.filter(r => {
    if (view === 'create') return !usedInvOrgIds.has(r.inv_org_id)
    // edit / view: keep all, the backend guards against re-assignment
    return true
  })
  const setField = (k, val) => {
    if (k === 'locator_control' && val === false && view === 'edit') {
      const checkLocators = async () => {
        try {
          const resp = await locatorApi.getAll({ inv_org_id: formData.inv_org_id, limit: 1 })
          if (resp.total > 0) {
            setPendingLocatorChange(val)
            setShowLocatorWarning(true)
          } else {
            setFormData(p => ({ ...p, [k]: val }))
          }
        } catch (err) {
          setFormData(p => ({ ...p, [k]: val }))
        }
      }
      checkLocators()
      return
    }

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

  const confirmLocatorControlChange = () => {
    setFormData(p => ({ ...p, locator_control: pendingLocatorChange }))
    setShowLocatorWarning(false)
    setPendingLocatorChange(null)
  }

  const handleCreate = () => {
    setFormData({ active_flag: 'Y', effective_from: new Date().toISOString().split('T')[0] })
    setCodeEdited(false); v.reset(); setView('create')
  }
  const handleEdit = (row) => { setSelected(row); setFormData(cleanFormData(row)); setCodeEdited(true); v.reset(); setView('edit') }
  const handleView = (row) => { setSelected(row); setFormData(cleanFormData(row)); v.reset(); setView('view') }
  const handleBack = () => { setView('list'); setSelected(null); v.reset() }

  const handleSubmit = async (e, migrationLocator = null) => {
    if (e) e.preventDefault()
    const payload = cleanFormData(formData)
    if (migrationLocator) {
      payload.migrate_locator_id = migrationLocator;
    }
    if (!v.runValidation(payload)) return toast.error('Please fix the highlighted errors')
    try {
      if (view === 'edit') await table.update(selected['org_param_id'], payload)
      else await table.create(payload)
      setMigrationModalOpen(false)
      handleBack()
    } catch (err) {
      if (err.response?.data?.requiresMigration) {
        setAffectedStockCount(err.response.data.affectedStockCount || 0)
        setMigrationModalOpen(true)
        try {
          const resp = await locatorApi.getAll({ inv_org_id: formData.inv_org_id, limit: 100 })
          setLocators(resp.data || [])
        } catch (e) {
          console.error('Failed to fetch locators', e)
        }
        return
      }
      if (err.response?.data?.errors) {
        if (typeof v !== 'undefined' && v.setErrors) v.setErrors(err.response.data.errors)
        else if (typeof setErrors === 'function') setErrors(err.response.data.errors)
        toast.error('Please fix the highlighted errors')
      } else {
        toast.error(err.response?.data?.message || 'Action failed')
      }
    }
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

            <Field label="Inv Org" required error={v.errors.inv_org_id}>
              <Select value={formData.inv_org_id} onChange={val => setField('inv_org_id', val)}
                onBlur={() => v.handleBlur('inv_org_id', formData)}
                error={v.errors.inv_org_id}
                options={availableInvOrgs?.map(r => ({ value: r.inv_org_id, label: r.inv_org_name || r.inv_org_id }))} />
            </Field>

            <Field label="Org Code" required error={v.errors.org_code}>
              <Input value={formData.org_code}
                readOnly
                onBlur={() => v.handleBlur('org_code', formData)}
                error={v.errors.org_code}
                placeholder="Auto-generated from Inv Org" />
            </Field>

            <Field label="Workday Calendar" required error={v.errors.workday_calendar_id}>
              <Select value={formData.workday_calendar_id} onChange={val => setField('workday_calendar_id', val)}
                onBlur={() => v.handleBlur('workday_calendar_id', formData)}
                error={v.errors.workday_calendar_id}
                options={workdayCalendars?.map(r => ({ value: r.workday_calendar_id || r.calendar_id, label: r.calendar_name || r.workday_calendar_id }))} />
            </Field>

            <Field label="Locator Control"><Toggle value={formData.locator_control} onChange={val => setField('locator_control', val)} /></Field>

            <Field label="Move Order Timeout Days" error={v.errors.move_order_timeout_days}>
              <Input type="number" value={formData.move_order_timeout_days}
                onChange={e => setField('move_order_timeout_days', e.target.value)}
                onBlur={() => v.handleBlur('move_order_timeout_days', formData)}
                error={v.errors.move_order_timeout_days} />
            </Field>

            <Field label="Move Order Timeout Action">
              <Input value={formData.move_order_timeout_action} onChange={e => setField('move_order_timeout_action', e.target.value)} />
            </Field>

            <Field label="Cost Method" required error={v.errors.cost_method_id}>
              <Select value={formData.cost_method_id} onChange={val => setField('cost_method_id', val)}
                onBlur={() => v.handleBlur('cost_method_id', formData)}
                error={v.errors.cost_method_id}
                options={costMethods?.map(r => ({ value: r.cost_method_id, label: r.cost_method_name || r.cost_method_id }))} />
            </Field>

            <Field label="Cost Type" required error={v.errors.cost_type_id}>
              <Select value={formData.cost_type_id} onChange={val => setField('cost_type_id', val)}
                onBlur={() => v.handleBlur('cost_type_id', formData)}
                error={v.errors.cost_type_id}
                options={costTypes?.map(r => ({ value: r.cost_type_id, label: r.cost_type_name || r.cost_type_id }))} />
            </Field>

            <Field label="Lot Control Enabled"><Toggle value={formData.lot_control_enabled} onChange={val => setField('lot_control_enabled', val)} /></Field>
            <Field label="Serial Control Enabled"><Toggle value={formData.serial_control_enabled} onChange={val => setField('serial_control_enabled', val)} /></Field>

            {/* <Field label="Module" required error={v.errors.module_id}>
              <Select value={formData.module_id} onChange={val => setField('module_id', val)}
                onBlur={() => v.handleBlur('module_id', formData)}
                error={v.errors.module_id}
                options={modules?.map(r => ({ value: r.module_id, label: r.module_name || r.module_id }))} />
            </Field> */}

            <Field label="Active"><Toggle value={formData.active_flag} onChange={val => setField('active_flag', val)} /></Field>

            <Field label="Effective From" required error={v.errors.effective_from}>
              <DateInput value={formData.effective_from} onChange={val => setField('effective_from', val)}
                onBlur={() => v.handleBlur('effective_from', formData)} error={v.errors.effective_from} />
            </Field>
            <Field label="Effective To" error={v.errors.effective_to}>
              <DateInput value={formData.effective_to} onChange={val => setField('effective_to', val)}
                onBlur={() => v.handleBlur('effective_to', formData)} error={v.errors.effective_to} />
            </Field>

            <AuditFields formData={formData} setField={setField} />
          </div>
        </div>

        {migrationModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-md p-6 animate-in fade-in zoom-in duration-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-white">Locator Migration Required</h3>
                <button type="button" onClick={() => setMigrationModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
              <div className="mb-4 text-sm text-slate-600 dark:text-slate-300">
                <p className="mb-2">There are <strong>{affectedStockCount}</strong> existing stock records without a locator.</p>
                <p>To enable Locator Control, you must migrate this stock to a default locator.</p>
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Select Default Locator</label>
                <Select value={migrationLocatorId} onChange={setMigrationLocatorId}
                  options={locators.map(r => ({ value: r.locator_id, label: r.locator_name || r.locator_id }))}
                />
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setMigrationModalOpen(false)} className="btn-secondary">Cancel</button>
                <button type="button" 
                  onClick={() => {
                    if (!migrationLocatorId) return toast.error('Please select a locator');
                    handleSubmit(null, migrationLocatorId);
                  }} 
                  className="btn-primary flex items-center gap-2"
                  disabled={!migrationLocatorId}>
                  Migrate & Enable
                </button>
              </div>
            </div>
          </div>
        )}
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
      
      <ConfirmDialog open={showLocatorWarning} title="Disable Locator Control?"
        severity="warning"
        message="This Inventory Organization has existing locators defined. Disabling locator control will hide these locators from transaction forms, but historical data will remain intact. Do you want to proceed?"
        onConfirm={confirmLocatorControlChange} onCancel={() => setShowLocatorWarning(false)} />
    </>
  )
}


