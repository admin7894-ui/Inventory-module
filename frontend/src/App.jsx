import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import { ScopeProvider } from './context/ScopeContext'
import { Layout } from './components/layout/Layout'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'

// All 46 pages
import DepartmentsPage          from './pages/DepartmentsPage'
import RolesPage                 from './pages/RolesPage'
import DesignationPage           from './pages/DesignationPage'
import ModulePage                from './pages/ModulePage'
import BusinessTypePage          from './pages/BusinessTypePage'
import LocationPage              from './pages/LocationPage'
import CompanyPage               from './pages/CompanyPage'
import BusinessGroupPage         from './pages/BusinessGroupPage'
import SecurityProfilePage       from './pages/SecurityProfilePage'
import ProfileAccessPage         from './pages/ProfileAccessPage'
import SecurityRolesPage         from './pages/SecurityRolesPage'
import TableAccessPage           from './pages/TableAccessPage'
import LegalEntityPage           from './pages/LegalEntityPage'
import OperatingUnitPage         from './pages/OperatingUnitPage'
import InventoryOrgPage          from './pages/InventoryOrgPage'
import WorkdayCalendarPage       from './pages/WorkdayCalendarPage'
import CostMethodPage            from './pages/CostMethodPage'
import CostTypePage              from './pages/CostTypePage'
import OrgParameterPage          from './pages/OrgParameterPage'
import ShipMethodPage            from './pages/ShipMethodPage'
import ShipNetworkPage           from './pages/ShipNetworkPage'
import IntercompanyPage          from './pages/IntercompanyPage'
import UomTypePage               from './pages/UomTypePage'
import UomPage                   from './pages/UomPage'
import CategorySetPage           from './pages/CategorySetPage'
import ItemCategoryPage          from './pages/ItemCategoryPage'
import ItemSubCategoryPage       from './pages/ItemSubCategoryPage'
import BrandPage                 from './pages/BrandPage'
import ItemTypePage              from './pages/ItemTypePage'
import ItemMasterPage            from './pages/ItemMasterPage'
import ZonePage                  from './pages/ZonePage'
import SubinventoryPage          from './pages/SubinventoryPage'
import LocatorPage               from './pages/LocatorPage'
import ItemSubinvRestrictionPage from './pages/ItemSubinvRestrictionPage'
import ItemOrgAssignmentPage     from './pages/ItemOrgAssignmentPage'
import UomConvPage               from './pages/UomConvPage'
import LotMasterPage             from './pages/LotMasterPage'
import SerialMasterPage          from './pages/SerialMasterPage'
import TransactionTypePage       from './pages/TransactionTypePage'
import TransactionReasonPage     from './pages/TransactionReasonPage'
import OpeningStockPage          from './pages/OpeningStockPage'
import InventoryTransactionPage  from './pages/InventoryTransactionPage'
import ItemStockPage             from './pages/ItemStockPage'
import StockLedgerPage           from './pages/StockLedgerPage'
import StockAdjustmentPage       from './pages/StockAdjustmentPage'
import BatchSerialTrackingPage   from './pages/BatchSerialTrackingPage'

