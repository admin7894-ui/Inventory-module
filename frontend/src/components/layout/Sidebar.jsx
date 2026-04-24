import { Link, useLocation } from 'react-router-dom'
import React, { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import clsx from 'clsx'
import { Menu, X, Sun, Moon, LogOut, ChevronDown, ChevronRight, LayoutDashboard, Database } from 'lucide-react'

const NAV = [
  { group: '🏢 Organization', items: [
    { label: 'Departments',     path: '/departments' },
    { label: 'Roles',           path: '/roles' },
    { label: 'Designation',     path: '/designation' },
    { label: 'Module',          path: '/module' },
    { label: 'Business Type',   path: '/business-type' },
    { label: 'Location',        path: '/location' },
    { label: 'Company',         path: '/company' },
    { label: 'Business Group',  path: '/business-group' },
  ]},
  { group: '🔐 Security', items: [
    { label: 'Security Profile', path: '/security-profile' },
    { label: 'Profile Access',   path: '/profile-access' },
    { label: 'Security Roles',   path: '/security-roles' },
    { label: 'Table Access',     path: '/table-access' },
  ]},
  { group: '🏛️ Hierarchy', items: [
    { label: 'Legal Entity',    path: '/legal-entity' },
    { label: 'Operating Unit',  path: '/operating-unit' },
    { label: 'Inventory Org',   path: '/inventory-org' },
  ]},
  { group: '📅 Costing & Cal', items: [
    { label: 'Workday Calendar', path: '/workday-calendar' },
    { label: 'Cost Method',      path: '/cost-method' },
    { label: 'Cost Type',        path: '/cost-type' },
    { label: 'Org Parameter',    path: '/org-parameter' },
  ]},
  { group: '🚢 Shipping', items: [
    { label: 'Ship Method',  path: '/ship-method' },
    { label: 'Ship Network', path: '/ship-network' },
    { label: 'Intercompany', path: '/intercompany' },
  ]},
  { group: '📏 UOM', items: [
    { label: 'UOM Type',       path: '/uom-type' },
    { label: 'UOM',            path: '/uom' },
    { label: 'UOM Conversion', path: '/uom-conv' },
  ]},
  { group: '📦 Item Setup', items: [
    { label: 'Category Set',   path: '/category-set' },
    { label: 'Item Category',  path: '/item-category' },
    { label: 'Sub Category',   path: '/item-sub-category' },
    { label: 'Brand',          path: '/brand' },
    { label: 'Item Type',      path: '/item-type' },
    { label: 'Item Master',    path: '/item-master' },
  ]},
  { group: '🏭 Warehouse', items: [
    { label: 'Zone',               path: '/zone' },
    { label: 'Subinventory',       path: '/subinventory' },
    { label: 'Locator / Bin',      path: '/locator' },
    { label: 'Item-Subinv Rules',  path: '/item-subinv-restriction' },
    { label: 'Item Org Assign',    path: '/item-org-assignment' },
  ]},
  { group: '🔖 Lot & Serial', items: [
    { label: 'Lot Master',    path: '/lot-master' },
    { label: 'Serial Master', path: '/serial-master' },
  ]},
  { group: '🔄 Transactions', items: [
    { label: 'Transaction Type',   path: '/transaction-type' },
    { label: 'Transaction Reason', path: '/transaction-reason' },
    { label: 'Opening Stock',      path: '/opening-stock' },
    { label: 'Inventory Txn',      path: '/inventory-transaction' },
  ]},
  { group: '📊 Stock', items: [
    { label: 'Item Stock',         path: '/item-stock' },
    { label: 'Stock Ledger',       path: '/stock-ledger' },
    { label: 'Stock Adjustment',   path: '/stock-adjustment' },
    { label: 'Batch/Serial Track', path: '/batch-serial-tracking' },
  ]},
]

function NavGroup({ grp, defaultOpen }) {
  const loc = useLocation()
  const hasActive = grp.items.some(i => loc.pathname.startsWith(i.path))
  const [open, setOpen] = useState(defaultOpen || hasActive)

  return (
    <div>
      <button onClick={() => setOpen(p => !p)}
        className={clsx('w-full flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-lg transition-colors',
          hasActive ? 'bg-brand-800 text-white' : 'text-brand-100 hover:bg-brand-800/60')}>
        <span className="truncate">{grp.group}</span>
        {open ? <ChevronDown className="w-3 h-3 flex-shrink-0" /> : <ChevronRight className="w-3 h-3 flex-shrink-0" />}
      </button>
      {open && (
        <div className="mt-1 ml-3 space-y-0.5 pl-2 border-l border-brand-700/50">
          {grp.items.map(item => (
            <Link key={item.path} to={item.path}
              className={clsx('block px-3 py-1.5 text-xs rounded-lg transition-colors',
                loc.pathname.startsWith(item.path)
                  ? 'bg-brand-500 text-white font-medium'
                  : 'text-brand-200 hover:bg-brand-700/50 hover:text-white')}>
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

export function Sidebar({ collapsed, onToggle }) {
  const { user, logout } = useAuth()
  const { dark, toggle: toggleDark } = useTheme()

  return (
    <aside className={clsx('bg-brand-900 dark:bg-gray-900 flex flex-col transition-all duration-300 h-screen sticky top-0 flex-shrink-0 overflow-hidden', collapsed ? 'w-0' : 'w-60')}>
      {/* Logo */}
      <div className="flex items-center gap-2 px-4 py-4 border-b border-brand-800 flex-shrink-0">
        <div className="bg-brand-500 p-1.5 rounded-lg flex-shrink-0">
          <Database className="w-5 h-5 text-white" />
        </div>
        <div className="min-w-0">
          <p className="text-white font-bold text-sm truncate">ERP Inventory</p>
          <p className="text-brand-300 text-xs truncate">{user?.username || 'Guest'}</p>
        </div>
      </div>

      {/* Dashboard */}
      <div className="px-3 py-2 flex-shrink-0">
        <Link to="/" className={clsx('flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
          useLocation().pathname === '/' ? 'bg-brand-500 text-white' : 'text-brand-100 hover:bg-brand-800')}>
          <LayoutDashboard className="w-4 h-4" /> Dashboard
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 pb-4 space-y-1">
        {NAV.map((grp, i) => <NavGroup key={i} grp={grp} defaultOpen={i < 2} />)}
      </nav>

      {/* Bottom */}
      <div className="px-3 py-3 border-t border-brand-800 flex-shrink-0 space-y-1">
        <button onClick={toggleDark} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-brand-200 hover:bg-brand-800 rounded-lg transition-colors">
          {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          {dark ? 'Light Mode' : 'Dark Mode'}
        </button>
        <button onClick={logout} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-brand-200 hover:bg-brand-800 rounded-lg transition-colors">
          <LogOut className="w-4 h-4" /> Sign Out
        </button>
      </div>
    </aside>
  )
}

export function Header({ onMenuToggle }) {
  return (
    <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center gap-4 flex-shrink-0 sticky top-0 z-10">
      <button onClick={onMenuToggle} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
        <Menu className="w-5 h-5 text-gray-600 dark:text-gray-400" />
      </button>
      <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">ERP Inventory Management System</span>
    </header>
  )
}
