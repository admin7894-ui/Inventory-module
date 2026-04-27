import React, { useState, useEffect, useMemo, useCallback } from 'react'
import toast from 'react-hot-toast'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTableData, useDropdownData } from '../hooks/useTableData'
import { CompanyGroup } from '../components/CompanyGroup'
import { DataTable, Toggle, Select, DateInput, Field, FormPage, ConfirmDialog, Input, AuditFields } from '../components/ui/index'
import { Package, MapPin, Hash, FileText, AlertTriangle, ArrowRightLeft, CheckCircle2, ShieldCheck } from 'lucide-react'
import {
  stockAdjustmentApi, inventoryOrgApi, subinventoryApi, locatorApi, 
  itemMasterApi, uomApi, transactionTypeApi, transactionReasonApi, moduleApi
} from '../services/api'

const COLUMNS = [
  { key: 'adjustment_id', label: 'ID' },
  { key: 'item_id', label: 'Item' },
  { key: 'inv_org_id', label: 'Org' },
  { key: 'txn_action', label: 'Action' },
  { key: 'adjustment_qty', label: 'Adj Qty' },
  { key: 'adjustment_value', label: 'Value' },
  { key: 'approval_status', label: 'Status', render: (v) => (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
      v === 'APPROVED' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' :
      v === 'REJECTED' ? 'bg-rose-100 text-rose-700 border border-rose-200' :
      'bg-amber-100 text-amber-700 border border-amber-200'
    }`}>
      {v || 'PENDING'}
    </span>
  )},
]

function SectionHeader({ icon: Icon, title, subtitle, color = 'brand' }) {
  const colors = {
    brand: 'from-blue-600 to-indigo-600', emerald: 'from-emerald-600 to-teal-600',
    amber: 'from-amber-500 to-orange-500', purple: 'from-purple-600 to-violet-600',
  }
  return (
    <div className={`flex items-center gap-3 mb-4 px-4 py-2.5 rounded-lg bg-gradient-to-r ${colors[color]} text-white shadow-sm`}>
      {Icon && <Icon className="w-4 h-4 flex-shrink-0" />}
      <div>
        <h3 className="text-sm font-semibold tracking-wide">{title}</h3>
        {subtitle && <p className="text-xs opacity-80">{subtitle}</p>}
      </div>
    </div>
  )
}

export default function StockAdjustmentPage() {
  const table = useTableData(stockAdjustmentApi, 'stock_adjustment')
  const [view, setView] = useState('list')
  const [selected, setSelected] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [formData, setFormData] = useState({})
  const [errors, setErrors] = useState({})

  // Dropdowns
  const { options: inventoryOrgs }    = useDropdownData(inventoryOrgApi, 'invorg_dd')
  const { options: subinventories }   = useDropdownData(subinventoryApi, 'sub_dd')
  const { options: locators }         = useDropdownData(locatorApi, 'loc2_dd')
  const { options: items }            = useDropdownData(itemMasterApi, 'item_dd')
  const { options: uoms }             = useDropdownData(uomApi, 'uom_dd')
  const { options: txnTypes }         = useDropdownData(transactionTypeApi, 'txntype_dd')
  const { options: txnReasons }       = useDropdownData(transactionReasonApi, 'txnrsn_dd')
  const { options: modules }          = useDropdownData(moduleApi, 'mod_dd')

  const setField = useCallback((k, v) => {
    setFormData(p => ({ ...p, [k]: v }));
    setErrors(p => { const n = { ...p }; delete n[k]; return n; });
  }, [])

  const selectedItem = useMemo(() => {
    return (items || []).find(i => i.item_id === formData.item_id);
  }, [items, formData.item_id]);

  const isYes = (v) => v === 'Y' || v === true || v === 'True' || v === 'true';
  const isLotControlled = selectedItem && isYes(selectedItem.is_lot_controlled);
  const isSerialControlled = selectedItem && isYes(selectedItem.is_serial_controlled);

  const handleTxnTypeChange = (tid) => {
    const type = (txnTypes || []).find(t => t.txn_type_id === tid);
    if (type) {
      const isTransfer = type.txn_action === 'TRANSFER';
      setFormData(prev => ({
        ...prev,
        txn_type_id: tid,
        txn_action: type.txn_action,
        transfer_flag: isTransfer ? 'Y' : 'N',
        approval_status: isTransfer ? 'APPROVED' : 'PENDING'
      }));
    }
  };

  const handleItemChange = (iid) => {
    const item = (items || []).find(i => i.item_id === iid);
    if (item) {
      setFormData(prev => ({
        ...prev,
        item_id: iid,
        uom_id: item.primary_uom_id || prev.uom_id,
        unit_cost: item.standard_cost || prev.unit_cost || 0,
        lot_id: '',
        serial_id: ''
      }));
    }
  };

  const isTransfer = formData.txn_action === 'TRANSFER';
  const currentAdjQty = useMemo(() => {
    if (isTransfer) return parseFloat(formData.physical_qty || 0);
    return parseFloat(formData.physical_qty || 0) - parseFloat(formData.system_qty || 0);
  }, [isTransfer, formData.physical_qty, formData.system_qty]);

  const handleCreate = () => {
    setFormData({ 
      active_flag: 'Y', 
      effective_from: new Date().toISOString().split('T')[0],
      adjustment_date: new Date().toISOString().split('T')[0],
      approval_status: 'PENDING'
    })
    setErrors({})
    setView('create')
  }
  const handleEdit = (row) => { setSelected(row); setFormData({ ...row }); setErrors({}); setView('edit') }
  const handleView = (row) => { setSelected(row); setFormData({ ...row }); setErrors({}); setView('view') }
  const handleBack = () => { setView('list'); setSelected(null); setErrors({}) }

  const validate = () => {
    const e = {}
    if (!formData.COMPANY_id) e.COMPANY_id = 'Required'
    if (!formData.bg_id) e.bg_id = 'Required'
    if (!formData.item_id) e.item_id = 'Required'
    if (!formData.txn_type_id) e.txn_type_id = 'Required'
    if (!formData.inv_org_id) e.inv_org_id = 'Required'
    if (isTransfer && !formData.to_inv_org_id) e.to_inv_org_id = 'Required'
    if (isLotControlled && !formData.lot_id) e.lot_id = 'Lot Required'
    if (isSerialControlled && !formData.serial_id) e.serial_id = 'Serial Required'
    return e
  }

  const handleSubmit = async (ev) => {
    ev.preventDefault()
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return toast.error('Please fix validation errors') }
    
    try {
      const payload = { 
        ...formData, 
        adjustment_qty: currentAdjQty,
        adjustment_value: (currentAdjQty * parseFloat(formData.unit_cost || 0)).toFixed(2),
        approved_by: isTransfer ? (formData.created_by || 'system') : formData.approved_by,
        active_flag: 'Y'
      }
      if (view === 'edit') await table.update(selected['adjustment_id'], payload)
      else await table.create(payload)
      handleBack()
    } catch {}
  }

  if (view !== 'list') {
    return (
      <FormPage title={view === 'view' ? 'View Adjustment' : view === 'edit' ? 'Edit Adjustment' : 'New Adjustment'}
        onBack={handleBack} onSubmit={handleSubmit} loading={table.isCreating || table.isUpdating} mode={view}>
        
        <div className="card p-6 mb-5">
          <SectionHeader icon={Package} title="Transaction Info" subtitle="Item and type details" color="brand" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Field label="ID"><Input value={formData.adjustment_id} readOnly /></Field>
            <CompanyGroup formData={formData} setField={setField} errors={errors} />
            <Field label="Item" required error={errors.item_id}>
              <Select value={formData.item_id} onChange={handleItemChange} error={errors.item_id} disabled={view !== 'create'}
                options={items?.map(r => ({ value: r.item_id, label: `${r.item_code || ''} - ${r.item_name || r.item_id}` }))} />
            </Field>
            <Field label="Adjustment Type" required error={errors.txn_type_id}>
              <Select value={formData.txn_type_id} onChange={handleTxnTypeChange} error={errors.txn_type_id} disabled={view === 'view'}
                options={txnTypes?.map(r => ({ value: r.txn_type_id, label: r.txn_type_name }))} />
            </Field>
            {selectedItem && (
              <Field label="Control Type">
                <div className="flex gap-2 mt-2">
                  {isLotControlled && <span className="badge-purple">Lot</span>}
                  {isSerialControlled && <span className="badge-yellow">Serial</span>}
                  {!isLotControlled && !isSerialControlled && <span className="badge-blue">Standard</span>}
                </div>
              </Field>
            )}
          </div>
        </div>

        <div className="card p-6 mb-5 animate-slide-in">
          <SectionHeader icon={MapPin} title="Locations" subtitle={isTransfer ? "Source and Destination" : "Storage location"} color="emerald" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className={`p-4 rounded-lg ${isTransfer ? 'bg-amber-50 border border-amber-100' : 'bg-gray-50'}`}>
              <h4 className="text-xs font-bold uppercase text-gray-500 mb-3">{isTransfer ? 'Source Location' : 'Location'}</h4>
              <div className="space-y-3">
                <Field label="Org" required error={errors.inv_org_id}>
                  <Select value={formData.inv_org_id} onChange={v => setField('inv_org_id', v)} disabled={view === 'view'}
                    options={inventoryOrgs?.map(r => ({ value: r.inv_org_id, label: r.inv_org_name }))} />
                </Field>
                <Field label="Subinventory">
                  <Select value={formData.subinventory_id} onChange={v => setField('subinventory_id', v)} disabled={view === 'view'}
                    options={subinventories?.filter(r => r.inv_org_id === formData.inv_org_id).map(r => ({ value: r.subinventory_id, label: r.subinventory_name }))} />
                </Field>
              </div>
            </div>

            {isTransfer && (
              <div className="p-4 rounded-lg bg-blue-50 border border-blue-100">
                <h4 className="text-xs font-bold uppercase text-blue-600 mb-3">Destination Location</h4>
                <div className="space-y-3">
                  <Field label="To Org" required error={errors.to_inv_org_id}>
                    <Select value={formData.to_inv_org_id} onChange={v => setField('to_inv_org_id', v)} disabled={view === 'view'}
                      options={inventoryOrgs?.map(r => ({ value: r.inv_org_id, label: r.inv_org_name }))} />
                  </Field>
                  <Field label="To Subinventory">
                    <Select value={formData.to_subinventory_id} onChange={v => setField('to_subinventory_id', v)} disabled={view === 'view'}
                      options={subinventories?.filter(r => r.inv_org_id === formData.to_inv_org_id).map(r => ({ value: r.subinventory_id, label: r.subinventory_name }))} />
                  </Field>
                </div>
              </div>
            )}

            <div className="p-4 rounded-lg bg-gray-50">
              <h4 className="text-xs font-bold uppercase text-gray-500 mb-3">Quantities</h4>
              <div className="space-y-3">
                {!isTransfer && (
                  <Field label="System Qty"><Input type="number" value={formData.system_qty} onChange={e => setField('system_qty', e.target.value)} disabled={view === 'view'} /></Field>
                )}
                <Field label={isTransfer ? "Transfer Qty" : "Physical Qty"}>
                  <Input type="number" value={formData.physical_qty} onChange={e => setField('physical_qty', e.target.value)} disabled={view === 'view'} />
                </Field>
                <Field label="Net Adjustment"><Input value={currentAdjQty} readOnly className="bg-white font-bold" /></Field>
              </div>
            </div>
          </div>
        </div>

        <div className="card p-6 mb-5">
          <SectionHeader icon={Hash} title="Tracking & Value" subtitle="Lot/Serial and Financials" color="purple" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {isLotControlled && (
              <Field label="Lot" required error={errors.lot_id}>
                <Select value={formData.lot_id} onChange={v => setField('lot_id', v)} disabled={view === 'view'}
                  options={dropdowns.lotMaster?.map(r => ({ value: r.lot_id, label: r.lot_number }))} />
              </Field>
            )}
            {isSerialControlled && (
              <Field label="Serial" required error={errors.serial_id}>
                <Select value={formData.serial_id} onChange={v => setField('serial_id', v)} disabled={view === 'view'}
                  options={dropdowns.serialMaster?.map(r => ({ value: r.serial_id, label: r.serial_number }))} />
              </Field>
            )}
            <Field label="UOM">
              <Select value={formData.uom_id} onChange={v => setField('uom_id', v)} disabled={view === 'view'}
                options={uoms?.map(r => ({ value: r.uom_id, label: r.uom_name }))} />
            </Field>
            <Field label="Unit Cost"><Input type="number" value={formData.unit_cost} onChange={e => setField('unit_cost', e.target.value)} disabled={view === 'view'} /></Field>
            <Field label="Reason">
              <Select value={formData.txn_reason_id} onChange={v => setField('txn_reason_id', v)} disabled={view === 'view'}
                options={txnReasons?.map(r => ({ value: r.txn_reason_id, label: r.txn_reason }))} />
            </Field>
            <Field label="Date"><DateInput value={formData.adjustment_date} onChange={v => setField('adjustment_date', v)} disabled={view === 'view'} /></Field>
          </div>
        </div>

        <div className="card p-6 mb-5">
          <SectionHeader icon={ShieldCheck} title="Approval & Audit" subtitle="Status and remarks" color="brand" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Field label="Status">
              <div className="flex items-center gap-2 mt-2">
                <CheckCircle2 className={`w-4 h-4 ${formData.approval_status === 'APPROVED' ? 'text-emerald-500' : 'text-amber-500'}`} />
                <span className="text-sm font-bold uppercase">{formData.approval_status || 'PENDING'}</span>
              </div>
            </Field>
            <Field label="Approved By"><Input value={formData.approved_by || 'Auto-set on approval'} readOnly className="bg-gray-50" /></Field>
            <Field label="Remarks" className="md:col-span-2">
              <textarea className="input" rows={2} value={formData.remarks || ''} onChange={e => setField('remarks', e.target.value)} disabled={view === 'view'} />
            </Field>
            <AuditFields formData={formData} />
          </div>
        </div>
      </FormPage>
    )
  }

  return (
    <>
      <DataTable
        title="Stock Adjustment"
        subtitle="Manage inventory adjustments and internal transfers"
        columns={COLUMNS} data={table.rows} total={table.total}
        page={table.page} pages={table.pages} loading={table.isLoading}
        onSearch={table.handleSearch} onPageChange={table.setPage}
        onSort={table.handleSort} sortBy={table.sortBy} sortOrder={table.sortOrder}
        onCreate={handleCreate}
        actions={{ onView: handleView, onEdit: handleEdit, onDelete: setConfirmDelete }}
      />
      <ConfirmDialog open={!!confirmDelete} title="Delete Adjustment"
        message={`Delete adjustment record ${confirmDelete?.adjustment_id}?`}
        onConfirm={handleDelete} onCancel={() => setConfirmDelete(null)} loading={table.isDeleting} />
    </>
  )
}
