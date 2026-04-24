import { useEffect } from 'react'
import { useDropdownData } from './useTableData'
import { companyApi, businessGroupApi, businessTypeApi } from '../services/api'

export function useCompanyLogic(formData, setField) {
  const { options: companies } = useDropdownData(companyApi, 'company_dd')
  
  // Fetch BGs for selected company
  const { options: businessGroups, isLoading: isLoadingBG } = useDropdownData(
    businessGroupApi, 
    'bg_dd_filtered', 
    { COMPANY_id: formData.COMPANY_id }, 
    !!formData.COMPANY_id
  )

  // Fetch BTs for selected company
  const { options: businessTypes, isLoading: isLoadingBT } = useDropdownData(
    businessTypeApi, 
    'bt_dd_filtered', 
    { COMPANY_id: formData.COMPANY_id }, 
    !!formData.COMPANY_id
  )

  // Auto-fill BG when company is selected and BGs are loaded
  useEffect(() => {
    if (formData.COMPANY_id && businessGroups.length > 0) {
      // Find BG that belongs to this company
      const found = businessGroups.find(bg => bg.COMPANY_id === formData.COMPANY_id)
      if (found && formData.bg_id !== found.bg_id) {
        setField('bg_id', found.bg_id)
      }
    }
  }, [formData.COMPANY_id, businessGroups])

  // Auto-fill first BT when company is selected and BTs are loaded (Requirement 5)
  useEffect(() => {
    if (formData.COMPANY_id && businessTypes.length > 0 && !formData.business_type_id) {
        setField('business_type_id', businessTypes[0].business_type_id)
    }
  }, [formData.COMPANY_id, businessTypes])

  const handleCompanyChange = (cid) => {
    setField('COMPANY_id', cid)
    setField('bg_id', '') // Reset BG
    setField('business_type_id', '') // Reset BT
  }

  return {
    companies,
    businessGroups,
    businessTypes,
    isLoadingBG,
    isLoadingBT,
    handleCompanyChange
  }
}
