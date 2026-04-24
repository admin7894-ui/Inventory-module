import React, { createContext, useContext, useState } from 'react'
import { authApi } from '../services/api'

const AuthCtx = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('erp_user') || 'null') } catch { return null }
  })

  const login = async (username, password) => {
    const res = await authApi.login({ username, password })
    if (res.success) {
      localStorage.setItem('erp_token', res.token)
      localStorage.setItem('erp_user', JSON.stringify(res.user))
      setUser(res.user)
    }
    return res
  }

  const logout = () => {
    localStorage.removeItem('erp_token')
    localStorage.removeItem('erp_user')
    setUser(null)
  }

  return (
    <AuthCtx.Provider value={{ user, login, logout, isAuth: !!user }}>
      {children}
    </AuthCtx.Provider>
  )
}

export const useAuth = () => useContext(AuthCtx)
