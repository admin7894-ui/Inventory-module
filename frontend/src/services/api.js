import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('erp_token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

api.interceptors.response.use(
  r => r,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('erp_token')
      localStorage.removeItem('erp_user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

// Generic CRUD factory
export const crud = (endpoint) => ({
  getAll:  (params) => api.get(endpoint, { params }).then(r => r.data),
  getOne:  (id)    => api.get(`${endpoint}/${id}`).then(r => r.data),
  create:  (data)  => api.post(endpoint, data).then(r => r.data),
  update:  (id, data) => api.put(`${endpoint}/${id}`, data).then(r => r.data),
  remove:  (id)    => api.delete(`${endpoint}/${id}`).then(r => r.data),
})

// All 46 APIs (Excel order)
export const departmentsApi           = crud('/departments')
export const rolesApi                 = crud('/roles')
export const designationApi           = crud('/designation')
export const moduleApi                = crud('/module')
export const businessTypeApi          = crud('/business-type')
export const locationApi              = crud('/location')
export const companyApi               = crud('/company')
export const businessGroupApi         = crud('/business-group')
export const securityProfileApi       = crud('/security-profile')
export const profileAccessApi         = crud('/profile-access')
export const securityRolesApi         = crud('/security-roles')
export const tableAccessApi           = crud('/table-access')
export const legalEntityApi           = crud('/legal-entity')
export const operatingUnitApi         = crud('/operating-unit')
export const inventoryOrgApi          = crud('/inventory-org')
export const workdayCalendarApi       = crud('/workday-calendar')
export const costMethodApi            = crud('/cost-method')
export const costTypeApi              = crud('/cost-type')
export const orgParameterApi          = crud('/org-parameter')
export const shipMethodApi            = crud('/ship-method')
export const shipNetworkApi           = crud('/ship-network')
export const intercompanyApi          = crud('/intercompany')
export const uomTypeApi               = crud('/uom-type')
export const uomApi                   = crud('/uom')
export const categorySetApi           = crud('/category-set')
export const itemCategoryApi          = crud('/item-category')
export const itemSubCategoryApi       = crud('/item-sub-category')
export const brandApi                 = crud('/brand')
export const itemTypeApi              = crud('/item-type')
export const itemMasterApi            = crud('/item-master')
export const zoneApi                  = crud('/zone')
export const subinventoryApi          = crud('/subinventory')
export const locatorApi               = crud('/locator')
export const itemSubinvRestrictionApi = crud('/item-subinv-restriction')
export const itemOrgAssignmentApi     = crud('/item-org-assignment')
export const uomConvApi               = crud('/uom-conv')
export const lotMasterApi             = crud('/lot-master')
export const serialMasterApi          = crud('/serial-master')
export const transactionTypeApi       = crud('/transaction-type')
export const transactionReasonApi     = crud('/transaction-reason')
export const openingStockApi          = crud('/opening-stock')
export const inventoryTransactionApi  = crud('/inventory-transaction')
export const itemStockApi             = crud('/item-stock')
export const stockLedgerApi           = crud('/stock-ledger')
export const stockAdjustmentApi       = crud('/stock-adjustment')
export const batchSerialTrackingApi   = crud('/batch-serial-tracking')

// Auth
export const authApi = {
  login: (d) => api.post('/auth/login', d).then(r => r.data),
  me:    ()  => api.get('/auth/me').then(r => r.data),
}

export default api
