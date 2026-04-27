import { useEffect } from 'react'
import { useDropdownData } from './useTableData'
import { companyApi, businessGroupApi, businessTypeApi, moduleApi } from '../services/api'
import { useAuth } from '../context/AuthContext'

export function useCompanyLogic(formData, setField) {
  const { user } = useAuth()

  // 1. Fetch all Business Groups (Parent)
  const { options: businessGroups, isLoading: isLoadingBG } = useDropdownData(businessGroupApi, 'bg_dd_all')

  // 2. Fetch Companies filtered by Business Group
  const { options: companies, isLoading: isLoadingCompany } = useDropdownData(
    companyApi, 
    'company_dd_filtered', 
    { bg_id: formData.bg_id }, 
    !!formData.bg_id
  )

  // 3. Fetch Business Types filtered by Company
  const { options: businessTypes, isLoading: isLoadingBT } = useDropdownData(
    businessTypeApi, 
    'bt_dd_filtered', 
    { COMPANY_id: formData.COMPANY_id }, 
    !!formData.COMPANY_id
  )

  // 4. Fetch all Modules for mapping if needed, or just use the one from user session
  const { options: allModules } = useDropdownData(moduleApi, 'mod_dd_all')

  // Auto-fill Module based on user session
  useEffect(() => {
    if (user && allModules.length > 0) {
      // Logic: If user has a module assigned or based on role
      // For now, let's look for "Inventory" as per example
      const inventoryModule = allModules.find(m => 
        m.module_name?.toLowerCase().includes('inventory') || 
        m.module_code === 'INV'
      )
      
      if (inventoryModule && formData.module_id !== inventoryModule.module_id) {
        setField('module_id', inventoryModule.module_id)
      }
    }
  }, [user, allModules, formData.module_id])

  // Reset logic
  const handleBGChange = (bgId) => {
    setField('bg_id', bgId)
    setField('COMPANY_id', '') // Reset Company
    setField('business_type_id', '') // Reset Business Type
  }

  const handleCompanyChange = (companyId) => {
    setField('COMPANY_id', companyId)
    setField('business_type_id', '') // Reset Business Type
  }

  return {
    businessGroups,
    companies,
    businessTypes,
    allModules,
    isLoadingBG,
    isLoadingCompany,
    isLoadingBT,
    handleBGChange,
    handleCompanyChange
  }
}
