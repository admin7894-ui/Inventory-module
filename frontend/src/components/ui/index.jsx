import React, { useState, useEffect, useRef } from 'react'
import { ChevronUp, ChevronDown, Search, X, ChevronLeft, ChevronRight, Eye, Edit2, Trash2, ToggleLeft, ToggleRight, AlertTriangle, Loader2 } from 'lucide-react'
import clsx from 'clsx'
import { createContext, useContext } from 'react'

const FormContext = createContext({ mode: 'edit' })
export const useFormMode = () => useContext(FormContext)

// ── Status Badge ──────────────────────────────────────────────
export function StatusBadge({ value }) {
  const v = String(value || '').toUpperCase()
  const cls =
    ['Y','ACTIVE','AVAILABLE','COMPLETED','APPROVED'].includes(v) ? 'badge-green' :
    ['N','EXPIRED','CANCELLED','REJECTED','DAMAGED'].includes(v) ? 'badge-red' :
    ['PENDING','RESERVED','QUARANTINE','ON_HOLD'].includes(v) ? 'badge-yellow' :
    ['IN','INTRA'].includes(v) ? 'badge-blue' :
    ['OUT','INTER'].includes(v) ? 'badge-red' :
    ['TRANSFER'].includes(v) ? 'badge-purple' : 'badge-gray'
  return <span className={cls}>{value || '—'}</span>
}

// ── Toggle Switch ─────────────────────────────────────────────
export function Toggle({ value, onChange, disabled }) {
  const { mode } = useFormMode()
  const isView = mode === 'view'
  const active = value === 'Y' || value === true || value === 'true'
  return (
    <button type="button" onClick={() => !disabled && !isView && onChange(active ? 'N' : 'Y')} disabled={disabled || isView}
      className={clsx('relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-1 disabled:opacity-50',
        active ? 'bg-brand-600' : 'bg-gray-300 dark:bg-gray-600')}>
      <span className={clsx('inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform', active ? 'translate-x-6' : 'translate-x-1')} />
    </button>
  )
}

// ── Select Dropdown ───────────────────────────────────────────
export function Select({ value, onChange, options = [], placeholder = '-- Select --', disabled, error, className }) {
  const { mode } = useFormMode()
  const isView = mode === 'view'
  return (
    <select value={value || ''} onChange={e => onChange(e.target.value)} disabled={disabled || isView}
      className={clsx(error ? 'input-error' : 'input', 'cursor-pointer', className)}>
      <option value="">{placeholder}</option>
      {options.map(opt => {
        const v = typeof opt === 'object' ? opt.value : opt
        const l = typeof opt === 'object' ? opt.label : opt
        return <option key={v} value={v}>{l}</option>
      })}
    </select>
  )
}

// ── Date Input ────────────────────────────────────────────────
export function DateInput({ value, onChange, required, error, min, max, disabled }) {
  const { mode } = useFormMode()
  const isView = mode === 'view'
  return (
    <input type="date" value={value || ''} onChange={e => onChange(e.target.value)}
      className={error ? 'input-error' : 'input'} required={required} min={min} max={max} disabled={disabled || isView} />
  )
}

// ── Standard Input ────────────────────────────────────────────
export function Input({ value, onChange, type = 'text', placeholder, disabled, readOnly, error, className, ...props }) {
  const { mode } = useFormMode()
  const isView = mode === 'view'
  return (
    <input
      type={type}
      value={value || ''}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled || isView}
      readOnly={readOnly}
      className={clsx(error ? 'input-error' : 'input', (readOnly || isView) && 'bg-gray-100 dark:bg-gray-800', className)}
      {...props}
    />
  )
}

