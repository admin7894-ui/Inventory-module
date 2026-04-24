import React from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../context/AuthContext'
import { Package, TrendingUp, AlertCircle, Clock, Database, Users, ArrowRight } from 'lucide-react'
import {
  companyApi, itemMasterApi, inventoryTransactionApi, itemStockApi,
  stockAdjustmentApi, lotMasterApi
} from '../services/api'

function StatCard({ label, value, icon: Icon, color, to }) {
  const card = (
    <div className="card p-5 flex items-center gap-4 hover:shadow-md transition-shadow">
      <div className={`p-3 rounded-xl ${color}`}><Icon className="w-6 h-6 text-white" /></div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-bold text-gray-900 dark:text-white">{value ?? '—'}</p>
      </div>
      {to && <ArrowRight className="w-4 h-4 text-gray-400 flex-shrink-0" />}
    </div>
  )
  return to ? <Link to={to}>{card}</Link> : card
}

function useCount(api, key) {
  const { data } = useQuery({ queryKey: [key, 'count'], queryFn: () => api.getAll({ limit: 1 }) })
  return data?.total ?? '…'
}

export default function DashboardPage() {
  const { user } = useAuth()
  const companies   = useCount(companyApi, 'company')
  const items       = useCount(itemMasterApi, 'item_master')
  const txns        = useCount(inventoryTransactionApi, 'inventory_transaction')
  const stock       = useCount(itemStockApi, 'item_stock')
  const adjustments = useCount(stockAdjustmentApi, 'stock_adjustment')
  const lots        = useCount(lotMasterApi, 'lot_master')

  const QUICK_LINKS = [
    { label: 'Item Master',           path: '/item-master',           color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
    { label: 'Inventory Transaction', path: '/inventory-transaction', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
    { label: 'Stock Adjustment',      path: '/stock-adjustment',      color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
    { label: 'Item Stock',            path: '/item-stock',            color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
    { label: 'Stock Ledger',          path: '/stock-ledger',          color: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400' },
    { label: 'Lot Master',            path: '/lot-master',            color: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400' },
    { label: 'Batch/Serial Tracking', path: '/batch-serial-tracking', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
    { label: 'Opening Stock',         path: '/opening-stock',         color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' },
  ]

  return (
    <div className="space-y-6 animate-slide-in">
      <div>
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">Welcome back, <span className="font-medium text-brand-600">{user?.username}</span> • ERP Inventory System • 46 Tables</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard label="Companies"    value={companies}   icon={Database}     color="bg-brand-600"   to="/company" />
        <StatCard label="Items"        value={items}       icon={Package}      color="bg-emerald-600" to="/item-master" />
        <StatCard label="Transactions" value={txns}        icon={TrendingUp}   color="bg-purple-600"  to="/inventory-transaction" />
        <StatCard label="Stock Lines"  value={stock}       icon={Clock}        color="bg-orange-500"  to="/item-stock" />
        <StatCard label="Adjustments"  value={adjustments} icon={AlertCircle}  color="bg-red-500"     to="/stock-adjustment" />
        <StatCard label="Lots"         value={lots}        icon={Users}        color="bg-teal-600"    to="/lot-master" />
      </div>

      {/* Quick Links */}
      <div className="card p-6">
        <h2 className="text-base font-semibold text-gray-800 dark:text-white mb-4">Quick Access</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {QUICK_LINKS.map(l => (
            <Link key={l.path} to={l.path}
              className={`px-4 py-3 rounded-xl text-sm font-semibold text-center transition-all hover:scale-105 ${l.color}`}>
              {l.label}
            </Link>
          ))}
        </div>
      </div>

      {/* All 46 Tables Grid */}
      <div className="card p-6">
        <h2 className="text-base font-semibold text-gray-800 dark:text-white mb-4">All 46 Tables</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
          {[
            ['Departments','/departments'],['Roles','/roles'],['Designation','/designation'],
            ['Module','/module'],['Business Type','/business-type'],['Location','/location'],
            ['Company','/company'],['Business Group','/business-group'],
            ['Security Profile','/security-profile'],['Profile Access','/profile-access'],
            ['Security Roles','/security-roles'],['Table Access','/table-access'],
            ['Legal Entity','/legal-entity'],['Operating Unit','/operating-unit'],
            ['Inventory Org','/inventory-org'],['Workday Calendar','/workday-calendar'],
            ['Cost Method','/cost-method'],['Cost Type','/cost-type'],
            ['Org Parameter','/org-parameter'],['Ship Method','/ship-method'],
            ['Ship Network','/ship-network'],['Intercompany','/intercompany'],
            ['UOM Type','/uom-type'],['UOM','/uom'],['Category Set','/category-set'],
            ['Item Category','/item-category'],['Sub Category','/item-sub-category'],
            ['Brand','/brand'],['Item Type','/item-type'],['Item Master','/item-master'],
            ['Zone','/zone'],['Subinventory','/subinventory'],['Locator/Bin','/locator'],
            ['Item-Subinv Rules','/item-subinv-restriction'],['Item Org Assign','/item-org-assignment'],
            ['UOM Conversion','/uom-conv'],['Lot Master','/lot-master'],['Serial Master','/serial-master'],
            ['Txn Type','/transaction-type'],['Txn Reason','/transaction-reason'],
            ['Opening Stock','/opening-stock'],['Inventory Txn','/inventory-transaction'],
            ['Item Stock','/item-stock'],['Stock Ledger','/stock-ledger'],
            ['Stock Adjustment','/stock-adjustment'],['Batch/Serial Track','/batch-serial-tracking'],
          ].map(([label, path]) => (
            <Link key={path} to={path}
              className="p-2 text-center text-xs font-medium bg-gray-50 dark:bg-gray-700 hover:bg-brand-50 dark:hover:bg-brand-900/30 hover:text-brand-700 dark:hover:text-brand-400 rounded-lg transition-colors border border-gray-200 dark:border-gray-600 hover:border-brand-300">
              {label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
