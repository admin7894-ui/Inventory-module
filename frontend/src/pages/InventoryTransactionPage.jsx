import React, { useState } from 'react'
import { useTableData } from '../hooks/useTableData'
import { DataTable, FormPage, Field, Input } from '../components/ui/index'
import { inventoryTransactionApi } from '../services/api'
import { Receipt, MapPin, Package, Hash, UserCheck, Calendar } from 'lucide-react'

const COLUMNS = [
  { key: 'txn_id', label: 'ID' },
  { key: 'item_code', label: 'Item Code' },
  { key: 'item_name', label: 'Item Name' },
  { key: 'inv_org_name', label: 'Organization' },
  { key: 'txn_action', label: 'Action', render: (v) => (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
      v === 'IN' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
    }`}>
      {v}
    </span>
  )},
  { key: 'txn_qty', label: 'Qty' },
  { key: 'uom_name', label: 'UOM' },
  { key: 'txn_reason_name', label: 'Reason' },
  { key: 'txn_date', label: 'Date' },
  { key: 'approved_by', label: 'Approved By' }
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

export default function InventoryTransactionPage() {
  const table = useTableData(inventoryTransactionApi, 'inventory_transaction')
  const [view, setView] = useState('list')
  const [selected, setSelected] = useState(null)

  const handleView = (row) => { setSelected(row); setView('view') }
  const handleBack = () => { setView('list'); setSelected(null) }

  if (view === 'view' && selected) {
    return (
      <FormPage title="Transaction Details" onBack={handleBack} mode="view">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="card p-6">
            <SectionHeader icon={Receipt} title="Basic Info" />
            <div className="grid grid-cols-1 gap-4">
              <Field label="Transaction ID"><Input value={selected.txn_id} readOnly /></Field>
              <Field label="Type"><Input value={selected.txn_type_id} readOnly /></Field>
              <Field label="Reason"><Input value={selected.txn_reason_name || selected.txn_reason_id} readOnly /></Field>
              <Field label="Action"><Input value={selected.txn_action} readOnly /></Field>
              <Field label="Date"><Input value={selected.txn_date} readOnly /></Field>
            </div>
          </div>

          <div className="card p-6">
            <SectionHeader icon={Package} title="Item & Quantity" color="emerald" />
            <div className="grid grid-cols-1 gap-4">
              <Field label="Item Code"><Input value={selected.item_code} readOnly /></Field>
              <Field label="Item Name"><Input value={selected.item_name} readOnly /></Field>
              <Field label="Quantity"><Input value={selected.txn_qty} readOnly /></Field>
              <Field label="UOM"><Input value={selected.uom_name} readOnly /></Field>
              <Field label="Unit Cost"><Input value={selected.unit_cost} readOnly /></Field>
            </div>
          </div>

          <div className="card p-6">
            <SectionHeader icon={MapPin} title="Location" color="purple" />
            <div className="grid grid-cols-1 gap-4">
              <Field label="Organization"><Input value={selected.inv_org_name} readOnly /></Field>
              <Field label="Subinventory"><Input value={selected.subinventory_id} readOnly /></Field>
              <Field label="Locator"><Input value={selected.locator_id} readOnly /></Field>
            </div>
          </div>

          <div className="card p-6">
            <SectionHeader icon={Hash} title="Tracking" color="amber" />
            <div className="grid grid-cols-1 gap-4">
              <Field label="Lot Number"><Input value={selected.display_lot || selected.lot_number || '--'} readOnly /></Field>
              <Field label="Serial Number"><Input value={selected.display_serial || selected.serial_number || '--'} readOnly /></Field>
              <Field label="Reference"><Input value={`${selected.reference_type}: ${selected.reference_no}`} readOnly /></Field>
            </div>
          </div>

          <div className="card p-6 md:col-span-2">
            <SectionHeader icon={UserCheck} title="Approval & Audit" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Field label="Approved By"><Input value={selected.approved_by} readOnly /></Field>
              <Field label="Created By"><Input value={selected.created_by} readOnly /></Field>
              <Field label="Remarks"><textarea className="input bg-gray-50" rows={2} value={selected.remarks || ''} readOnly /></Field>
            </div>
          </div>
        </div>
      </FormPage>
    )
  }

  return (
    <DataTable
      title="Inventory Transactions"
      subtitle="Full audit trail of all stock movements"
      columns={COLUMNS} data={table.rows} total={table.total}
      page={table.page} pages={table.pages} loading={table.isLoading}
      onSearch={table.handleSearch} onPageChange={table.setPage}
      onSort={table.handleSort} sortBy={table.sortBy} sortOrder={table.sortOrder}
      actions={{ onView: handleView }}
    />
  )
}
