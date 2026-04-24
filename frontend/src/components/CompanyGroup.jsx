import React from 'react'
import { Field, Select } from './ui/index'
import { Loader2 } from 'lucide-react'
import { useCompanyLogic } from '../hooks/useCompanyLogic'

export function CompanyGroup({ formData, setField }) {
  const { 
    companies, 
    businessGroups, 
    businessTypes, 
    isLoadingBG, 
    isLoadingBT, 
    handleCompanyChange 
  } = useCompanyLogic(formData, setField)

  return (
    <>
      <Field label="Company" required>
        <Select 
          value={formData.COMPANY_id} 
          onChange={handleCompanyChange} 
          options={companies.map(r => ({ 
            value: r.company_id, 
            label: r.company_name || r.company_id 
          }))} 
        />
      </Field>

      <Field label="Business Group">
        <div className="relative">
          <Select 
            value={formData.bg_id} 
            onChange={v => setField('bg_id', v)} 
            disabled={true} 
            placeholder={isLoadingBG ? 'Loading...' : '-- Auto-filled --'}
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

      <Field label="Business Type" required>
        <div className="relative">
          <Select 
            value={formData.business_type_id} 
            onChange={v => setField('business_type_id', v)} 
            disabled={!formData.COMPANY_id}
            placeholder={!formData.COMPANY_id ? 'Select Company First' : isLoadingBT ? 'Loading...' : '-- Select --'}
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
