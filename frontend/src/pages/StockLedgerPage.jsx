import React, { useState } from 'react'
import { useTableData } from '../hooks/useTableData'
import { DataTable, FormPage, Field, Input } from '../components/ui/index'
import { stockLedgerApi } from '../services/api'
import { Receipt, MapPin, Package, Hash, BarChart3, Clock } from 'lucide-react'

const COLUMNS = [
  { key: 'ledger_id', label: 'ID' },
  { key: 'item_code', label: 'Item Code' },
  { key: 'item_name', label: 'Item Name' },
  { key: 'inv_org_name', label: 'Org' },
  { key: 'dr_qty', label: 'In (+)', render: (v) => v > 0 ? <span className="text-emerald-600 font-bold">+{v}</span> : '--' },
  { key: 'cr_qty', label: 'Out (-)', render: (v) => v > 0 ? <span className="text-rose-600 font-bold">-{v}</span> : '--' },
  { key: 'balance_qty', label: 'Balance', render: (v) => <span className="font-bold text-blue-600">{v}</span> },
  { key: 'uom_name', label: 'UOM' },
  { key: 'transaction_date', label: 'Date' }
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

export default function StockLedgerPage() {
  const table = useTableData(stockLedgerApi, 'stock_ledger')
  const [view, setView] = useState('list')
  const [selected, setSelected] = useState(null)

  const handleView = (row) => { setSelected(row); setView('view') }
  const handleBack = () => { setView('list'); setSelected(null) }

  if (view === 'view' && selected) {
    return (
      <FormPage title="Ledger Entry Details" onBack={handleBack} mode="view">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="card p-6">
            <SectionHeader icon={Receipt} title="Transaction Reference" />
            <div className="grid grid-cols-1 gap-4">
              <Field label="Ledger ID"><Input value={selected.ledger_id} readOnly /></Field>
              <Field label="Txn ID"><Input value={selected.transaction_id} readOnly /></Field>
              <Field label="Type"><Input value={selected.txn_type_name || selected.txn_type_id} readOnly /></Field>
              <Field label="Ref No"><Input value={selected.reference_no} readOnly /></Field>
              <Field label="Date"><Input value={selected.transaction_date} readOnly /></Field>
            </div>
          </div>

          <div className="card p-6">
            <SectionHeader icon={Package} title="Item & UOM" color="emerald" />
            <div className="grid grid-cols-1 gap-4">
              <Field label="Item Code"><Input value={selected.item_code} readOnly /></Field>
              <Field label="Item Name"><Input value={selected.item_name} readOnly /></Field>
              <Field label="UOM"><Input value={selected.uom_name} readOnly /></Field>
              <Field label="Lot/Serial"><Input value={selected.lot_number || selected.serial_number || '--'} readOnly /></Field>
            </div>
          </div>

          <div className="card p-6">
            <SectionHeader icon={BarChart3} title="Movement & Balances" color="purple" />
            <div className="grid grid-cols-1 gap-4">
              <Field label="Debit (In)"><Input value={selected.dr_qty} readOnly className="text-emerald-700 bg-emerald-50 font-bold" /></Field>
              <Field label="Credit (Out)"><Input value={selected.cr_qty} readOnly className="text-rose-700 bg-rose-50 font-bold" /></Field>
              <Field label="Running Balance"><Input value={selected.balance_qty} readOnly className="text-blue-700 bg-blue-50 font-bold" /></Field>
            </div>
          </div>

          <div className="card p-6">
            <SectionHeader icon={MapPin} title="Location" color="amber" />
            <div className="grid grid-cols-1 gap-4">
              <Field label="Organization"><Input value={selected.inv_org_name} readOnly /></Field>
              <Field label="Subinventory"><Input value={selected.subinventory_name} readOnly /></Field>
              <Field label="Locator"><Input value={selected.locator_name} readOnly /></Field>
            </div>
          </div>

          <div className="card p-6 md:col-span-2">
            <SectionHeader icon={Clock} title="Audit" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
      title="Stock Ledger"
      subtitle="Historical record of all stock movements and running balances"
      columns={COLUMNS} data={table.rows} total={table.total}
      page={table.page} pages={table.pages} loading={table.isLoading}
      onSearch={table.handleSearch} onPageChange={table.setPage}
      onSort={table.handleSort} sortBy={table.sortBy} sortOrder={table.sortOrder}
      actions={{ onView: handleView }}
    />
  )
}
