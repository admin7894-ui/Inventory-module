import React from 'react'
import { Field, Select } from './ui/index'
import { Loader2 } from 'lucide-react'
import { useCompanyLogic } from '../hooks/useCompanyLogic'

export function CompanyGroup({ formData, setField, errors = {}, handleBlur }) {
  const { 
    companies, 
    businessGroups, 
    businessTypes, 
    isLoadingBG, 
    isLoadingBT, 
    handleCompanyChange 
  } = useCompanyLogic(formData, setField)

  const onCompanyChange = (v) => {
    handleCompanyChange(v)
    if (handleBlur) handleBlur('COMPANY_id')
  }

  return (
    <>
      <Field label="Company" required error={errors.COMPANY_id}>
        <Select 
          value={formData.COMPANY_id} 
          onChange={onCompanyChange} 
          onBlur={() => handleBlur?.('COMPANY_id')}
          error={errors.COMPANY_id}
          options={companies.map(r => ({ 
            value: r.company_id, 
            label: r.company_name || r.company_id 
          }))} 
        />
      </Field>

      <Field label="Business Group" required error={errors.bg_id}>
        <div className="relative">
          <Select 
            value={formData.bg_id} 
            onChange={v => setField('bg_id', v)} 
            disabled={true} 
            placeholder={!formData.COMPANY_id ? 'Select Company first' : isLoadingBG ? 'Loading...' : '-- Auto-filled --'}
            error={errors.bg_id}
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

      <Field label="Business Type" required error={errors.business_type_id}>
        <div className="relative">
          <Select 
            value={formData.business_type_id} 
            onChange={v => { setField('business_type_id', v); handleBlur?.('business_type_id') }} 
            onBlur={() => handleBlur?.('business_type_id')}
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
    </>
  )
}
