import React, { useState } from 'react'
import { useTableData } from '../hooks/useTableData'
import { DataTable, FormPage, Field, Input } from '../components/ui/index'
import { batchSerialTrackingApi } from '../services/api'
import { Hash, MapPin, Package, Clock, ShieldCheck, Calendar } from 'lucide-react'

const COLUMNS = [
  { key: 'tracking_id', label: 'ID' },
  { key: 'tracking_type', label: 'Type', render: (v) => (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
      v === 'SERIAL' ? 'bg-amber-100 text-amber-700' : 'bg-purple-100 text-purple-700'
    }`}>
      {v}
    </span>
  )},
  { key: 'item_code', label: 'Item Code' },
  { key: 'lot_number', label: 'Lot #' },
  { key: 'serial_number', label: 'Serial #' },
  { key: 'status', label: 'Status', render: (v) => (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
      v === 'AVAILABLE' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-700'
    }`}>
      {v || 'UNKNOWN'}
    </span>
  )},
  { key: 'receipt_date', label: 'Receipt' },
  { key: 'expiry_date', label: 'Expiry' }
]

function SectionHeader({ icon: Icon, title, color = 'brand' }) {
  const colors = {
    brand: 'from-blue-600 to-indigo-600', emerald: 'from-emerald-600 to-teal-600',
    amber: 'from-amber-500 to-orange-500', purple: 'from-purple-600 to-violet-600',
  }
  return (
    <div className={`flex items-center gap-3 mb-4 px-4 py-2 rounded-lg bg-gradient-to-r ${colors[color]} text-white shadow-sm`}>
      {Icon && <Icon className="w-4 h-4" />}
      <h3 className="text-sm font-semibold">{title}</h3>
    </div>
  )
}

export default function BatchSerialTrackingPage() {
  const table = useTableData(batchSerialTrackingApi, 'batch___serial_tracking')
  const [view, setView] = useState('list')
  const [selected, setSelected] = useState(null)

  const handleView = (row) => { setSelected(row); setView('view') }
  const handleBack = () => { setView('list'); setSelected(null) }

  if (view === 'view' && selected) {
    return (
      <FormPage title="Tracking Details" onBack={handleBack} mode="view">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="card p-6">
            <SectionHeader icon={Hash} title="Identification" />
            <div className="grid grid-cols-1 gap-4">
              <Field label="Tracking ID"><Input value={selected.tracking_id} readOnly /></Field>
              <Field label="Type"><Input value={selected.tracking_type} readOnly /></Field>
              <Field label="Status"><Input value={selected.status} readOnly className="font-bold text-emerald-700 uppercase" /></Field>
              <Field label="Lot Number"><Input value={selected.lot_number || '--'} readOnly /></Field>
              <Field label="Serial Number"><Input value={selected.serial_number || '--'} readOnly /></Field>
            </div>
          </div>

          <div className="card p-6">
            <SectionHeader icon={Package} title="Item & Org" color="emerald" />
            <div className="grid grid-cols-1 gap-4">
              <Field label="Item Code"><Input value={selected.item_code} readOnly /></Field>
              <Field label="Item Name"><Input value={selected.item_name} readOnly /></Field>
              <Field label="Company"><Input value={selected.company_name} readOnly /></Field>
              <Field label="UOM"><Input value={selected.uom_name} readOnly /></Field>
            </div>
          </div>

          <div className="card p-6">
            <SectionHeader icon={Calendar} title="Dates & Lifecycle" color="purple" />
            <div className="grid grid-cols-1 gap-4">
              <Field label="Receipt Date"><Input value={selected.receipt_date} readOnly /></Field>
              <Field label="Manufacture Date"><Input value={selected.manufacture_date || '--'} readOnly /></Field>
              <Field label="Expiry Date"><Input value={selected.expiry_date || '--'} readOnly className={selected.expiry_date ? 'text-rose-600' : ''} /></Field>
            </div>
          </div>

          <div className="card p-6">
            <SectionHeader icon={MapPin} title="Current Location" color="amber" />
            <div className="grid grid-cols-1 gap-4">
              <Field label="Organization"><Input value={selected.inv_org_id} readOnly /></Field>
              <Field label="Subinventory"><Input value={selected.subinventory_id} readOnly /></Field>
              <Field label="Locator"><Input value={selected.locator_id || '--'} readOnly /></Field>
            </div>
          </div>

          <div className="card p-6 md:col-span-2">
            <SectionHeader icon={ShieldCheck} title="Audit & Remarks" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Source Txn"><Input value={selected.txn_id} readOnly /></Field>
              <Field label="Remarks"><textarea className="input bg-gray-50" rows={2} value={selected.remarks || ''} readOnly /></Field>
            </div>
          </div>
        </div>
      </FormPage>
    )
  }

  return (
    <DataTable
      title="Batch & Serial Tracking"
      subtitle="Complete lifecycle tracking for lot and serial controlled items"
      columns={COLUMNS} data={table.rows} total={table.total}
      page={table.page} pages={table.pages} loading={table.isLoading}
      onSearch={table.handleSearch} onPageChange={table.setPage}
      onSort={table.handleSort} sortBy={table.sortBy} sortOrder={table.sortOrder}
      actions={{ onView: handleView }}
    />
  )
}