// ── Confirm Dialog ────────────────────────────────────────────
export function ConfirmDialog({ open, title, message, onConfirm, onCancel, loading }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 animate-slide-in">
      <div className="card max-w-sm w-full p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-red-100 rounded-full"><AlertTriangle className="w-5 h-5 text-red-600" /></div>
          <h3 className="font-semibold text-gray-900 dark:text-white">{title || 'Confirm'}</h3>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">{message || 'Are you sure?'}</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="btn-secondary flex-1">Cancel</button>
          <button onClick={onConfirm} disabled={loading} className="btn-danger flex-1">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Data Table ────────────────────────────────────────────────
export function DataTable({ title, subtitle, columns, data, total, page, pages, limit, onSearch, onPageChange, onSort, sortBy, sortOrder, loading, onCreate, actions = {}, renderCell, filterBar }) {
  const [search, setSearch] = useState('')

  const handleSearch = (e) => { e.preventDefault(); onSearch?.(search) }

  return (
    <div className="space-y-4 animate-slide-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">{title}</h1>
          {subtitle && <p className="page-subtitle">{subtitle}</p>}
        </div>
        {onCreate && (
          <button onClick={onCreate} className="btn-primary">
            <span className="text-lg leading-none">+</span> Add New
          </button>
        )}
      </div>

      <div className="card">
        {/* Search + filters */}
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex flex-wrap items-center gap-3">
          <form onSubmit={handleSearch} className="flex items-center gap-2 flex-1 min-w-[200px]">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search all fields…"
                className="input pl-9 py-1.5 text-sm" />
              {search && <button type="button" onClick={() => { setSearch(''); onSearch?.('') }} className="absolute right-2 top-1/2 -translate-y-1/2"><X className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600" /></button>}
            </div>
            <button type="submit" className="btn-secondary btn-sm">Search</button>
          </form>
          {filterBar}
          <span className="text-xs text-gray-500 ml-auto">{total} records</span>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-brand-900 dark:bg-brand-800">
                {columns.map(col => (
                  <th key={col.key} className="th" onClick={() => col.sortable !== false && onSort?.(col.key)}>
                    <div className="flex items-center gap-1">
                      {col.label}
                      {sortBy === col.key && (
                        sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                      )}
                    </div>
                  </th>
                ))}
                <th className="th text-center w-24">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {columns.map(col => (
                      <td key={col.key} className="td"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-20" /></td>
                    ))}
                    <td className="td"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-16" /></td>
                  </tr>
                ))
              ) : data.length === 0 ? (
                <tr><td colSpan={columns.length + 1} className="td text-center py-12 text-gray-400">No records found</td></tr>
              ) : (
                data.map((row, i) => (
                  <tr key={i} className={clsx('tr-hover', i % 2 === 1 && 'bg-gray-50 dark:bg-gray-800/50')}>
                    {columns.map(col => (
                      <td key={col.key} className="td">
                        {renderCell ? renderCell(col, row) : (
                          col.render ? col.render(row[col.key], row) :
                          col.type === 'badge' ? <StatusBadge value={row[col.key]} /> :
                          col.type === 'toggle' ? <Toggle value={row[col.key]} disabled /> :
                          col.type === 'currency' ? <span className="font-medium text-emerald-700">₹{parseFloat(row[col.key]||0).toLocaleString()}</span> :
                          <span className="text-gray-700 dark:text-gray-300">{String(row[col.key] || '—')}</span>
                        )}
                      </td>
                    ))}
                    <td className="td">
                      <div className="flex items-center justify-center gap-1">
                        {actions.onView && <button onClick={() => actions.onView(row)} title="View" className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Eye className="w-3.5 h-3.5" /></button>}
                        {actions.onEdit && <button onClick={() => actions.onEdit(row)} title="Edit" className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>}
                        {actions.onDelete && <button onClick={() => actions.onDelete(row)} title="Delete" className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pages > 1 && (
          <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
            <span className="text-xs text-gray-500">Page {page} of {pages}</span>
            <div className="flex items-center gap-2">
              <button onClick={() => onPageChange?.(page - 1)} disabled={page <= 1} className="btn-secondary btn-xs">
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              {Array.from({ length: Math.min(5, pages) }, (_, i) => {
                const p = Math.max(1, Math.min(pages - 4, page - 2)) + i
                return (
                  <button key={p} onClick={() => onPageChange?.(p)}
                    className={clsx('btn btn-xs', p === page ? 'btn-primary' : 'btn-secondary')}>{p}</button>
                )
              })}
              <button onClick={() => onPageChange?.(page + 1)} disabled={page >= pages} className="btn-secondary btn-xs">
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Form Field ────────────────────────────────────────────────
export function Field({ label, required, error, children }) {
  return (
    <div>
      <label className={clsx('label', required && 'label-required')}>{label}</label>
      {children}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  )
}

// ── Page Form Wrapper ─────────────────────────────────────────
export function FormPage({ title, subtitle, onBack, onSubmit, loading, children, mode = 'edit' }) {
  return (
    <FormContext.Provider value={{ mode }}>
      <div className="animate-slide-in">
        <div className="page-header">
          <div>
            <button onClick={onBack} className="text-sm text-brand-600 hover:text-brand-800 flex items-center gap-1 mb-1">
              ← Back to list
            </button>
            <h1 className="page-title">{title}</h1>
            {subtitle && <p className="page-subtitle">{subtitle}</p>}
          </div>
        </div>
        <form onSubmit={onSubmit} noValidate>
          {children}
          <div className="flex items-center gap-3 pt-4">
            <button type="button" onClick={onBack} className="btn-secondary">Cancel</button>
            {mode !== 'view' && (
              <button type="submit" disabled={loading} className="btn-primary min-w-[120px]">
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : 'Save Record'}
              </button>
            )}
          </div>
        </form>
      </div>
    </FormContext.Provider>
  )
}

// ── Audit Fields ──────────────────────────────────────────────
export function AuditFields({ formData, setField }) {
  const { mode } = useFormMode()
  const user = JSON.parse(localStorage.getItem('erp_user') || '{}')?.username || 'admin'

  useEffect(() => {
    if (mode === 'create') {
      if (formData.created_by !== user) setField?.('created_by', user)
    }
  }, [mode, user])

  return (
    <>
      <Field label="Created By">
        <Input value={formData.created_by} readOnly />
      </Field>
      {mode !== 'create' && (
        <>
          <Field label="Updated By">
            <Input value={formData.updated_by} readOnly />
          </Field>
          <Field label="Created At">
            <Input value={formData.created_at} readOnly />
          </Field>
          <Field label="Updated At">
            <Input value={formData.updated_at} readOnly />
          </Field>
        </>
      )}
    </>
  )
}
