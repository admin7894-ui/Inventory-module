import React from 'react'
import { Field, Select, Input } from './ui/index'
import { Loader2 } from 'lucide-react'
import { useCompanyLogic } from '../hooks/useCompanyLogic'
import { useScope } from '../context/ScopeContext'

export function CompanyGroup({ formData, setField, errors = {}, handleBlur }) {
  const { scope, setScope } = useScope()
  const { 
    businessGroups,
    companies, 
    businessTypes,
    allModules,
    isLoadingBG, 
    isLoadingCompany,
    isLoadingBT, 
    handleBGChange,
    handleCompanyChange 
  } = useCompanyLogic(formData, setField)

  React.useEffect(() => {
    if (scope.bg_id && formData.bg_id !== scope.bg_id) setField('bg_id', scope.bg_id)
    if (scope.COMPANY_id && formData.COMPANY_id !== scope.COMPANY_id) setField('COMPANY_id', scope.COMPANY_id)
    if (scope.business_type_id && formData.business_type_id !== scope.business_type_id) setField('business_type_id', scope.business_type_id)
  }, [scope.bg_id, scope.COMPANY_id, scope.business_type_id])

  const onBGChange = (v) => {
    handleBGChange(v)
    setScope({ bg_id: v, COMPANY_id: '', business_type_id: '' })
    if (handleBlur) handleBlur('bg_id', v)
  }

  const onCompanyChange = (v) => {
    handleCompanyChange(v)
    setScope({ COMPANY_id: v, business_type_id: '' })
    if (handleBlur) handleBlur('COMPANY_id', v)
  }

  // Get current module name for display
  const currentModule = allModules.find(m => m.module_id === formData.module_id)
  const moduleName = currentModule ? (currentModule.module_name || currentModule.module_id) : '-- Auto-filled --'

  return (
    <>
      <Field label="Business Group" required error={errors.bg_id}>
        <div className="relative">
          <Select 
            value={formData.bg_id} 
            onChange={onBGChange} 
            onBlur={(e) => handleBlur?.('bg_id', formData.bg_id)}
            error={errors.bg_id}
            placeholder={isLoadingBG ? 'Loading...' : '-- Select --'}
            options={businessGroups.map(r => ({ 
              value: r.bg_id, 
              label: r.bg_name || r['Business Group Name'] || r.bg_id 
            }))} 
          />
          {isLoadingBG && (
            <div className="absolute right-8 top-1/2 -translate-y-1/2">
              <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
            </div>
          )}
        </div>
      </Field>

      <Field label="Company" required error={errors.COMPANY_id}>
        <div className="relative">
          <Select 
            value={formData.COMPANY_id} 
            onChange={onCompanyChange} 
            onBlur={(e) => handleBlur?.('COMPANY_id', formData.COMPANY_id)}
            disabled={!formData.bg_id}
            placeholder={!formData.bg_id ? 'Select Business Group first' : isLoadingCompany ? 'Loading...' : '-- Select --'}
            error={errors.COMPANY_id}
            options={companies.map(r => ({ 
              value: r.company_id, 
              label: r.company_name || r.company_id 
            }))} 
          />
          {isLoadingCompany && (
            <div className="absolute right-8 top-1/2 -translate-y-1/2">
              <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
            </div>
          )}
        </div>
      </Field>

      <Field label="Business Type" required error={errors.business_type_id}>
        <div className="relative">
          <Select 
            value={formData.business_type_id} 
            onChange={v => { setField('business_type_id', v); setScope({ business_type_id: v }); handleBlur?.('business_type_id', v) }} 
            onBlur={(e) => handleBlur?.('business_type_id', formData.business_type_id)}
            disabled={!formData.COMPANY_id}
            placeholder={!formData.COMPANY_id ? 'Select Company first' : isLoadingBT ? 'Loading...' : '-- Select --'}
            error={errors.business_type_id}
            options={businessTypes.map(r => ({ 
              value: r.business_type_id, 
              label: r.name || r.business_type_id 
            }))} 
          />
          {isLoadingBT && (
            <div className="absolute right-8 top-1/2 -translate-y-1/2">
              <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
            </div>
          )}
        </div>
      </Field>

      <Field label="Module" required>
        <Input 
          value={moduleName} 
          readOnly 
          disabled 
          className="bg-gray-100 cursor-not-allowed font-medium text-brand-700" 
        />
      </Field>
    </>
  )
}
