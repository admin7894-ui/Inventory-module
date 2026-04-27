import React, { useState } from 'react'
import { useTableData } from '../hooks/useTableData'
import { DataTable, FormPage, Field, Input } from '../components/ui/index'
import { itemStockApi } from '../services/api'
import { Box, MapPin, Building, Ruler, BarChart3, Clock } from 'lucide-react'

const COLUMNS = [
  { key: 'item_code', label: 'Item Code' },
  { key: 'item_name', label: 'Item Name' },
  { key: 'company_name', label: 'Company' },
  { key: 'inv_org_name', label: 'Org' },
  { key: 'subinventory_id', label: 'Subinv' },
  { key: 'onhand_qty', label: 'Onhand', render: (v) => <span className="font-bold text-blue-600">{v}</span> },
  { key: 'available_qty', label: 'Available', render: (v) => <span className="font-bold text-emerald-600">{v}</span> },
  { key: 'uom_name', label: 'UOM' },
  { key: 'total_cost_value', label: 'Value' }
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

export default function ItemStockPage() {
  const table = useTableData(itemStockApi, 'item_stock_onhand')
  const [view, setView] = useState('list')
  const [selected, setSelected] = useState(null)

  const handleView = (row) => { setSelected(row); setView('view') }
  const handleBack = () => { setView('list'); setSelected(null) }

  if (view === 'view' && selected) {
    return (
      <FormPage title="Onhand Stock Details" onBack={handleBack} mode="view">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="card p-6">
            <SectionHeader icon={Box} title="Item Information" />
            <div className="grid grid-cols-1 gap-4">
              <Field label="Item Code"><Input value={selected.item_code} readOnly /></Field>
              <Field label="Item Name"><Input value={selected.item_name} readOnly /></Field>
              <Field label="UOM"><Input value={selected.uom_name} readOnly /></Field>
              <Field label="Lot Number"><Input value={selected.lot_number || '--'} readOnly /></Field>
            </div>
          </div>

          <div className="card p-6">
            <SectionHeader icon={BarChart3} title="Inventory Balances" color="emerald" />
            <div className="grid grid-cols-1 gap-4">
              <Field label="Onhand Qty"><Input value={selected.onhand_qty} readOnly className="font-bold text-blue-700 bg-blue-50" /></Field>
              <Field label="Available Qty"><Input value={selected.available_qty} readOnly className="font-bold text-emerald-700 bg-emerald-50" /></Field>
              <Field label="Reserved Qty"><Input value={selected.reserved_qty || 0} readOnly /></Field>
              <Field label="In Transit Qty"><Input value={selected.in_transit_qty || 0} readOnly /></Field>
            </div>
          </div>

          <div className="card p-6">
            <SectionHeader icon={MapPin} title="Location" color="purple" />
            <div className="grid grid-cols-1 gap-4">
              <Field label="Organization"><Input value={selected.inv_org_name} readOnly /></Field>
              <Field label="Subinventory"><Input value={selected.subinventory_name} readOnly /></Field>
              <Field label="Locator"><Input value={selected.locator_name || '--'} readOnly /></Field>
            </div>
          </div>

          <div className="card p-6">
            <SectionHeader icon={Building} title="Organization" color="amber" />
            <div className="grid grid-cols-1 gap-4">
              <Field label="Company"><Input value={selected.company_name} readOnly /></Field>
              <Field label="Business Group"><Input value={selected.business_group_name} readOnly /></Field>
              <Field label="Business Type"><Input value={selected.business_type_name} readOnly /></Field>
            </div>
          </div>

          <div className="card p-6 md:col-span-2">
            <SectionHeader icon={Clock} title="Financials & Audit" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Field label="Unit Cost"><Input value={selected.unit_cost} readOnly /></Field>
              <Field label="Total Value"><Input value={selected.total_cost_value} readOnly className="font-bold" /></Field>
              <Field label="Last Txn ID"><Input value={selected.last_transaction_id} readOnly /></Field>
            </div>
          </div>
        </div>
      </FormPage>
    )
  }

  return (
    <DataTable
      title="Onhand Stock"
      subtitle="Current real-time inventory balances across all locations"
      columns={COLUMNS} data={table.rows} total={table.total}
      page={table.page} pages={table.pages} loading={table.isLoading}
      onSearch={table.handleSearch} onPageChange={table.setPage}
      onSort={table.handleSort} sortBy={table.sortBy} sortOrder={table.sortOrder}
      actions={{ onView: handleView }}
    />
  )
}