function ProtectedRoute({ children }) {
  const { isAuth } = useAuth()
  return isAuth ? <Layout>{children}</Layout> : <Navigate to="/login" replace />
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />

      {/* Organization */}
      <Route path="/departments"             element={<ProtectedRoute><DepartmentsPage /></ProtectedRoute>} />
      <Route path="/roles"                   element={<ProtectedRoute><RolesPage /></ProtectedRoute>} />
      <Route path="/designation"             element={<ProtectedRoute><DesignationPage /></ProtectedRoute>} />
      <Route path="/module"                  element={<ProtectedRoute><ModulePage /></ProtectedRoute>} />
      <Route path="/business-type"           element={<ProtectedRoute><BusinessTypePage /></ProtectedRoute>} />
      <Route path="/location"               element={<ProtectedRoute><LocationPage /></ProtectedRoute>} />
      <Route path="/company"                element={<ProtectedRoute><CompanyPage /></ProtectedRoute>} />
      <Route path="/business-group"          element={<ProtectedRoute><BusinessGroupPage /></ProtectedRoute>} />

      {/* Security */}
      <Route path="/security-profile"        element={<ProtectedRoute><SecurityProfilePage /></ProtectedRoute>} />
      <Route path="/profile-access"          element={<ProtectedRoute><ProfileAccessPage /></ProtectedRoute>} />
      <Route path="/security-roles"          element={<ProtectedRoute><SecurityRolesPage /></ProtectedRoute>} />
      <Route path="/table-access"            element={<ProtectedRoute><TableAccessPage /></ProtectedRoute>} />

      {/* Hierarchy */}
      <Route path="/legal-entity"            element={<ProtectedRoute><LegalEntityPage /></ProtectedRoute>} />
      <Route path="/operating-unit"          element={<ProtectedRoute><OperatingUnitPage /></ProtectedRoute>} />
      <Route path="/inventory-org"           element={<ProtectedRoute><InventoryOrgPage /></ProtectedRoute>} />

      {/* Costing */}
      <Route path="/workday-calendar"        element={<ProtectedRoute><WorkdayCalendarPage /></ProtectedRoute>} />
      <Route path="/cost-method"             element={<ProtectedRoute><CostMethodPage /></ProtectedRoute>} />
      <Route path="/cost-type"               element={<ProtectedRoute><CostTypePage /></ProtectedRoute>} />
      <Route path="/org-parameter"           element={<ProtectedRoute><OrgParameterPage /></ProtectedRoute>} />

      {/* Shipping */}
      <Route path="/ship-method"             element={<ProtectedRoute><ShipMethodPage /></ProtectedRoute>} />
      <Route path="/ship-network"            element={<ProtectedRoute><ShipNetworkPage /></ProtectedRoute>} />
      <Route path="/intercompany"            element={<ProtectedRoute><IntercompanyPage /></ProtectedRoute>} />

      {/* UOM */}
      <Route path="/uom-type"                element={<ProtectedRoute><UomTypePage /></ProtectedRoute>} />
      <Route path="/uom"                     element={<ProtectedRoute><UomPage /></ProtectedRoute>} />
      <Route path="/uom-conv"                element={<ProtectedRoute><UomConvPage /></ProtectedRoute>} />

      {/* Item Setup */}
      <Route path="/category-set"            element={<ProtectedRoute><CategorySetPage /></ProtectedRoute>} />
      <Route path="/item-category"           element={<ProtectedRoute><ItemCategoryPage /></ProtectedRoute>} />
      <Route path="/item-sub-category"       element={<ProtectedRoute><ItemSubCategoryPage /></ProtectedRoute>} />
      <Route path="/brand"                   element={<ProtectedRoute><BrandPage /></ProtectedRoute>} />
      <Route path="/item-type"               element={<ProtectedRoute><ItemTypePage /></ProtectedRoute>} />
      <Route path="/item-master"             element={<ProtectedRoute><ItemMasterPage /></ProtectedRoute>} />

      {/* Warehouse */}
      <Route path="/zone"                    element={<ProtectedRoute><ZonePage /></ProtectedRoute>} />
      <Route path="/subinventory"            element={<ProtectedRoute><SubinventoryPage /></ProtectedRoute>} />
      <Route path="/locator"                 element={<ProtectedRoute><LocatorPage /></ProtectedRoute>} />
      <Route path="/item-subinv-restriction" element={<ProtectedRoute><ItemSubinvRestrictionPage /></ProtectedRoute>} />
      <Route path="/item-org-assignment"     element={<ProtectedRoute><ItemOrgAssignmentPage /></ProtectedRoute>} />

      {/* Lot & Serial */}
      <Route path="/lot-master"              element={<ProtectedRoute><LotMasterPage /></ProtectedRoute>} />
      <Route path="/serial-master"           element={<ProtectedRoute><SerialMasterPage /></ProtectedRoute>} />

      {/* Transactions */}
      <Route path="/transaction-type"        element={<ProtectedRoute><TransactionTypePage /></ProtectedRoute>} />
      <Route path="/transaction-reason"      element={<ProtectedRoute><TransactionReasonPage /></ProtectedRoute>} />
      <Route path="/opening-stock"           element={<ProtectedRoute><OpeningStockPage /></ProtectedRoute>} />
      <Route path="/inventory-transaction"   element={<ProtectedRoute><InventoryTransactionPage /></ProtectedRoute>} />

      {/* Stock */}
      <Route path="/item-stock"              element={<ProtectedRoute><ItemStockPage /></ProtectedRoute>} />
      <Route path="/stock-ledger"            element={<ProtectedRoute><StockLedgerPage /></ProtectedRoute>} />
      <Route path="/stock-adjustment"        element={<ProtectedRoute><StockAdjustmentPage /></ProtectedRoute>} />
      <Route path="/stock-adjustment/new"    element={<ProtectedRoute><StockAdjustmentPage /></ProtectedRoute>} />
      <Route path="/batch-serial-tracking"   element={<ProtectedRoute><BatchSerialTrackingPage /></ProtectedRoute>} />

      <Route path="*" element={
        <div className="text-center py-24 text-gray-600 dark:text-gray-300">
          <h1 className="text-2xl font-semibold">Page Not Found</h1>
          <p className="mt-2">The page you are looking for does not exist.</p>
        </div>
      } />
    </Routes>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ScopeProvider>
          <AppRoutes />
        </ScopeProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}
