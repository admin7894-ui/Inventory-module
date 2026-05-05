import React, { useState } from 'react'
import { useTableData } from '../hooks/useTableData'
import { DataTable, FormPage, Field, Input, AuditFields } from '../components/ui/index'
import { lotMasterApi, itemMasterApi } from '../services/api'
import { useDropdownData } from '../hooks/useTableData'

const COLUMNS = [
  { key: 'lot_id',           label: 'Lot ID' },
  { key: 'company_name',     label: 'Company' },
  { key: 'business_type_name', label: 'Business Type' },
  { key: 'bg_name',          label: 'Business Group' },
  { key: 'item_code',        label: 'Item Code' },
  { key: 'item_name',        label: 'Item Name' },
  { key: 'lot_number',       label: 'Lot Number' },
  { key: 'manufacture_date', label: 'Manufacture Date' },
  { key: 'expiry_date',      label: 'Expiry Date' },
]

export default function LotMasterPage() {
  const table = useTableData(lotMasterApi, 'lot_master')
  const [view,     setView]     = useState('list')
  const [selected, setSelected] = useState(null)

  const handleView = row => { setSelected(row); setView('view') }
  const handleBack = ()  => { setView('list'); setSelected(null) }

  // ── Detail view (read-only) ───────────────────────────────────────────────
  if (view === 'view' && selected) {
    return (
      <FormPage title="View Lot Master" onBack={handleBack} mode="view">
        <div className="card p-6 mb-4">
          <div className="mb-3 flex items-center gap-2 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2">
            <span className="material-symbols-outlined text-base">info</span>
            Lot records are system-generated. Use Opening Stock or Stock Adjustment to create lots.
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Field label="Lot ID"><Input value={selected.lot_id} readOnly /></Field>
            <Field label="Company"><Input value={selected.company_name || selected.COMPANY_id} readOnly /></Field>
            <Field label="Business Group"><Input value={selected.bg_name || selected.bg_id} readOnly /></Field>
            <Field label="Business Type"><Input value={selected.business_type_name || selected.business_type_id} readOnly /></Field>
            <Field label="Item Code"><Input value={selected.item_code || selected.item_id} readOnly /></Field>
            <Field label="Item Name"><Input value={selected.item_name} readOnly /></Field>
            <Field label="Lot Number"><Input value={selected.lot_number} readOnly /></Field>
            <Field label="Manufacture Date"><Input value={selected.manufacture_date || '--'} readOnly /></Field>
            <Field label="Expiry Date"><Input value={selected.expiry_date || '--'} readOnly /></Field>
            <Field label="Status">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                selected.status === 'AVAILABLE' ? 'bg-emerald-100 text-emerald-700' :
                selected.status === 'RESERVED'  ? 'bg-amber-100 text-amber-700' :
                'bg-gray-100 text-gray-600'
              }`}>
                {selected.status || 'AVAILABLE'}
              </span>
            </Field>
            <Field label="Active"><Input value={selected.active_flag || '--'} readOnly /></Field>
            <Field label="Effective From"><Input value={selected.effective_from || '--'} readOnly /></Field>
            <Field label="Effective To"><Input value={selected.effective_to || '--'} readOnly /></Field>
            <Field label="Created By"><Input value={selected.created_by || '--'} readOnly /></Field>
            <Field label="Updated By"><Input value={selected.updated_by || '--'} readOnly /></Field>
          </div>
        </div>
      </FormPage>
    )
  }

  // ── List view — no onCreate, only onView ──────────────────────────────────
  return (
    <DataTable
      title="Lot Master"
      subtitle="Read-only registry of all Lot Numbers — created via transactions only"
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
      // onCreate intentionally omitted — no manual creation
      actions={{ onView: handleView }}
    />
  )
}
