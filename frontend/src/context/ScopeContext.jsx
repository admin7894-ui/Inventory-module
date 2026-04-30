import React, { createContext, useContext, useMemo, useState } from 'react'
import { useAuth } from './AuthContext'

const ScopeCtx = createContext(null)

const STORAGE_KEY = 'erp_scope'

function readInitialScope() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
    if (saved.bg_id || saved.COMPANY_id || saved.business_type_id) return saved
    const user = JSON.parse(localStorage.getItem('erp_user') || '{}')
    return {
      bg_id: user.bg_id || '',
      COMPANY_id: user.company_id || user.COMPANY_id || '',
      business_type_id: user.business_type_id || '',
    }
  } catch {
    return {}
  }
}

export function ScopeProvider({ children }) {
  const { user } = useAuth()
  const [scope, setScopeState] = useState(() => ({
    bg_id: '',
    COMPANY_id: '',
    business_type_id: '',
    ...readInitialScope(),
  }))

  const setScope = (next) => {
    setScopeState(prev => {
      const value = typeof next === 'function' ? next(prev) : next
      const merged = { ...prev, ...value }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(merged))
      window.dispatchEvent(new CustomEvent('erp-scope-change', { detail: merged }))
      return merged
    })
  }

  const resetScope = () => setScope({ bg_id: '', COMPANY_id: '', business_type_id: '' })

  React.useEffect(() => {
    if (!user) return
    setScope(prev => ({
      bg_id: prev.bg_id || user.bg_id || '',
      COMPANY_id: prev.COMPANY_id || user.company_id || user.COMPANY_id || '',
      business_type_id: prev.business_type_id || user.business_type_id || '',
    }))
  }, [user?.bg_id, user?.company_id, user?.COMPANY_id, user?.business_type_id])

  const value = useMemo(() => ({
    scope,
    setScope,
    resetScope,
    isScopeComplete: !!(scope.bg_id && scope.COMPANY_id && scope.business_type_id),
  }), [scope])

  return <ScopeCtx.Provider value={value}>{children}</ScopeCtx.Provider>
}

export const useScope = () => useContext(ScopeCtx)
